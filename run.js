import fs from 'fs'
import browserSync from 'browser-sync'
import swc from '@swc/core'
import { transform as transformCss, browserslistToTargets, Features } from 'lightningcss'
import browserslist from 'browserslist'
import { Readable } from 'stream'
import doiuse from 'doiuse/stream'
import zlib from 'node:zlib'

const { readFile, writeFile } = fs.promises
const log = (level,msg) => console.log(`\x1b[33m[${level}]\x1b[0m ${msg}`)
const packageJson = JSON.parse(await readFile('./package.json'))
const { name, version, browserslist: browserlistString } = packageJson
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
	minMjsWithCss: 'biscuitman.withcss.min.mjs',
	dialogPolyfillJsWithCss: 'dialog-polyfill.withcss.js',
	dialogPolyfillJsWithCssMin: 'dialog-polyfill.withcss.min.js',
	legacyJs: 'biscuitman.legacy.js',
	legacyMinJs: 'biscuitman.legacy.min.js',
	legacyCss: 'biscuitman.legacy.css',
	legacyMinCss: 'biscuitman.legacy.min.css',
}

export async function styles(skipFileSave) {
	const sourceStyles = await readFile(`src/${filenames.css}`, 'utf8')

	let processedStyles = transformCss({
		code: Buffer.from(sourceStyles),
		minify: false,
		sourceMap: false,
		targets: browserslistToTargets(browserslist(browserlistString)),
		include: Features.Nesting,
		exclude: Features.Colors | Features.LogicalProperties
	})
	let css = `${comment}\n` + processedStyles.code
	if (!skipFileSave) await writeFile(`dist/${filenames.css}`, css)
	log('css',`Saved dist/${filenames.css}`)

	let minifiedStyles = transformCss({
		code: Buffer.from(sourceStyles),
		minify: true,
		sourceMap: false,
		targets: browserslistToTargets(browserslist(browserlistString)),
		include: Features.Nesting,
		exclude: Features.Colors | Features.LogicalProperties
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

async function buildLegacy() {
	// Disable legacy builds for now
	/*
		2024-09-18
		Latest progress Firefox 25, Chrome 30, Safari 7, IE 11 Js mostly
		working but for Symbol.iterator call. Solution probably to swap
		out swc ES5 transpilation for babel.
	*/
	if (packageJson) return
	const legacyBrowserlistString = 'ie >=11, chrome >=30, firefox >=25, safari >=7' // 2013 browsers
	const legacyComment = comment.replace('biscuitman','biscuitman (legacy)')

	// Legacy Styles
	const sourceStyles = await readFile(`src/${filenames.css}`, 'utf8')
	let processedStyles = transformCss({
		code: Buffer.from(sourceStyles),
		minify: false,
		sourceMap: false,
		targets: browserslistToTargets(browserslist(legacyBrowserlistString)),
		include: Features.Nesting
	})
	// Flatten CSS custom properties
	let flatCss = `${processedStyles.code}`
		.replaceAll('var(--ui)','0,0,0')
		.replaceAll('var(--tx)','#444')
		.replaceAll('var(--bg)','#fff')
		.replaceAll('var(--c)','#105d89')

	let css = `${legacyComment}\n` + flatCss
	await writeFile(`dist/${filenames.legacyCss}`, css)
	log('css',`Saved dist/${filenames.legacyCss}`)

	// Legacy JS
	const sourceJs = await readFile(`src/${filenames.js}`, 'utf8')
	const legacyPolyfills = await readFile('src/legacyPolyfills.js', 'utf8')

	const legacyJs = swc.transform(`${legacyPolyfills};${sourceJs}`, {
		sourceMaps: false,
		isModule: false,
		env: {
			targets: legacyBrowserlistString,
		},
		jsc: {
			parser: {
				syntax: 'ecmascript',
				target: 'es5',
			},
		},
		minify: false,
	}).then(async ({ code }) => {
		// Bugfix swc transpilation helper
		code = code
			.replace('var ownKeys = Object.keys(source);','var ownKeys = Object.keys(typeof source === "object" ? source : {});') // bugfix swc transpilation
		await writeFile(`dist/${filenames.legacyJs}`, `${comment}\n${code}`)
		log('js',`Saved dist/${filenames.legacyJs}`)
		return code
	})


	const minLegacyJs = swc.transform(await legacyJs, {
		sourceMaps: false,
		isModule: false,
		env: {
			targets: legacyBrowserlistString
		},
		jsc: {
			parser: {
				target: 'es5'
			},
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
		await writeFile(`dist/${filenames.legacyMinJs}`, code)
		log('js',`Saved dist/${filenames.legacyMinJs}`)
		return code
	})

	return Promise.all([legacyJs, minLegacyJs])
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

	// Build Dialog Polyfill
	const dialogPolyfillJs = await readFile('node_modules/dialog-polyfill/dist/dialog-polyfill.js', 'utf8')
	const dialogPolyfillJsMin = await swc.transform(dialogPolyfillJs, {
		sourceMaps: false,
		isModule: false,
		jsc: {
			minify: {
				compress: {
					unused: true
				},
				mangle: false
			}
		},
		minify: true
	})

	const dialogPolyfillCss = await readFile('node_modules/dialog-polyfill/dist/dialog-polyfill.css', 'utf8')
	const dialogPolyfillCssMin = transformCss({
		code: Buffer.from(dialogPolyfillCss),
		minify: true,
		sourceMap: false
	})
	//TODO: This outputs compressed HEX RGBA which might not work for older browsers

	const dialogPolyfillJsCss = `${comment}/* dialog-polyfill.js ${packageJson.devDependencies['dialog-polyfill']}*/
${dialogPolyfillJs}
(function(d) {
	var css=d.createElement('style');
	css.textContent='${comment}${dialogPolyfillCssMin.code}';
	d.head.appendChild(css)
})(document);`
	const dialogPolyfillJsCssMin = `${comment}/* dialog-polyfill.js ${packageJson.devDependencies['dialog-polyfill']}*/${dialogPolyfillJsMin.code};(function(d){var c=d.createElement('style');c.textContent='${comment}${dialogPolyfillCssMin.code}';d.head.appendChild(c)})(document);`

	await Promise.all([
		writeFile(`dist/${filenames.dialogPolyfillJsWithCss}`, dialogPolyfillJsCss),
		writeFile(`dist/${filenames.dialogPolyfillJsWithCssMin}`, dialogPolyfillJsCssMin),
	])
	log('build',`Saved dist/${filenames.dialogPolyfillJsWithCss}`)
	log('build',`Saved dist/${filenames.dialogPolyfillJsWithCssMin} ${getCompressedSizes(dialogPolyfillJsCssMin)}`)

	// Legacy version (WIP: Chrome 37, IE11 etc)
	buildLegacy()

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
		cssreport()
	])
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

	bs.watch([
		'./src/biscuitman.js',
		'./src/biscuitman.mjs'
	], async (event, file) => {
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
		https: { // required for https cookies
			key: './server.key',
			cert: './server.crt'
		},
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
			default: break
		}
	}
}

main().catch(err => console.error('Error:', err))
