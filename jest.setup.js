import browserSync from 'browser-sync'
import puppeteer from 'puppeteer'

global.__SERVERPORT__ = 3003
global.__SERVERURL__ = `http://localhost:${__SERVERPORT__}`
global.__HTML__ = null
global.utils = {
	getConfig: () => page.evaluate(() => window.biscuitman),
	getConsent: () => page.evaluate(() => window.Consent),
	loadConsents: () =>
		page.evaluate(() => JSON.parse(localStorage.getItem('myconsent')))
}
let bs

beforeAll(async () => {
	bs = browserSync.create('test')

	bs.init({
		server: './',
		port: __SERVERPORT__ || 3333,
		logLevel: 'silent',
		ui:false,
		open: false,
		notify: false,
		ghostmode: false,
		logFileChanges: false,
		injectChanges: false,
		snippet: false,
		online: false,
		minify: false,
		codeSync: false,
		middleware: [
			(req, res, next) => {
				if (__HTML__ && req.method === 'GET' && req.url === '/') {
					res.setHeader('Content-Type', 'text/html')
					res.end(__HTML__)
				} else {
					next()
				}
			}
		]
	},(err, bsInstance) => {
		if (err) {
			console.error('Error starting BrowserSync:', err)
		} else {
			console.log(`BrowserSync running at: ${bsInstance.options.getIn(['urls', 'local'])}`)
		}
	})

	global.__BROWSER__ = await puppeteer.launch({
		headless: true
	})

	// page.on('console', (msg) => {
	// 	const text = msg.text()
	// 	const location = msg.location()
	// 	if (msg.type() === 'error') {
	// 		// Squash 404 errors
	// 		if (text.startsWith('Failed to load resource:')) return false

	// 		// Raise errors if it originated from a locally-served resource
	// 		if (location && location.url && location.url.startsWith(global.__SERVERURL__)) {
	// 			console.error('Console error:', msg.text())
	// 		} else return false
	// 	}
	// })
})

beforeEach(async () => {
	const client = await page.createCDPSession()
	await client.send('Storage.clearDataForOrigin', {
		origin: __SERVERURL__,
		storageTypes:
			'cookies, local_storage, session_storage, indexeddb, websql, cache_storage, service_workers'
	})
})

afterAll(async () => {
	await __BROWSER__.close()
	bs.exit()
})



// expect.extend({
// 	async toHaveVisible(page, selector, timeout = 150) {
// 		function isElementVisible(page, selector, timeout = 150) {
// 			return new Promise((resolve) => {
// 				page.waitForSelector(selector, { visible: true, timeout })
// 					.then(() => {
// 						resolve(true)
// 					})
// 					.catch(() => {
// 						resolve(false)
// 					})
// 			})
// 		}

// 		let isVisible = await isElementVisible(page, selector, timeout)

// 		if (isVisible) {
// 			return {
// 				message: () => `expected '${selector}' not to be visible`,
// 				pass: true
// 			}
// 		} else {
// 			return {
// 				message: () => `expected '${selector}' to be visible`,
// 				pass: false
// 			}
// 		}
// 	}
// })
