import fs from 'node:fs'
import swc from '@swc/core'
import {transform} from 'lightningcss'
const {name, version, repository} = JSON.parse(fs.readFileSync('./package.json'))

const comment = `/*! ${name} ${version} ${repository.url.replace('.git','')} */`

const css = fs.readFileSync('biscuitman.css', 'utf8')
let { code } = transform({
	code: Buffer.from(css),
	minify: true,
	sourceMap: false
})
fs.writeFileSync('biscuitman.min.css', comment + code)
console.log('Written biscuitman.min.css')

const js = fs.readFileSync('biscuitman.js', 'utf8')
swc.transform(js, {
	sourceMaps: false,
	isModule: false,
 
	jsc: {
		minify: {
			compress: {
				unused: true
			},
			mangle: true
		},
		target: "es2022"
	},
	minify: true
  })
  .then(({code, map}) => {
	const codeWithoutWhitespace = code.replace(/[\n\t]/g, '')
	fs.writeFileSync('biscuitman.min.js', comment + codeWithoutWhitespace)
	console.log('Written biscuitman.min.js')
	writeJsAll(codeWithoutWhitespace)
  });

  function writeJsAll(js) {
	fs.writeFileSync('biscuitman.withcss.min.js', comment + js + 
		`;((d)=>{let c=d.createElement('style');c.textContent=\`${code}\`;d.documentElement.appendChild(c)})(document);`)
	console.log('Written biscuitman.min.css.js')
  }
