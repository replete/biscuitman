import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as base, expect } from '@playwright/test'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const BASE_URL = 'http://localhost:3003'

const MIME_TYPES = {
	'.js': 'text/javascript',
	'.mjs': 'text/javascript',
	'.css': 'text/css',
	'.html': 'text/html',
	'.json': 'application/json',
	'.map': 'application/json'
}

export const appVersions = [
	'biscuitman.js',
	'biscuitman.min.js',
	'biscuitman.withcss.js',
	'biscuitman.withcss.min.js',
	'biscuitman.mjs',
	'biscuitman.min.mjs',
	'biscuitman.withcss.mjs',
	'biscuitman.withcss.min.mjs',
	'biscuitman-legacy.js',
	'biscuitman-legacy.min.js',
	'biscuitman-legacy.withcss.js',
	'biscuitman-legacy.withcss.min.js'
]

// only test the main version in CI
export const testedVersions = process.env.GITHUB_ACTIONS === 'true' ? ['biscuitman.js'] : appVersions

/**
 * The generated page is fulfilled straight from memory and dist/ assets are
 * read off disk, so the suite needs no web server and no shared port. That is
 * what makes it safe to run every bundle variant in parallel.
 */
export const test = base.extend({
	load: async ({ page }, use) => {
		let html = ''

		await page.route('**/*', async (route) => {
			const url = new URL(route.request().url())

			// Third-party analytics: the <script> element still lands in the DOM,
			// but nothing leaves the machine.
			if (url.origin !== BASE_URL) return route.abort()

			if (url.pathname === '/') {
				return route.fulfill({ contentType: 'text/html; charset=utf-8', body: html })
			}

			const filePath = path.resolve(ROOT, '.' + url.pathname)
			if (!filePath.startsWith(ROOT + path.sep)) return route.fulfill({ status: 403, body: '' })

			try {
				return route.fulfill({
					contentType: MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream',
					body: await readFile(filePath)
				})
			} catch {
				return route.fulfill({ status: 404, body: '' })
			}
		})

		await use(async (filename, options, configOverride) => {
			html = buildHTML(filename, options, configOverride)
			await page.goto('/', { waitUntil: 'domcontentloaded' })
		})
	},

	consent: async ({ page }, use) => {
		await use({
			getConfig: () => page.evaluate(() => window.biscuitman),
			getConsent: () => page.evaluate(() => window.Consent),
			loadConsents: () => page.evaluate(() => JSON.parse(localStorage.getItem('myconsent')))
		})
	}
})

export { expect }

export function buildHTML(filename, options, configOverride) {
	let isModule = filename.endsWith('.mjs')
	let config = {
		message:
			'By clicking "Accept All", you agree to the use of cookies for improving browsing, providing personalized ads or content, and analyzing traffic. {link}',
		info: `Cookies categorized as "Essential" are stored in your browser to enable basic site functionalities.
Additionally, third-party cookies are utilized to analyze website usage, store preferences, and deliver relevant content and advertisements with your consent.
While you have the option to enable or disable some or all of these cookies, note that disabling certain ones may impact your browsing experience.`,
		linkText: 'Privacy Policy',
		linkURL: 'https://domain.com/privacy-policy',
		sections: ['essential', 'functional', 'analytics', 'performance', 'advertisement', 'uncategorized'],
		essentialTitle: 'Essential',
		essentialMessage: 'Essential cookies are required for basic site functionality',
		essentialCookies: {
			myconsent: 'This key is required to store your consent preferences'
		},
		functionalTitle: 'Functional',
		functionalMessage:
			'Functional cookies allow us to perform specific tasks such as sharing website content on social media platforms, gathering feedback, and enabling other third-party features',
		functionalCookies: {
			biscuitselector: 'Your favourite biscuit is stored here'
		},
		analyticsTitle: 'Analytics',
		analyticsMessage:
			'Analytical cookies allow us to understand visitor interactions with the website, offering insights into metrics like visitor count, bounce rate, and traffic source',
		analyticsCookies: {
			_ga: 'This cookie, set by Google Analytics, computes visitor, session, and campaign data, tracking site usage for analytical reports. It stores information anonymously, assigning a randomly generated number to identify unique visitors',
			'_ga_*': 'Google Analytics uses this cookie for storing page view count',
			sc_is_visitor_unique: 'Statcounter uses this as a visit counter',
			sc_medium_source: 'Statcounter uses this to store the referring website',
			'statcounter.com/localstorage/': 'Statcounter uses this to count',
			'_pk_*': 'Matomo/Piwik analytics',
			'_hj*': 'Hotjar analytics',
			'mp_*': 'Mixpanel analytics',
			'_kvyo_*': 'Klaviyo analytics',
			__kla_id: 'Klaviyo analytics'
		},
		performanceTitle: 'Performance',
		performanceMessage:
			'Performance cookies allow us to understand critical website performance indicators, contributing to an enhanced user experience for visitors',
		advertisementTitle: 'Advertisement',
		advertisementMessage:
			'Advertisement cookies serve to deliver tailored advertisements to visitors based on their previous page visits and to evaluate the efficacy of advertising campaigns',
		uncategorizedTitle: 'Uncategorized',
		uncategorizedMessage:
			'Uncategorized cookies are those currently under analysis and have not yet been assigned to a specific category',
		acceptNonEU: false,
		force: false
	}

	if (configOverride) config = { ...config, ...configOverride }

	let html = `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${filename}</title>
	${filename.includes('withcss') ? '' : '<link rel="stylesheet" href="dist/biscuitman.css"/>'}
	${options?.mockTimeZone ? `<script>Intl.DateTimeFormat = () => ({resolvedOptions: () => ({timeZone: '${options.mockTimeZone}'})})</script>` : ''}
</head>
<body style="height:1500px">
<main><h1>${filename}</h1></main>
<!-- Google Analytics -->
	<script type="text/javascript" id="js-analytics-gtm-setup">
		window.dataLayer = window.dataLayer || [];
		function gtag(){dataLayer.push(arguments);}
		gtag('js', new Date());
		gtag('config', 'G-TEST');
	</script>
	<script type="text/plain" data-consent="analytics" async src="https://www.googletagmanager.com/gtag/js?id=G-TEST" id="js-analytics-gtm"></script>

	<!-- Statcounter -->
	<script id="js-analytics-statcounter-setup">
		// not handled by biscuitman
		var sc_project=9999999999999999999
		var sc_invisible=1
		var sc_security="beefbeef"
		var sc_https=1
	</script>
	<script type="text/plain" data-consent="analytics" async src="https://statcounter.com/counter/counter.js" id="js-analytics-statcounter"></script>

	<!-- Matomo Analytics -->
	<script type="text/javascript" id="js-analytics-matomo-setup">
		var _mtm = window._mtm = window._mtm || [];
		_mtm.push({'mtm.startTime': (new Date().getTime()), 'event': 'mtm.Start'});
    	_mtm.push({'idSite': '9999999999999999999'});
	</script>
	<script type="text/plain" data-consent="analytics" defer src="https://cdn.matomo.cloud/demo-web.matomo.org/container_bugnCohE.js" id="js-analytics-matomo">
		console.log('Matomo loaded:', !!Matomo) // only available once loaded
	</script>

	<!-- Hotjar Analytics -->
	<script type="text/plain" data-consent="analytics" id="js-analytics-hotjar">
		(function(h,o,t,j,a,r){
		  h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
		  h._hjSettings={hjid:000000,hjsv:6};
		  a=o.getElementsByTagName('head')[0];
		  r=o.createElement('script');r.async=1;
		  r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
		  a.appendChild(r);
		})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
	  </script>

	  <!-- Mixpanel Analytics -->
	  <script type="text/plain" data-consent="analytics" id="js-analytics-mixpanel">
		(function(f,b){
		  if(!b.__SV){
			var e,g,i,h;
			window.mixpanel=b;
			b._i=[];
			b.init=function(e,f,c){
			  function g(a,d){
				var b=d.split(".");
				2==b.length&&(a=a[b[0]],d=b[1]);
				a[d]=function(){
				  a.push([d].concat(Array.prototype.slice.call(arguments,0)))
				}
			  }
			  var a=b;
			  "undefined"!==typeof c?a=b[c]=[]:c="mixpanel";
			  a.people=a.people||[];
			  a.toString=function(a){
				var d="mixpanel";
				"mixpanel"!==c&&(d+="."+c);
				a||(d+=" (stub)");
				return d
			  };
			  a.people.toString=function(){
				return a.toString(1)+".people (stub)"
			  };
			  i="disable time_event track track_pageview track_links track_forms register register_once alias unregister identify name_tag set_config reset people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user".split(" ");
			  for(h=0;h<i.length;h++)g(a,i[h]);
			  b._i.push([e,f,c])
			};
			b.__SV=1.2;
			e=f.createElement("script");
			e.type="text/javascript";
			e.async=!0;
			e.src="//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";
			g=f.getElementsByTagName("script")[0];
			g.parentNode.insertBefore(e,g)
		  }
		})(document,window.mixpanel||[]);
		mixpanel.init("FAKE_TOKEN");
	  </script>

	<!-- misc analytics -->
	<script type="text/plain" data-consent="analytics" id="js-analytics-misc">
		console.log('analytics consent granted: This script will be inserted when analytics consent is granted')
	</script>

	<script type="text/plain" data-consent="analytics" id="js-analytics-klaviyo-setup">
		var _learnq = _learnq || [];
		_learnq.push(['identify', {
		  // Change the line below to dynamically print the user's email.
		  '$email' : '{{ email }}'
		}]);
	</script>
	<script type="text/plain" data-consent="analytics" src="https://static.klaviyo.com/onsite/js/klaviyo.js" id="js-analytics-klaviyo"></script>

`
	if (isModule)
		html += `
	<!-- Biscuitman config -->
	<script type="module" id="js-biscuitman-init">
		import biscuitman from '/dist/esm/${filename}'
		let bm = biscuitman.create(${JSON.stringify(config)})
	</script>
`
	else
		html += `
	<!-- Biscuitman config -->
	<script id="js-biscuitman-config">
		biscuitman = ${JSON.stringify(config)}
	</script>

	<!-- Biscuitman: load -->
	<script src="dist/${filename}" id="js-biscuitman"></script>

`
	html += `
	</body>
	</html>`
	return html
}
