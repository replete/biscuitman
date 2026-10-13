import fs from 'node:fs'
import { Readable } from 'node:stream'
import zlib from 'node:zlib'
import swc from '@swc/core'
import { transform as transformCss, browserslistToTargets, Features } from 'lightningcss'
import browserslist from 'browserslist'
import doiuse from 'doiuse/stream'
// Legacy build tooling:
import * as babel from '@babel/core'
import { rollup } from 'rollup'
import resolve from '@rollup/plugin-node-resolve'

const { readFile, writeFile } = fs.promises
const log = (level,msg) => console.log(`\x1b[33m[${level}]\x1b[0m ${msg}`)
const packageJson = JSON.parse(await readFile('./package.json'))
const { name, version, browserslist: browserlistString } = packageJson
const comment = `/*! ${name}.js ${version} */`
// lightningcss keeps the space after a comma inside custom property values and around var()
const squeeze = ({ code }) => String(code).replaceAll(', ', ',')

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
	legacyJs: 'biscuitman-legacy.js',
	legacyMinJs: 'biscuitman-legacy.min.js',
	legacyCss: 'biscuitman-legacy.css',
	legacyMinCss: 'biscuitman-legacy.min.css',
	legacyJsWithCss: 'biscuitman-legacy.withcss.js',
	minLegacyJsWithCss: 'biscuitman-legacy.withcss.min.js'
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
	let minCss = comment + squeeze(minifiedStyles)
	if (!skipFileSave) await writeFile(`dist/${filenames.minCss}`, minCss)
	log('css',`Saved dist/${filenames.minCss}`)

	return [processedStyles.code, squeeze(minifiedStyles)]
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

	// src/biscuitman.mjs is a wrapper around the browser source, see its header
	const marker = '/* biscuitman.js */'
	const globalConfig = 'w.biscuitman'
	const wrapperMjs = await readFile(`src/${filenames.mjs}`, 'utf8')
	if (!wrapperMjs.includes(marker) || !sourceJs.includes(globalConfig)) throw new Error('ESM build: marker or config reference not found')
	// The leading semicolon stops the inlined IIFE being parsed as a call on the previous line
	const sourceMjs = wrapperMjs.replace(marker, () => ';' + sourceJs.replace(globalConfig, 'config'))
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

// The three demo pages are one template, src/demo.html:
//   <!-- if standard esm --> ... <!-- endif -->   keeps a block on the named pages only
//   <!-- define name ... -->                      sets {{name}} for reuse
//   {{name}}                                      a value from the page or the template
export async function pages() {
	const variants = {
		'index.html': { page: 'standard', title: 'Standard', label: '', bundle: 'biscuitman.js' },
		'index-esm.html': { page: 'esm', title: 'ESM', label: ' (ESM)' },
		'index-legacy.html': { page: 'legacy', title: 'Legacy', label: ' (legacy)', bundle: 'biscuitman-legacy.js' }
	}
	const defined = {}
	const template = (await readFile('src/demo.html', 'utf8')).replace(/<!-- define (\w+)\n([\s\S]*?)\n-->\n/g, (match, key, value) => {
		defined[key] = value
		return ''
	})

	await Promise.all(Object.entries(variants).map(([file, variant]) => {
		const values = {
			...defined,
			...variant,
			version,
			generated: '<!-- Generated from src/demo.html by "npm run build": edit that file, not this one -->',
			demos: Object.entries(variants).map(([href, { title }]) => href === file ? `<strong>${title}</strong>` : `<a href="${href}">${title}</a>`).join(' · ')
		}
		const html = template
			.replace(/<!-- if ([\w ]+) -->\n([\s\S]*?)<!-- endif -->\n/g, (match, names, block) => names.split(' ').includes(variant.page) ? block : '')
			.replace(/\{\{(\w+)\}\}/g, (match, key) => {
				if (!(key in values)) throw new Error(`src/demo.html: unknown {{${key}}}`)
				return values[key]
			})
		log('pages', `Saved ${file}`)
		return writeFile(file, html)
	}))
}

async function buildLegacy() {
	const legacyBrowserlistString = 'ie 11, chrome 30, firefox 25, safari 7' // 2013 browsers
	const legacyComment = comment.replace('biscuitman.js','biscuitman-legacy.js')

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
		.replaceAll('var(--bm-ui)','0,0,0')
		.replaceAll('var(--bm-tx)','#444')
		.replaceAll('var(--bm-bg)','#fff')
		.replaceAll('var(--bm-c)','#105d89')
		.replaceAll('var(--bm-h)','1.2em')
		.replaceAll('var(--bm-w)','2.3em')
	let legacyCss = flatCss
	await writeFile(`dist/${filenames.legacyCss}`, `${legacyComment}\n` + legacyCss)
	log('legacy',`Saved dist/${filenames.legacyCss}`)

	let legacyMinifiedCss = transformCss({
		code: Buffer.from(legacyCss),
		minify: true,
		sourceMap: false,
		targets: browserslistToTargets(browserslist(legacyBrowserlistString)),
		include: Features.Nesting
	})
	let legacyMinCss = legacyComment + squeeze(legacyMinifiedCss)
	await writeFile(`dist/${filenames.legacyMinCss}`, legacyMinCss)
	log('legacy',`Saved dist/${filenames.legacyMinCss}`)

	// Legacy JS
	const sourceJs = await readFile(`src/${filenames.js}`, 'utf8')
	const legacyPolyfillsJs = await readFile('src/legacyPolyfills.js', 'utf8')
	const { code } = await babel.transformAsync(sourceJs, {
		presets: [
			['@babel/preset-env', {
				targets: {
					browsers: legacyBrowserlistString.split(', ')
				},
				modules: false,
			}],
		],
		plugins: [
			['@babel/plugin-transform-for-of', {
				assumeArray: true // Fixes IE11
			}]
		]
	})
	const bundle = await rollup({
		input: 'virtual-entry',
		plugins: [
			{
				name: 'virtual-entry',
				resolveId(id) {
					return id === 'virtual-entry' ? id : null
				},
				load(id) {
					return id === 'virtual-entry' ? `${legacyPolyfillsJs}\n${code}` : null
				},
			},
			resolve({ browser: true }),
		],
	})
	const { output } = await bundle.generate({
		format: 'iife',
		name: 'app',
	})
	const legacyJs = output[0].code
	await writeFile(`dist/${filenames.legacyJs}`, `${legacyComment}\n${legacyJs}`)
	log('legacy',`Saved dist/${filenames.legacyJs}`)

	const legacyJsMin = swc.transform(await legacyJs, {
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
		code = legacyComment + code.replace(/[\n\t]/g,'')
		await writeFile(`dist/${filenames.legacyMinJs}`, code)
		log('legacy',`Saved dist/${filenames.legacyMinJs}`)
		return code
	})

	// Legacy JS with CSS
	let legacyJsCss = `${legacyComment}
${legacyJs}
(function(d){
	var css=d.createElement('style');
	css.textContent='${legacyComment}${legacyMinCss}';
	d.head.appendChild(css);
})(document);`
	let legacyJsCssMin = `${await legacyJsMin};(function(d){var c=d.createElement('style');c.textContent='${legacyComment}${legacyMinCss}';d.head.appendChild(c)})(document);`

	Promise.all([
		writeFile(`dist/${filenames.legacyJsWithCss}`, legacyJsCss),
		writeFile(`dist/${filenames.minLegacyJsWithCss}`, legacyJsCssMin),
	])
	log('legacy',`Saved dist/${filenames.legacyJsWithCss} ${getCompressedSizes(legacyJsCss)}`)
	log('legacy',`Saved dist/${filenames.minLegacyJsWithCss} ${getCompressedSizes(legacyJsCssMin)}`)

	return Promise.all([legacyJsMin])
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
	await buildLegacy()

	await pages()

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
		cssReport()
	])
}

export async function cssReport() {
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
	const { createServer } = await import('vite')
	const certs = ['./server.key', './server.crt']
	const server = await createServer({
		configFile: false,
		appType: 'mpa',
		optimizeDeps: { noDiscovery: true },
		server: {
			port: 3000,
			strictPort: true,
			// https lets the demo delete Secure cookies: npm run makecerts
			https: certs.every(file => fs.existsSync(file)) ? { key: fs.readFileSync(certs[0]), cert: fs.readFileSync(certs[1]) } : undefined,
			watch: { ignored: ['**/__tests__/reports/**'] },
			fs: { deny: ['.env', '.env.*', '*.{crt,pem,key}', '**/.git/**'] }
		}
	})

	let building = false
	server.watcher.on('change', async (file) => {
		file = file.replace(`${process.cwd()}/`, '')
		if (building || !(file.startsWith('src/') || file === 'package.json')) return
		building = true
		log('dev', `${file} changed`)
		await build().catch(err => console.error('Error:', err))
		building = false
		server.ws.send({ type: 'full-reload' })
	})

	await server.listen()
	server.printUrls()
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
