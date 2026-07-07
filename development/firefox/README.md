# GHOLL-ACCEL Firefox Package

Version: **v1.0.0 Stable**

This folder is the development source for the Firefox build of GHOLL-ACCEL.

## Development install

Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, then select this folder's `manifest.json`.

## Release package

Do not zip this folder manually. From the repository root run:

```bash
python scripts/build_release.py
```

The packaged release is created under:

```text
releases/v1.0.0/GHOLL-ACCEL-firefox-v1.0.0.zip
```

Created by BY_Gholl. MIT licensed.
