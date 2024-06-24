import fs from 'fs'
import zlib from 'zlib'
import swc from '@swc/core'
import { transform as transformCss, browserslistToTargets, Features} from 'lightningcss'
import browserslist from 'browserslist'
import browserSync from 'browser-sync'
const { readFile, writeFile } = fs.promises;
const { name, version } = JSON.parse(await readFile('./package.json'))
const comment = `/*! ${name}.js ${version} */`

const filenames = {
	css: 'biscuitman.css',
	minCss: 'biscuitman.min.css',
	js: 'biscuitman.js',
	minJs: 'biscuitman.min.js',
	jsWithCss: 'biscuitman.withcss.js',
	minJsWithCss: 'biscuitman.withcss.min.js'
}
const browserlistString = '>= 2%'

export async function styles() {
	const sourceStyles = await readFile(filenames.css, 'utf8')

	let processedStyles = transformCss({
		code: Buffer.from(sourceStyles),
		minify: false,
		sourceMap: false,
		targets: browserslistToTargets(browserslist(browserlistString)),
		include: Features.Nesting
	})
	await writeFile(`dist/${filenames.css}`, `${comment}\n` + processedStyles.code)
	console.log(`Saved dist/${filenames.css}`)

	let minifiedStyles = transformCss({
		code: Buffer.from(sourceStyles),
		minify: true,
		sourceMap: false,
		targets: browserslistToTargets(browserslist(browserlistString)),
		include: Features.Nesting
	})
	await writeFile(`dist/${filenames.minCss}`, comment + minifiedStyles.code)
	console.log(`Saved dist/${filenames.minCss}`)

	return [processedStyles.code, minifiedStyles.code]
}

export async function scripts() {
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
		await writeFile(`dist/${filenames.js}`, `${comment}\n` + code)
		console.log(`Saved dist/${filenames.js}`)
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
		console.log(`Saved dist/${filenames.minJs}`)
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

	console.log(`Saved dist/${filenames.jsWithCss}
- size: ${jsCss.length} bytes
- gzip: ${zlib.gzipSync(jsCss).length} bytes
- brot: ${zlib.brotliCompressSync(jsCss).length} bytes	
	`)

	console.log(`Saved dist/${filenames.minJsWithCss}
- size: ${jsCssMin.length} bytes
- gzip: ${zlib.gzipSync(jsCssMin).length} bytes
- brot: ${zlib.brotliCompressSync(jsCssMin).length} bytes	
	`)
	console.timeEnd('Build Time')
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
			default: console.log('Usage: node build.js [serve|build|styles|scripts]');
		}
	}
}

main().catch(err => console.error('Error:', err));
