#!/bin/bash
# Builds the private Unraid bundle: the image as freegameslist:local, saved to
# freegameslist-image.tar.gz, plus install.sh and README.txt, all in OUT
# (default: the share the Unraid server sees as /mnt/user/filesharing/unraid-share/freegameslist).
#
#   bash unraid/build-local.sh
#   OUT=/some/folder bash unraid/build-local.sh
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${OUT:-/mnt/filesharing/unraid-share/freegameslist}"

# The commit the image is built from; "-dirty" when the working tree has uncommitted changes.
COMMIT="$(git -C "$REPO" rev-parse --short HEAD)"
if [ -n "$(git -C "$REPO" status --porcelain)" ]; then
  COMMIT="${COMMIT}-dirty"
fi

echo "==> Building freegameslist:local from $COMMIT ..."
docker build --pull -t freegameslist:local "$REPO"

mkdir -p "$OUT"
echo "==> Saving the image to $OUT/freegameslist-image.tar.gz ..."
# Written under a temporary name first, so a half-copied tarball never sits next to install.sh.
docker save freegameslist:local | gzip -1 >"$OUT/freegameslist-image.tar.gz.part"
mv "$OUT/freegameslist-image.tar.gz.part" "$OUT/freegameslist-image.tar.gz"
cp "$REPO/unraid/install-local.sh" "$OUT/install.sh"
sed "s/COMMIT/$COMMIT/" "$REPO/unraid/install-local.README.txt" >"$OUT/README.txt"
chmod 755 "$OUT/install.sh"

ls -lh "$OUT"
echo "Done. On Unraid: bash /mnt/user/filesharing/unraid-share/freegameslist/install.sh"
