((d, w)=>{
	const bm = 'biscuitman'
	const ui = d.createElement('div')
	let dialog

	const defaults = {
		storageKey: 'myconsent',
		global: 'Consent',
		force:false,
		enableMore: true,
		sections: ['essential'],
		title: 'Your privacy matters',
		message: 'We use cookies',
		settings: 'Settings',
		reject: 'Reject All',
		accept: 'Accept All',
		save: 'Save My Settings',
		settingsTitle: 'My Consent Settings',
		info: ``,
		more: '(Show more)',
		noCookies: 'No cookies to display',
		acceptNonEU: false,
// 		message: 'By clicking "Accept All", you agree to the use of cookies for improving browsing, providing personalized ads or content, and analyzing traffic. {link}',
// 		info: `Cookies categorized as "Essential" are stored in your browser to enable basic site functionalities. 
// Additionally, third-party cookies are utilized to analyze website usage, store preferences, and deliver relevant content and advertisements with your consent.
// While you have the option to enable or disable some or all of these cookies, note that disabling certain ones may impact your browsing experience.`,
// 		linkText: 'Privacy Policy',
// 		linkURL: 'https://domain.com/privacy-policy',
// 		sections: ['essential','functional','analytics','performance','advertisement','uncategorized'],
// 		essentialTitle: 'Essential',
// 		essentialMessage: 'Essential cookies are required for basic site functionality',
// 		functionalTitle: 'Functional',
// 		functionalMessage: 'Functional cookies allow us to perform specific tasks such as sharing website content on social media platforms, gathering feedback, and enabling other third-party features',
// 		analyticsTitle: 'Analytics',
// 		analyticsMessage: 'Analytical cookies allow us to understand visitor interactions with the website, offering insights into metrics like visitor count, bounce rate, and traffic source',
// 		analyticsCookies: {
// 			'_ga': 'This cookie, set by Google Analytics, computes visitor, session, and campaign data, tracking site usage for analytical reports. It stores information anonymously, assigning a randomly generated number to identify unique visitors',
// 			'_ga_*': 'Google Analytics uses this cookie for storing page view count'
// 		},
// 		performanceTitle: 'Performance',
// 		performanceMessage: 'Performance cookies allow us to understand critical website performance indicators, contributing to an enhanced user experience for visitors',
// 		advertisementTitle: 'Advertisement',
// 		advertisementMessage: 'Advertisement cookies serve to deliver tailored advertisements to visitors based on their previous page visits and to evaluate the efficacy of advertising campaigns',
// 		uncategorizedTitle: 'Uncategorized',
// 		uncategorizedMessage: 'Uncategorized cookies are those currently under analysis and have not yet been assigned to a specific category',
	}

	// read user options from 'biscuitman' global object
	const o = w.biscuitman ? {...defaults, ...w.biscuitman} : defaults

	// Apply UI and bind events
	function render() {
		ui.classList.add(bm)
		ui.style = 'position:fixed;background:#fff;bottom:0' // critical css
		ui.innerHTML = `
<article>
	<b>${o.title}</b>
	<p>${o.message}</p>
	<nav>
		<button data-id="accept">${o.accept}</button>
		<button data-id="settings">${o.settings}</button>
		<button data-id="reject">${o.reject}</button>
	</nav>
</article>
<dialog>
	<div class="bm-dialog">
		<b>${o.settingsTitle}</b>
		<button data-id="close"${o.force ? ' disabled' : ''}>×</button>
		<div class="bm-sections">
			<p><span>${o.message}</span></p>
			<p>${
				o.info.split('\n').map((line, i, arr) => {
					let more = (arr.length > 1 && o.enableMore && i == 0) 
						? `<a class="more" href="javascript:void(0)">${o.more}</a>` 
						: ''
					return `<span>${line}${more}</span>`
				}).join('')
			}
			</p>
			${o.sections.map(section => {
				let hasConsent = w[o.global][section]
				let isEssential = section === 'essential'
				let isDisabled = isEssential ? 'disabled' : ''
				let isChecked = isEssential ? 'checked' : ''
				if (hasConsent !== undefined) isChecked = hasConsent ? 'checked' : ''
				let cookies = o[`${section}Cookies`]
				return `
			<section>
				<details>
					<summary>
						<b>${o[`${section}Title`]}</b>
						<label for="${bm}_${section}">
							<input type="checkbox" id="${bm}_${section}" ${isDisabled} ${isChecked} data-s="${section}"/>
						</label>
						<p>${o[`${section}Message`]}</p>
					</summary>
					${cookies
						? Object.entries(cookies).map(([k, v]) => `<dl><dt>${k}</dt><dd>${v}</dd></dl>`).join('')
						: `<dl><dd>${o.noCookies}</dd></dl>`
					}
				</details>
			</section>`
			}).join('')}
		</div>
		<nav>
			<button data-id="accept">${o.accept}</button>
			<button data-id="save">${o.save}</button>
			<button data-id="reject">${o.reject}</button>
		</nav>
	</div>
</dialog>`.replaceAll('{link}',`<a href="${o.linkURL}">${o.linkText}</a>`)
		ui.querySelectorAll('button').forEach(b => b.addEventListener('click', buttonHandler))
		dialog = ui.querySelector('dialog')
		dialog.addEventListener('close', closeModalHandler)
		dialog.addEventListener('cancel', cancelModalHandler)
		const moreLink = ui.querySelector('.more');
		if (moreLink) moreLink.addEventListener('click', moreLink.remove)
		d.body.appendChild(ui)
	}

	function buttonHandler(e) {
		id = e.target.dataset.id
		switch (id) {
			case 'accept': saveConsent(true); break;
			case 'close': dialog.close(); break;
			case 'settings': openModal(); break;
			case 'save': saveConsent(); break;
			case 'reject': saveConsent(false); break;
			default: break
		}
		dispatch('button', {id})
	}

	function closeModalHandler() {
		dispatch('close')
	}

	function cancelModalHandler(e) {
		if (o.force) e.preventDefault()
	}

	function openModal() {
		dialog.showModal()
		dispatch('open')
	}

	const displayUI = (show) => d.documentElement.classList[show ? 'remove' : 'add']('js-bm-hidden')

	function readConsent() {
		try {
			return JSON.parse(localStorage.getItem(o.storageKey))
		} catch (err) {
			console.error(bm, err)
			localStorage.removeItem(o.storageKey) // If there's an error in localstorage, wipe consent data
			return {}
		}
	}

	// Update global and localstorage with consent options
	function saveConsent(value) {
		const willReadValues = value === undefined
		w[o.global].consentTime = +new Date()
		o.sections.forEach(section => {
			if (section === 'essential') return false
			let sectionElement = ui.querySelector(`[data-s=${section}]`)
			w[o.global][section] = willReadValues 
				? sectionElement.checked
				: value
			if (!willReadValues) sectionElement.checked = value
		})
		localStorage.setItem(o.storageKey, JSON.stringify(w[o.global]))
		insertScripts()
		dispatch('save', {data: w[o.global]})
		dialog.close()
		displayUI(false)
	}

	// Custom events in case you want to trigger behaviour
	function dispatch(eventName, data) {
		const name = `${bm}:${eventName}`
		const payload = {
			...(data !== undefined && data),
			time: +new Date()
		}
		d.dispatchEvent(new CustomEvent(name, payload))
		console.debug(name, payload);
	}

	// replaces neutralized script tags with active script tags
	function insertScripts() {
		const scripts = d.querySelectorAll('script[data-consent]')
		scripts.forEach(script => {
			// Check consent
			if (!w[o.global][script.dataset.consent]) return false
			// Create new tag
			const newScript = d.createElement('script')
			// Copy attributes, ignoring data- and type attributes
			for (let { name, value } of script.attributes) {
				if (name.startsWith('data-') || name === 'type') continue
				newScript.setAttribute(name, value)
			}
			// set type property
			newScript.setAttribute('type', script.dataset.type || 'text/javascript')
			// copy inline scripts if they do not have a src attribute
			if (!script.src) newScript.textContent = script.textContent
			// Insert script to DOM
			script.parentNode.replaceChild(newScript, script)
			dispatch('inject', {el: script})

			// If tag has src and inline script, insert dependent inline script as new tag on load
			if (script.src && script.textContent.trim() !== '') newScript.addEventListener('load', () => {
				let depScript = d.createElement('script')
				depScript.textContent = script.textContent
				newScript.insertAdjacentElement('afterend', depScript)
				dispatch('inject', {el: depScript, parent: script})
			})
		});
	}

	// Load consent
	w[o.global] = readConsent() || {} 

	// Optionally auto-accept consent if timezone is not EU
	const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
	const isEuropeTimezone = /^(GMT|UTC)$/.test(tz) || /(Europe|BST|CEST|CET|EET|IST|WEST|WET|GMT-1|GMT-2|UTC+1|UTC+2|UTC+3)/.test(tz)
	if (o.acceptNonEU && !isEuropeTimezone) {
		saveConsent(true)
		displayUI(false)
	}

	// Initiate UI
	render()

	// Consent logic
	if (w[o.global].consentTime) {
		displayUI(false)
		// Consent exists, initiate scripts:
		insertScripts()
	} else if (o.force) {
		// Force consent choice
		openModal()
	}

	// Helper global methods 
	// <a onclick="bmUpdateConsent()" href="javascript:void(0)">Update Consent Preferences</a>
	w.bmInvalidateConsent = () => {
		dispatch('invalidate', {data: readConsent()})
		saveConsent(false) // resets UI
		localStorage.removeItem(o.storageKey)
		displayUI(true)
	}
	w.bmUpdateConsent = () => {
		dispatch('update', {data: readConsent()})
		openModal()
	}
})(document, window)
