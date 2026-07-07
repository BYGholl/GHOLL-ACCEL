# Contributing

Thanks for helping improve GHOLL-ACCEL Ultimate.

## Development rules

- Keep the project dependency-free unless a dependency is clearly necessary.
- Do not add remote code execution, remote script loading, telemetry, tracking, or analytics.
- Keep all extension logic readable and reviewable.
- Run validation before creating a pull request:

```bash
node scripts/validate-extension.js
```

## Pull request checklist

- [ ] The extension loads with `Load unpacked`.
- [ ] YouTube normal video test passed.
- [ ] Pause/resume ramp test passed.
- [ ] Panic `1.0x` test passed.
- [ ] Popup buttons work after page refresh.
- [ ] No new console errors from extension code.
- [ ] README/CHANGELOG updated when behavior changes.

## Code style

- Plain JavaScript, HTML, and CSS.
- Prefer small helper functions over large repeated blocks.
- Keep user-facing text understandable.
- Comment critical playback/timer logic.
