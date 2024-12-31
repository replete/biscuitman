let appVersions = [
	['biscuitman.js'],
	['biscuitman.min.js'],
	['biscuitman.withcss.js'],
	['biscuitman.withcss.min.js'],
	['biscuitman.mjs'],
	['biscuitman.min.mjs'],
	['biscuitman.withcss.mjs'],
	['biscuitman.withcss.min.mjs'],
	['biscuitman-legacy.js'],
	['biscuitman-legacy.min.js'],
	['biscuitman-legacy.withcss.js'],
	['biscuitman-legacy.withcss.min.js']
]

appVersions.forEach(([filename])=>{
	describe(`a fresh load of ${filename}`, () => {

		beforeEach(async ()=> {
			setHTML(filename)
			await page.goto(__SERVERURL__, { waitUntil: 'domcontentloaded' })
		})

		afterEach(async () => {
			global.__HTML = null
		})

		test('should load without consents', async () => {
			expect(await utils.getConsent()).toBeEmpty()
			expect(await utils.loadConsents()).toBeNull()
		})

		test('should display a UI', async () => {
			const ui = await page.$('.biscuitman')
			expect(ui).not.toBeNull()

			const banner = await page.$('.biscuitman article')
			expect(await banner.isVisible()).toBe(true)
		})

		it('should have loaded CSS correctly', async () => {
			const element = await page.$('.biscuitman [data-id=accept]')
			const color = await page.evaluate(el => getComputedStyle(el).backgroundColor, element)
			expect(color).toBe('rgb(16, 93, 137)') // #105d89
		})

		test('should open settings modal after clicking settings', async () => {
			await page.click('button[data-id=settings]')
			const dialog = await page.$('dialog')
			expect(await dialog.isVisible()).toBe(true)
		})

		test('should close settings modal after clicking close', async () => {
			await page.click('button[data-id=settings]')
			const dialog = await page.$('dialog')
			await page.click('button[data-id=close]')
			expect(await dialog.isVisible()).toBe(false)
		})

		test('should hide UI and save consents correctly after clicking accept', async () => {
			await page.click('button[data-id=accept]')

			const banner = await page.$('.biscuitman article')
			expect(await banner.isVisible()).toBe(false)

			let entries = [
				['analytics', true],
				['functional', true],
				['advertisement', true],
				['performance', true],
				['uncategorized', true]
			]

			expect(await utils.getConsent()).toContainEntries(entries)
			expect(await utils.loadConsents()).toContainEntries(entries)
		})

		test('should hide UI and save consents correctly after clicking reject', async () => {
			await page.click('button[data-id=reject]')

			const banner = await page.$('.biscuitman article')
			expect(await banner.isVisible()).toBe(false)

			let entries = [
				['analytics', false],
				['functional', false],
				['advertisement', false],
				['performance', false],
				['uncategorized', false]
			]
			expect(await utils.getConsent()).toContainEntries(entries)
			expect(await utils.loadConsents()).toContainEntries(entries)
		})

		test('should hide UI and save consents correctly after selecting some sections', async () => {
			await page.click('button[data-id=settings]')
			await page.click('[for=bm_analytics]')
			await page.click('[for=bm_functional]')
			await page.click('[for=bm_performance]')

			await page.click('button[data-id=save]')

			const banner = await page.$('.biscuitman article')
			expect(await banner.isVisible()).toBe(false)

			let entries = [
				['analytics', true],
				['functional', true],
				['advertisement', false],
				['performance', true],
				['uncategorized', false]
			]

			expect(await utils.getConsent()).toContainEntries(entries)
			expect(await utils.loadConsents()).toContainEntries(entries)
		})

		test('should remove consent preferences when "bmInvalidate" is called', async () => {
			await page.evaluate(() => window.bmInvalidate())
			expect(await utils.getConsent()).toEqual({})
			expect(await utils.loadConsents()).toBeNull()
		})

		test('should update consent preferences when "bmUpdate" is called', async () => {
			await page.evaluate(() => window.bmUpdate())
			const dialog = await page.$('dialog')
			const dialogVisible = await page.evaluate(
				(dialog) => dialog.open,
				dialog
			)
			expect(dialogVisible).toBe(true)
		})

		// TODO test these supported values of Intl.DateTimeFormat().resolvedOptions().timeZone:

		// Africa (52 zones):
		// Africa/Abidjan, Africa/Accra, Africa/Addis_Ababa, Africa/Algiers, Africa/Asmera, Africa/Bamako, Africa/Bangui, Africa/Banjul, Africa/Bissau, Africa/Blantyre, Africa/Brazzaville, Africa/Bujumbura, Africa/Cairo, Africa/Casablanca, Africa/Ceuta, Africa/Conakry, Africa/Dakar, Africa/Dar_es_Salaam, Africa/Djibouti, Africa/Douala, Africa/El_Aaiun, Africa/Freetown, Africa/Gaborone, Africa/Harare, Africa/Johannesburg, Africa/Juba, Africa/Kampala, Africa/Khartoum, Africa/Kigali, Africa/Kinshasa, Africa/Lagos, Africa/Libreville, Africa/Lome, Africa/Luanda, Africa/Lubumbashi, Africa/Lusaka, Africa/Malabo, Africa/Maputo, Africa/Maseru, Africa/Mbabane, Africa/Mogadishu, Africa/Monrovia, Africa/Nairobi, Africa/Ndjamena, Africa/Niamey, Africa/Nouakchott, Africa/Ouagadougou, Africa/Porto-Novo, Africa/Sao_Tome, Africa/Tripoli, Africa/Tunis, Africa/Windhoek

		// America (143 zones):
		// America/Adak, America/Anchorage, America/Anguilla, America/Antigua, America/Araguaina, America/Argentina/La_Rioja, America/Argentina/Rio_Gallegos, America/Argentina/Salta, America/Argentina/San_Juan, America/Argentina/San_Luis, America/Argentina/Tucuman, America/Argentina/Ushuaia, America/Aruba, America/Asuncion, America/Bahia, America/Bahia_Banderas, America/Barbados, America/Belem, America/Belize, America/Blanc-Sablon, America/Boa_Vista, America/Bogota, America/Boise, America/Buenos_Aires, America/Cambridge_Bay, America/Campo_Grande, America/Cancun, America/Caracas, America/Catamarca, America/Cayenne, America/Cayman, America/Chicago, America/Chihuahua, America/Ciudad_Juarez, America/Coral_Harbour, America/Cordoba, America/Costa_Rica, America/Creston, America/Cuiaba, America/Curacao, America/Danmarkshavn, America/Dawson, America/Dawson_Creek, America/Denver, America/Detroit, America/Dominica, America/Edmonton, America/Eirunepe, America/El_Salvador, America/Fort_Nelson, America/Fortaleza, America/Glace_Bay, America/Godthab, America/Goose_Bay, America/Grand_Turk, America/Grenada, America/Guadeloupe, America/Guatemala, America/Guayaquil, America/Guyana, America/Halifax, America/Havana, America/Hermosillo, America/Indiana/Knox, America/Indiana/Marengo, America/Indiana/Petersburg, America/Indiana/Tell_City, America/Indiana/Vevay, America/Indiana/Vincennes, America/Indiana/Winamac, America/Indianapolis, America/Inuvik, America/Iqaluit, America/Jamaica, America/Jujuy, America/Juneau, America/Kentucky/Monticello, America/Kralendijk, America/La_Paz, America/Lima, America/Los_Angeles, America/Louisville, America/Lower_Princes, America/Maceio, America/Managua, America/Manaus, America/Marigot, America/Martinique, America/Matamoros, America/Mazatlan, America/Mendoza, America/Menominee, America/Merida, America/Metlakatla, America/Mexico_City, America/Miquelon, America/Moncton, America/Monterrey, America/Montevideo, America/Montserrat, America/Nassau, America/New_York, America/Nome, America/Noronha, America/North_Dakota/Beulah, America/North_Dakota/Center, America/North_Dakota/New_Salem, America/Ojinaga, America/Panama, America/Paramaribo, America/Phoenix, America/Port-au-Prince, America/Port_of_Spain, America/Porto_Velho, America/Puerto_Rico, America/Punta_Arenas, America/Rankin_Inlet, America/Recife, America/Regina, America/Resolute, America/Rio_Branco, America/Santarem, America/Santiago, America/Santo_Domingo, America/Sao_Paulo, America/Scoresbysund, America/Sitka, America/St_Barthelemy, America/St_Johns, America/St_Kitts, America/St_Lucia, America/St_Thomas, America/St_Vincent, America/Swift_Current, America/Tegucigalpa, America/Thule, America/Tijuana, America/Toronto, America/Tortola, America/Vancouver, America/Whitehorse, America/Winnipeg, America/Yakutat

		// Antarctica (11 zones):
		// Antarctica/Casey, Antarctica/Davis, Antarctica/DumontDUrville, Antarctica/Macquarie, Antarctica/Mawson, Antarctica/McMurdo, Antarctica/Palmer, Antarctica/Rothera, Antarctica/Syowa, Antarctica/Troll, Antarctica/Vostok

		// Arctic (1 zones):
		// Arctic/Longyearbyen

		// Asia (83 zones):
		// Asia/Aden, Asia/Almaty, Asia/Amman, Asia/Anadyr, Asia/Aqtau, Asia/Aqtobe, Asia/Ashgabat, Asia/Atyrau, Asia/Baghdad, Asia/Bahrain, Asia/Baku, Asia/Bangkok, Asia/Barnaul, Asia/Beirut, Asia/Bishkek, Asia/Brunei, Asia/Calcutta, Asia/Chita, Asia/Choibalsan, Asia/Colombo, Asia/Damascus, Asia/Dhaka, Asia/Dili, Asia/Dubai, Asia/Dushanbe, Asia/Famagusta, Asia/Gaza, Asia/Hebron, Asia/Hong_Kong, Asia/Hovd, Asia/Irkutsk, Asia/Jakarta, Asia/Jayapura, Asia/Jerusalem, Asia/Kabul, Asia/Kamchatka, Asia/Karachi, Asia/Katmandu, Asia/Khandyga, Asia/Krasnoyarsk, Asia/Kuala_Lumpur, Asia/Kuching, Asia/Kuwait, Asia/Macau, Asia/Magadan, Asia/Makassar, Asia/Manila, Asia/Muscat, Asia/Nicosia, Asia/Novokuznetsk, Asia/Novosibirsk, Asia/Omsk, Asia/Oral, Asia/Phnom_Penh, Asia/Pontianak, Asia/Pyongyang, Asia/Qatar, Asia/Qostanay, Asia/Qyzylorda, Asia/Rangoon, Asia/Riyadh, Asia/Saigon, Asia/Sakhalin, Asia/Samarkand, Asia/Seoul, Asia/Shanghai, Asia/Singapore, Asia/Srednekolymsk, Asia/Taipei, Asia/Tashkent, Asia/Tbilisi, Asia/Tehran, Asia/Thimphu, Asia/Tokyo, Asia/Tomsk, Asia/Ulaanbaatar, Asia/Urumqi, Asia/Ust-Nera, Asia/Vientiane, Asia/Vladivostok, Asia/Yakutsk, Asia/Yekaterinburg, Asia/Yerevan

		// Atlantic (10 zones):
		// Atlantic/Azores, Atlantic/Bermuda, Atlantic/Canary, Atlantic/Cape_Verde, Atlantic/Faeroe, Atlantic/Madeira, Atlantic/Reykjavik, Atlantic/South_Georgia, Atlantic/St_Helena, Atlantic/Stanley

		// Australia (11 zones):
		// Australia/Adelaide, Australia/Brisbane, Australia/Broken_Hill, Australia/Darwin, Australia/Eucla, Australia/Hobart, Australia/Lindeman, Australia/Lord_Howe, Australia/Melbourne, Australia/Perth, Australia/Sydney

		// Europe (58 zones):
		// Europe/Amsterdam, Europe/Andorra, Europe/Astrakhan, Europe/Athens, Europe/Belgrade, Europe/Berlin, Europe/Bratislava, Europe/Brussels, Europe/Bucharest, Europe/Budapest, Europe/Busingen, Europe/Chisinau, Europe/Copenhagen, Europe/Dublin, Europe/Gibraltar, Europe/Guernsey, Europe/Helsinki, Europe/Isle_of_Man, Europe/Istanbul, Europe/Jersey, Europe/Kaliningrad, Europe/Kiev, Europe/Kirov, Europe/Lisbon, Europe/Ljubljana, Europe/London, Europe/Luxembourg, Europe/Madrid, Europe/Malta, Europe/Mariehamn, Europe/Minsk, Europe/Monaco, Europe/Moscow, Europe/Oslo, Europe/Paris, Europe/Podgorica, Europe/Prague, Europe/Riga, Europe/Rome, Europe/Samara, Europe/San_Marino, Europe/Sarajevo, Europe/Saratov, Europe/Simferopol, Europe/Skopje, Europe/Sofia, Europe/Stockholm, Europe/Tallinn, Europe/Tirane, Europe/Ulyanovsk, Europe/Vaduz, Europe/Vatican, Europe/Vienna, Europe/Vilnius, Europe/Volgograd, Europe/Warsaw, Europe/Zagreb, Europe/Zurich

		// Indian (11 zones):
		// Indian/Antananarivo, Indian/Chagos, Indian/Christmas, Indian/Cocos, Indian/Comoro, Indian/Kerguelen, Indian/Mahe, Indian/Maldives, Indian/Mauritius, Indian/Mayotte, Indian/Reunion

		// Pacific (38 zones):
		// Pacific/Apia, Pacific/Auckland, Pacific/Bougainville, Pacific/Chatham, Pacific/Easter, Pacific/Efate, Pacific/Enderbury, Pacific/Fakaofo, Pacific/Fiji, Pacific/Funafuti, Pacific/Galapagos, Pacific/Gambier, Pacific/Guadalcanal, Pacific/Guam, Pacific/Honolulu, Pacific/Kiritimati, Pacific/Kosrae, Pacific/Kwajalein, Pacific/Majuro, Pacific/Marquesas, Pacific/Midway, Pacific/Nauru, Pacific/Niue, Pacific/Norfolk, Pacific/Noumea, Pacific/Pago_Pago, Pacific/Palau, Pacific/Pitcairn, Pacific/Ponape, Pacific/Port_Moresby, Pacific/Rarotonga, Pacific/Saipan, Pacific/Tahiti, Pacific/Tarawa, Pacific/Tongatapu, Pacific/Truk, Pacific/Wake, Pacific/Wallis

		// UTC (1 zones):
		// UTC

		test('should auto-consent if when the timezone is America/New_York', async () => {
			setHTML(
				filename,
				{
					mockTimeZone: 'America/New_York',
				},
				{
					acceptNonEU: true
				}
			)
			await page.goto(__SERVERURL__, { waitUntil: 'domcontentloaded' })

			const banner = await page.$('.biscuitman article')
			expect(await banner.isVisible()).toBe(false)

			let entries = [
				['analytics', true],
				['functional', true],
				['advertisement', true],
				['performance', true],
				['uncategorized', true]
			]

			expect(await utils.getConsent()).toContainEntries(entries)
			expect(await utils.loadConsents()).toContainEntries(entries)
		})

		test('should not auto-consent if when the timezone is European', async () => {
			setHTML(
				filename,
				{
					mockTimeZone: 'Europe/Amsterdam',
				},
				{
					acceptNonEU: true
				}
			)
			await page.goto(__SERVERURL__, { waitUntil: 'domcontentloaded' })

			const banner = await page.$('.biscuitman article')
			expect(await banner.isVisible()).toBe(true)

		})
	})
})

function setHTML(filename, options, configOverride) {
	let isModule = filename.endsWith('.mjs')
	let config = {
		message: 'By clicking "Accept All", you agree to the use of cookies for improving browsing, providing personalized ads or content, and analyzing traffic. {link}',
		info: `Cookies categorized as "Essential" are stored in your browser to enable basic site functionalities.
Additionally, third-party cookies are utilized to analyze website usage, store preferences, and deliver relevant content and advertisements with your consent.
While you have the option to enable or disable some or all of these cookies, note that disabling certain ones may impact your browsing experience.`,
		linkText: 'Privacy Policy',
		linkURL: 'https://domain.com/privacy-policy',
		sections: ['essential','functional','analytics','performance','advertisement','uncategorized'],
		essentialTitle: 'Essential',
		essentialMessage: 'Essential cookies are required for basic site functionality',
		essentialCookies: {
			'myconsent': 'This key is required to store your consent preferences'
		},
		functionalTitle: 'Functional',
		functionalMessage: 'Functional cookies allow us to perform specific tasks such as sharing website content on social media platforms, gathering feedback, and enabling other third-party features',
		functionalCookies: {
			'biscuitselector':'Your favourite biscuit is stored here'
		},
		analyticsTitle: 'Analytics',
		analyticsMessage: 'Analytical cookies allow us to understand visitor interactions with the website, offering insights into metrics like visitor count, bounce rate, and traffic source',
		analyticsCookies: {
			'_ga': 'This cookie, set by Google Analytics, computes visitor, session, and campaign data, tracking site usage for analytical reports. It stores information anonymously, assigning a randomly generated number to identify unique visitors',
			'_ga_*': 'Google Analytics uses this cookie for storing page view count',
			'sc_is_visitor_unique': 'Statcounter uses this as a visit counter',
			'sc_medium_source': 'Statcounter uses this to store the referring website',
			'statcounter.com/localstorage/': 'Statcounter uses this to count',
			'_pk_*': 'Matomo/Piwik analytics',
			'_hj*': 'Hotjar analytics',
			'mp_*': 'Mixpanel analytics',
			'_kvyo_*': 'Klaviyo analytics',
			'__kla_id': 'Klaviyo analytics'
		},
		performanceTitle: 'Performance',
		performanceMessage: 'Performance cookies allow us to understand critical website performance indicators, contributing to an enhanced user experience for visitors',
		advertisementTitle: 'Advertisement',
		advertisementMessage: 'Advertisement cookies serve to deliver tailored advertisements to visitors based on their previous page visits and to evaluate the efficacy of advertising campaigns',
		uncategorizedTitle: 'Uncategorized',
		uncategorizedMessage: 'Uncategorized cookies are those currently under analysis and have not yet been assigned to a specific category',
		acceptNonEU: false,
		force: false,
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
	if (isModule) html+=`
	<!-- Biscuitman config -->
	<script type="module" id="js-biscuitman-init">
		import biscuitman from '/dist/esm/${filename}'
		let bm = biscuitman.create(${JSON.stringify(config)})
	</script>
`
	else html+= `
	<!-- Biscuitman config -->
	<script id="js-biscuitman-config">
		biscuitman = ${JSON.stringify(config)}
	</script>

	<!-- Biscuitman: load -->
	<script src="dist/${filename}" id="js-biscuitman"></script>

`
	html+= `
	</body>
	</html>`
	global.__HTML__ = html
}
