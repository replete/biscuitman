import fs from 'node:fs'
import swc from '@swc/core'
import browserslist from 'browserslist'
import {transform, browserslistToTargets, Features} from 'lightningcss'
const {name, version } = JSON.parse(fs.readFileSync('./package.json'))
const comment = `/*! ${name}.js ${version} */`

const browserlistString = '>= 2%'

const css = fs.readFileSync('biscuitman.css', 'utf8')
let { code } = transform({
	code: Buffer.from(css),
	minify: true,
	sourceMap: false,
	targets: browserslistToTargets(browserslist(browserlistString)),
	include: Features.Nesting
})
fs.writeFileSync('dist/biscuitman.min.css', comment + code)
console.log('Wrote dist/biscuitman.min.css')

const js = fs.readFileSync('biscuitman.js', 'utf8')
swc.transform(js, {
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
		},
		// target: "es2022"
	},
	minify: true
  })
  .then(({code, map}) => {
	const optimizedCode = code
		// remove whitespace:
		.replace(/[\n\t]/g, '')
	fs.writeFileSync('dist/biscuitman.min.js', comment + optimizedCode)
	console.log('Wrote dist/biscuitman.min.js')
	writeJsWithCss(optimizedCode)
  });

  function writeJsWithCss(js) {
	fs.writeFileSync('dist/biscuitman.withcss.min.js', comment + js + 
		`;((d)=>{let c=d.createElement('style');c.textContent=\`${code}\`;d.documentElement.appendChild(c)})(document);`)
	console.log('Wrote dist/biscuitman.withcss.min.js')
  }
