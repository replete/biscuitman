((d, w)=>{
	const bm = 'biscuitman'
	const ui = d.createElement('aside')
	let dialog

	const defaults = {
		storageKey: 'myconsent',
		global: 'Consent',
		enableMore: true,
		sections: ['essential'],
		title: 'Your privacy matters',
		msg: 'We use cookies',
		settingsLabel: 'Settings',
		rejectLabel: 'Reject All',
		acceptLabel: 'Accept All',
		saveLabel: 'Save My Settings',
		settingsTitle: 'My Consent Settings',
		info: '',
		moreLabel: 'Show more',
		noCookiesLabel: 'No cookies to display',
		acceptNonEU: false
	}

	// read user options from 'biscuitman' global object
	const o = w.biscuitman ? {...defaults, ...w.biscuitman} : defaults

	// Apply UI and bind events
	function render() {
		const wrapInfo = (text) => text.split('\n').map((line, i, arr) => {
			let more = (arr.length > 1 && o.enableMore && i == 0) 
				? `<a class="more" href="javascript:void(0)">${o.moreLabel}</a>` : ''
			return `<span>${line}${more}</span>`}).join('')
		const addSections = () => {
			let html = ''
			o.sections.forEach(section => {
				let hasConsent = w[o.global][section]
				let isEssential = section === 'essential'
				let isDisabled = isEssential ? 'disabled' : ''
				let isChecked = isEssential ? 'checked' : ''
				if (hasConsent !== undefined) isChecked = hasConsent ? 'checked' : ''
				let title = o[`${section}Title`]
				let message = o[`${section}Message`]
				let cookies = o[`${section}Cookies`]
				let cookiesHtml = cookies
					? Object.entries(cookies).map(([k, v]) => `<p class="bm-s-item"><b>${k}</b><span>${v}</span></p>`).join('')
					: `<p class="bm-s-item">${o.noCookiesLabel}</p>`
				html += `
<section>
	<details>
		<summary>
			<b class="bm-s-title">${title}</b>
			<label for="${bm}_${section}">
				<input type="checkbox" id="${bm}_${section}" ${isDisabled} ${isChecked} data-s="${section}"/>
			</label>
			<p class="bm-s-msg">${message}</p>
		</summary>
		${cookiesHtml}
	</details>
</section>`})
			return html
		}
		ui.id = bm
		ui.classList.add(bm)
		ui.innerHTML = `
<article>
	<div class="bm-front">
		<b class="bm-title">${o.title}</b>
		<p class="bm-msg">${o.msg}</p>
	</div>
	<nav>
		<button data-id="accept">${o.acceptLabel}</button>
		<button data-id="settings">${o.settingsLabel}</button>
		<button data-id="reject">${o.rejectLabel}</button>
	</nav>
</article>
<dialog>
	<div class="bm-wrap">
		<b class="bm-title">${o.settingsTitle}</b>
		<button data-id="close">×</button>
		<div class="bm-main">
			<p class="bm-msg">${o.msg}</p>
			<p class="bm-info">${wrapInfo(o.info)}</p>
			${addSections()}
		</div>
		<nav>
			<button data-id="accept">${o.acceptLabel}</button>
			<button data-id="save">${o.saveLabel}</button>
			<button data-id="reject">${o.rejectLabel}</button>
		</nav>
	</div>
</dialog>`
		ui.querySelectorAll('button').forEach(b => b.addEventListener('click', buttonHandler))
		dialog = ui.querySelector('dialog')
		dialog.addEventListener('close', closeModalHandler)
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
		dispatch('buttonPress', {id})
	}

	function closeModalHandler() {
		dispatch('closeModal')
	}

	function openModal() {
		dialog.showModal()
		dispatch('openModal')
	}

	const displayUI = (show) => d.documentElement.classList[show ? 'remove' : 'add']('js-bm-hidden')

	function readConsent() {
		try {
			return JSON.parse(localStorage.getItem(o.storageKey))
		} catch (err) {
			console.error(`${bm} readConsent error:`, err.message)
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
			w[o.global][section] = willReadValues 
				? ui.querySelector(`[data-s=${section}]`).checked
				: value
			if (!willReadValues) ui.querySelector(`[data-s=${section}]`).checked = value
		})
		localStorage.setItem(o.storageKey, JSON.stringify(w[o.global]))
		insertScripts()
		dispatch('saveConsent', {data: w[o.global]})
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
			dispatch('scriptInjected', {data: script.outerHTML})

			// If tag has src and inline script, insert dependent inline script as new tag on load
			if (script.src && script.textContent.trim() !== '') newScript.addEventListener('load', () => {
				let depScript = d.createElement('script')
				depScript.textContent = script.textContent
				newScript.insertAdjacentElement('afterend', depScript)
				dispatch('scriptLoaded', {data: depScript.outerHTML})
			})
		});
	}

	// Startup

	w[o.global] = readConsent() || {} 

	if (w[o.global].consentTime) {
		displayUI(false)
		insertScripts()
	}

	// Optionally auto-accept consent if timezone is not EU
	const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
	const isEuropeTimezone = /^(GMT|UTC)$/.test(tz) || /(Europe|BST|CEST|CET|EET|IST|WEST|WET|GMT-1|GMT-2|UTC+1|UTC+2|UTC+3)/.test(tz)
	if (o.acceptNonEU && !isEuropeTimezone) {
		saveConsent(true)
		displayUI(false)
	}

	// Initiate UI
	render()

	// Helper global methods 
	// <a onclick="bmUpdateConsent()" href="javascript:void(0)">Update Consent Preferences</a>
	w.bmInvalidateConsent = () => {
		saveConsent(false) // resets UI
		localStorage.removeItem(o.storageKey)
		displayUI(true)
		dispatch('invalidateConsent', readConsent())
	}
	w.bmUpdateConsent = () => {
		openModal()
		dispatch('updateConsent', readConsent())
	}
})(document, window)
