describe('a fresh instance of biscuitman', () => {
	test('should load without without consents', async () => {
		expect(await utils.getConsent()).toBeEmpty()
		expect(await utils.loadConsents()).toBeNull()
	})

	test('should display a UI', async () => {
		const ui = await page.$('.biscuitman')
		expect(ui).not.toBeNull()

		const banner = await page.$('.biscuitman article')
		expect(await banner.isVisible()).toBe(true)
	})

	test('should open settings modal after clicking settings', async () => {
		await page.click('button[data-id=settings]')
		const dialog = await page.$('dialog')
		expect(await dialog.isVisible()).toBe(true)
	})

	test('should close settings modal after clicking close', async () => {
		await page.click('button[data-id=settings]')
		const dialog = await page.$('dialog')
		await page.click('button[data-id=close]')
		expect(await dialog.isVisible()).toBe(false)
	})

	test('should hide UI and save consents correctly after clicking accept', async () => {
		await page.click('button[data-id=accept]')

		const banner = await page.$('.biscuitman article')
		expect(await banner.isVisible()).toBe(false)

		let entries = [
			['analytics', true],
			['functional', true],
			['advertisement', true],
			['performance', true],
			['uncategorized', true]
		]

		expect(await utils.getConsent()).toContainEntries(entries)
		expect(await utils.loadConsents()).toContainEntries(entries)
	})

	test('should hide UI and save consents correctly after clicking reject', async () => {
		await page.click('button[data-id=reject]')

		const banner = await page.$('.biscuitman article')
		expect(await banner.isVisible()).toBe(false)

		let entries = [
			['analytics', false],
			['functional', false],
			['advertisement', false],
			['performance', false],
			['uncategorized', false]
		]
		expect(await utils.getConsent()).toContainEntries(entries)
		expect(await utils.loadConsents()).toContainEntries(entries)
	})

	test('should hide UI and save consents correctly after selecting some sections', async () => {
		await page.click('button[data-id=settings]')
		await page.click('[for=biscuitman_analytics]')
		await page.click('[for=biscuitman_functional]')
		await page.click('[for=biscuitman_performance]')

		await page.click('button[data-id=save]')

		const banner = await page.$('.biscuitman article')
		expect(await banner.isVisible()).toBe(false)

		let entries = [
			['analytics', true],
			['functional', true],
			['advertisement', false],
			['performance', true],
			['uncategorized', false]
		]

		expect(await utils.getConsent()).toContainEntries(entries)
		expect(await utils.loadConsents()).toContainEntries(entries)
	})

	test('should remove consent preferences when "bmInvalidate" is called', async () => {
		await page.evaluate(() => window.bmInvalidate())
		expect(await utils.getConsent()).toEqual({})
		expect(await utils.loadConsents()).toBeNull()
	})

	test('should update consent preferences when "bmUpdate" is called', async () => {
		await page.evaluate(() => window.bmUpdate())
		const dialog = await page.$('dialog')
		const dialogVisible = await page.evaluate(
			(dialog) => dialog.open,
			dialog
		)
		expect(dialogVisible).toBe(true)
	})
})
