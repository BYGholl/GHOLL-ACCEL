# GHOLL-ACCEL

![Open Source Attribution Certificate](docs/assets/open-source-certificate.svg)

**GHOLL-ACCEL** is an open-source YouTube speed ramp controller extension by **BY_Gholl** (`@byghollofficiall`).

This repository now starts from **v1.0.0 Stable**. Earlier internal builds used high prototype numbers, but the public project versioning starts cleanly at `v1.0.0`.

> This project is not affiliated with YouTube, Google, Chrome, Brave, Microsoft Edge, Mozilla Firefox, or Tampermonkey.

## Repository layout

```text
GHOLL_ACCEL_v1_0_0/
├─ development/
│  ├─ chrome/       # Development source for Chrome, Brave, Edge, Opera, Vivaldi
│  └─ firefox/      # Development source for Firefox
├─ releases/
│  └─ v1.0.0/       # Ready-to-upload packaged release ZIP files
├─ docs/
├─ scripts/
├─ LICENSE
├─ NOTICE
└─ OPEN_SOURCE_CERTIFICATE.md
```

## Development vs Release

- `development/` is for editing source code, testing with **Load unpacked**, and future development.
- `releases/` is for packaged ZIP builds that are ready for GitHub Releases, Chrome Web Store, or Firefox AMO review.

Do not edit files inside `releases/` manually. Edit `development/`, then run the build script.

## Stable release packages

Current stable version: **v1.0.0**

```text
releases/v1.0.0/GHOLL-ACCEL-chromium-v1.0.0.zip
releases/v1.0.0/GHOLL-ACCEL-firefox-v1.0.0.zip
releases/v1.0.0/SHA256SUMS.txt
```

Use the Chromium package for Chrome, Brave, Edge, Opera, Vivaldi, and Chromium-based browsers.

Use the Firefox package for Firefox.

## Main features

- Manifest V3 browser extension.
- YouTube speed ramp controller.
- Modern in-page control panel.
- Mini HUD.
- Presets.
- Pause-aware timer.
- Seek keeps speed/ramp.
- Loop keeps speed/ramp.
- Next video keeps speed/ramp.
- Export/import/reset settings.
- Panic 1.0x reset.
- Open-source MIT license with attribution to BY_Gholl.

## Build packages

```bash
python scripts/build_release.py
```

Validate only:

```bash
python scripts/build_release.py --validate-only
```

The script creates:

```text
releases/v1.0.0/GHOLL-ACCEL-chromium-v1.0.0.zip
releases/v1.0.0/GHOLL-ACCEL-firefox-v1.0.0.zip
releases/v1.0.0/SHA256SUMS.txt
```

## Install for development

### Chrome / Brave / Edge

1. Open `chrome://extensions` or `brave://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select `development/chrome`.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `development/firefox/manifest.json`.

## License

MIT License. Everyone can use, fork, modify, share, and study the project as long as the license and attribution remain.

Created by **BY_Gholl**.
