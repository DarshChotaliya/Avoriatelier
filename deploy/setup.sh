#!/usr/bin/env bash
# First-time setup of the Avori ERP on a Ubuntu/Debian VPS. Run once, as root:
#
#     bash setup.sh                       # ERP on http://<server-ip>:<free port>
#     DOMAIN=erp.example.com bash setup.sh   # ERP on that domain, with HTTPS when certbot is installed
#
# It only adds its own things: the folder /var/www/avori-erp, the database "avori_erp", the service "avori-erp"
# and one Nginx site file. Other sites and databases on the server are not touched. Running it again is safe.
# Later updates: /var/www/avori-erp/deploy/update.sh
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/DarshChotaliya/Avoriatelier.git}"
BRANCH="${BRANCH:-dev_d}"
APP_DIR="${APP_DIR:-/var/www/avori-erp}"
DOMAIN="${DOMAIN:-}"
SERVICE=avori-erp
DB_NAME=avori_erp
DB_USER=avori_erp
ENV_FILE=/etc/avori-erp.env
STATE_DIR=/var/lib/avori-erp

say() { printf '\n\033[1;32m== %s\033[0m\n' "$*"; }
[ "$(id -u)" = 0 ] || { echo "Run as root (sudo bash setup.sh)."; exit 1; }

# First port from the list that nothing on this server listens on.
free_port() {
  for p in "$@"; do
    if ! ss -tlnH | awk '{print $4}' | grep -qE "[:.]${p}\$"; then echo "$p"; return; fi
  done
  echo "No free port among: $*" >&2; exit 1
}

say "1/8 Packages (only what is missing)"
export DEBIAN_FRONTEND=noninteractive
need=()
command -v git >/dev/null || need+=(git)
command -v nginx >/dev/null || need+=(nginx)
command -v psql >/dev/null || need+=(postgresql)
command -v curl >/dev/null || need+=(curl)
if [ ${#need[@]} -gt 0 ]; then apt-get update -y && apt-get install -y "${need[@]}"; fi

if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs
fi

# .NET 8 SDK (builds and runs the API). Kept in /opt/dotnet8 so it cannot clash with another .NET on the server.
DOTNET=/opt/dotnet8/dotnet
if [ ! -x "$DOTNET" ] || ! "$DOTNET" --list-sdks | grep -q '^8\.'; then
  curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
  bash /tmp/dotnet-install.sh --channel 8.0 --install-dir /opt/dotnet8
fi
export DOTNET_ROOT=/opt/dotnet8 DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1

say "2/8 Code from Git ($BRANCH)"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch origin "$BRANCH" && git -C "$APP_DIR" checkout "$BRANCH" && git -C "$APP_DIR" pull --ff-only
else
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

say "3/8 Database and settings"
if [ ! -f "$ENV_FILE" ]; then
  DB_PASS="$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32)"
  API_PORT="$(free_port 5023 5024 5025 5026 5027 5028 5029 5030)"
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
    && runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}'" \
    || runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}'"
  runuser -u postgres -- psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
    || runuser -u postgres -- createdb -O "${DB_USER}" "${DB_NAME}"
  # Only root can read this file; the password never goes into Git or the terminal.
  umask 077
  cat > "$ENV_FILE" <<EOF
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://127.0.0.1:${API_PORT}
ConnectionStrings__Purchase=Host=127.0.0.1;Port=5432;Database=${DB_NAME};Username=${DB_USER};Password=${DB_PASS}
DOTNET_ROOT=/opt/dotnet8
HOME=${STATE_DIR}
API_PORT=${API_PORT}
EOF
  umask 022
  echo "Created $ENV_FILE and database ${DB_NAME}."
else
  echo "Keeping the existing $ENV_FILE (database and password unchanged)."
fi
API_PORT="$(grep '^API_PORT=' "$ENV_FILE" | cut -d= -f2)"
# Sign-in keys live here, so users stay signed in when the API restarts.
mkdir -p "$STATE_DIR" && chown -R www-data:www-data "$STATE_DIR"

say "4/8 Build (web app + API) — a few minutes"
bash "$APP_DIR/deploy/build.sh"

say "5/8 Service"
cat > /etc/systemd/system/${SERVICE}.service <<EOF
[Unit]
Description=Avori ERP API
After=network.target postgresql.service

[Service]
WorkingDirectory=${APP_DIR}/publish
ExecStart=/opt/dotnet8/dotnet ${APP_DIR}/publish/Purchase.Api.dll
EnvironmentFile=${ENV_FILE}
User=www-data
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable "$SERVICE" >/dev/null
systemctl restart "$SERVICE"

say "6/8 Nginx site"
# Debian/Ubuntu keep sites in sites-available + sites-enabled; other layouts read conf.d/*.conf.
if [ -d /etc/nginx/sites-enabled ]; then SITE=/etc/nginx/sites-available/${SERVICE}; else SITE=/etc/nginx/conf.d/${SERVICE}.conf; fi
if [ -n "$DOMAIN" ]; then
  LISTEN="listen 80;"; SERVER_NAME="$DOMAIN"; WEB_PORT=80
elif [ -f "$SITE" ] && grep -qE 'listen [0-9]+;' "$SITE"; then
  WEB_PORT="$(grep -oE 'listen [0-9]+;' "$SITE" | head -1 | grep -oE '[0-9]+')"
  LISTEN="listen ${WEB_PORT};"; SERVER_NAME="_"
else
  WEB_PORT="$(free_port 8090 8091 8092 8093 8094 8095 8096 8097 8098 8099)"
  LISTEN="listen ${WEB_PORT};"; SERVER_NAME="_"
fi
cat > "$SITE" <<EOF
# Avori ERP: the built web app, with /api passed to the API on 127.0.0.1:${API_PORT}.
server {
    ${LISTEN}
    server_name ${SERVER_NAME};
    root ${APP_DIR}/build;
    index index.html;
    client_max_body_size 30m;   # purchase / quotation photos

    location /api/ {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    # Pages of the web app, e.g. /p/<SKU> opened by a QR tag.
    location / {
        try_files \$uri /index.html;
    }
}
EOF
if [ -d /etc/nginx/sites-enabled ]; then ln -sf "$SITE" /etc/nginx/sites-enabled/${SERVICE}; fi
nginx -t
systemctl reload nginx

say "7/8 Firewall / HTTPS"
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then ufw allow "${WEB_PORT}/tcp" >/dev/null; fi
if [ -n "$DOMAIN" ] && command -v certbot >/dev/null; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect \
    || echo "certbot could not get a certificate yet (is the DNS A record of $DOMAIN pointing here?). Run it again later."
elif [ -n "$DOMAIN" ]; then
  echo "certbot is not installed: the site is on http://$DOMAIN. For HTTPS: apt install certbot python3-certbot-nginx"
fi

say "8/8 Check"
sleep 6
code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${API_PORT}/api/auth/status" || true)"
echo "API on 127.0.0.1:${API_PORT}: HTTP ${code}"
[ "$code" = 200 ] || { echo "The API did not answer. See: journalctl -u ${SERVICE} -n 50"; exit 1; }
IP="$(curl -s -4 ifconfig.me || hostname -I | awk '{print $1}')"
if [ -n "$DOMAIN" ]; then URL="http://${DOMAIN}"; else URL="http://${IP}:${WEB_PORT}"; fi
echo
echo "Avori ERP is running:  ${URL}"
echo "Open it and create the Owner account (first screen)."
echo "Updates later:  ${APP_DIR}/deploy/update.sh"
