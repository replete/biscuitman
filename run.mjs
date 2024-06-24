import fs from 'fs'
import swc from '@swc/core'
import { transform as transformCss, browserslistToTargets, Features} from 'lightningcss'
import browserslist from 'browserslist'
import browserSync from 'browser-sync'
import { Readable } from 'stream'
import doiuse from 'doiuse/stream'
import { ESLint } from 'eslint'
import zlib from 'zlib'
const { readFile, writeFile } = fs.promises;
const log = msg => console.log(`\x1b[33m[ run ]\x1b[0m ${msg}`)
const { name, version, browserslist: browserlistString } = JSON.parse(await readFile('./package.json'))
const comment = `/*! ${name}.js ${version} */`

const filenames = {
	css: 'biscuitman.css',
	minCss: 'biscuitman.min.css',
	js: 'biscuitman.js',
	minJs: 'biscuitman.min.js',
	jsWithCss: 'biscuitman.withcss.js',
	minJsWithCss: 'biscuitman.withcss.min.js'
}

export async function styles(skipFileSave) {
	const sourceStyles = await readFile(filenames.css, 'utf8')

	let processedStyles = transformCss({
		code: Buffer.from(sourceStyles),
		minify: false,
		sourceMap: false,
		targets: browserslistToTargets(browserslist(browserlistString)),
		include: Features.Nesting
	})
	if (!skipFileSave) await writeFile(`dist/${filenames.css}`, `${comment}\n` + processedStyles.code)
	log(`Saved dist/${filenames.css}`)

	let minifiedStyles = transformCss({
		code: Buffer.from(sourceStyles),
		minify: true,
		sourceMap: false,
		targets: browserslistToTargets(browserslist(browserlistString)),
		include: Features.Nesting
	})
	if (!skipFileSave) await writeFile(`dist/${filenames.minCss}`, comment + minifiedStyles.code)
	log(`Saved dist/${filenames.minCss}`)

	return [processedStyles.code, minifiedStyles.code]
}

export async function scripts(skipFileSave) {
	const sourceJs = await readFile(filenames.js, 'utf8')

	const js = swc.transform(sourceJs, {
		sourceMaps: false,
		isModule: false,
		env: {
			targets: browserlistString
		},
		minify: false
	  })
	  .then(async ({ code }) => {
		if (!skipFileSave) await writeFile(`dist/${filenames.js}`, `${comment}\n` + code)
		log(`Saved dist/${filenames.js}`)
		return code
	});

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
		await writeFile(`dist/${filenames.minJs}`, comment + code.replace(/[\n\t]/g, ''))
		log(`Saved dist/${filenames.minJs}`)
		return code
	})

	return Promise.all([js, minJs])
}

async function build() {
	console.time('Build Time')
	let js = await scripts()
	let css = await styles()

	let jsCss = `${comment}
${js[0]};
((d)=>{
	let css=d.createElement('style');
	css.textContent=\`${css[0]}\`;
	d.head.appendChild(css)
})(document);`
	let jsCssMin = `${comment}${js[1].replace(/[\n\t]/g, '')};((d)=>{let c=d.createElement('style');c.textContent=\`${css[1]}\`;d.head.appendChild(c)})(document);`
	
	await Promise.all([
		writeFile(`dist/${filenames.jsWithCss}`, jsCss),
		writeFile(`dist/${filenames.minJsWithCss}`, jsCssMin)
	])

	log(`Saved dist/${filenames.jsWithCss} (bytes: ${jsCss.length}, ${zlib.gzipSync(jsCss).length} gz, ${zlib.brotliCompressSync(jsCss).length} br)`)
	log(`Saved dist/${filenames.minJsWithCss} (bytes: ${jsCssMin.length}, ${zlib.gzipSync(jsCssMin).length} gz, ${zlib.brotliCompressSync(jsCssMin).length} br)`)

	console.timeEnd('Build Time')
}

async function report() {
	log('Checking JS browser compatibility...')
	let js = await scripts(true)
	const eslint = new ESLint({
		overrideConfig: {
			parserOptions: {
				ecmaVersion: 2018,
			  },
			extends: [
				'plugin:compat/recommended'
			],
			plugins: ['compat'],
			rules: {
				"compat/compat": "error"
			},
			settings: {
				browsers: browserslist(browserlistString)
			},
			env: {
			  browser: true,
			  es6: true,
			}
		}
	})

	const lint = await eslint.lintText(js[0])
	const formatter = await eslint.loadFormatter('stylish')
	const jsReport = formatter.format(lint)
	if (jsReport.length === 0) {
		log('No JS Compatibilty warnings')
	} else console.log(jsReport)

	log('Checking CSS browser compatibility...')
	let css = await styles(true)
	let cssReportData = []
	new Readable({
		read() {
		  this.push(css[0])
		  this.push(null)
		}
	})
	.pipe(doiuse({
		browsers: 'last 2 years',
		ignore: []
	}))
	.on('data',usageInfo => {
		console.log(usageInfo.message.replace('<streaming css input>:',''))
		cssReportData.push(usageInfo)
	})
	.on('end', async data => {
		await writeFile('cssreport.json', JSON.stringify({report: cssReportData}))
		log('Saved cssreport.json')
	})
}

async function serve() {
    const bs = browserSync.create();

    bs.watch('package.json', async (event, file) => {
        if (event === 'change') {
            console.log(`File ${file} has changed`)
            await build()
            bs.reload()
        }
    });

    bs.watch('biscuitman.js', async (event, file) => {
        if (event === 'change') {
            console.log(`File ${file} has changed`)
            await scripts()
            bs.reload()
        }
    });

    bs.watch('biscuitman.css', async (event, file) => {
        if (event === 'change') {
            console.log(`File ${file} has changed`)
            styles()
        }
    })

    bs.init({
        server: './',
        files: ['./dist/*','index.html'], // watch
        port: 3000, 
		https: true, // required for https cookies
        open: false,
        notify: false
    })
}

async function main() {
    const args = process.argv.slice(2);

	for (let arg of args) {
		switch (arg) {
			case 'serve': serve(); break;
			case 'styles': styles(); break;
			case 'scripts': scripts(); break;
			case 'build': build(); break;
			case 'report': report(); break;
			default: console.log('Usage: node build.js [serve|build|styles|scripts]');
		}
	}
}

main().catch(err => console.error('Error:', err));
