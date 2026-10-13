# Changelog

## 0.6.0

### Breaking-ish (css vars/selectors changed)

- CSS variables are now prefixed with `--bm-`: `--c` is now `--bm-c`, `--bg` is `--bm-bg`, `--tx` is `--bm-tx` and `--ui` is `--bm-ui`.
- The button rows are `<div class="bm-buttons">` instead of `<nav>`.
- Section toggles are styled from the checkbox state. The `checked` and `disabled` classes on `label` are gone

### Fixed

- Startup no longer forces a synchronous layout of the page. `--bm-height` is measured with a `ResizeObserver`, which also keeps it correct when the banner changes height. It could previously be stale with the `withcss` bundles. (fixes #5)
- The timezone is only looked up when `acceptNonEU` is on. The lookup was the slowest part of startup and ran on every load.
- `acceptNonEU` treats EU and EEA territory outside the `Europe/` timezones as European (the Azores, Madeira, the Canary Islands, Iceland, the Faroe Islands, Svalbard, Ceuta, Cyprus and the French overseas regions), as well as bare UTC offsets from `+00:00` to `+03:59`.
- - `acceptNonEU` only acts when the browser reports a timezone itself. IE 11, Firefox before 52 and Safari before 10 now always show the banner, and the legacy bundle no longer defines a partial global `Intl`.
- `acceptNonEU` no longer overrides a choice the visitor already made.
- Toggles showed as off when the settings were reopened after "Accept All".
- The section chevron was drawn smaller on sites with a global `box-sizing: border-box` reset.
- Prevent host site resets from overriding styles
- Accessibility: the banner is a labelled region, the dialog, its close button and every toggle have accessible names, and the close button shows a focus outline for keyboard users. The UI passes axe. A new `close` option sets the close button's label. (fixes #6)
- `data-type` on a gated script sets the type of the injected script, e.g. `module` (already supported, now documented).

### Changed

- The ESM build is now generated from the same source as the script build, and no longer experimental.
- The demo pages are now generated from one template.
- font stack is now `system-ui, 'Segoe UI', Roboto, sans-serif`.
- About the same size despite the additions: `biscuitman.withcss.min.js` is 10.9 kB (4.2 kB gzip, 3.5kB brotli).
- Added `exports` map to npm package: `biscuitman`, `biscuitman/withcss` and `biscuitman/css`.
- Release downloads contain only `dist`, `src`, the README and the license.
- tests: switched Jest for Playwright
- tests: added `axe` accessibility checks, and a BrowserStack smoke test covers the oldest supported browsers.
- Switched dev server from browser-sync to Vite.
- Building needs Node 22.18+ or 24.11+.
