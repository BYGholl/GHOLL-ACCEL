#!/usr/bin/env python3
"""Build and validate GHOLL-ACCEL browser release packages.

The repository separates development source from packaged releases:

- development/chrome
- development/firefox
- releases/vX.Y.Z

No third-party dependencies are required.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import zipfile
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = "1.0.0"
DEVELOPMENT = ROOT / "development"
RELEASE_DIR = ROOT / "releases" / f"v{VERSION}"

REQUIRED_ROOT_FILES = [
    "README.md",
    "README_TR.md",
    "LICENSE",
    "NOTICE",
    "AUTHORS.md",
    "OPEN_SOURCE_CERTIFICATE.md",
    "CHANGELOG.md",
]

REQUIRED_EXTENSION_FILES = [
    "manifest.json",
    "src/content.js",
    "src/content.css",
    "src/popup.html",
    "src/popup.css",
    "src/popup.js",
    "icons/icon16.png",
    "icons/icon32.png",
    "icons/icon48.png",
    "icons/icon128.png",
    "LICENSE",
    "NOTICE",
    "AUTHORS.md",
    "OPEN_SOURCE_CERTIFICATE.md",
]

@dataclass(frozen=True)
class Target:
    folder: str
    package_name: str
    requires_gecko: bool = False
    requires_chromium_min: bool = False

TARGETS = [
    Target("chrome", f"GHOLL-ACCEL-chromium-v{VERSION}.zip", requires_chromium_min=True),
    Target("firefox", f"GHOLL-ACCEL-firefox-v{VERSION}.zip", requires_gecko=True),
]


def fail(message: str) -> None:
    print(f"[FAIL] {message}")
    raise SystemExit(1)


def ok(message: str) -> None:
    print(f"[OK] {message}")


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Cannot parse JSON: {path} ({exc})")


def validate_manifest(target: Target, manifest: dict) -> None:
    if manifest.get("manifest_version") != 3:
        fail(f"{target.folder}: manifest_version must be 3")
    if manifest.get("version") != VERSION:
        fail(f"{target.folder}: manifest version must be {VERSION}")
    if not manifest.get("name"):
        fail(f"{target.folder}: name missing")
    if not manifest.get("description"):
        fail(f"{target.folder}: description missing")
    if "storage" not in manifest.get("permissions", []):
        fail(f"{target.folder}: storage permission missing")
    if not manifest.get("content_scripts"):
        fail(f"{target.folder}: content_scripts missing")
    if target.requires_gecko and "browser_specific_settings" not in manifest:
        fail("firefox: browser_specific_settings.gecko missing")
    if target.requires_chromium_min and "minimum_chrome_version" not in manifest:
        fail("chrome: minimum_chrome_version missing")


def validate_target(target: Target) -> None:
    base = DEVELOPMENT / target.folder
    if not base.exists():
        fail(f"Missing target folder: development/{target.folder}")

    for rel in REQUIRED_EXTENSION_FILES:
        if not (base / rel).exists():
            fail(f"development/{target.folder}: missing {rel}")

    manifest = load_json(base / "manifest.json")
    validate_manifest(target, manifest)

    action = manifest.get("action", {})
    popup = action.get("default_popup")
    if popup and not (base / popup).exists():
        fail(f"{target.folder}: popup referenced by manifest does not exist: {popup}")

    for icon_path in manifest.get("icons", {}).values():
        if not (base / icon_path).exists():
            fail(f"{target.folder}: icon referenced by manifest does not exist: {icon_path}")

    for script_def in manifest.get("content_scripts", []):
        for js in script_def.get("js", []):
            if not (base / js).exists():
                fail(f"{target.folder}: content JS missing: {js}")
        for css in script_def.get("css", []):
            if not (base / css).exists():
                fail(f"{target.folder}: content CSS missing: {css}")

    ok(f"development/{target.folder}: validation passed")


def validate_repo() -> None:
    for rel in REQUIRED_ROOT_FILES:
        if not (ROOT / rel).exists():
            fail(f"root: missing {rel}")
    for target in TARGETS:
        validate_target(target)
    ok("repository validation passed")


def zip_target(target: Target) -> Path:
    base = DEVELOPMENT / target.folder
    RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    out = RELEASE_DIR / target.package_name
    if out.exists():
        out.unlink()

    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for path in sorted(base.rglob("*")):
            if path.is_dir():
                continue
            if path.name in {".DS_Store", "Thumbs.db"}:
                continue
            zf.write(path, path.relative_to(base).as_posix())

    ok(f"created {out.relative_to(ROOT)}")
    return out


def write_checksums(paths: list[Path]) -> Path:
    out = RELEASE_DIR / "SHA256SUMS.txt"
    lines = []
    for path in paths:
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        lines.append(f"{digest}  {path.name}")
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    ok(f"created {out.relative_to(ROOT)}")
    return out


def build() -> None:
    validate_repo()
    if RELEASE_DIR.exists():
        for old in RELEASE_DIR.glob("*.zip"):
            old.unlink()
        sums = RELEASE_DIR / "SHA256SUMS.txt"
        if sums.exists():
            sums.unlink()
    created = [zip_target(target) for target in TARGETS]
    checksums = write_checksums(created)
    print("\nRelease packages:")
    for path in created + [checksums]:
        print(f"- {path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build GHOLL-ACCEL release packages")
    parser.add_argument("--validate-only", action="store_true", help="validate files without creating ZIP packages")
    args = parser.parse_args()

    if args.validate_only:
        validate_repo()
    else:
        build()


if __name__ == "__main__":
    main()
