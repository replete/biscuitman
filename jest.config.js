export default {
	// rust version of jest
	transform: {
		'^.+\\.(t|j)sx?$': '@swc/jest',
	},
	preset: 'jest-puppeteer',
	setupFilesAfterEnv: [
		'./jest.setup.js',
		'jest-extended/all'
	],
	testTimeout: 30000, // Increase timeout for Puppeteer operations
};
