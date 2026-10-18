#!/bin/zsh
# Renders the brand PNGs and the brandbook PDF with headless Chrome. Run from brand/ after _src/build.py.
set -e
cd "$(dirname "$0")/.."
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROF="$(mktemp -d)"
shot() { # shot <html path> <png path> <WxH>
  "$CH" --headless=new --disable-gpu --hide-scrollbars --no-first-run --no-default-browser-check --user-data-dir="$PROF" \
    --force-device-scale-factor=1 --virtual-time-budget=3000 --window-size="$3" --screenshot="$2" "file://$PWD/$1" >/dev/null 2>&1
}
while read -r name size; do
  shot "_src/wrap/$name.html" "logo/$name.png" "${size},${size}"
done < _src/manifest.txt
for b in banner/*.html; do
  shot "$b" "${b%.html}.png" "1500,500"
done
"$CH" --headless=new --disable-gpu --no-first-run --user-data-dir="$PROF" --virtual-time-budget=6000 --no-pdf-header-footer \
  --print-to-pdf="$PWD/brandbook/Seed-brandbook.pdf" "file://$PWD/brandbook/index.html" >/dev/null 2>&1
rm -rf "$PROF"
echo rendered
