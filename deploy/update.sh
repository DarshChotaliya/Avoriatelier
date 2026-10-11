#!/usr/bin/env bash
# Updates the Avori ERP on the VPS to the latest pushed code. Run as root on the server:
#
#     /var/www/avori-erp/deploy/update.sh
#
# git pull -> build -> restart the API. New database tables are added by the API when it starts; data is kept.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE=avori-erp
ENV_FILE=/etc/avori-erp.env

cd "$APP_DIR"
before="$(git rev-parse --short HEAD)"
git pull --ff-only
echo "Code: ${before} -> $(git rev-parse --short HEAD)"

bash "$APP_DIR/deploy/build.sh"
systemctl restart "$SERVICE"

sleep 6
port="$(grep '^API_PORT=' "$ENV_FILE" | cut -d= -f2)"
code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${port}/api/auth/status" || true)"
echo "API: HTTP ${code}"
[ "$code" = 200 ] || { echo "The API did not start. See: journalctl -u ${SERVICE} -n 50"; exit 1; }
echo "Avori ERP updated."
