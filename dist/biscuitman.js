/*! biscuitman.js 0.3.11 */
((d, w, Object1, h, bm)=>{
    const defaults = {
        key: 'myconsent',
        global: 'Consent',
        force: false,
        enableMore: true,
        sections: [
            'essential'
        ],
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
        acceptNonEU: false
    };
    const o = {
        ...defaults,
        ...w.biscuitman
    };
    // UI & Events:
    const ui = d.createElement('div');
    let dialog;
    function render() {
        ui.classList.add(bm);
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
			<p>${o.info.split('\n').map((line, i, arr)=>{
            let more = arr.length > 1 && o.enableMore && i == 0 ? `<a class="more" href="javascript:void(0)">${o.more}</a>` : '';
            return `<span>${line}${more}</span>`;
        }).join('')}
			</p>
			${o.sections.map((section)=>{
            let hasConsent = getConsents()[section];
            let isEssential = section === 'essential';
            let isDisabled = isEssential ? 'disabled' : '';
            let isChecked = isEssential ? 'checked' : '';
            if (hasConsent !== undefined) isChecked = hasConsent ? 'checked' : '';
            let cookies = o[`${section}Cookies`];
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
					${cookies ? Object1.entries(cookies).map((param)=>{
                let [k, v] = param;
                return `<dl><dt>${k}</dt><dd>${v}</dd></dl>`;
            }).join('') : `<dl><dd>${o.noCookies}</dd></dl>`}
				</details>
			</section>`;
        }).join('')}
		</div>
		<nav>
			<button data-id="accept">${o.accept}</button>
			<button data-id="save">${o.save}</button>
			<button data-id="reject">${o.reject}</button>
		</nav>
	</div>
</dialog>`.replaceAll('{link}', `<a href="${o.linkURL}">${o.linkText}</a>`);
        ui.querySelectorAll('button').forEach((b)=>b.addEventListener('click', buttonHandler));
        dialog = ui.querySelector('dialog');
        dialog.addEventListener('close', closeModalHandler);
        dialog.addEventListener('cancel', cancelModalHandler);
        const moreLink = ui.querySelector('.more');
        if (moreLink) moreLink.addEventListener('click', moreLink.remove);
        d.body.appendChild(ui);
    }
    const displayUI = (show)=>ui.classList.toggle('bm-hide', !show);
    const applyCssClasses = ()=>{
        let { consentTime, ...consents } = getConsents();
        // if (!consentTime) h.className = h.className.replace(/\bbm-[^\s]+(\s+|$)/g, '').trim();
        if (!consentTime) consents = Object1.fromEntries(o.sections.slice(1).map((sectionName)=>[
                sectionName,
                false
            ]));
        for (let [name, granted] of Object1.entries(consents)){
            h.classList.toggle(`bm-${name}`, granted);
            h.classList.toggle(`bm-no-${name}`, !granted);
        }
    };
    function buttonHandler(e) {
        let id = e.target.dataset.id;
        dispatch('button', {
            id
        });
        switch(id){
            case 'accept':
                saveConsents(true);
                break;
            case 'close':
                dialog.close();
                break;
            case 'settings':
                openModal();
                break;
            case 'save':
                saveConsents();
                break;
            case 'reject':
                saveConsents(false);
                break;
        }
    }
    function closeModalHandler() {
        dispatch('close');
    }
    function cancelModalHandler(e) {
        if (o.force) e.preventDefault();
    }
    function openModal() {
        dispatch('open');
        dialog.showModal();
    }
    function dispatch(eventName, data) {
        const name = `${bm}:${eventName}`;
        const payload = {
            ...data !== undefined && data,
            time: +new Date()
        };
        d.dispatchEvent(new CustomEvent(name, payload));
        console.debug(name, payload);
    }
    // Data:
    const getConsents = ()=>w[o.global] || {};
    function setConsents(consents) {
        w[o.global] = consents;
        applyCssClasses();
    }
    function checkConsents(oldConsents, newConsents) {
        for(const sectionName in oldConsents)if (oldConsents[sectionName] && newConsents[sectionName] === false) dispatch('revoke', {
            section: sectionName
        });
    }
    function loadConsents() {
        try {
            return JSON.parse(localStorage.getItem(o.key));
        } catch (err) {
            console.error(err);
            localStorage.removeItem(o.key);
            return {};
        }
    }
    function clearStorages() {
        const localStores = Object1.fromEntries(Object1.entries(localStorage));
        const cookies = Object1.fromEntries(d.cookie.split('; ').map((cookie)=>cookie.split('=')));
        const { consentTime, ...consents } = loadConsents() || o.sections.slice(1).reduce((consents, section)=>{
            consents[section] = false;
            return {
                consentTime: undefined,
                ...consents
            };
        }, {});
        for (let [section, sectionConsent] of Object1.entries(consents)){
            if (sectionConsent) continue;
            let sectionCookieNames = Object1.keys(o[`${section}Cookies`] || {});
            sectionCookieNames.filter((name)=>name.endsWith('*')).map((wildcardName)=>{
                Object1.keys({
                    ...cookies,
                    ...localStores
                }).map((name)=>{
                    if (name.startsWith(wildcardName.slice(0, -1))) sectionCookieNames.push(name);
                });
            });
            for (const name of sectionCookieNames){
                if (cookies[name]) {
                    let expiredCookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 UTC;path=/;`;
                    d.cookie = expiredCookie;
                    d.cookie = `${expiredCookie}domain=${location.hostname};` // Safari iOS
                    ;
                    d.cookie = `${expiredCookie}domain=.${location.hostname};` // Safari iOS
                    ;
                    dispatch('delete', {
                        cookie: name
                    });
                }
                if (localStores[name]) {
                    localStorage.removeItem(name);
                    dispatch('delete', {
                        localStorage: name
                    });
                }
            }
        }
    }
    function saveConsents(value) {
        const willReadValues = value === undefined;
        let consents = {
            consentTime: +new Date()
        };
        o.sections.forEach((section)=>{
            if (section === 'essential') return false;
            let sectionElement = ui.querySelector(`[data-s=${section}]`);
            let sectionConsent = willReadValues ? sectionElement.checked : value;
            consents[section] = sectionConsent;
            if (!willReadValues) sectionElement.checked = value;
        });
        checkConsents(getConsents(), consents);
        setConsents(consents);
        localStorage.setItem(o.key, JSON.stringify(consents));
        dispatch('save', {
            data: consents
        });
        clearStorages();
        insertScripts();
        dialog.close();
        displayUI(false);
    }
    function insertScripts() {
        const scripts = d.querySelectorAll('script[data-consent]');
        scripts.forEach((script)=>{
            if (!getConsents()[script.dataset.consent]) return false;
            const newScript = d.createElement('script');
            for (let { name, value } of script.attributes){
                if (name.startsWith('data-') || name === 'type') continue;
                newScript.setAttribute(name, value);
            }
            newScript.setAttribute('type', script.dataset.type || 'text/javascript');
            if (!script.src) newScript.textContent = script.textContent;
            script.parentNode.replaceChild(newScript, script);
            dispatch('inject', {
                el: script,
                ...script.id && {
                    id: script.id
                }
            });
            // If tag has src AND tag content, inject new tag adjacent to parent after load
            if (script.src && script.textContent.trim() !== '') newScript.addEventListener('load', ()=>{
                let afterScript = d.createElement('script');
                afterScript.textContent = script.textContent;
                if (script.id) afterScript.id = script.id + '-after';
                newScript.insertAdjacentElement('afterend', afterScript);
                dispatch('inject', {
                    el: afterScript,
                    parent: script,
                    ...afterScript.id && {
                        id: afterScript.id
                    }
                });
            });
        });
    }
    // Start:
    setConsents(loadConsents() || {});
    // Optional Non-EU auto-consent
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isEuropeTimezone = /^(GMT|UTC)$/.test(tz) || /(Europe|BST|CEST|CET|EET|IST|WEST|WET|GMT-1|GMT-2|UTC+1|UTC+2|UTC+3)/.test(tz);
    if (o.acceptNonEU && !isEuropeTimezone) {
        saveConsents(true);
        displayUI(false);
    }
    // Render UI
    render();
    // Wipe matching cookies/localStorages without consent 
    clearStorages();
    // Consent logic
    if (w[o.global].consentTime) {
        displayUI(false);
        insertScripts();
    } else if (o.force) openModal();
    // Helper  methods 
    // <a onclick="bmInvalidate()" href="javascript:void(0)">Delete Consent Preferences</a>
    w.bmInvalidate = ()=>{
        dispatch('invalidate', {
            data: getConsents()
        });
        saveConsents(false);
        setConsents({});
        localStorage.removeItem(o.key);
        displayUI(true);
    };
    // <a onclick="bmUpdate()" href="javascript:void(0)">Update Consent Preferences</a>
    w.bmUpdate = ()=>{
        dispatch('update', {
            data: getConsents()
        });
        openModal();
    };
})(document, window, Object, document.documentElement, 'biscuitman');
