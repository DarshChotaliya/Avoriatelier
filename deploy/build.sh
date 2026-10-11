#!/usr/bin/env bash
# Builds the web app (build/) and the API (publish/) inside the checkout. Used by setup.sh and update.sh.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
export DOTNET_ROOT=/opt/dotnet8 DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1
cd "$APP_DIR"

echo "-- web app"
npm ci --no-audit --no-fund
# No source maps: smaller build, and the React build needs less memory on a small VPS.
GENERATE_SOURCEMAP=false CI=false npm run build

echo "-- API"
/opt/dotnet8/dotnet publish api/Purchase.Api.csproj -c Release -o "$APP_DIR/publish.new" --nologo
# Swap in the new build only when it compiled, so a failed build leaves the running one alone.
rm -rf "$APP_DIR/publish.old"
if [ -d "$APP_DIR/publish" ]; then mv "$APP_DIR/publish" "$APP_DIR/publish.old"; fi
mv "$APP_DIR/publish.new" "$APP_DIR/publish"
rm -rf "$APP_DIR/publish.old"
