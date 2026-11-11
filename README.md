# Taking Care project page

Static site for care.theskysanctum.com. No build step. Plain HTML, CSS, and one small script.

## What is in here

- `index.html`: the project page (hero, try-it demo, how it works, features, download)
- `checklist/index.html`: your existing checklist tool, with a slim "Taking Care" bar on top. The tool itself is unchanged.
- `privacy/index.html`: what the app and site do with data
- `download/Taking_Care.apk`: the Android app, version 1.0
- `assets/`: styles, self-hosted Lexend font, screenshots taken from the real app, demo script
- `CNAME`, `.nojekyll`, `404.html`, `robots.txt`, `sitemap.xml`

## Put it online (GitHub Pages)

1. Put everything in this folder at the root of the repo that already serves care.theskysanctum.com (or the `/docs` folder, if Pages is set to that).
2. In the repo, go to Settings, then Pages. Pick the branch and folder. Custom domain stays `care.theskysanctum.com` (the `CNAME` file already says so). Turn on "Enforce HTTPS" once it is available.
3. DNS: `care` should be a CNAME record pointing at `YOUR-GITHUB-USERNAME.github.io`. If that already works today, nothing changes.

## Updating the app

1. Replace `download/Taking_Care.apk`.
2. Update the SHA-256 shown in the Download section of `index.html`. Get it with `sha256sum download/Taking_Care.apk`.
3. Update the version and size text next to it.

Tip: if you would rather not keep big files in the repo history, attach the APK to a GitHub Release and point the Download button at the release file instead.

## Notes

- The app is signed with a debug key, so Android shows an "unknown app" warning. Signing with your own release key is the next step if you want to remove that. Publishing on Google Play would also need a release key.
- The checklist page still loads Tailwind and Google Fonts from their CDNs. The privacy page says so. Self-hosting them would let you drop that line.
- Screenshots use demo data and the name "Alex".
