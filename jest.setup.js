import puppeteer from 'puppeteer'
import { testServer } from './run'

global.__SERVERPORT__ = 3003
global.__SERVERURL__ = `http://localhost:${__SERVERPORT__}`

beforeAll(async () => {
	global.__SERVER__ = await testServer(__SERVERPORT__)
	global.__BROWSER__ = await puppeteer.launch({
		headless: true
	})

	page.on('pageerror', (error) => {
		console.error('Page error:', error)
	})

	page.on('console', (msg) => {
		let text = msg.text()
		if (msg.type() === 'error') {
			if (text.startsWith('Failed to load resource:')) return false
			console.log('Console error:', msg.text())
		}
	})

	global.utils = {
		getConfig: () => page.evaluate(() => window.biscuitman),
		getConsent: () => page.evaluate(() => window.Consent),
		loadConsents: () =>
			page.evaluate(() => JSON.parse(localStorage.getItem('myconsent')))
	}
})

afterAll(async () => {
	await __BROWSER__.close()
	__SERVER__.exit()
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
