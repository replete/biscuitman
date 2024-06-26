import puppeteer from 'puppeteer'
import { testServer } from '../run'

let serverPort = 3003

describe("a fresh instance of biscuitman", () => {
	let server, browser, page
	let getConfig, getConsent, loadConsents

	beforeAll(async () => {
		server = await testServer(serverPort)

		browser = await puppeteer.launch({
			headless: true, 
			// slowMo: showBrowser ? 100 : false, 
			// devtools: showBrowser
		})

		page = await context.newPage()

		await page.setViewport({width: 1200, height: 600});
		
		page.on('pageerror', (error) => {
			console.error('Page error:', error)
		})

		page.on('console', (msg) => {
			let text = msg.text()
			if (msg.type() === 'error') {
				if (text.startsWith('Failed to load resource:')) return false
				console.log("Console error:", msg.text())
			}
		})

		getConfig = () => page.evaluate(() => window.biscuitman)
		getConsent = () => page.evaluate(() => window.Consent)
		loadConsents = () => page.evaluate(() => JSON.parse(localStorage.getItem('myconsent')))
	})

	beforeEach(async () => {
		await page.goto(`https://localhost:${serverPort}`, {waitUntil: 'domcontentloaded'})
	})
	
	afterEach(async () => {
		// Wipe storages
		const client = await page.target().createCDPSession()		
		await client.send('Storage.clearDataForOrigin', {
			origin: `https://localhost:${serverPort}`,
			storageTypes: 'cookies, local_storage, session_storage, indexeddb, websql, cache_storage, service_workers'
		})
	})

	afterAll(async () => {
		await browser.close()
		server.exit()
	})

	test("should load without without consents", async () => {
		expect(await getConsent()).toBeEmpty()
		expect(await loadConsents()).toBeNull()
	})

	test("should display a UI", async () => {
		const ui = await page.$('.biscuitman')
		expect(ui).not.toBeNull()
		
		const banner = await page.$('.biscuitman article')
		expect(await banner.isVisible()).toBe(true)
	})

	test("should open settings modal after clicking settings", async () => {
		await page.click('button[data-id=settings]')
		const dialog = await page.$('dialog')
		expect(await dialog.isVisible()).toBe(true)
	})

	test("should close settings modal after clicking close", async () => {
		await page.click('button[data-id=settings]')
		const dialog = await page.$('dialog')
		await page.click('button[data-id=close]')
		expect(await dialog.isVisible()).toBe(false)
	})

	test("should hide UI and save consents correctly after clicking accept", async () => {
		await page.click('button[data-id=accept]')

		const banner = await page.$('.biscuitman article')
		expect(await banner.isVisible()).toBe(false)

		let entries = [
			['analytics',true],
			['functional',true],
			['advertisement',true],
			['performance',true],
			['uncategorized',true],
		]

		expect(await getConsent()).toContainEntries(entries)
		expect(await loadConsents()).toContainEntries(entries)
	})

	test("should hide UI and save consents correctly after clicking reject", async () => {
		await page.click('button[data-id=reject]')

		const banner = await page.$('.biscuitman article')
		expect(await banner.isVisible()).toBe(false)

		let entries = [
			['analytics',false],
			['functional',false],
			['advertisement',false],
			['performance',false],
			['uncategorized',false],
		]
		expect(await getConsent()).toContainEntries(entries)
		expect(await loadConsents()).toContainEntries(entries)
	})

	test("should hide UI and save consents correctly after selecting some sections", async () => {

		await page.click('button[data-id=settings]')
		const dialog = await page.$('dialog')
		await page.click('[for=biscuitman_analytics]')
		await page.click('[for=biscuitman_functional]')
		await page.click('[for=biscuitman_performance]')

		await page.click('button[data-id=save]')

		const banner = await page.$('.biscuitman article')
		expect(await banner.isVisible()).toBe(false)

		let entries = [
			['analytics',true],
			['functional',true],
			['advertisement',false],
			['performance',true],
			['uncategorized',false]
		]

		expect(await getConsent()).toContainEntries(entries)
		expect(await loadConsents()).toContainEntries(entries)
	})


	test('should remove consent preferences when "bmInvalidate" is called', async () => {
		await page.evaluate(() => window.bmInvalidate())
		expect(await getConsent()).toEqual({})
		expect(await loadConsents()).toBeNull()
	})

	test('should update consent preferences when "bmUpdate" is called', async () => {
		await page.evaluate(() => window.bmUpdate())
		const dialog = await page.$("dialog")
		const dialogVisible = await page.evaluate(
			(dialog) => dialog.open,
			dialog
		)
		expect(dialogVisible).toBe(true)
	})
})
