# Deploying the Avori ERP to the VPS

The server runs the code that is pushed to GitHub (`dev_d`). First time a script sets everything up; after that an
update is `git pull` + build + restart.

## Once, on this computer

1. Copy `deploy/vps.example.json` to `deploy/vps.local.json` and fill in the VPS password.
   That file is ignored by Git, so the password is never committed.
2. Optional: put a domain in `"domain"` (e.g. `erp.avoriatelier.com`, with its DNS A record pointing at the VPS).
   Without a domain the ERP is served on `http://<server-ip>:<free port>`.

## Commands (run from the repo folder)

| Command | What it does |
|---|---|
| `node deploy/deploy.js check` | Only looks: ports in use on the server and which ones are free. Changes nothing. |
| `node deploy/deploy.js setup` | First time: installs what is missing, clones the repo, creates the database, builds, starts the API as a service and adds the Nginx site. Safe to run again. |
| `node deploy/deploy.js update` | Later: `git pull`, build, restart. Run it after every `git push`. |

On the server itself the same things are `bash setup.sh` and `/var/www/avori-erp/deploy/update.sh`.

## What it creates on the server

- `/var/www/avori-erp` — the Git checkout, `build/` (web app) and `publish/` (API)
- database `avori_erp` with its own user; the generated password is only in `/etc/avori-erp.env` (root only)
- service `avori-erp` (the API on `127.0.0.1`, started on boot) — logs: `journalctl -u avori-erp -n 50`
- one Nginx site file `avori-erp`; other sites, databases and PM2 apps are not touched

New database tables are added when the API starts; existing data is kept. Open the ERP once after setup and create
the Owner account on the first screen.
