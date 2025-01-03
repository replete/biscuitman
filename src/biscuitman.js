((d, w, O, h)=>{
	const defaults = {
		key: 'myconsent',
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
		info: '',
		more: 'Show more',
		noCookies: 'No cookies to display',
		acceptNonEU: false,
		dialogPolyfill: '/dist/dialog-polyfill.withcss.min.js', // set to false to disable dialog polyfill loading
		// message: 'By clicking "Accept All", you agree to the use of cookies for improving browsing, providing personalized ads or content, and analyzing traffic. {link}',
		// info: `Cookies categorized as "Essential" are stored in your browser to enable basic site functionalities.
		// Additionally, third-party cookies are utilized to analyze website usage, store preferences, and deliver relevant content and advertisements with your consent.
		// While you have the option to enable or disable some or all of these cookies, note that disabling certain ones may impact your browsing experience.`,
		// linkText: 'Privacy Policy',
		// linkURL: 'https://domain.com/privacy-policy',
		// sections: ['essential','functional','analytics','performance','advertisement','uncategorized'],
		// essentialTitle: 'Essential',
		// essentialMessage: 'Essential cookies are required for basic site functionality',
		// functionalTitle: 'Functional',
		// functionalMessage: 'Functional cookies allow us to perform specific tasks such as sharing website content on social media platforms, gathering feedback, and enabling other third-party features',
		// analyticsTitle: 'Analytics',
		// analyticsMessage: 'Analytical cookies allow us to understand visitor interactions with the website, offering insights into metrics like visitor count, bounce rate, and traffic source',
		// analyticsCookies: {
		// 	'_ga': 'This cookie, set by Google Analytics, computes visitor, session, and campaign data, tracking site usage for analytical reports. It stores information anonymously, assigning a randomly generated number to identify unique visitors',
		// 	'_ga_*': 'Google Analytics uses this cookie for storing page view count'
		// },
		// performanceTitle: 'Performance',
		// performanceMessage: 'Performance cookies allow us to understand critical website performance indicators, contributing to an enhanced user experience for visitors',
		// advertisementTitle: 'Advertisement',
		// advertisementMessage: 'Advertisement cookies serve to deliver tailored advertisements to visitors based on their previous page visits and to evaluate the efficacy of advertising campaigns',
		// uncategorizedTitle: 'Uncategorized',
		// uncategorizedMessage: 'Uncategorized cookies are those currently under analysis and have not yet been assigned to a specific category',

	}
	const o = { ...defaults, ...w.biscuitman }

	// UI & Events:

	const ui = d.createElement('div')
	let dialog

	function render() {
		ui.className = 'biscuitman'
		ui.innerHTML = `
<article>
	<b>${o.title}</b>
	<p>${o.message}</p>
	<nav>
		<button data-id=accept>${o.accept}</button>
		<button data-id=settings>${o.settings}</button>
		<button data-id=reject>${o.reject}</button>
	</nav>
</article>
<dialog>
	<div class=bm-dialog>
		<b>${o.settingsTitle}</b>
		<button data-id=close${o.force ? ' disabled' : ''}>×</button>
		<div class=bm-sections>
			<p><span>${o.message}</span></p>
			<p>${o.info.split('\n').map((line, i, arr) =>
				`<span>${line}</span>
				${arr.length > 1 && o.enableMore && i == 0 ?
				`<a data-id=more href=# rel=nofollow>${o.more}</a>` : ''
				}`).join('')}
			</p>
			${o.sections.map(section => {
					let hasConsent = getConsents()[section]
					let isEssential = section === 'essential'
					let disabledProp = isEssential ? 'disabled' : ''
					let checkedProp = isEssential ? 'checked' : ''
					if (hasConsent !== undefined) checkedProp = hasConsent ? 'checked' : ''
					let cookies = o[`${section}Cookies`]
					return `
			<section>
				<details>
					<summary>
						<b>${o[`${section}Title`]}</b>
						<label for=bm_${section} class="${disabledProp} ${checkedProp}">
							<input type=checkbox id=bm_${section} ${disabledProp} ${checkedProp} data-s="${section}"/>
						</label>
						<p>${o[`${section}Message`]}</p>
					</summary>
					${cookies ? O.entries(cookies).map(([k, v]) =>
					`<dl><dt>${k}</dt><dd>${v}</dd></dl>`).join('') :
					`<dl><dd>${o.noCookies}</dd></dl>`}
				</details>
			</section>`}).join('')}
		</div>
		<nav>
			<button data-id=accept>${o.accept}</button>
			<button data-id=save>${o.save}</button>
			<button data-id=reject>${o.reject}</button>
		</nav>
	</div>
</dialog>`.replaceAll('{link}',`<a href="${o.linkURL}">${o.linkText}</a>`)
		ui.onclick = e => {
			let id = e.target.dataset.id
			if (!id) return
			dispatch('button', { id })
			switch (id) {
				case 'more': e.target.remove(); break
				case 'accept': saveConsents(true); break
				case 'close': dialog.close(); break
				case 'settings': openModal(); break
				case 'save': saveConsents(); break
				case 'reject': saveConsents(false)
			}
		}
		ui.onchange = e => {
			if (!e.target.dataset.s) return
			e.target.parentElement.classList.toggle('checked', e.target.checked)
		}
		dialog = ui.querySelector('dialog')
		if (o.dialogPolyfill && !dialog.close) loadDialogPolyfill(dialog)
		dialog.onclose = () => dispatch('close')
		if (o.force) {
			dialog.oncancel = e => e.preventDefault()
			dialog.onkeydown = e => e.key === 'Escape' ? e.preventDefault() : null
		}
		d.body.appendChild(ui)
		w.addEventListener('resize', updateBannerHeight)
	}

	const updateBannerHeight = () => { h.style.setProperty('--bm-height', `${ui.offsetHeight}px`) }
	const displayUI = show => {
		h.classList.toggle('bm-show', show)
		updateBannerHeight()
	}

	const applyCssClasses = () => {
		let { consentTime, ...consents } = getConsents()
		if (!consentTime) consents = O.fromEntries(o.sections.slice(1).map(sectionName => [sectionName, false]))

		for (let [name, granted] of O.entries(consents)) {
			h.classList.toggle(`bm-${name}`, granted)
			h.classList.toggle(`bm-no-${name}`, !granted)
		}
	}

	function openModal() {
		dispatch('open')
		dialog.showModal()
	}

	function dispatch(eventName, data) {
		const name = `bm:${eventName}`
		const payload = {
			...(data !== undefined && data),
			time: +new Date
		}
		d.dispatchEvent(new CustomEvent(name, { detail: payload }))
		console.debug(name, payload)
	}

	function loadDialogPolyfill(dialog) {
		function mount() {
			d.documentElement.classList.add('bm-dialog-polyfill')
			w.dialogPolyfill.registerDialog(dialog)
		}
		if (w.dialogPolyfill) mount()
		else {
			const script = d.createElement('script')
			script.onload = mount
			script.src = o.dialogPolyfill
			d.head.appendChild(script)
		}
	}

	// Data:

	const getConsents = () => w[o.global] || {}

	function setConsents(consents) {
		w[o.global] = consents
		applyCssClasses()
	}

	function checkConsents(oldConsents, newConsents) {
		for (const sectionName in oldConsents)
			if (oldConsents[sectionName] && newConsents[sectionName] === false)
				dispatch('revoke', { section: sectionName })
	}

	function loadConsents() {
		try {
			return JSON.parse(localStorage.getItem(o.key))
		} catch (err) {
			console.error(err)
			localStorage.removeItem(o.key)
			return {}
		}
	}

	function clearStorages() {
		const localStores = O.fromEntries(O.entries(localStorage))
		const cookies = O.fromEntries(
			d.cookie.split('; ').map(cookie => cookie.split('='))
		)
		const { consentTime, ...consents } = loadConsents() || o.sections.slice(1).reduce((consents, section) => {
			consents[section] = false
			return { consentTime: undefined, ...consents }
		}, {})

		for (let [section, sectionConsent] of O.entries(consents)) {
			if (sectionConsent) continue
			let sectionCookieNames = O.keys(o[`${section}Cookies`] || {})

			sectionCookieNames
				.filter(name => name.endsWith('*'))
				.map(wildcardName => {
					O.keys({ ...cookies, ...localStores }).map(name => {
						if (name.startsWith(wildcardName.slice(0, -1))) sectionCookieNames.push(name)
					})
				})

			for (const name of sectionCookieNames) {
				if (cookies[name]) {
					let expiredCookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 UTC;path=/;`
					d.cookie = expiredCookie
					d.cookie = `${expiredCookie}domain=${location.hostname};` // Safari iOS
					d.cookie = `${expiredCookie}domain=.${location.hostname};` // Safari iOS
					dispatch('delete',{ cookie : name })
				}
				if (localStores[name]) {
					localStorage.removeItem(name)
					dispatch('delete',{ localStorage : name })
				}
			}
		}
	}

	function saveConsents(value) {
		const willReadValues = value === undefined
		let consents = {
			consentTime: +new Date()
		}
		o.sections.forEach(section => {
			if (section === 'essential') return
			let sectionElement = ui.querySelector(`[data-s=${section}]`)
			let sectionConsent = willReadValues
				? sectionElement.checked
				: value
			consents[section] = sectionConsent
			if (!willReadValues) sectionElement.checked = value
		})
		checkConsents(getConsents(),consents)
		setConsents(consents)
		localStorage.setItem(o.key, JSON.stringify(consents))
		dispatch('save', { data: consents })
		clearStorages()
		insertScripts()
		if (dialog.open) dialog.close()
		displayUI(false)
	}

	function insertScripts() {
		const scripts = d.querySelectorAll('script[data-consent]')
		scripts.forEach(script => {
			if (!getConsents()[script.dataset.consent]) return

			const newScript = d.createElement('script')
			for (let { name, value } of script.attributes) {
				if (name.startsWith('data-') || name === 'type') continue
				newScript.setAttribute(name, value)
			}
			newScript.setAttribute('type', script.dataset.type || 'text/javascript')
			if (!script.src) newScript.textContent = script.textContent
			script.parentNode.replaceChild(newScript, script)
			dispatch('inject', { el: script, ...(script.id && { id: script.id }) })

			// If tag has src AND tag content, inject new tag adjacent to parent after load
			if (script.src && script.textContent.trim() !== '') newScript.addEventListener('load', () => {
				let afterScript = d.createElement('script')
				afterScript.textContent = script.textContent
				if (script.id) afterScript.id = script.id + '-after'
				newScript.insertAdjacentElement('afterend', afterScript)
				dispatch('inject', { el: afterScript, parent: script, ...(afterScript.id && { id: afterScript.id }) })
			})
		})
	}

	// Start:

	setConsents(loadConsents() || {})

	// Render UI
	render()

	// Optional Non-EU auto-consent
	const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
	const isEuropeTimezone = /^(GMT|UTC)$/.test(tz) || /(Europe|BST|CEST|CET|EET|IST|WEST|WET|GMT-1|GMT-2|UTC+1|UTC+2|UTC+3)/.test(tz)
	if (o.acceptNonEU && !isEuropeTimezone) {
		saveConsents(true)
		displayUI(false)
	}

	// Wipe matching cookies/localStorages without consent
	clearStorages()

	// Consent logic
	if (w[o.global].consentTime) {
		displayUI(false)
		insertScripts()
	} else {
		displayUI(true)
		if (o.force) openModal()
	}


	// Helper  methods
	// <a onclick="bmInvalidate()" href="javascript:void(0)">Delete Consent Preferences</a>
	w.bmInvalidate = () => {
		dispatch('invalidate', { data: getConsents() })
		checkConsents({})
		saveConsents(false)
		setConsents({})
		localStorage.removeItem(o.key)
		displayUI(true)
		if (o.force) dialog.showModal()
	}
	// <a onclick="bmUpdate()" href="javascript:void(0)">Update Consent Preferences</a>
	w.bmUpdate = () => {
		dispatch('update', { data: getConsents() })
		displayUI(true)
		openModal()
	}

})(document, window, Object, document.documentElement)
