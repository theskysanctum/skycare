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

- The app ID is `app.takingcare.guide`. It is the original ID, kept so new versions install over old ones and keep saved data. The visible name is SkyCare.
- Saved-data keys in the browser start with `taking_care_` for the same reason.
