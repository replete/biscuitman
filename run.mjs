import fs from 'fs'
import zlib from 'zlib'
import swc from '@swc/core'
import { transform as transformCss, browserslistToTargets, Features} from 'lightningcss'
import browserslist from 'browserslist'
const { readFile, writeFile } = fs.promises;
const { name, version } = JSON.parse(await readFile('./package.json'))
const comment = `/*! ${name}.js ${version} */`

const files = {
	css: 'biscuitman.css',
	minCss: 'biscuitman.min.css',
	js: 'biscuitman.js',
	minJs: 'biscuitman.min.js',
	jsWithCss: 'biscuitman.withcss.js',
	minJsWithCss: 'biscuitman.withcss.min.js'
}
const browserlistString = '>= 2%'

export async function styles() {
	const sourceStyles = await readFile(files.css, 'utf8')

	let processedStyles = transformCss({
		code: Buffer.from(sourceStyles),
		minify: false,
		sourceMap: false,
		targets: browserslistToTargets(browserslist(browserlistString)),
		include: Features.Nesting
	})
	writeFile(`dist/${files.css}`, `${comment}\n` + processedStyles.code)
	console.log(`Saved dist/${files.css}`)

	let minifiedStyles = transformCss({
		code: Buffer.from(sourceStyles),
		minify: true,
		sourceMap: false,
		targets: browserslistToTargets(browserslist(browserlistString)),
		include: Features.Nesting
	})
	writeFile(`dist/${files.minCss}`, comment + minifiedStyles.code)
	console.log(`Saved dist/${files.minCss}`)

	return [processedStyles.code, minifiedStyles.code]
}

export async function scripts() {
	const sourceJs = await readFile(files.js, 'utf8')

	// Processed
	const js = swc.transform(sourceJs, {
		sourceMaps: false,
		isModule: false,
		env: {
			targets: browserlistString
		},
		minify: false
	  })
	  .then(async ({ code }) => {
		await writeFile(`dist/${files.js}`, `${comment}\n` + code)
		console.log(`Saved dist/${files.js}`)
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
		await writeFile(`dist/${files.minJs}`, comment + code.replace(/[\n\t]/g, ''))
		console.log(`Saved dist/${files.minJs}`)
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
	let c=d.createElement('style');
	c.textContent=\`${css[0]}\`;
	d.documentElement.appendChild(c)
})(document);`
	let jsCssMin = `${comment}${js[1].replace(/[\n\t]/g, '')};((d)=>{let c=d.createElement('style');c.textContent=\`${css[1]}\`;d.documentElement.appendChild(c)})(document);`
	
	await Promise.all([
		writeFile(`dist/${files.jsWithCss}`, jsCss),
		writeFile(`dist/${files.minJsWithCss}`, jsCssMin)
	])

	console.log(`Saved dist/${files.jsWithCss}
- size: ${jsCss.length} bytes
- gzip: ${zlib.gzipSync(jsCss).length} bytes
- brot: ${zlib.brotliCompressSync(jsCss).length} bytes	
	`)

	console.log(`Saved dist/${files.minJsWithCss}
- size: ${jsCssMin.length} bytes
- gzip: ${zlib.gzipSync(jsCssMin).length} bytes
- brot: ${zlib.brotliCompressSync(jsCssMin).length} bytes	
	`)
	console.timeEnd('Build Time')
}

async function main() {
    const args = process.argv.slice(2);

	for (let arg of args) {
		switch (arg) {
			case 'serve': serve(); break;
			case 'styles': styles(); break;
			case 'scripts': scripts(); break;
			case 'build': build(); break;
			default: console.log('Usage: node build.js [serve|styles|scripts|build]');
		}
	}
}

main().catch(err => console.error('Error:', err));
