#!/bin/bash
# Installs, updates or rolls back FreeGamesList on Unraid from the image in this folder
# (freegameslist-image.tar.gz).
#
#   bash install.sh             # first time: install; later: update (same as "update")
#   bash install.sh update      # back up, load the new image, recreate, check that the data is still there
#   bash install.sh rollback    # back to the previous image and the last update backup
#   PORT=8095 bash install.sh   # another port (updates keep the port of the running site)
#
# Two containers from one image: "freegameslist" serves the website and only reads the database,
# "freegameslist-worker" fetches all stores once a day and is the only one that writes it.
#
# The database is a cache: everything in it can be fetched again from the stores. An update still
# saves it first (to /mnt/user/appdata/freegameslist-backups, the last 5 are kept), so a rollback
# puts the list back exactly as it was. If the new version doesn't come up or the list is gone
# afterwards, the script goes back to the previous version by itself.
#
# -E: the update's ERR trap (start the old version again) must also fire inside functions.
set -Eeuo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
DATA="${DATA:-/mnt/user/appdata/freegameslist}"
BACKUPS="${BACKUPS:-/mnt/user/appdata/freegameslist-backups}"
SITE="freegameslist"
WORKER="freegameslist-worker"
IMAGE="freegameslist"
TARBALL="freegameslist-image.tar.gz"
KEEP_BACKUPS=5
# Unraid's nobody:users, the owner of everything in appdata.
APP_USER="99:100"

# When the stores are fetched (cron, in the server's time zone) and how often a failed store is retried.
CRON_SCHEDULE="${CRON_SCHEDULE:-0 15 * * *}"
RETRY_ATTEMPTS="${RETRY_ATTEMPTS:-3}"
RETRY_DELAY_MIN="${RETRY_DELAY_MIN:-10}"
# Limit the regions, e.g. UPDATE_REGIONS=DE,AT,CH (empty: all 15).
UPDATE_REGIONS="${UPDATE_REGIONS:-}"

# The port of the running site, so an update keeps it without PORT=...; 8092 for a new install.
running_port() {
  docker container inspect "$SITE" \
    --format '{{range $p, $b := .HostConfig.PortBindings}}{{if eq $p "3000/tcp"}}{{(index $b 0).HostPort}}{{end}}{{end}}' \
    2>/dev/null || true
}
PORT="${PORT:-$(running_port)}"
PORT="${PORT:-8092}"

# The server's time zone (Unraid keeps it in ident.cfg), so the daily update starts at local time.
TIME_ZONE="${TZ:-$( (tr -d '\r' </boot/config/ident.cfg | sed -n 's/^timeZone="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' | head -n 1) 2>/dev/null || true)}"
TIME_ZONE="${TIME_ZONE:-Europe/Berlin}"

# The server's LAN address, for the icon and the hints.
SERVER_IP="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i <= NF; i++) if ($i == "src") print $(i + 1)}')"
ICON="http://${SERVER_IP}:${PORT}/icon-192.png"

# Prints a step.
step() {
  echo "==> $*"
}

# Stops with a message.
fail() {
  echo "ERROR: $*" >&2
  exit 1
}

# True when a container with this name exists (running or not).
container_exists() {
  docker container inspect "$1" >/dev/null 2>&1
}

# Loads the image from the tarball next to this script.
load_image() {
  [ -f "$HERE/$TARBALL" ] || fail "$TARBALL is missing next to install.sh"
  step "Loading the image ..."
  docker load -i "$HERE/$TARBALL"
}

# Runs a shell command as root in a throwaway container (no network) with the data folder at /data
# and the update backups at /backups, so it works whoever owns the files and whoever starts the script.
in_data() {
  mkdir -p "$BACKUPS"
  docker run --rm --network none --user 0:0 --entrypoint sh \
    -v "$DATA:/data" -v "$BACKUPS:/backups" \
    "$IMAGE:local" -c "$1"
}

# Creates the data folder and hands it to nobody:users, the user both containers run as.
prepare() {
  mkdir -p "$DATA"
  in_data "[ \"\$(stat -c '%u:%g' /data)\" = '$APP_USER' ] || chown -R $APP_USER /data"
}

# (Re)creates both containers from the :local image. Both run read-only, without capabilities, as 99:100.
create_containers() {
  docker rm -f "$SITE" "$WORKER" >/dev/null 2>&1 || true

  # Worker: fetches all stores on CRON_SCHEDULE, and right away when the data is older than a day.
  docker run -d \
    --name "$WORKER" \
    --restart unless-stopped \
    --user "$APP_USER" \
    --read-only --tmpfs /tmp \
    --cap-drop ALL --security-opt no-new-privileges:true \
    -v "${DATA}:/data" \
    -e TZ="$TIME_ZONE" \
    -e CRON_SCHEDULE="$CRON_SCHEDULE" \
    -e RETRY_ATTEMPTS="$RETRY_ATTEMPTS" \
    -e RETRY_DELAY_MIN="$RETRY_DELAY_MIN" \
    -e UPDATE_REGIONS="$UPDATE_REGIONS" \
    --label net.unraid.docker.icon="$ICON" \
    "$IMAGE:local" node worker.mjs >/dev/null

  # Website: only reads the database; behind the Cloudflare Tunnel.
  docker run -d \
    --name "$SITE" \
    --restart unless-stopped \
    --user "$APP_USER" \
    --read-only --tmpfs /tmp --tmpfs /app/.next/cache:mode=1777 \
    --cap-drop ALL --security-opt no-new-privileges:true \
    -p "${PORT}:3000" \
    -v "${DATA}:/data" \
    -e TZ="$TIME_ZONE" \
    --health-cmd 'wget -qO- http://127.0.0.1:3000/api/health?web >/dev/null || exit 1' \
    --health-interval 30s --health-timeout 5s --health-start-period 20s --health-retries 3 \
    --label net.unraid.docker.webui="http://[IP]:[PORT:3000]/" \
    --label net.unraid.docker.icon="$ICON" \
    "$IMAGE:local" >/dev/null
}

# Waits until the website answers (1 minute at most).
wait_healthy() {
  step "Waiting for the site to start ..."
  for _ in $(seq 1 60); do
    if curl -fsS "http://127.0.0.1:${PORT}/api/health?web" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# Prints how many finished game lists (one per region and language) the database holds; 0 without a database.
# Runs as 99:100 so SQLite's side files (-wal, -shm) never end up owned by root.
count_lists() {
  docker run --rm --network none --user "$APP_USER" --entrypoint node \
    -v "$DATA:/data" \
    "$IMAGE:local" -e '
      const fs = process.getBuiltinModule("node:fs");
      if (!fs.existsSync("/data/freegames.db")) { console.log(0); process.exit(0); }
      const { DatabaseSync } = process.getBuiltinModule("node:sqlite");
      const db = new DatabaseSync("/data/freegames.db", { readOnly: true });
      console.log(db.prepare("SELECT COUNT(*) AS n FROM snapshots").get().n);
    '
}

# Saves the data folder (database and its journal) while both containers are stopped.
backup() {
  local name
  name="freegameslist-$(date +%Y%m%d-%H%M%S).tar.gz"
  step "Backing up the database to $BACKUPS/$name ..."
  in_data "cd /data && tar -czf /backups/$name . && chmod 600 /backups/$name \
    && ls -1t /backups/freegameslist-*.tar.gz | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -f"
  LAST_BACKUP="$name"
}

# Prints the given backup's name, or the newest one's; stops when there is none.
find_backup() {
  local name="${1:-$(ls -1t "$BACKUPS" 2>/dev/null | grep '^freegameslist-.*\.tar\.gz$' | head -n 1 || true)}"
  [ -n "$name" ] && [ -f "$BACKUPS/$name" ] || fail "no backup found in $BACKUPS"
  echo "$name"
}

# Puts a backup back and gives the files to 99:100 again.
restore_backup() {
  local name="$1"
  step "Restoring $BACKUPS/$name ..."
  in_data "rm -f /data/freegames.db /data/freegames.db-wal /data/freegames.db-shm && cd /data \
    && tar -xzf /backups/$name && chown -R $APP_USER /data"
}

# Stops both containers; the worker first, it's the one writing the database.
stop_all() {
  docker stop -t 30 "$WORKER" >/dev/null 2>&1 || true
  docker stop -t 30 "$SITE" >/dev/null 2>&1 || true
}

# Goes back to the image saved as :previous and the newest backup.
rollback() {
  local name
  docker image inspect "$IMAGE:previous" >/dev/null 2>&1 || fail "there is no previous version to go back to"
  # Find the backup before anything is removed.
  name="$(find_backup "${1:-}")"
  step "Going back to the previous version ..."
  docker rm -f "$SITE" "$WORKER" >/dev/null 2>&1 || true
  # The known-good image first: the restore below runs in a container of $IMAGE:local.
  docker tag "$IMAGE:previous" "$IMAGE:local"
  restore_backup "$name"
  create_containers
  wait_healthy || fail "the previous version doesn't start either - see: docker logs $SITE"
  echo "Back on the previous version; the data is as it was before the update."
}

# Prints where the site is and what happens next.
summary() {
  echo
  echo "Done. The site runs at http://${SERVER_IP}:${PORT} and shows up in the Docker tab."
  if [ "$(count_lists)" = "0" ]; then
    echo "The first update is running now; the list fills in when it's done (a few minutes)."
    echo "Follow it in the Docker tab: $WORKER > Logs."
  fi
  echo "Daily update: \"$CRON_SCHEDULE\" ($TIME_ZONE)."
  echo "Cloudflare Tunnel: point freegames.tunefishservers.net to http://${SERVER_IP}:${PORT}"
}

# First installation.
install() {
  if ss -ltn 2>/dev/null | grep -q ":${PORT} "; then
    fail "port ${PORT} is already used. Start again with another one, e.g.: PORT=8095 bash $0"
  fi
  load_image
  step "Data folder ..."
  prepare
  step "Creating the containers ..."
  create_containers
  wait_healthy || fail "the site didn't start - see: docker logs $SITE"
  summary
}

# Update: backup, new image, recreate, check the data; back to the previous version on trouble.
update() {
  local before after loaded=""
  container_exists "$SITE" || [ -s "$DATA/freegames.db" ] || fail "FreeGamesList isn't installed yet (use: bash $0 install)"
  # Data folder but no image (new server, or images deleted): load the new one first, the
  # checks below run in it, and there is no previous version to keep.
  if ! docker image inspect "$IMAGE:local" >/dev/null 2>&1; then
    load_image
    loaded="yes"
  fi

  step "Stopping both containers (closes the database cleanly) ..."
  stop_all
  # Anything failing before the new version runs: start the old containers again and stop here.
  trap 'echo "Update stopped; the old version keeps running." >&2; docker start "$SITE" "$WORKER" >/dev/null 2>&1 || true' ERR
  mkdir -p "$DATA"
  before="$(count_lists)"
  backup

  if [ -z "$loaded" ]; then
    # Keep the running version for a rollback.
    docker tag "$IMAGE:local" "$IMAGE:previous"
    load_image
  fi
  prepare
  trap - ERR
  step "Recreating the containers with the new version ..."
  create_containers
  if ! wait_healthy; then
    echo "The new version doesn't start (docker logs $SITE shows why)." >&2
    docker logs --tail 30 "$SITE" >&2 || true
    rollback "$LAST_BACKUP"
    exit 1
  fi

  step "Checking that the game lists are still there ..."
  after="$(count_lists || echo 0)"
  if [ "$after" -lt "$before" ]; then
    echo "The database held $before game lists before the update and $after after it." >&2
    rollback "$LAST_BACKUP"
    exit 1
  fi
  if [ "$before" -gt 0 ] && ! curl -fsS "http://127.0.0.1:${PORT}/api/games?cc=DE&lang=de" >/dev/null 2>&1; then
    echo "The new version doesn't serve the game list." >&2
    docker logs --tail 30 "$SITE" >&2 || true
    rollback "$LAST_BACKUP"
    exit 1
  fi
  echo "All $before game lists are still there, the site serves them."
  summary
}

MODE="${1:-}"
if [ -z "$MODE" ]; then
  if container_exists "$SITE" || [ -s "$DATA/freegames.db" ]; then
    MODE="update"
  else
    MODE="install"
  fi
fi

case "$MODE" in
  install) install ;;
  update) update ;;
  rollback) rollback ;;
  *) fail "unknown mode '$MODE' (install, update or rollback)" ;;
esac

# Free the space of replaced images (the :previous one stays for a rollback).
docker image prune -f >/dev/null 2>&1 || true
