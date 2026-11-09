# Open items, newest last

## 1. Host FreeGamesList on Unraid as Docker, with install and update like Beichtstuhl

**Status:** done locally, not yet run on the real Unraid · **Reported:** 2026-11-09

> Add the same install for this app like for Beichtstuhl repo. I want to just host it on unraid as
> docker, with install, update functionality, make the same procedure as Beichtstuhl

**Plan**
- [x] `unraid/install-local.sh` (install, update with backup + data check + automatic rollback, rollback)
- [x] `unraid/build-local.sh` builds the bundle into `/mnt/filesharing/unraid-share/freegameslist/`
- [x] Tested locally with renamed copies: install, update, broken image → rollback, emptied
      database → rollback, failed backup → old version starts again, manual rollback
- [x] Bundle built and copied to the share (commit 97edf83-dirty)
- [ ] User runs `bash /mnt/user/filesharing/unraid-share/freegameslist/install.sh` on Unraid
- [ ] Docker tab shows both containers with icon, WebUI opens the site
- [ ] Cloudflare Tunnel: freegames.tunefishservers.net → http://10.0.0.10:8092

**Done when** freegames.tunefishservers.net shows the list served from Unraid and a second
`install.sh` run (update) ends with "All N game lists are still there".
