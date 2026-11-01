#!/usr/bin/env bash
#
# Build the signed release APK and attach it to a GitHub release.
#
#   pnpm run apk:release v1.0.0
#
# Everything is local: `gh` is the only network call. Nothing is pushed, so a
# broken build cannot publish a half-finished artifact.
#
# Prerequisites (once per machine):
#   - android/keystore.properties + the .jks it points at (README → "Signing")
#   - JDK 21 (Gradle 8.14 rejects Java 25+)
#   - the Android SDK, via android/local.properties or $ANDROID_HOME

set -euo pipefail

TAG="${1:-}"
if [ -z "$TAG" ]; then
  echo "usage: pnpm run apk:release <tag>   (e.g. pnpm run apk:release v1.0.0)" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# --- checks -----------------------------------------------------------------

if [ ! -f android/keystore.properties ]; then
  cat >&2 <<'MSG'
android/keystore.properties is missing, so the release APK would be unsigned.
Create it (it and the .jks are gitignored; back both up somewhere safe):

  keytool -genkeypair -v -keystore android/app/maxhp-release.jks \
    -alias maxhp -keyalg RSA -keysize 2048 -validity 10000

  cat > android/keystore.properties <<EOF
  storeFile=maxhp-release.jks
  storePassword=…
  keyAlias=maxhp
  keyPassword=…
  EOF
MSG
  exit 1
fi

if [ ! -f android/local.properties ] && [ -z "${ANDROID_HOME:-}" ]; then
  echo "No Android SDK: set ANDROID_HOME or create android/local.properties with sdk.dir=…" >&2
  exit 1
fi

command -v gh >/dev/null || {
  echo "gh (GitHub CLI) is required to publish the release." >&2
  exit 1
}

# Gradle 8.14.3 ships with the Capacitor template and rejects Java 25+ bytecode.
JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk}"
export JAVA_HOME
if [ -x "$JAVA_HOME/bin/java" ]; then
  java_major="$("$JAVA_HOME/bin/java" -version 2>&1 | sed -n 's/.*version "\([0-9]*\).*/\1/p')"
  if [ "${java_major:-0}" -gt 21 ]; then
    echo "JAVA_HOME points at Java $java_major; Gradle 8.14 needs 21." >&2
    exit 1
  fi
fi

# --- build ------------------------------------------------------------------

# Always regenerate: the APK embeds `.output/public`, so a stale generate would
# ship the previous client with a new version number.
pnpm run cap:sync

VERSION="$(sed -n 's/^ *versionName "\(.*\)"/\1/p' android/app/build.gradle)"
( cd android && ./gradlew --console=plain assembleRelease )

APK="android/app/build/outputs/apk/release/app-release.apk"
[ -f "$APK" ] || { echo "Gradle did not produce $APK" >&2; exit 1; }

ASSET="MaxHP-$VERSION.apk"
cp "$APK" "$ASSET"

# --- publish ----------------------------------------------------------------

if gh release view "$TAG" >/dev/null 2>&1; then
  gh release upload "$TAG" "$ASSET" --clobber
else
  gh release create "$TAG" "$ASSET" \
    --title "MaxHP $VERSION" \
    --notes "Android app (APK). Sideload it: enable \"Install unknown apps\" for your
browser or file manager, then open the file. Updating over a previous install
keeps your data; uninstalling first does not."
fi

rm -f "$ASSET"
echo "Released $ASSET on $TAG"
