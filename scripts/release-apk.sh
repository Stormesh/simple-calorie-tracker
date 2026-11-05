#!/usr/bin/env bash
#
# Build the signed release APK and attach it to a GitHub release.
#
#   pnpm run apk:release v1.0.0
#   pnpm run apk:release v1.0.0 --notes "Status bar icons are now white"
#   pnpm run apk:release v1.0.0 --notes-file release-notes/v1.0.0.md
#
# The install instructions are appended to whatever notes you give; without
# notes the release falls back to a one-line description plus those
# instructions. `RELEASE_NOTES` works too, for scripting.
#
# Everything is local: `gh` is the only network call. Nothing is pushed, so a
# broken build cannot publish a half-finished artifact. The tag is created
# server-side by `gh`, pointing at the remote default branch — push first, or
# the release will not match the code it was built from.
#
# Prerequisites (once per machine):
#   - android/keystore.properties + the .jks it points at (README → "Signing")
#   - JDK 21 (Gradle 8.14 rejects Java 25+)
#   - the Android SDK, via android/local.properties or $ANDROID_HOME
#   - an authenticated `gh` (`gh auth login`)

set -euo pipefail

usage() {
  cat >&2 <<'MSG'
usage: pnpm run apk:release <tag> [--notes <text> | --notes-file <path>]

  <tag>                 release tag, e.g. v1.0.0
  --notes <text>        release notes (markdown, inline)
  --notes-file <path>   release notes read from a file (markdown)
  RELEASE_NOTES         environment alternative to --notes

Install instructions are always appended to the notes.
MSG
}

TAG="${1:-}"
if [ -z "$TAG" ]; then
  usage
  exit 1
fi
shift

NOTES=""
NOTES_FILE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --notes)
      NOTES="${2:?--notes needs a value}"
      shift 2
      ;;
    --notes=*)
      NOTES="${1#*=}"
      shift
      ;;
    --notes-file)
      NOTES_FILE="${2:?--notes-file needs a path}"
      shift 2
      ;;
    --notes-file=*)
      NOTES_FILE="${1#*=}"
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [ -n "$NOTES_FILE" ]; then
  if [ ! -f "$NOTES_FILE" ]; then
    echo "Notes file not found: $NOTES_FILE" >&2
    exit 1
  fi
  NOTES="$(cat "$NOTES_FILE")"
fi

[ -n "$NOTES" ] || NOTES="${RELEASE_NOTES:-}"
[ -n "$NOTES" ] || NOTES="Android app (APK)."

# Fixed footer: every release is sideloaded, and the "unknown apps" prompt is
# the one thing every user trips over.
INSTALL_NOTES='Sideload it: enable "Install unknown apps" for your browser or file
manager, then open the file. Updating over a previous install keeps your data;
uninstalling first does not.'

NOTES="$NOTES

$INSTALL_NOTES"

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
if [ "v$VERSION" != "$TAG" ]; then
  echo "warning: tag $TAG does not match versionName $VERSION — bump versionName" >&2
  echo "         (and versionCode, which must always increase) for a real release." >&2
fi
( cd android && ./gradlew --console=plain assembleRelease )

APK="android/app/build/outputs/apk/release/app-release.apk"
[ -f "$APK" ] || { echo "Gradle did not produce $APK" >&2; exit 1; }

ASSET="MaxHP-$VERSION.apk"
cp "$APK" "$ASSET"

# --- publish ----------------------------------------------------------------

echo "--- release notes for $TAG ---"
echo "$NOTES"
echo "------------------------------"

if gh release view "$TAG" >/dev/null 2>&1; then
  # Re-release: replace the asset and refresh the notes, so a second run after
  # fixing a typo in the notes does what it looks like it does.
  gh release upload "$TAG" "$ASSET" --clobber
  gh release edit "$TAG" --title "MaxHP $VERSION" --notes "$NOTES"
  echo "Updated existing release $TAG (asset replaced, notes refreshed)."
else
  gh release create "$TAG" "$ASSET" --title "MaxHP $VERSION" --notes "$NOTES"
fi

rm -f "$ASSET"
echo "Released $ASSET on $TAG"
