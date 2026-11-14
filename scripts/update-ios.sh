#!/bin/sh
# Rebuilds Rally's screens and copies them into the iPhone project.
# Use this instead of `npx cap sync` (that command can hang on some Macs).
# Run from the rally folder:  sh scripts/update-ios.sh
set -e
cd "$(dirname "$0")/.."

rm -rf dist
npm run build:native > build.log 2>&1 &
BUILD_PID=$!

# The build prints its files first and sometimes never exits afterwards,
# so stop it as soon as the page has been written.
i=0
while kill -0 "$BUILD_PID" 2>/dev/null; do
  if [ -f dist/client/index.html ]; then
    sleep 5
    kill "$BUILD_PID" 2>/dev/null || true
    break
  fi
  i=$((i + 1))
  if [ "$i" -gt 900 ]; then
    echo "Build took too long. See build.log"; kill "$BUILD_PID" 2>/dev/null || true; exit 1
  fi
  sleep 1
done

if [ ! -f dist/client/index.html ]; then
  echo "Build failed. Last lines of build.log:"; tail -20 build.log; exit 1
fi

mkdir -p ios/App/App/public
rm -rf ios/App/App/public/*
cp -R dist/client/* ios/App/App/public/

cat > ios/App/App/capacitor.config.json <<'EOF'
{
  "appId": "com.trwng.rally",
  "appName": "Rally",
  "webDir": "public",
  "ios": { "contentInset": "never", "scrollEnabled": true },
  "plugins": { "CapacitorHttp": { "enabled": true } }
}
EOF

cat > ios/App/App/config.xml <<'EOF'
<?xml version='1.0' encoding='utf-8'?>
<widget version="1.0.0" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">
  <access origin="*" />
</widget>
EOF

echo "Done. In Xcode press Play (Command + R)."
