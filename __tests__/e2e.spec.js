import AxeBuilder from '@axe-core/playwright'
import { test, expect, testedVersions } from './fixtures.js'

// jest-extended's toContainEntries, expressed with Playwright's expect
const containsEntries = (entries) => expect.objectContaining(Object.fromEntries(entries))

// The banner and the settings dialog each render their own accept/reject
// button and privacy link, so these selectors match twice. Playwright locators
// are strict, so the banner's copy has to be named explicitly.
const banner = (page) => page.locator('.biscuitman article')
const acceptButton = (page) => page.locator('button[data-id=accept]').first()
const rejectButton = (page) => page.locator('button[data-id=reject]').first()

// Runs against the whole page: axe's region rule only applies at page level
const axeViolations = async (page) =>
	(await new AxeBuilder({ page }).analyze()).violations.map(
		({ id, nodes }) => `${id}: ${nodes.map((node) => node.html).join(' ')}`
	)

const ALL_GRANTED = [
	['analytics', true],
	['functional', true],
	['advertisement', true],
	['performance', true],
	['uncategorized', true]
]

const ALL_DENIED = [
	['analytics', false],
	['functional', false],
	['advertisement', false],
	['performance', false],
	['uncategorized', false]
]

testedVersions.forEach((filename) => {
	test.describe(`a fresh load of ${filename}`, () => {
		test.beforeEach(async ({ load }) => {
			await load(filename)
		})

		test('should load without consents', async ({ consent }) => {
			expect(Object.keys(await consent.getConsent())).toHaveLength(0)
			expect(await consent.loadConsents()).toBeNull()
		})

		test('should display a UI', async ({ page }) => {
			await expect(page.locator('.biscuitman')).toBeAttached()
			await expect(banner(page)).toBeVisible()
		})

		test('should have loaded CSS correctly', async ({ page }) => {
			const color = await page
				.locator('.biscuitman [data-id=accept]')
				.first()
				.evaluate((el) => getComputedStyle(el).backgroundColor)
			expect(color).toBe('rgb(16, 93, 137)') // #105d89
		})

		test('should open settings modal after clicking settings', async ({ page }) => {
			await page.click('button[data-id=settings]')
			await expect(page.locator('dialog')).toBeVisible()
		})

		test('should have no axe violations in the banner', async ({ page }) => {
			await expect(banner(page)).toBeVisible()
			expect(await axeViolations(page)).toEqual([])
		})

		test('should have no axe violations in the settings modal', async ({ page }) => {
			await page.click('button[data-id=settings]')
			await expect(page.locator('dialog')).toBeVisible()
			expect(await axeViolations(page)).toEqual([])
		})

		test('should give the banner, modal and close button accessible names', async ({ page }) => {
			await expect(page.getByRole('region', { name: 'Your privacy matters' })).toBeVisible()
			await page.click('button[data-id=settings]')
			await expect(page.getByRole('dialog', { name: 'My Consent Settings' })).toBeVisible()
			await expect(page.getByRole('button', { name: 'Close' })).toBeVisible()
			await expect(page.getByRole('navigation')).toHaveCount(0)
		})

		if (filename.endsWith('.mjs')) test('should expose consent(), on() and off() on the ESM instance', async ({ page }) => {
			// create() returns the instance the page already made
			await page.evaluate(async (file) => {
				const bm = (await import(`/dist/esm/${file}`)).default.create()
				window.saves = 0
				window.onSave = () => window.saves++
				window.bm = bm.on('save', window.onSave)
			}, filename)
			expect(await page.evaluate(() => window.bm.consent('analytics'))).toBe(false)

			await acceptButton(page).click()
			expect(await page.evaluate(() => window.saves)).toBe(1)
			expect(await page.evaluate(() => window.bm.consent('analytics'))).toBe(true)

			await page.evaluate(() => {
				window.bm.off('save', window.onSave)
				window.bm.invalidate()
			})
			expect(await page.evaluate(() => window.saves)).toBe(1)
			expect(await page.evaluate(() => window.bm.consent('analytics'))).toBe(false)
		})

		test('should close settings modal after clicking close', async ({ page }) => {
			await page.click('button[data-id=settings]')
			await page.click('button[data-id=close]')
			await expect(page.locator('dialog')).toBeHidden()
		})

		test('should hide UI and save consents correctly after clicking accept', async ({ page, consent }) => {
			await acceptButton(page).click()

			await expect(banner(page)).toBeHidden()

			expect(await consent.getConsent()).toEqual(containsEntries(ALL_GRANTED))
			expect(await consent.loadConsents()).toEqual(containsEntries(ALL_GRANTED))
		})

		test('should hide UI and save consents correctly after clicking reject', async ({ page, consent }) => {
			await rejectButton(page).click()

			await expect(banner(page)).toBeHidden()

			expect(await consent.getConsent()).toEqual(containsEntries(ALL_DENIED))
			expect(await consent.loadConsents()).toEqual(containsEntries(ALL_DENIED))
		})

		test('should hide UI and save consents correctly after selecting some sections', async ({ page, consent }) => {
			await page.click('button[data-id=settings]')
			await page.click('label:has([data-s=analytics])')
			await page.click('label:has([data-s=functional])')
			await page.click('label:has([data-s=performance])')

			await page.click('button[data-id=save]')

			await expect(banner(page)).toBeHidden()

			let entries = [
				['analytics', true],
				['functional', true],
				['advertisement', false],
				['performance', true],
				['uncategorized', false]
			]

			expect(await consent.getConsent()).toEqual(containsEntries(entries))
			expect(await consent.loadConsents()).toEqual(containsEntries(entries))
		})

		test('should remove consent preferences when "bmInvalidate" is called', async ({ page, consent }) => {
			await page.evaluate(() => window.bmInvalidate())
			expect(await consent.getConsent()).toEqual({})
			expect(await consent.loadConsents()).toBeNull()
		})

		test('should update consent preferences when "bmUpdate" is called', async ({ page }) => {
			await page.evaluate(() => window.bmUpdate())
			const isOpen = await page.locator('dialog').evaluate((el) => el.open)
			expect(isOpen).toBe(true)
		})

		test('should auto-consent if when the timezone is America/New_York', async ({ page, load, consent }) => {
			await load(filename, { mockTimeZone: 'America/New_York' }, { acceptNonEU: true })

			await expect(banner(page)).toBeHidden()

			expect(await consent.getConsent()).toEqual(containsEntries(ALL_GRANTED))
			expect(await consent.loadConsents()).toEqual(containsEntries(ALL_GRANTED))
		})

		test('should not auto-consent if when the timezone is European', async ({ page, load }) => {
			await load(filename, { mockTimeZone: 'Europe/Amsterdam' }, { acceptNonEU: true })

			await expect(banner(page)).toBeVisible()
		})

		const testTimezones = [
			['UTC', false],
			['UTC+1', false],
			['Etc/GMT-2', false],
			['Europe/London', false],
			['Atlantic/Canary', false],
			['Atlantic/Faeroe', false],
			['Asia/Nicosia', false],
			['Indian/Reunion', false],
			['America/Martinique', false],
			['Atlantic/Bermuda', true],
			['Asia/Tokyo', true],
			['America/New_York', true],
			['Australia/Sydney', true]
		]
		testTimezones.forEach(([zone, shouldAutoConsent]) => {
			test(`should handle ${zone} timezone correctly`, async ({ page, load }) => {
				await load(filename, { mockTimeZone: zone }, { acceptNonEU: true })

				const article = banner(page)
				if (shouldAutoConsent) await expect(article).toBeHidden()
				else await expect(article).toBeVisible()
			})
		})

		test('should properly inject scripts when consent given', async ({ page }) => {
			await acceptButton(page).click()

			// Wait for script to be injected and transformed. Scripts are never
			// "visible", so this has to wait on attachment rather than visibility.
			const injected = page.locator('script[src*="googletagmanager.com"]')
			await expect(injected).toBeAttached({ timeout: 2000 })

			const analyticsScripts = await injected.evaluateAll((els) => els.map((el) => el.src))
			expect(analyticsScripts).toContain('https://www.googletagmanager.com/gtag/js?id=G-TEST')
		})

		test('should fire correct events', async ({ page }) => {
			await page.evaluate(() => {
				window._bmEvents = []
				;['save', 'revoke', 'inject', 'delete'].forEach((event) => {
					document.addEventListener(`bm:${event}`, (e) => {
						window._bmEvents.push({
							type: event,
							detail: JSON.parse(JSON.stringify(e.detail)) // Ensure serializable
						})
					})
				})
			})

			await acceptButton(page).click()

			await expect
				.poll(() => page.evaluate(() => window._bmEvents.map((e) => e.type)))
				.toContain('save')

			const events = await page.evaluate(() => window._bmEvents)

			// Verify events
			expect(events).toContainEqual(
				expect.objectContaining({
					type: 'save',
					detail: expect.objectContaining({
						data: expect.any(Object),
						time: expect.any(Number)
					})
				})
			)

			// Should have inject events for analytics scripts
			expect(events.some((e) => e.type === 'inject')).toBe(true)
		})

		test('should clean up cookies when consent revoked', async ({ page }) => {
			// Set some test cookies
			await page.evaluate(() => {
				document.cookie = '_ga=test;path=/'
				localStorage.setItem('_ga_test', 'value')
			})

			await rejectButton(page).click()

			// Verify cleanup
			await expect.poll(() => page.evaluate(() => document.cookie)).not.toContain('_ga')

			const storage = await page.evaluate(() => localStorage.getItem('_ga_test'))
			expect(storage).toBeNull()
		})

		test('should maintain correct checkbox states', async ({ page }) => {
			await page.click('button[data-id=settings]')
			await page.click('label:has([data-s=analytics])')

			// Verify checkbox state persists after reopening
			await page.click('button[data-id=close]')
			await page.click('button[data-id=settings]')

			const checked = await page.locator('[data-s=analytics]').evaluate((el) => el.checked)
			expect(checked).toBe(true)
		})

		test('should enforce modal in force mode', async ({ page, load }) => {
			await load(filename, null, { force: true })

			const dialog = page.locator('dialog')
			await expect(dialog).toBeVisible()

			// Verify can't close with ESC
			await page.keyboard.press('Escape')
			await expect(dialog).toBeVisible()
		})

		test('should set correct HTML classes for consents', async ({ page }) => {
			await page.click('button[data-id=settings]')
			await page.click('label:has([data-s=analytics])')
			await page.click('button[data-id=save]')

			const classes = await page.locator('html').evaluate((el) => Array.from(el.classList))
			expect(classes).toContain('bm-analytics')
			expect(classes).not.toContain('bm-no-analytics')
		})

		test('should correctly render privacy policy link', async ({ page }) => {
			const link = page.locator('a[href="https://domain.com/privacy-policy"]').first()
			await expect(link).toBeAttached()
			await expect(link).toHaveText('Privacy Policy')
		})
	})
})
