#!/bin/sh
REPO=${1:-/home/claude/universal-safety-care-inventory}
N=$(( $(git -C "$REPO" rev-list --count HEAD) + 1 ))
V="1.0.$N"
APP=$(cd "$(dirname "$0")/.." && pwd)
printf "export const VERSION = '%s';\n" "$V" > "$APP/src/version.js"
sed -i "s/versionCode [0-9]*/versionCode $N/; s/versionName \"[^\"]*\"/versionName \"$V\"/" "$APP/android/app/build.gradle"
echo "$V"
