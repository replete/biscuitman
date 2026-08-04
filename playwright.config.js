import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './__tests__',
	testMatch: '**/*.spec.js',

	// Every test gets its own isolated context, so they can all run at once
	fullyParallel: true,

	// Fail the build on CI if a .only was committed
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,

	reporter: process.env.CI
		? [['github'], ['list'], ['html', { open: 'never' }]]
		: [['list'], ['html', { open: 'never' }]],
	timeout: 30000,

	use: {
		baseURL: 'http://localhost:3003',
		trace: 'on-first-retry'
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
})
