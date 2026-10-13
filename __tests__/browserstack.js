/*
	Smoke test on real browsers via BrowserStack Automate

	The Playwright suite covers behaviour in depth but only in Chromium. This
	checks the basics, and takes screenshots, in browsers Playwright cannot drive.
	Each run writes one page of screenshots to browserstack-results/browserstack-<run>.html

	npm run test:browserstack                  modern bundle, in the browsers below
	npm run test:browserstack:legacy           legacy bundle, in the legacy browsers below
	npm run test:browserstack -- safari ios    only browsers whose name matches
	npm run test:browserstack -- --local       local Chrome, no BrowserStack (to debug the checks)

	The two runs report to separate BrowserStack projects. The README badges show the ones CI
	reports to from main; local and branch runs go to -dev projects so they cannot change a badge

	Needs BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY, from the environment or a .env file
*/
import http from 'node:http'
import { readFile, mkdir, writeFile, appendFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Builder, By } from 'selenium-webdriver'
import browserstack from 'browserstack-local'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT = path.join(ROOT, 'browserstack-results')
const PARALLEL = 5 // sessions the BrowserStack plan allows at once
const TIMEOUT = 20000
const LEGACY = 'biscuitman-legacy.withcss.min.js'
const MODERN = 'biscuitman.withcss.min.js'
const SHOTS = ['banner', 'modal', 'saved']

// Mirrors "Browser Support" in README.md: the oldest version of each browser it lists,
// or the nearest one BrowserStack offers. Not offered: Opera 71+, Firefox for Android
const windows = (name, browserName, browserVersion, osVersion, bundle) => ({ name, browserName, browserVersion, os: 'Windows', osVersion, bundle })
const mac = (name, browserVersion, osVersion, bundle) => ({ name, browserName: 'Safari', browserVersion, os: 'OS X', osVersion, bundle })
const device = (name, browserName, deviceName, osVersion, bundle) => ({ name, browserName, deviceName, osVersion, bundle })

const browsers = [
	// Modern bundle with native <dialog>
	windows('chrome85', 'Chrome', '85.0', '10', MODERN),
	windows('edge85', 'Edge', '85.0', '10', MODERN),
	windows('firefox98', 'Firefox', '98.0', '10', MODERN),
	mac('safari15', '15.6', 'Monterey', MODERN),
	device('ios15', 'safari', 'iPhone 13', '15', MODERN),
	device('samsung', 'samsung', 'Samsung Galaxy S20', '10.0', MODERN),
	// Modern bundle with the dialog polyfill
	mac('safari13', '13.1', 'Catalina', MODERN),
	windows('firefox77', 'Firefox', '77.0', '10', MODERN),
	device('ios14', 'safari', 'iPhone 12', '14', MODERN), // the only iOS 13 offered is 13.3 (Safari 13.0), below the supported 13.1
	// Legacy bundle
	mac('safari7', '7.1', 'Mavericks', LEGACY),
	mac('safari6', '6.2', 'Mountain Lion', LEGACY),
	windows('chrome30', 'Chrome', '30.0', '7', LEGACY),
	windows('chrome24', 'Chrome', '24.0', '7', LEGACY),
	windows('firefox24', 'Firefox', '24.0', '7', LEGACY),
	windows('ie11', 'IE', '11.0', '10', LEGACY),
	// Current engines that Playwright does not run here
	mac('safari-latest', 'latest', 'Sequoia', MODERN),
	windows('firefox-latest', 'Firefox', 'latest', '11', MODERN)
]

const config = {
	message: 'By clicking "Accept All", you agree to the use of cookies. {link}',
	info: 'Cookies categorized as "Essential" are stored in your browser.\nYou can enable or disable the others.',
	linkText: 'Privacy Policy',
	linkURL: 'https://domain.com/privacy-policy',
	sections: ['essential', 'functional', 'analytics'],
	essentialTitle: 'Essential',
	essentialMessage: 'Essential cookies are required for basic site functionality',
	functionalTitle: 'Functional',
	functionalMessage: 'Functional cookies allow us to perform specific tasks',
	analyticsTitle: 'Analytics',
	analyticsMessage: 'Analytical cookies allow us to understand visitor interactions with the website',
	analyticsCookies: { _ga: 'Google Analytics' }
}

// Inline scripts are ES5 so the page itself runs in every browser above
const buildHTML = (bundle) => `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${bundle}</title>
	<script>
		window.errors = []
		window.onerror = function (message) { window.errors.push(String(message)) }
	</script>
</head>
<body>
	<main><h1 style="font-size:16px">${bundle}</h1></main>
	<script type="text/plain" data-consent="analytics">window.analyticsRan = true</script>
	<script>biscuitman = ${JSON.stringify(config)}</script>
	<script src="/dist/${bundle}"></script>
</body>
</html>`

function serve() {
	const server = http.createServer(async (request, response) => {
		const url = new URL(request.url, 'http://localhost')
		if (url.pathname === '/') {
			response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
			return response.end(buildHTML(url.searchParams.get('bundle')))
		}
		const filePath = path.resolve(ROOT, '.' + url.pathname)
		try {
			if (!filePath.startsWith(path.join(ROOT, 'dist') + path.sep)) throw new Error('outside dist')
			const body = await readFile(filePath)
			response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' })
			response.end(body)
		} catch {
			response.writeHead(404)
			response.end()
		}
	})
	return new Promise((resolve) => server.listen(0, () => resolve(server)))
}

async function check(driver, browser, origin) {
	const failures = []
	const expect = (label, passed) => passed || failures.push(label)
	const js = (script) => driver.executeScript(script)
	const click = (selector) => driver.findElement(By.css(selector)).click()
	// Selenium's own isDisplayed() injects code that needs Map, which Chrome 37 lacks
	const isVisible = (selector) => js(`var el = document.querySelector('${selector}'); return el.offsetWidth > 0 && el.offsetHeight > 0`)
	const screenshot = async (label) => {
		await writeFile(path.join(OUTPUT, `${browser.name}-${label}.png`), await driver.takeScreenshot(), 'base64')
	}

	await driver.get(`${origin}/?bundle=${browser.bundle}`)
	await driver.wait(() => js('return !!document.querySelector(".biscuitman article")'), TIMEOUT, 'banner was not rendered')
	expect('banner is visible', await isVisible('.biscuitman article'))
	await screenshot('banner')

	// The dialog polyfill loads on demand in browsers without <dialog>
	await click('button[data-id=settings]')
	await driver.wait(() => js('return document.querySelector(".biscuitman dialog").hasAttribute("open")'), TIMEOUT, 'settings modal did not open')
	await screenshot('modal')

	await driver.findElement(By.css('[data-s=analytics]')).findElement(By.xpath('..')).click()
	await click('button[data-id=save]')
	await driver.wait(() => js('return !!(window.Consent && window.Consent.consentTime)'), TIMEOUT, 'consent was not saved')

	expect('analytics consent granted', await js('return window.Consent.analytics === true'))
	expect('functional consent denied', await js('return window.Consent.functional === false'))
	expect('consent stored', await js('return JSON.parse(localStorage.getItem("myconsent")).analytics === true'))
	expect('html has consent classes', await js('return /bm-analytics/.test(document.documentElement.className) && /bm-no-functional/.test(document.documentElement.className)'))
	expect('consented script was injected', await js('return window.analyticsRan === true'))
	expect('banner is hidden after saving', !(await isVisible('.biscuitman')))
	const errors = await js('return window.errors')
	expect(`no script errors (${errors.join('; ')})`, errors.length === 0)
	await screenshot('saved')

	return failures
}

async function run(browser, { origin, credentials, project, build, localIdentifier }) {
	let driver
	let failures
	let version = ''
	try {
		if (credentials) driver = await new Builder()
			.usingServer('https://hub-cloud.browserstack.com/wd/hub')
			.withCapabilities({
				browserName: browser.browserName,
				...(browser.deviceName ? {} : { browserVersion: browser.browserVersion }),
				'bstack:options': {
					...(browser.deviceName ? { deviceName: browser.deviceName, realMobile: true } : { os: browser.os }),
					osVersion: browser.osVersion,
					projectName: project,
					buildName: build,
					sessionName: `${browser.name} ${browser.bundle}`,
					local: true,
					localIdentifier,
					userName: credentials.username,
					accessKey: credentials.key
				}
			})
			.build()
		else driver = await new Builder().forBrowser('chrome').build()

		failures = await check(driver, browser, origin)
		// What the browser says it is, to confirm BrowserStack gave us the version we asked for
		const userAgent = await driver.executeScript('return navigator.userAgent')
		version = (/(SamsungBrowser|Edg|Firefox)\/[\d.]+/.exec(userAgent) || /(Chrome|Version)\/[\d.]+|rv:[\d.]+/.exec(userAgent) || [''])[0]
	} catch (err) {
		failures = [String(err.message || err).split('\n')[0]]
		// Say why, when the page itself threw
		const errors = driver && await driver.executeScript('return (window.errors || []).join("; ") + " [" + navigator.userAgent + "]"').catch(() => '')
		if (errors) failures.push(errors)
	}

	if (driver) {
		const status = { status: failures.length ? 'failed' : 'passed', reason: failures.join(', ').slice(0, 250) }
		if (credentials) await driver.executeScript(`browserstack_executor: ${JSON.stringify({ action: 'setSessionStatus', arguments: status })}`).catch(() => {})
		await driver.quit().catch(() => {})
	}

	console.log(`${failures.length ? '✗' : '✓'} ${browser.name}${version && ` (${version})`}${failures.map((failure) => `\n    ${failure}`).join('')}`)
	return { browser, version, failures }
}

// One self-contained page per run: screenshots are embedded so it can be opened or shared as a single file
async function gallery(results, title) {
	const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;')
	const rows = await Promise.all(results.map(async ({ browser, version, failures }) => {
		const cells = await Promise.all(SHOTS.map(async (label) => {
			const png = await readFile(path.join(OUTPUT, `${browser.name}-${label}.png`), 'base64').catch(() => '')
			return `<td>${png ? `<img alt="${browser.name} ${label}" src="data:image/png;base64,${png}">` : '–'}</td>`
		}))
		return `<tr class="${failures.length ? 'failed' : 'passed'}">
	<th>${failures.length ? '✗' : '✓'} ${browser.name}<small>${escape(version)}</small>${failures.map((failure) => `<small class="failure">${escape(failure)}</small>`).join('')}</th>
	${cells.join('')}
</tr>`
	}))
	const file = path.join(OUTPUT, `browserstack-${title}.html`)
	await writeFile(file, `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>biscuitman ${title} screenshots</title>
<style>
	body { font: 14px/1.4 system-ui, sans-serif; margin: 16px; color: #222; background: #f4f4f4 }
	table { border-collapse: collapse }
	th, td { padding: 8px; vertical-align: top; text-align: left; border-top: 1px solid #ccc }
	thead th { position: sticky; top: 0; background: #f4f4f4 }
	small { display: block; font-weight: normal; color: #666 }
	.failed th, .failure { color: #b00020 }
	img { display: block; width: 300px; height: 220px; object-fit: contain; object-position: top; background: #fff; border: 1px solid #ccc; cursor: zoom-in }
	img.zoom { width: auto; height: auto; max-width: 90vw; cursor: zoom-out }
</style>
</head>
<body>
<h1>biscuitman ${title}</h1>
<p>${escape(new Date().toISOString().slice(0, 16).replace('T', ' '))} UTC. Click a screenshot to see it full size.</p>
<table>
<thead><tr><th>Browser</th>${SHOTS.map((label) => `<th>${label}</th>`).join('')}</tr></thead>
<tbody>
${rows.join('\n')}
</tbody>
</table>
<script>document.onclick = function (e) { if (e.target.tagName === 'IMG') e.target.classList.toggle('zoom') }</script>
</body>
</html>`)
	return file
}

async function main() {
	const args = process.argv.slice(2)
	const isLocal = args.includes('--local')
	const bundle = args.includes('--legacy') ? LEGACY : MODERN
	const filters = args.filter((arg) => !arg.startsWith('--'))
	const { BROWSERSTACK_USERNAME: username, BROWSERSTACK_ACCESS_KEY: key } = process.env

	if (!isLocal && !(username && key)) {
		console.error('Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY (environment or .env), or pass --local')
		return 1
	}

	let selected = isLocal ? [{ name: 'local-chrome', bundle }] : browsers.filter((browser) => browser.bundle === bundle)
	if (filters.length) selected = selected.filter((browser) => filters.some((filter) => browser.name.includes(filter)))
	if (!selected.length) {
		console.error(`No browser matches: ${filters.join(' ')}`)
		return 1
	}

	await mkdir(OUTPUT, { recursive: true })
	const server = await serve()
	const { port } = server.address()
	const { version } = JSON.parse(await readFile(path.join(ROOT, 'package.json')))
	const context = { origin: `http://localhost:${port}` }
	let tunnel

	if (!isLocal) {
		// bs-local.com resolves to this machine through the tunnel; Safari cannot reach localhost
		context.origin = `http://bs-local.com:${port}`
		context.credentials = { username, key }
		// The README badges show the latest build in the 'biscuitman' and 'biscuitman-legacy' projects,
		// so only CI runs on main report there; everything else goes to a -dev project
		const { GITHUB_REF_NAME: branch, GITHUB_SHA: sha } = process.env
		context.project = `biscuitman${bundle === LEGACY ? '-legacy' : ''}${branch === 'main' ? '' : '-dev'}`
		context.build = `${version} ${sha ? `${branch} ${sha.slice(0, 7)}` : new Date().toISOString().slice(0, 16)}`
		context.localIdentifier = `biscuitman-${process.pid}`
		tunnel = new browserstack.Local()
		await new Promise((resolve, reject) => {
			tunnel.start({ key, localIdentifier: context.localIdentifier }, (err) => (err ? reject(err) : resolve()))
		})
	}

	const results = []
	try {
		const queue = [...selected]
		const worker = async () => {
			while (queue.length) results.push(await run(queue.shift(), context))
		}
		await Promise.all(Array.from({ length: isLocal ? 1 : PARALLEL }, worker))
	} finally {
		if (tunnel) await new Promise((resolve) => tunnel.stop(resolve))
		server.close()
	}

	results.sort((a, b) => selected.indexOf(a.browser) - selected.indexOf(b.browser))
	const page = await gallery(results, isLocal ? 'local' : bundle === LEGACY ? 'legacy' : 'modern')
	const failed = results.filter(({ failures }) => failures.length).length

	// In GitHub Actions, list the results on the run's summary page
	if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, [
		`### BrowserStack ${bundle === LEGACY ? 'legacy' : 'modern'}: ${results.length - failed} passed, ${failed} failed`,
		'',
		'| | Browser | Reported version | Failures |',
		'|---|---|---|---|',
		...results.map(({ browser, version, failures }) => `| ${failures.length ? '❌' : '✅'} | ${browser.name} | ${version} | ${failures.join('; ').replace(/\|/g, '/')} |`),
		'',
		''
	].join('\n'))
	console.log(`\n${results.length - failed} passed, ${failed} failed. Screenshots: ${path.relative(ROOT, page)}`)
	return failed ? 1 : 0
}

process.exitCode = await main()
