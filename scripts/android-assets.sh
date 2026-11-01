#!/usr/bin/env bash
#
# Regenerate the Android launcher icon and splash screens from public/favicon.png.
#
#   pnpm run apk:assets
#
# The Capacitor template ships its own branding (a white "Capacitor" mark on a
# white background). Everything below overwrites those files in place, so this
# script is the single source of truth: change public/favicon.png, re-run, and
# the whole set is consistent again.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/public/favicon.png"
RES="$ROOT/android/app/src/main/res"

# Must match `values/ic_launcher_background.xml` and the SplashScreen
# `backgroundColor` in capacitor.config.ts, so the icon, the splash and the
# app's first frame share one colour and nothing flashes white.
BG="#080808"

command -v magick >/dev/null || {
  echo "ImageMagick (magick) is required." >&2
  exit 1
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# --- launcher icon ----------------------------------------------------------
#
# Two icon families:
#  - adaptive (Android 8+): a 108dp transparent foreground over a solid
#    background colour. The launcher masks it, and only the central 66dp is
#    guaranteed to survive — so the heart is drawn at 60/108 of the canvas.
#  - legacy: a flat bitmap for old launchers, already shaped (rounded square and
#    circle), because there is no mask to apply.

declare -A LEGACY=([mdpi]=48 [hdpi]=72 [xhdpi]=96 [xxhdpi]=144 [xxxhdpi]=192)
declare -A ADAPTIVE=([mdpi]=108 [hdpi]=162 [xhdpi]=216 [xxhdpi]=324 [xxxhdpi]=432)

for density in "${!LEGACY[@]}"; do
  legacy="${LEGACY[$density]}"
  canvas="${ADAPTIVE[$density]}"
  dir="$RES/mipmap-$density"

  # Adaptive foreground: transparent canvas, heart inside the safe zone.
  heart=$((canvas * 60 / 108))
  magick "$SRC" -filter Lanczos -resize "${heart}x${heart}" \
    -background none -gravity center -extent "${canvas}x${canvas}" \
    "$dir/ic_launcher_foreground.png"

  # Legacy square + circle: brand background, heart centred, corners cut by a
  # mask because Android 7 launchers draw the bitmap as-is.
  inner=$((legacy * 3 / 4))
  magick "$SRC" -filter Lanczos -resize "${inner}x${inner}" \
    -background none -gravity center -extent "${legacy}x${legacy}" "$TMP/heart.png"
  magick -size "${legacy}x${legacy}" "xc:$BG" "$TMP/heart.png" -composite "$TMP/base.png"

  radius=$((legacy / 5))
  magick -size "${legacy}x${legacy}" xc:black -fill white \
    -draw "roundrectangle 0,0,$((legacy - 1)),$((legacy - 1)),$radius,$radius" "$TMP/square-mask.png"
  magick "$TMP/base.png" "$TMP/square-mask.png" -alpha off -compose CopyOpacity -composite \
    "$dir/ic_launcher.png"

  magick -size "${legacy}x${legacy}" xc:black -fill white \
    -draw "circle $((legacy / 2)),$((legacy / 2)),$((legacy / 2)),0" "$TMP/circle-mask.png"
  magick "$TMP/base.png" "$TMP/circle-mask.png" -alpha off -compose CopyOpacity -composite \
    "$dir/ic_launcher_round.png"
done

# --- splash screen ----------------------------------------------------------
#
# A dark field with the heart in the middle. Capacitor scales it CENTER_CROP, so
# each landscape/portrait bucket gets the exact pixel size the launcher-style
# drawable would otherwise have been generated at.

splash() {
  local file="$1" w="$2" h="$3"
  local short=$((w < h ? w : h))
  local heart=$((short * 22 / 100))
  magick "$SRC" -filter Lanczos -resize "${heart}x${heart}" "$TMP/splash-heart.png"
  magick -size "${w}x${h}" "xc:$BG" "$TMP/splash-heart.png" -gravity center -composite "$file"
}

splash "$RES/drawable/splash.png" 480 320

splash "$RES/drawable-port-mdpi/splash.png" 320 480
splash "$RES/drawable-port-hdpi/splash.png" 480 800
splash "$RES/drawable-port-xhdpi/splash.png" 720 1280
splash "$RES/drawable-port-xxhdpi/splash.png" 960 1600
splash "$RES/drawable-port-xxxhdpi/splash.png" 1280 1920

splash "$RES/drawable-land-mdpi/splash.png" 480 320
splash "$RES/drawable-land-hdpi/splash.png" 800 480
splash "$RES/drawable-land-xhdpi/splash.png" 1280 720
splash "$RES/drawable-land-xxhdpi/splash.png" 1600 960
splash "$RES/drawable-land-xxxhdpi/splash.png" 1920 1280

echo "Android icon + splash regenerated from public/favicon.png"
