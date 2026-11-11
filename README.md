# SkyCare

A self-care teaching app and planner. Android app and installable web app, plus the website at https://theskysanctum.com/skycare.

- Website: https://theskysanctum.com/skycare/
- Web app: https://theskysanctum.com/skycare/app/
- Personal inventory: https://theskysanctum.com/skycare/inventory/
- Android download: https://theskysanctum.com/skycare/download/SkyCare.apk

## What is in here

- `index.html`, `privacy/`, `404.html`: the project page and privacy page.
- `inventory/index.html`: the personal inventory. Tap green, yellow, or red for each skill, save the list, then import it into the app.
- `download/SkyCare.apk`: the Android app (debug-signed).
- `app/`: the web app (an installable PWA), built from `source/`.
- `source/`: the app code for Android and web. See `source/README.md` for build steps.
- `assets/`: styles, the Lexend font, screenshots, the demo video, `lockcore.js`.
- `.nojekyll`, `robots.txt`, `sitemap.xml`.

## Put it online (GitHub Pages)

The site is static and has no build step. It is a project page, so it is served at `https://theskysanctum.com/skycare/` once `theskysanctum.com` is set up on the `theskysanctum.github.io` repo. There is no `CNAME` file here, and the repo has no custom domain of its own. All links inside the site and the web app are relative, so it also works under any other path.

## Updating the app

1. Build the APK and replace `download/SkyCare.apk` (see `source/README.md`).
2. Update the SHA-256 and the version text in the Download section of `index.html`. Get the hash with `sha256sum download/SkyCare.apk`.
3. Rebuild the web app: `node source/scripts/build-web.js app` from `source/`, with the output folder set to this repo's `app/`. Commit `app/`.

The version is `1.0.N`, where N is the commit count plus one (`source/scripts/version.sh`).

## Notes

- The app is signed with a debug key, so Android shows an "unknown app" warning. Signing with your own release key would remove it, and Google Play needs one.
- The app ID is `app.skycare.app`. It installs beside the older Taking Care app, so use Export all my data in the old app, then Restore in SkyCare.
- The inventory page still loads Tailwind and Google Fonts from their CDNs. The privacy page says so.
- Screenshots use demo data and the name "Alex". Save new ones as WebP at 780 by 1600.
- `assets/video/` has a short silent screen recording of the app. Re-record it when the screens change a lot.

## Locked files

Reports, backups, and profile files can be locked with a password (Web Crypto: PBKDF2-SHA256, 600,000 rounds, then AES-256-GCM). The code is `source/src/lockcore.js`. The inventory page uses a build of it at `assets/lockcore.js`:

```
npx esbuild source/src/lockcore.js --bundle --format=iife --global-name=TCLockCore --minify --outfile=assets/lockcore.js
```

A locked file is plain text with a short note and a block between `-----BEGIN SKYCARE-----` and `-----END SKYCARE-----`. Older `TAKING CARE` blocks can still be read.
