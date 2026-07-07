# GHOLL-ACCEL Chromium Package

Version: **v1.0.0 Stable**

This folder is the development source for the Chromium build of GHOLL-ACCEL.

## Development install

Open `chrome://extensions` or `brave://extensions`, enable Developer mode, then load this folder with **Load unpacked**.

## Release package

Do not zip this folder manually. From the repository root run:

```bash
python scripts/build_release.py
```

The packaged release is created under:

```text
releases/v1.0.0/GHOLL-ACCEL-chromium-v1.0.0.zip
```

Created by BY_Gholl. MIT licensed.
