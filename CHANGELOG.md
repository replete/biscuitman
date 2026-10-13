# Changelog

## 0.6.0

### Breaking

- CSS variables are prefixed with `--bm-`: `--c` is now `--bm-c`, `--bg` is `--bm-bg`, `--tx` is `--bm-tx` and `--ui` is `--bm-ui`.
- The button rows are `<div class="bm-buttons">` instead of `<nav>`.
- Section toggles are styled from the checkbox state. The `checked` and `disabled` classes on `label` are gone, and the toggle sits outside `<summary>` as `<label><input><i></i></label>`.
- `acceptNonEU` only acts when the browser reports a timezone itself. IE 11, Firefox before 52 and Safari before 10 now always show the banner, and the legacy bundle no longer defines a partial global `Intl`.
- The font stack is `system-ui, 'Segoe UI', Roboto, sans-serif`.

### Added

- Accessibility: the banner is a labelled region, the dialog, its close button and every toggle have accessible names, and the close button shows a focus outline for keyboard users. The UI passes axe. A new `close` option sets the close button's label. (#6)
- A shield against the host site's CSS in current browsers: nothing is inherited from the page, and styles a site sets on bare elements no longer leak in.
- The ESM build is no longer experimental. It is generated from the same source as the script build.
- `data-type` on a gated script sets the type of the injected script, e.g. `module` (already supported, now documented).

### Fixed

- Startup no longer forces a synchronous layout of the page. `--bm-height` is measured with a `ResizeObserver`, which also keeps it correct when the banner changes height. It could previously be stale with the `withcss` bundles. (#5)
- The timezone is only looked up when `acceptNonEU` is on. The lookup was the slowest part of startup and ran on every load.
- `acceptNonEU` no longer overrides a choice the visitor already made.
- `acceptNonEU` treats EU and EEA territory outside the `Europe/` timezones as European (the Azores, Madeira, the Canary Islands, Iceland, the Faroe Islands, Svalbard, Ceuta, Cyprus and the French overseas regions), as well as bare UTC offsets from `+00:00` to `+03:59`.
- Toggles showed as off when the settings were reopened after "Accept All".
- The section chevron was drawn smaller on sites with a global `box-sizing: border-box` reset.

### Changed

- About the same size despite the additions: `biscuitman.withcss.min.js` is 10.9 kB (4.2 kB gzipped).
- The npm package has an `exports` map: `biscuitman`, `biscuitman/withcss` and `biscuitman/css`.
- Release downloads contain only `dist`, `src`, the README and the license.

### Development

- Tests moved from Jest to Playwright, with axe checks, and a BrowserStack smoke test covers the oldest supported browsers.
- The dev server is Vite. The demo pages are generated from one template.
- Building needs Node 22.18+ or 24.11+.
