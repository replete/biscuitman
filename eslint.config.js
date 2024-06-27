import globals from 'globals'
import pluginJs from '@eslint/js'
export default [
	{
		files: ['*.js'],
		languageOptions: {
			globals: {
				...globals.node
			}
		}
	},
	{
		files: ['**/*.js'],
		ignores: ['dist/**/*.js','./coverage/**/*.js'],
		rules: {
			...pluginJs.configs.recommended.rules,
			semi: [2,'never'],
			quotes: [2,'single']
		},
	}, 
	{
		files: ['src/*.js'],
		languageOptions: {
			globals: {
				...globals.browser
			}
		},
		rules: {

		}
	}, 
	{
		files: ['jest.setup.js', '__tests__/**/*.js'],
		rules: {
		},
		languageOptions: {
			globals: {
				...globals.jest,
				...globals.browser,
				...globals.node,
				utils: false,
				page: false,
				browser: false,
				__BROWSER__: false,
				__SERVER__: false
			}
		}
	}
]