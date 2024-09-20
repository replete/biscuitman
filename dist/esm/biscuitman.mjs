/*! biscuitman.js 0.5.0 */
const { document: d, window: w, Object: O } = globalThis;
const h = d.documentElement;
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
    info: '',
    more: 'Show more',
    noCookies: 'No cookies to display',
    acceptNonEU: false,
    dialogPolyfill: '/dist/dialog-polyfill.withcss.min.js'
};
let options;
// UI & Events:
const ui = document.createElement('div');
let dialog;
let listeners = {};
function render() {
    ui.className = 'biscuitman';
    ui.innerHTML = `
<article>
    <b>${options.title}</b>
	<p>${options.message}</p>
	<nav>
		<button data-id="accept">${options.accept}</button>
		<button data-id="settings">${options.settings}</button>
		<button data-id="reject">${options.reject}</button>
	</nav>
</article>
<dialog>
	<div class="bm-dialog">
		<b>${options.settingsTitle}</b>
		<button data-id="close"${options.force ? ' disabled' : ''}>×</button>
		<div class="bm-sections">
			<p><span>${options.message}</span></p>
			<p>${options.info.split('\n').map((line, i, arr)=>`<span>${line}</span>
				${arr.length > 1 && options.enableMore && i == 0 ? `<a class="more" href="javascript:void(0)">${options.more}</a>` : ''}`).join('')}
			</p>
			${options.sections.map((section)=>{
        let hasConsent = getConsents()[section];
        let isEssential = section === 'essential';
        let disabledProp = isEssential ? 'disabled' : '';
        let checkedProp = isEssential ? 'checked' : '';
        if (hasConsent !== undefined) checkedProp = hasConsent ? 'checked' : '';
        let cookies = options[`${section}Cookies`];
        return `
			<section>
				<details>
					<summary>
						<b>${options[`${section}Title`]}</b>
						<label for="bm_${section}" class="${disabledProp} ${checkedProp}">
							<input type="checkbox" id="bm_${section}" ${disabledProp} ${checkedProp} data-s="${section}"/>
						</label>
						<p>${options[`${section}Message`]}</p>
					</summary>
					${cookies ? O.entries(cookies).map((param)=>{
            let [k, v] = param;
            return `<dl><dt>${k}</dt><dd>${v}</dd></dl>`;
        }).join('') : `<dl><dd>${options.noCookies}</dd></dl>`}
				</details>
			</section>`;
    }).join('')}
		</div>
		<nav>
			<button data-id="accept">${options.accept}</button>
			<button data-id="save">${options.save}</button>
			<button data-id="reject">${options.reject}</button>
		</nav>
	</div>
</dialog>`.replaceAll('{link}', `<a href="${options.linkURL}">${options.linkText}</a>`);
    ui.querySelectorAll('button').forEach((b)=>b.addEventListener('click', buttonHandler));
    dialog = ui.querySelector('dialog');
    dialog.onclose = ()=>dispatch('close');
    if (options.force) {
        dialog.oncancel = (e)=>e.preventDefault();
        dialog.onkeydown = (e)=>e.key === 'Escape' ? e.preventDefault() : null;
    }
    if (options.dialogPolyfill && !dialog.close || !dialog.showModal) loadDialogPolyfill(dialog);
    const moreLink = ui.querySelector('.more');
    if (moreLink) moreLink.addEventListener('click', moreLink.remove);
    ui.querySelectorAll('[data-s]').forEach((checkbox)=>checkbox.addEventListener('change', (e)=>{
            checkbox.parentElement.classList.toggle('checked', e.target.checked);
        }));
    d.body.appendChild(ui);
    w.addEventListener('resize', updateBannerHeight);
}
const updateBannerHeight = ()=>{
    h.style.setProperty('--bm-height', `${ui.offsetHeight}px`);
};
const displayUI = (show)=>{
    h.classList.toggle('bm-show', show);
    updateBannerHeight();
};
const applyCssClasses = ()=>{
    let { consentTime, ...consents } = getConsents();
    if (!consentTime) consents = O.fromEntries(options.sections.slice(1).map((sectionName)=>[
            sectionName,
            false
        ]));
    for (let [name, granted] of O.entries(consents)){
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
    }
}
function openModal() {
    dispatch('open');
    dialog.showModal();
}
function dispatch(eventName, data) {
    const name = `bm:${eventName}`;
    const payload = {
        ...data !== undefined && data,
        time: +new Date
    };
    d.dispatchEvent(new CustomEvent(name, {
        detail: payload
    }));
    console.debug(name, payload);
    if (listeners[name]) listeners[name].forEach((callback)=>callback(payload));
}
function loadDialogPolyfill(dialog) {
    function mount() {
        d.documentElement.classList.add('bm-dialog-polyfill');
        w.dialogPolyfill.registerDialog(dialog);
    }
    if (w.dialogPolyfill) mount();
    else {
        const script = d.createElement('script');
        script.onload = mount;
        script.src = options.dialogPolyfill;
        d.head.appendChild(script);
    }
}
// Data:
const getConsents = ()=>w[options.global] || {};
function setConsents(newConsents) {
    w[options.global] = newConsents;
    applyCssClasses();
}
const checkConsent = (sectionName)=>!!getConsents()[sectionName];
function checkConsents(oldConsents, newConsents) {
    for(const sectionName in oldConsents)if (oldConsents[sectionName] && newConsents[sectionName] === false) dispatch('revoke', {
        section: sectionName
    });
}
function loadConsents() {
    try {
        return JSON.parse(localStorage.getItem(options.key));
    } catch (err) {
        console.error(err);
        localStorage.removeItem(options.key);
        return {};
    }
}
function clearStorages() {
    const localStores = O.fromEntries(O.entries(localStorage));
    const cookies = O.fromEntries(d.cookie.split('; ').map((cookie)=>cookie.split('=')));
    const { consentTime, ...consents } = loadConsents() || options.sections.slice(1).reduce((consents, section)=>{
        consents[section] = false;
        return {
            consentTime: undefined,
            ...consents
        };
    }, {});
    for (let [section, sectionConsent] of O.entries(consents)){
        if (sectionConsent) continue;
        let sectionCookieNames = O.keys(options[`${section}Cookies`] || {});
        sectionCookieNames.filter((name)=>name.endsWith('*')).map((wildcardName)=>{
            O.keys({
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
        consentTime: +new Date
    };
    options.sections.forEach((section)=>{
        if (section === 'essential') return;
        let sectionElement = ui.querySelector(`[data-s=${section}]`);
        let sectionConsent = willReadValues ? sectionElement.checked : value;
        consents[section] = sectionConsent;
        if (!willReadValues) sectionElement.checked = value;
    });
    checkConsents(getConsents(), consents);
    setConsents(consents);
    localStorage.setItem(options.key, JSON.stringify(consents));
    dispatch('save', {
        data: consents
    });
    clearStorages();
    insertScripts();
    if (dialog.open) dialog.close();
    displayUI(false);
}
function insertScripts() {
    const scripts = d.querySelectorAll('script[data-consent]');
    scripts.forEach((script)=>{
        if (!getConsents()[script.dataset.consent]) return;
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
function handleNonEUConsent() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isEuropeTimezone = /^(GMT|UTC)$/.test(tz) || /(Europe|BST|CEST|CET|EET|IST|WEST|WET|GMT-1|GMT-2|UTC+1|UTC+2|UTC+3)/.test(tz);
    if (options.acceptNonEU && !isEuropeTimezone) {
        saveConsents(true);
        displayUI(false);
    }
}
let instance;
function create() {
    let config = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    if (instance) return instance;
    options = {
        ...defaults,
        ...config
    };
    function initialize() {
        setConsents(loadConsents() || {});
        // Optional Non-EU auto-consent
        handleNonEUConsent();
        // Render UI
        render();
        // Wipe matching cookies/localStorages without consent
        clearStorages();
        // Consent logic
        if (w[options.global].consentTime) {
            displayUI(false);
            insertScripts();
        } else {
            displayUI(true);
            if (options.force) openModal();
        }
    }
    // Helper  methods
    // <a onclick="bmInvalidate()" href="javascript:void(0)">Delete Consent Preferences</a>
    const invalidate = w.bmInvalidate = ()=>{
        dispatch('invalidate', {
            data: getConsents()
        });
        checkConsents({});
        saveConsents(false);
        setConsents({});
        localStorage.removeItem(options.key);
        displayUI(true);
        if (options.force) dialog.showModal();
    };
    // <a onclick="bmUpdate()" href="javascript:void(0)">Update Consent Preferences</a>
    const update = w.bmUpdate = ()=>{
        dispatch('update', {
            data: getConsents()
        });
        openModal();
    };
    initialize();
    instance = {
        consent: checkConsent,
        invalidate,
        update,
        on: (event, callback)=>{
            const eventName = `bm:${event}`;
            if (!listeners[eventName]) listeners[eventName] = [];
            listeners[eventName].push(callback);
            return instance;
        },
        off: (event, callback)=>{
            const eventName = `bm:${event}`;
            if (!listeners[eventName]) return;
            listeners[eventName] = listeners[eventName].filter((cb)=>cb !== callback);
        }
    };
    return instance;
}
export default {
    create
};
