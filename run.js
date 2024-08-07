import fs from 'fs'
import browserSync from 'browser-sync'
import swc from '@swc/core'
import { transform as transformCss, browserslistToTargets, Features } from 'lightningcss'
import browserslist from 'browserslist'
import { Readable } from 'stream'
import { ESLint } from 'eslint'
import compat from 'eslint-plugin-compat'
import globals from 'globals'
import doiuse from 'doiuse/stream'
import zlib from 'zlib'
const { readFile, writeFile } = fs.promises
const log = (level,msg) => console.log(`\x1b[33m[${level}]\x1b[0m ${msg}`)
const { name, version, browserslist: browserlistString } = JSON.parse(await readFile('./package.json'))
const comment = `/*! ${name}.js ${version} */`

const filenames = {
	css: 'biscuitman.css',
	minCss: 'biscuitman.min.css',
	js: 'biscuitman.js',
	minJs: 'biscuitman.min.js',
	jsWithCss: 'biscuitman.withcss.js',
	minJsWithCss: 'biscuitman.withcss.min.js',
	mjs: 'biscuitman.mjs',
	minMjs: 'biscuitman.min.mjs',
	mjsWithCss: 'biscuitman.withcss.mjs',
	minMjsWithCss: 'biscuitman.withcss.min.mjs'
}

export async function styles(skipFileSave) {
	const sourceStyles = await readFile(`src/${filenames.css}`, 'utf8')

	let processedStyles = transformCss({
		code: Buffer.from(sourceStyles),
		minify: false,
		sourceMap: false,
		targets: browserslistToTargets(browserslist(browserlistString)),
		include: Features.Nesting
	})
	let css = `${comment}\n` + processedStyles.code
	if (!skipFileSave) await writeFile(`dist/${filenames.css}`, css)
	log('css',`Saved dist/${filenames.css}`)

	let minifiedStyles = transformCss({
		code: Buffer.from(sourceStyles),
		minify: true,
		sourceMap: false,
		targets: browserslistToTargets(browserslist(browserlistString)),
		include: Features.Nesting
	})
	let minCss = comment + minifiedStyles.code
	if (!skipFileSave) await writeFile(`dist/${filenames.minCss}`, minCss)
	log('css',`Saved dist/${filenames.minCss}`)

	return [processedStyles.code, minifiedStyles.code]
}

export async function scripts(skipFileSave) {
	const sourceJs = await readFile(`src/${filenames.js}`, 'utf8')

	const js = swc.transform(sourceJs, {
		sourceMaps: false,
		isModule: false,
		env: {
			targets: browserlistString
		},
		minify: false
	})
		.then(async ({ code }) => {
			code = `${comment}\n` + code
			if (!skipFileSave) await writeFile(`dist/${filenames.js}`, code)
			log('js',`Saved dist/${filenames.js}`)
			return code
		})

	const minJs = swc.transform(sourceJs, {
		sourceMaps: false,
		isModule: false,
		env: {
			targets: browserlistString
		},
		jsc: {
			minify: {
				compress: {
					unused: true
				},
				mangle: true
			}
		},
		minify: true
	}).then(async ({ code }) => {
		code = comment + code.replace(/[\n\t]/g,'')
		await writeFile(`dist/${filenames.minJs}`, code)
		log('js',`Saved dist/${filenames.minJs}`)
		return code
	})

	// Module version:

	const sourceMjs = await readFile(`src/${filenames.mjs}`, 'utf8')
	const mjs = swc.transform(sourceMjs, {
		sourceMaps: false,
		isModule: true,
		env: {
			targets: browserlistString
		},
		minify: false
	})
		.then(async ({ code }) => {
			code = `${comment}\n` + code
			if (!skipFileSave) await writeFile(`dist/esm/${filenames.mjs}`, code)
			log('js',`Saved dist/esm/${filenames.mjs}`)
			return code
		})

	const minMjs = swc.transform(sourceMjs, {
		sourceMaps: false,
		isModule: true,
		env: {
			targets: browserlistString
		},
		jsc: {
			minify: {
				compress: {
					unused: true
				},
				mangle: true
			}
		},
		minify: true
	}).then(async ({ code }) => {
		code = comment + code.replace(/[\n\t]/g, '')
		await writeFile(`dist/esm/${filenames.minMjs}`, code)
		log('js',`Saved dist/${filenames.minMjs}`)
		return code
	})

	return Promise.all([js, minJs, mjs, minMjs])
}

export async function build() {
	console.time('Build Time')
	let js = await scripts()
	let css = await styles()

	let jsCss = `${js[0]};
((d)=>{
	let css=d.createElement('style');
	css.textContent=\`${comment}
${css[0]}\`;
	d.head.appendChild(css)
})(document);`
	let jsCssMin = `${js[1].replace(/[\n\t]/g, '')};((d)=>{let c=d.createElement('style');c.textContent=\`${comment}${css[1]}\`;d.head.appendChild(c)})(document);`

	let mjsCss = `${js[2]}
if (typeof BMCSS === 'undefined') {
	let css=document.createElement('style');
	css.id = 'BMCSS';
	css.textContent=\`${comment}
${css[0]}\`;
	document.head.appendChild(css)
}`
	let mjsCssMin = `${js[3].replace(/[\n\t]/g, '')};if(typeof BMCSS==='undefined'){let c=document.createElement('style');c.id='BMCSS';c.textContent=\`${comment}${css[1]}\`;document.head.appendChild(c)}`

	await Promise.all([
		writeFile(`dist/${filenames.jsWithCss}`, jsCss),
		writeFile(`dist/${filenames.minJsWithCss}`, jsCssMin),
		writeFile(`dist/esm/${filenames.mjsWithCss}`, mjsCss),
		writeFile(`dist/esm/${filenames.minMjsWithCss}`, mjsCssMin),
	])

	log('build',`Saved dist/${filenames.jsWithCss} ${getCompressedSizes(jsCss)}`)
	log('build',`Saved dist/${filenames.minJsWithCss} ${getCompressedSizes(jsCssMin)}`)
	log('build',`Saved dist/esm/${filenames.mjsWithCss} ${getCompressedSizes(mjsCss)}`)
	log('build',`Saved dist/esm/${filenames.minMjsWithCss} ${getCompressedSizes(mjsCssMin)}`)

	console.timeEnd('Build Time')
}

function getCompressedSizes(text) {
	return `(${(text.length / 1024).toFixed(2)}kB) `
	+ `(${ (zlib.gzipSync(text).length / 1024).toFixed(2)}kB/gz) `
	+ `(${ (zlib.brotliCompressSync(text).length / 1024).toFixed(2)}kB/br)`
}

export async function report() {
	log('report', 'Running browser compatibility reports...')
	await Promise.all([
		cssreport(),
		jsreport()
	])
}

export async function jsreport() {
	// TODO: This doesn't work, rip it out
	log('js report','Checking JS browser compatibility...')
	let js = await scripts(true)
	const eslint = new ESLint({
		overrideConfigFile: true,
		overrideConfig: {
			...compat.configs['flat/recommended'],
			languageOptions: {
				ecmaVersion: 2018,
				globals: {
					...globals.browser
				}
			},
			rules: {
				'compat/compat': 'error',
				...compat.configs['flat/recommended'].rules
			},
			settings: {
				browsers: 'last 10 years'
			}
		}
	})

	const lint = await eslint.lintText(js[0])
	const formatter = await eslint.loadFormatter('stylish')
	const jsReport = formatter.format(lint)
	if (jsReport.length === 0) {
		log('js report','✅ No JS Compatibilty warnings')
	} else log('js report', jsReport)
}

export async function cssreport() {
	log('css report','Checking CSS browser compatibility...')
	let css = await styles(true)
	let cssReportData = []
	new Readable({
		read() {
		  this.push(css[0])
		  this.push(null)
		}
	})
		.pipe(doiuse({
			browsers: browserlistString,
			ignore: []
		}))
		.on('data',usageInfo => {
			log('css report', usageInfo.message.replace('<streaming css input>:',''))
			cssReportData.push(usageInfo)
		})
		.on('end', async () => {
			await writeFile('cssreport.json', JSON.stringify({ report: cssReportData }))
			log('css report','Saved cssreport.json (see compatibility table on index.html')
		})
}

export async function serve() {
	const bs = browserSync.create()

	bs.watch('package.json', async (event, file) => {
		if (event === 'change') {
			console.log(`${file} has changed`)
			await build()
			bs.reload()
		}
	})

	bs.watch('./src/biscuitman.js', async (event, file) => {
		if (event === 'change') {
			console.log(`${file} has changed`)
			await build()
			bs.reload()
		}
	})

	bs.watch('./src/biscuitman.css', async (event, file) => {
		if (event === 'change') {
			await styles()
			console.log(`File ${file} has changed`)
		}
	})

	bs.init({
		server: './',
		files: ['./dist/*','index.html','./src/*.css','./src/*.js', './src/*.mjs'], // watch
		port: 3000,
		// https: { // required for https cookies
		// 	key: './server.key',
		// 	cert: './server.crt'
		// },
		open: false,
		notify: false
	})
}

async function main() {
	const args = process.argv.slice(2)

	for (let arg of args) {
		switch (arg) {
			case 'serve': serve(); break
			case 'styles': styles(); break
			case 'scripts': scripts(); break
			case 'build': build(); break
			case 'report': report(); break
			case 'jsreport': jsreport(); break
			default: break
		}
	}
}

main().catch(err => console.error('Error:', err))
