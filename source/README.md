# SkyCare source

The Android app and web app, as one codebase. The website, the web build and the APK in the folder above are built from this.

- `src/app.js`: the whole app (screens, planner, moods, reminders, apps tab, locking files).
- `src/lockcore.js`: password locking (PBKDF2 and AES-256-GCM through Web Crypto).
- `src/book.json`: the book of skills.
- `www/`: the page, styles, images and icons. `www/app.js` is built, not kept in git.
- `android/`: the Capacitor Android project, including the custom `Apps` plugin (app list, launching, home-app check).
- `scripts/version.sh`: sets the version from the number of commits (1.0.N, where N is this commit's number) in `src/version.js` and `android/app/build.gradle`.
- `scripts/build-web.js`: builds the installable web app (with its offline service worker).

## Build the Android app

You need Node 20 or newer, a JDK 17 or newer, and the Android SDK.

```
cd source
npm ci
scripts/version.sh
npm run bundle
npx cap copy android
cd android && ./gradlew assembleDebug
```

The APK is in `android/app/build/outputs/apk/debug/`. Create `android/local.properties` with `sdk.dir=/path/to/Android/Sdk` if Gradle cannot find the SDK. The result is signed with a debug key, so a phone will show the "unknown app" prompt. For a release you would sign it with your own key, and keep that key somewhere safe and out of this repo.

## Build the web app

```
cd source
npm ci
scripts/version.sh
npm run bundle
node scripts/build-web.js ../app
```

## Notes

- The app ID is `app.skycare.app`.
- Saved-data keys in the browser start with `skycare_`.

## Dropbox sync

Optional. One locked file (`/skycare.sync`, PBKDF2 + AES-256-GCM, same lock format as backups) in the app's own Dropbox folder. Sign-in is OAuth with PKCE, so there is no secret in the app and no server.

Setup, once:

1. Create an app at https://www.dropbox.com/developers/apps: Scoped access, App folder.
2. Permissions tab: turn on `files.metadata.read`, `files.content.read`, `files.content.write`, then Submit.
3. Settings tab, Redirect URIs: add `skycare://dropbox` and `https://theskysanctum.com/skycare/app/`.
4. Put the App key in `src/dropbox.json` as `{"key": "..."}`. With an empty key the Dropbox card is hidden.
5. Rebuild the web app and the APK.

How it syncs: the app remembers the Dropbox revision and a hash of the data from the last sync. If only the phone changed it uploads, if only Dropbox changed it downloads, and if both changed it asks which copy to keep. It syncs on open, 15 seconds after a change, and from Settings > Sync now.
