# biscuitman.js 🍪 Lightweight Consent Manager

[![tests](https://github.com/replete/biscuitman/actions/workflows/node.js.yml/badge.svg)](https://github.com/replete/biscuitman/actions/workflows/node.js.yml) [![BrowserStack status](https://automate.browserstack.com/badge.svg?badge_key=QmsxRjJMaGZ2dk9zNS9Mcm40dzBlaHU3TG9Xa0thS0ZYKzhiM2t6YXBJVT0tLWgvSWZyRFNMbDVVYzFnZjdSUEhubWc9PQ==--aa5279df24a33d520da213e3b13e3d256d90478f)](https://automate.browserstack.com/public-build/QmsxRjJMaGZ2dk9zNS9Mcm40dzBlaHU3TG9Xa0thS0ZYKzhiM2t6YXBJVT0tLWgvSWZyRFNMbDVVYzFnZjdSUEhubWc9PQ==--aa5279df24a33d520da213e3b13e3d256d90478f) (Legacy [![BrowserStack status](https://automate.browserstack.com/badge.svg?badge_key=NXh6bEVSMFo0WEdKNytRbjM3UU1ISHFrZGVTNDJyZmpTVW1adkwzeVc1az0tLVBYaGdYa2JDblMzVW5EZGZqZC9zOEE9PQ==--a10fddff63f0f52e50c6c8cc92dbf40e467dcac7)](https://automate.browserstack.com/public-build/NXh6bEVSMFo0WEdKNytRbjM3UU1ISHFrZGVTNDJyZmpTVW1adkwzeVc1az0tLVBYaGdYa2JDblMzVW5EZGZqZC9zOEE9PQ==--a10fddff63f0f52e50c6c8cc92dbf40e467dcac7))

Biscuitman is a super lightweight, customizable consent manager for your website. Weighing in around 3-4kB compressed, it's designed to be fast-loading and easy to implement with a flat configuration object.

![screenshot of main UI](media/ui.webp)

#### [View demo](https://replete.github.io/biscuitman)

## Features

- Tiny: about 4kB gzipped including styles, with no dependencies
- Holds back `<script>` tags until the visitor consents to their section, then injects them
- Consent is granular, by sections you define (e.g. essential, analytics, advertisement)
- Optionally lists each section's cookies, and removes them when consent is rejected or withdrawn
- Consent is stored in `localStorage` and exposed on `window.Consent`, as classes on `<html>`, and through events
- Every string is configurable, so you can localize it
- Themable with CSS variables, mobile-first, and shielded from your site's own CSS in current browsers
- Accessible: labelled landmarks and controls, keyboard operable, checked with [axe](https://github.com/dequelabs/axe-core)
- Also packaged as an [ES module](#esm-version), and as a [legacy build](#legacy-browser-support) for 2013-era browsers

## Install

```sh
npm install biscuitman
```

Or load it from a CDN (pin a version in production):

```html
<script src="https://cdn.jsdelivr.net/npm/biscuitman/dist/biscuitman.withcss.min.js"></script>
```

Or download the files in `dist/` from a [release](https://github.com/replete/biscuitman/releases). The `withcss` files include the styles; the others need `biscuitman.css` as well.

## Quick start

```html
<!-- 1. Mark the scripts that need consent -->
<script type="text/plain" data-consent="analytics" async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>

<!-- 2. Configure, before biscuitman loads -->
<script>
	biscuitman = {
		message: 'We use cookies to understand how this site is used. {link}',
		linkText: 'Privacy Policy',
		linkURL: '/privacy-policy',
		sections: ['essential', 'analytics'],
		essentialTitle: 'Essential',
		essentialMessage: 'Required for the site to work',
		analyticsTitle: 'Analytics',
		analyticsMessage: 'Help us understand how visitors use the site',
		analyticsCookies: {
			_ga: 'Google Analytics visitor ID',
			'_ga_*': 'Google Analytics session state'
		}
	}
</script>

<!-- 3. Load biscuitman -->
<script src="biscuitman.withcss.min.js"></script>
```

The [demo](https://replete.github.io/biscuitman) runs a fuller setup with real analytics scripts (using dummy IDs). View its source for a complete configuration.

## Configuration

### Scripts

Give a script `type="text/plain"` so the browser ignores it, and `data-consent` with a section name. Biscuitman injects a working copy once that section is consented.

```html
<script type="text/plain" data-consent="analytics" id="js-analytics-misc">
	console.log('Runs as soon as analytics consent is granted')
</script>

<script type="text/plain" data-consent="analytics" async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX">
	// A script with both src and content: the content runs after the file has loaded
	console.log('GTM loaded:', !!google_tag_manager)
</script>
```

Scripts are injected as `text/javascript`. Add `data-type="module"` to inject one as a module.

### Sections

A section is one group of consent choices. List the names in `sections`, without spaces or special characters, and describe each with three options named after it:

- `{section}Title` – its heading
- `{section}Message` – its description
- `{section}Cookies` – optional: an object of cookie or `localStorage` names and what each is for

`essential` is special: it needs no consent, and its toggle is switched on and disabled. List it first.

Names listed in `{section}Cookies` are shown to the visitor, and deleted when that section's consent is rejected or withdrawn. A name can end in `*` to match a prefix, e.g. `_ga_*`.

### Options

| Option           | Default                                  | Description                                                                   |
| ---------------- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| `sections`       | `['essential']`                          | Section names, see [Sections](#sections)                                      |
| `title`          | `'Your privacy matters'`                 | Banner title                                                                  |
| `message`        | `'We use cookies'`                       | Banner message                                                                |
| `linkText`       |                                          | Text of the link that replaces `{link}` in any string                         |
| `linkURL`        |                                          | Where that link goes                                                          |
| `info`           | `''`                                     | Longer text at the top of the settings modal, one paragraph per line          |
| `enableMore`     | `true`                                   | Hide all but the first line of `info` behind a "show more" link               |
| `accept`         | `'Accept All'`                           | Accept button text                                                            |
| `reject`         | `'Reject All'`                           | Reject button text                                                            |
| `settings`       | `'Settings'`                             | Settings button text                                                          |
| `settingsTitle`  | `'My Consent Settings'`                  | Settings modal title                                                          |
| `save`           | `'Save My Settings'`                     | Save button text, in the modal                                                |
| `close`          | `'Close'`                                | Accessible name of the modal's close button                                   |
| `more`           | `'Show more'`                            | "Show more" link text                                                         |
| `noCookies`      | `'No cookies to display'`                | Shown in an expanded section that lists no cookies                            |
| `force`          | `false`                                  | Open the settings modal straight away and keep it open until a choice is made |
| `key`            | `'myconsent'`                            | `localStorage` key the choices are stored under                               |
| `global`         | `'Consent'`                              | Name of the global object the choices are exposed on                          |
| `dialogPolyfill` | `'/dist/dialog-polyfill.withcss.min.js'` | URL of the [dialog polyfill](#dialog-polyfill), or `false` to never load it   |
| `acceptNonEU`    | `false`                                  | Experimental, see below                                                       |

### `acceptNonEU` (experimental)

When this is on, a first-time visitor whose browser reports a timezone outside Europe is given full consent automatically and never sees the banner. It exists for sites that want as much analytics data as they can collect where a consent prompt is not required.

- "Europe" means any `Europe/…` timezone, EU and EEA territory elsewhere (the Azores, Madeira, the Canary Islands, Iceland, the Faroe Islands, Svalbard, Ceuta, Cyprus and the French overseas regions), and timezones that name no place at UTC to UTC+3, such as `UTC` or `CET`.
- A visitor who has already made a choice keeps it.
- Browsers that cannot report a timezone (IE 11, Firefox before 52, Safari before 10) always get the banner.

This is a guess from the device's clock, not a check of where someone is or which laws apply to them. Other places have consent rules too. Biscuitman is a tool, not legal advice: whether a setup meets your obligations is for you to decide.

## ESM version

The same code packaged as an ES module, for bundlers and `<script type="module">`. ([ESM demo](https://replete.github.io/biscuitman/index-esm.html))

With a bundler, the package exposes:

- `biscuitman` – the ESM version, without styles
- `biscuitman/withcss` – the ESM version, which injects its own styles
- `biscuitman/css` – the stylesheet

```html
<script type="module" id="biscuitman-init">
	import biscuitman from './dist/esm/biscuitman.withcss.mjs'
	let bm = biscuitman.create({ /* ...options */ })
		// optional event callbacks
        .on('save', (data) => {
			console.log('ESM version: consents were saved', data.data)
		})
		.on('revoke', (data) => {
			if (data.section === 'analytics') console.log('ESM version: analytics was revoked')
		})
</script>
```

`biscuitman.create(options)` returns a single instance; calling it again returns the same one. Its methods are listed under [ESM instance](#esm-instance).

## Theme CSS

It's easy enough to theme the included styles by overriding CSS variables. They are shortened but straightforward:

```css
/* hacker mode */
.biscuitman {
	--bm-c: limegreen;
	--bm-bg: #000;
	--bm-tx: #fff;
	--bm-ui: 255, 255, 255;
	font-family: monospace;
}
/* Dark mode */
@media (prefers-color-scheme: dark) {
	.biscuitman {
		--bm-c: #1586c6;
		--bm-bg: #000;
		--bm-tx: #fff;
		--bm-ui: 255, 255, 255;
	}
}
```

The banner height is applied as a px value to the `var(--bm-height)` css variable on html so that you can add an offset style when it is visible to make sure no content is obscured by the banner. This is an `min-height` based example, but you might implement something else based on margin/padding depending on your site.

```css
html.bm-show::after {
	content: '';
	min-height: var(--bm-height);
	/* min-height: calc(var(--bm-height) + 20px) */
	display: block;
}
```

The value is kept current as the banner changes height (for example when its text re-wraps), and is `0px` while the banner is hidden.

If you offset a fixed element by the banner height, prefer a transform over `bottom`, because moving an element with a transform does not count as a layout shift:

```css
.my-fixed-bar {
	transform: translateY(calc(-1 * var(--bm-height)));
}
```

## Browser Support

Biscuitman is written in modern Javascript and compiled with `swc`. The included distributables are tested to support the following browsers:

- Chrome/Edge/Opera: 85+ (released June 2020)
- Firefox: 98+ (released March 2022)
- Safari (inc iOS): 15.4+ (released March 2022)
- Samsung Internet: 14+ (released April 2021)

### Dialog polyfill

To support older than the browsers above, a polyfill for `<dialog>` is required. Biscuitman checks for this automatically and loads a [polyfill for dialog](https://github.com/GoogleChrome/dialog-polyfill) on-demand (if it is not already loaded), and then correctly binds the UI.

For this to work, you must host `dist/dialog-polyfill.withcss.js` and set the config property `dialogPolyfill` to the correct URL.

This will extend the browser support to:

- Safari (inc iOS) 13.1+ (released March 2020)
- Firefox 77+ (released June 2020)
- Firefox Android 79+ (released August 2020)

If the dialog polyfill is already loaded (`window.dialogPolyfill` exists), the polyfill will not be loaded again. To disable this on-demand functionality altogether, set `dialogPolyfill` property to `false`.

### Legacy Browser Support

If you need to support really old browsers (you poor sod), use `biscuitman-legacy.js`, `biscuitman-legacy.min.js` or `biscuitman-legacy.withcss.js` ([legacy demo](https://replete.github.io/biscuitman/index-legacy.html)) to extend the browser support to:

- Safari 7+ / 6.2+ (released Oct 2013)
- Chrome 24+ (released Jan 2013)
- Firefox 24+ (released Sep 2013)
- IE 11+ (released Oct 2013)

This legacy version is transpiled to ES5 and includes required polyfills to make itself functional on these ancient browsers. This makes the distributables roughly double the filesize of the modern versions.

In these extremely old browsers, the functionality is intact and the UI is usable but it may look slightly janky as the browser is missing CSS features like `gap` resulting in missing gaps between buttons.

## API

### Globals

- `biscuitman` – configuration object, must be `window.biscuitman`
    - `biscuitman.create(options)` for the ESM version
- `Consent` – object for accessing consents (override: `global` in config)

    ```
    {
    	"consentTime": 1717846660979,
    	"functional": false,
    	"analytics": false,
    	"performance": false,
    	"advertisement": false,
    	"uncategorized": false
    }
    ```

    - example usage: `if (Consent.analytics) { doAnalyticsThing() }`

- `bmInvalidate()` – Delete stored consent data and reinstate UI (you might use this in your app code)
- `bmUpdate()` – Opens My Consent Settings modal (you might want to link this on your Privacy policy or footer nav)
    - example usage: `<a href="javascript:bmUpdate();"> Update my consent settings</a>`

### ESM instance

Returned by `biscuitman.create(options)`:

- `on(event, callback)` / `off(event, callback)` – listen for the [events](#events) below, without the `bm:` prefix
- `consent(sectionName)` – `true` if that section is consented
- `update()` – open the settings modal
- `invalidate()` – delete stored consent and show the banner again

### CSS classes

- `biscuitman` on UI container
- `bm-{sectionName}`, `bm-no-{sectionName}`, `bm-show` and sometimes `bm-dialog-polyfill` on `<html>`
- `--bm-height` CSS variable written to `<html style="--bm-height:0px;">`

### Events

Custom events prefixed with `bm:` are fired on `document`. The easiest way to see how events work is to view the `console.debug()` calls in the [demo](https://replete.github.io/biscuitman).

- `bm:open` => `{time: 1718915128298}` modal opened
- `bm:close` => `{time: 1718915128298}` modal closed
- `bm:button` => `{id: "settings", time: 1718915128298}` button clicked
- `bm:save` => `{data: {consentTime: 1718914784624, analytics: true, advertisement: fal..}, time: 1718914784624}` consent choice saved
- `bm:inject` => `{el: $Element, parent?: $Element, id?: 'script-id', time: 1718914784624}` script injected to DOM. if parent exists, it's a new tag inserted after a `src` script loaded which also had text content (a 'dependent' script = tidier convenient markup)
- `bm:invalidate` => `{data: {...consentObjectJustDeleted}, time: 1718915128298}` consent invalidated
- `bm:revoke` => `{section: 'analytics', time: 1718914784624}` returns section that was revoked if updated consent changed from true to false
- `bm:update` => `{data: {...currentConsentObject}, time: 1718914784624}` returns current consent object and time
- `bm:delete` => `{localStorage|cookie: 'cookieName', time: 1718914784624}` fires when consent is rejected or invalidated and cookies/localStorage entries are deleted

You can watch for these events like this:

```js
document.addEventListener('bm:save', ({ detail }) => {
	let { data, time } = detail
	console.log(data)
})
```

## Development

`npm run dev` builds the project and starts a [Vite](https://vite.dev) development server on `https://localhost:3000`, rebuilding and reloading when anything in `src/` changes.

We need `https://` to be able to delete Secure cookies.

### Fix NET::ERR_CERT_AUTHORITY_INVALID error

To prevent invalid certificate warnings, you can generate a local SSL key with `mkcert`:

- Install `mkcert` ([Installation instructions](https://github.com/FiloSottile/mkcert#installation)) and then run:
- run `npm run makecerts`, to generate `server.crt` and `server.key` for the dev server (without them it falls back to `http://`)
- if you're using another solution for local SSL certs, generate `server.crt` and `server.key` manually and place them in the root

Visiting `https://localhost:3000` should now work without warnings.

### Building

`npm run build` - creates project distributes via `run.js`, a custom build script requiring Node 22.18+ or 24.11+

The build also writes the three demo pages (`index.html`, `index-esm.html`, `index-legacy.html`) from one template, `src/demo.html`. Edit the template, not the pages.

### Releasing

1. On the release branch, set `version` in `package.json`, add a section for it to `CHANGELOG.md`, run `npm run build` and commit.
2. Merge the branch into `main`.
3. On `main`, run `npm run release`. It checks the commit is releasable, then tags it and pushes the tag. `npm run release -- --dry-run` only runs the checks.

The tag starts the Release workflow, which publishes to npm and creates the GitHub release from the changelog section.

### Tests

[Playwright](https://playwright.dev) runs the end-to-end tests against every bundle in `dist/`, in a real Chromium. Each test gets its own isolated browser context, so they all run in parallel. The test page and the `dist/` assets are served from memory and disk by Playwright's request interception, so no dev server or port is needed.

Install the browser once after cloning:

`npx playwright install chromium`

Then:

`npm run test` - runs the full suite against all 12 bundle variants (CI runs `biscuitman.js` only)

`npm run test:ui` - opens Playwright's interactive UI mode for debugging

`npm run test:report` - opens the HTML report from the last run

#### Real browsers

A smaller smoke test runs on [BrowserStack](https://www.browserstack.com) in the oldest browsers listed under [Browser Support](#browser-support), and saves screenshots to `__tests__/reports/browserstack/`. It needs a BrowserStack account, with `BROWSERSTACK_USERNAME` and `BROWSERSTACK_ACCESS_KEY` set in the environment or a `.env` file.

`npm run test:browserstack` - modern bundle

`npm run test:browserstack:legacy` - legacy bundle

`npm run test:browserstack -- --local` - same checks in local Chrome, no account needed

## Support development

<a href="https://www.buymeacoffee.com/replete"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=replete&button_colour=BD5FFF&font_colour=ffffff&font_family=Poppins&outline_colour=000000&coffee_colour=FFDD00" /></a>
