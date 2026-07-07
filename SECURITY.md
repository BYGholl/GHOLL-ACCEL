# Security Policy

## Supported versions

Only the latest release is actively maintained.

## Reporting a vulnerability

Open a GitHub issue with the `security` label or contact the maintainer privately if the issue should not be public.

## Security principles

GHOLL-ACCEL Ultimate should not include:

- telemetry
- tracking
- remote script loading
- obfuscated code
- credential collection
- unnecessary permissions

Current extension permissions are intentionally small:

- `storage`
- `activeTab`
- YouTube host permissions for content-script injection
