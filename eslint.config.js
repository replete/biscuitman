import globals from 'globals'
import pluginJs from '@eslint/js'
export default [
	{
		// Global ignores: build output and generated reports. An `ignores` key
		// only acts globally when it is the sole key on a config object.
		ignores: ['dist/**', 'coverage/**', '__tests__/reports/**']
	},
	{
		files: ['*.js'],
		languageOptions: {
			globals: {
				...globals.node
			}
		}
	},
	{
		files: ['**/*.js','**/*.mjs'],
		ignores: [
			'dist/**/*.js',
			'dist/**/*.mjs',
			'coverage/**/*.js',
			'src/legacyPolyfills.js'],
		rules: {
			...pluginJs.configs.recommended.rules,
			semi: [2, 'never'],
			quotes: [2, 'single'],
			'object-curly-spacing': [2, 'always'],
			'no-unused-vars': [2, { 'vars': 'all', 'args': 'after-used', 'ignoreRestSiblings': true }],
			indent: ['warn', 'tab', {
				ignoredNodes: [
					'ConditionalExpression',
					'TemplateLiteral'
				],
				SwitchCase: 1,
				MemberExpression: 1,
				// FunctionDeclaration: { body: 1, parameters: 1 },
				FunctionExpression: { body: 1, parameters: 1 },
				CallExpression: { arguments: 1 },
			}],
			'no-multi-spaces': 'error',
			'no-new-wrappers': 2,
			'no-new-func': 2,
			'no-loop-func': 2,
			'dot-location': ['error', 'property']
		},
	},
	{
		files: ['src/*.js','src/*.mjs'],
		languageOptions: {
			globals: {
				...globals.browser
			}
		}
	},
	{
		files: ['__tests__/**/*.js', 'playwright.config.js'],
		rules: {
		},
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	}
]
