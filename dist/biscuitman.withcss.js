/*! biscuitman.js 0.6.0 */
((d, w, O, h)=>{
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
        close: 'Close',
        settingsTitle: 'My Consent Settings',
        info: '',
        more: 'Show more',
        noCookies: 'No cookies to display',
        acceptNonEU: false,
        dialogPolyfill: '/dist/dialog-polyfill.withcss.min.js'
    };
    const o = {
        ...defaults,
        ...w.biscuitman
    };
    // UI & Events:
    const ui = d.createElement('div');
    let dialog;
    function render() {
        ui.className = 'biscuitman';
        ui.innerHTML = `
<article role=region aria-labelledby=bm-t>
	<b id=bm-t>${o.title}</b>
	<p>${o.message}</p>
	<div class=bm-buttons>
		<button data-id=accept>${o.accept}</button>
		<button data-id=settings>${o.settings}</button>
		<button data-id=reject>${o.reject}</button>
	</div>
</article>
<dialog aria-labelledby=bm-st>
	<div class=bm-dialog>
		<b id=bm-st>${o.settingsTitle}</b>
		<button data-id=close aria-label="${o.close}"${o.force ? ' disabled' : ''}>×</button>
		<div class=bm-sections>
			<p><span>${o.message}</span></p>
			<p>${o.info.split('\n').map((line, i, arr)=>`<span>${line}</span>
				${arr.length > 1 && o.enableMore && i == 0 ? `<a data-id=more href=# rel=nofollow>${o.more}</a>` : ''}`).join('')}
			</p>
			${o.sections.map((section)=>{
            let hasConsent = getConsents()[section];
            let isEssential = section === 'essential';
            let disabledProp = isEssential ? 'disabled' : '';
            let checkedProp = isEssential ? 'checked' : '';
            if (hasConsent !== undefined) checkedProp = hasConsent ? 'checked' : '';
            let cookies = o[`${section}Cookies`];
            return `
			<section>
				<details>
					<summary>
						<b id=bm-t-${section}>${o[`${section}Title`]}</b>
						<p>${o[`${section}Message`]}</p>
					</summary>
					${cookies ? O.entries(cookies).map(([k, v])=>`<dl><dt>${k}</dt><dd>${v}</dd></dl>`).join('') : `<dl><dd>${o.noCookies}</dd></dl>`}
				</details>
				<label>
					<input type=checkbox ${disabledProp} ${checkedProp} aria-labelledby=bm-t-${section} data-s="${section}"/>
					<i></i>
				</label>
			</section>`;
        }).join('')}
		</div>
		<div class=bm-buttons>
			<button data-id=accept>${o.accept}</button>
			<button data-id=save>${o.save}</button>
			<button data-id=reject>${o.reject}</button>
		</div>
	</div>
</dialog>`.replaceAll('{link}', `<a href="${o.linkURL}">${o.linkText}</a>`);
        ui.onclick = (e)=>{
            let id = e.target.dataset.id;
            if (!id) return;
            dispatch('button', {
                id
            });
            switch(id){
                case 'more':
                    e.target.remove();
                    break;
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
        };
        dialog = ui.querySelector('dialog');
        if (o.dialogPolyfill && !dialog.close) loadDialogPolyfill(dialog);
        dialog.onclose = ()=>dispatch('close');
        if (o.force) {
            dialog.oncancel = (e)=>e.preventDefault();
            dialog.onkeydown = (e)=>e.key === 'Escape' ? e.preventDefault() : null;
        }
        d.body.appendChild(ui);
        updateBannerHeight();
        new ResizeObserver(updateBannerHeight).observe(ui);
    }
    const updateBannerHeight = (entries)=>h.style.setProperty('--bm-height', `${entries ? ui.offsetHeight : 0}px`);
    const displayUI = (show)=>h.classList.toggle('bm-show', show);
    const applyCssClasses = ()=>{
        let { consentTime, ...consents } = getConsents();
        if (!consentTime) consents = noConsents();
        for (let [name, granted] of O.entries(consents)){
            h.classList.toggle(`bm-${name}`, granted);
            h.classList.toggle(`bm-no-${name}`, !granted);
        }
    };
    function openModal() {
        dispatch('open');
        dialog.showModal();
    }
    function dispatch(eventName, data) {
        const name = `bm:${eventName}`;
        const payload = {
            ...data,
            time: +new Date
        };
        d.dispatchEvent(new CustomEvent(name, {
            detail: payload
        }));
        console.debug(name, payload);
    }
    function loadDialogPolyfill(dialog) {
        function mount() {
            h.classList.add('bm-dialog-polyfill');
            w.dialogPolyfill.registerDialog(dialog);
        }
        if (w.dialogPolyfill) mount();
        else {
            const script = d.createElement('script');
            script.onload = mount;
            script.src = o.dialogPolyfill;
            d.head.appendChild(script);
        }
    }
    // Data:
    const getConsents = ()=>w[o.global] || {};
    const noConsents = ()=>O.fromEntries(o.sections.slice(1).map((section)=>[
                section,
                false
            ]));
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
        const localStores = O.fromEntries(O.entries(localStorage));
        const cookies = O.fromEntries(d.cookie.split('; ').map((cookie)=>cookie.split('=')));
        const { consentTime, ...consents } = loadConsents() || noConsents();
        for (let [section, sectionConsent] of O.entries(consents)){
            if (sectionConsent) continue;
            let sectionCookieNames = O.keys(o[`${section}Cookies`] || {});
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
                    d.cookie = `${expiredCookie}domain=${location.hostname};`; // Safari iOS
                    d.cookie = `${expiredCookie}domain=.${location.hostname};`; // Safari iOS
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
            if (section === 'essential') return;
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
    // Start:
    setConsents(loadConsents() || {});
    // Render UI
    render();
    // Optional Non-EU auto-consent
    if (o.acceptNonEU && !getConsents().consentTime) {
        const tz = w.Intl && Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz && !/^(GMT|UTC)$|^\+0[0-3]:|GMT-[123]$|Europe|CET|EET|WET|Arctic|Azores|Canary|Madeira|Reykjavik|Fae?roe|Jan_Mayen|Ceuta|Nicosia|Famagusta|Cayenne|Guadeloupe|Martinique|Marigot|Reunion|Mayotte/.test(tz)) saveConsents(true);
    }
    // Wipe matching cookies/localStorages without consent
    clearStorages();
    // Consent logic
    if (w[o.global].consentTime) {
        displayUI(false);
        insertScripts();
    } else {
        displayUI(true);
        if (o.force) openModal();
    }
    // Helper  methods
    // <a onclick="bmInvalidate()" href="javascript:void(0)">Delete Consent Preferences</a>
    w.bmInvalidate = ()=>{
        dispatch('invalidate', {
            data: getConsents()
        });
        checkConsents({});
        saveConsents(false);
        setConsents({});
        localStorage.removeItem(o.key);
        displayUI(true);
        if (o.force) dialog.showModal();
    };
    // <a onclick="bmUpdate()" href="javascript:void(0)">Update Consent Preferences</a>
    w.bmUpdate = ()=>{
        dispatch('update', {
            data: getConsents()
        });
        displayUI(true);
        openModal();
    };
})(document, window, Object, document.documentElement);
;
((d)=>{
	let css=d.createElement('style');
	css.textContent=`/*! biscuitman.js 0.6.0 */
@supports selector(:has(a)) {
  .biscuitman {
    all: initial;
  }

  .biscuitman *, .biscuitman :before, .biscuitman :after {
    all: revert;
  }
}

.biscuitman {
  --bm-ui: 0, 0, 0;
  --bm-tx: #444;
  --bm-bg: #fff;
  --bm-c: #105d89;
  background: var(--bm-bg);
  box-sizing: border-box;
  z-index: 3;
  width: 100%;
  padding: 20px;
  font-family: system-ui, Segoe UI, Roboto, sans-serif;
  display: none;
  position: fixed;
  bottom: 0;
  box-shadow: 0 -2px 10px #00000029;
}

.bm-show .biscuitman {
  display: block;
}

.biscuitman * {
  box-sizing: border-box;
  color: var(--bm-tx);
  margin: 0;
  padding: 0;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.4em;
}

.biscuitman:has([open]) {
  transform: translateY(100%);
}

.biscuitman article {
  position: relative;
}

@media (min-width: 770px) {
  .biscuitman article {
    padding-right: calc(max(300px, 30vw) + 20px);
  }

  .biscuitman article .bm-buttons {
    width: 30vw;
    min-width: 300px;
    position: absolute;
    bottom: 50%;
    right: 0;
    transform: translateY(50%);
  }
}

.biscuitman article p {
  margin: 10px 0;
  font-size: 13px;
}

@media (min-width: 575px) {
  .biscuitman article p {
    font-size: 14px;
  }
}

.biscuitman button {
  background: var(--bm-bg);
  border: 2px solid var(--bm-c);
  color: var(--bm-c);
  cursor: pointer;
  border-radius: 3px;
  margin-top: 10px;
  padding: .8em;
  font-size: 13px;
  line-height: 1em;
}

.biscuitman button[data-id="accept"] {
  background: var(--bm-c);
  color: var(--bm-bg) !important;
}

.biscuitman button[data-id="close"] {
  color: rgba(var(--bm-ui), .5);
  opacity: .6;
  -webkit-user-select: none;
  user-select: none;
  z-index: 2;
  background: none;
  border: none;
  padding: 10px;
  font-size: 24px;
  position: absolute;
  top: 0;
  right: 10px;
}

.biscuitman button[disabled] {
  display: none;
}

.biscuitman button:hover {
  opacity: .8;
}

.biscuitman .bm-buttons {
  display: flex;
}

@media (min-width: 576px) {
  .biscuitman .bm-buttons {
    flex-direction: row-reverse;
    gap: 10px;
    width: 100%;
  }

  .biscuitman .bm-buttons button {
    flex-grow: 1;
  }
}

@media (max-width: 575px) {
  .biscuitman .bm-buttons {
    flex-direction: column;
    flex-grow: 1;
  }
}

.biscuitman dialog {
  background: var(--bm-bg);
  border: 0;
  width: 100%;
  max-width: 100%;
  height: 100%;
  max-height: 100%;
}

@media (min-width: 576px) {
  .biscuitman dialog {
    border-radius: 10px;
    width: 90vw;
    max-width: 860px;
    max-height: 80vh;
    margin: auto;
    box-shadow: 0 0 8px #0000004d;
  }
}

@media (min-width: 576px) and (min-height: 1134px) {
  .biscuitman dialog {
    max-height: 950px;
  }
}

.biscuitman dialog .bm-buttons {
  position: relative;
}

.biscuitman .bm-dialog {
  flex-direction: column;
  height: 100%;
  padding: 20px;
  display: flex;
}

.biscuitman .bm-dialog b {
  padding-bottom: 8px;
  position: relative;
}

.biscuitman .bm-dialog > b:after, .biscuitman .bm-dialog .bm-buttons:after {
  content: "";
  pointer-events: none;
  width: 100%;
  height: 25px;
  position: absolute;
  left: 0;
}

.biscuitman .bm-dialog > b:after {
  background: linear-gradient(180deg, var(--bm-bg) 20%, #fff0);
  z-index: 1;
  margin-bottom: -24px;
  bottom: 0;
}

.biscuitman .bm-dialog .bm-buttons:after {
  background: linear-gradient(0deg, var(--bm-bg) 20%, #fff0);
  top: -24px;
}

.biscuitman .bm-sections {
  scrollbar-color: rgba(var(--bm-ui), .2) var(--bm-bg);
  height: 100%;
  padding: 15px 0;
  position: relative;
  overflow-y: scroll;
}

@media (min-width: 576px) {
  .biscuitman .bm-sections {
    margin-right: -18px;
    padding-right: 4px;
  }
}

.biscuitman .bm-sections > p {
  padding-right: 30px;
  font-size: 13px;
  line-height: 18px;
}

@media (min-width: 576px) {
  .biscuitman .bm-sections > p {
    font-size: 14px;
  }
}

.biscuitman .bm-sections > p span {
  font-size: inherit;
  padding-bottom: 5px;
  display: inline-block;
}

.biscuitman .bm-sections > p [data-id="more"] ~ span {
  display: none;
}

.biscuitman a {
  font-size: inherit;
  color: var(--bm-c);
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}

.biscuitman a:hover {
  text-decoration: underline;
}

.biscuitman section {
  margin-bottom: 10px;
  position: relative;
}

.biscuitman section:first-of-type {
  margin-top: 10px;
}

.biscuitman details {
  border: 1px solid rgba(var(--bm-ui), .2);
  border-radius: 5px;
  padding: 10px;
  box-shadow: 0 2px 4px #0000001a;
}

.biscuitman details[open] summary b:after {
  margin: -3px 0 0 -2px;
  transform: rotate(45deg) scale(.3);
}

.biscuitman summary {
  cursor: pointer;
  anchor-name: --bm;
  flex-direction: column;
  width: 100%;
  padding: 5px 80px 10px 10px;
  display: flex;
  position: relative;
}

.biscuitman summary b {
  margin-bottom: 3px;
}

.biscuitman summary b:after {
  content: "";
  box-sizing: content-box;
  border: 5px solid rgba(var(--bm-ui), .4);
  border-top-color: #0000;
  border-left-color: #0000;
  border-radius: 2px;
  width: 1em;
  height: 1em;
  margin: -2px 0 0 -4px;
  display: block;
  transform: rotate(-45deg) scale(.3);
}

.biscuitman summary p {
  font-size: 14px;
}

.biscuitman summary > * {
  display: inline-flex;
}

.biscuitman summary::-webkit-details-marker {
  display: none;
}

.biscuitman dl {
  background: rgba(var(--bm-ui), .08);
  margin: 10px;
  padding: 10px;
  display: flex;
}

.biscuitman dl dt, .biscuitman dl dd {
  font-size: 12px;
}

.biscuitman dl dt {
  min-width: 120px;
  padding-right: 30px;
  font-weight: bold;
}

.biscuitman label {
  top: 15px;
  top: calc(anchor(--bm center) - 14px);
  position: absolute;
  right: 31px;
}

.biscuitman label i {
  --bm-h: 1.2em;
  --bm-w: 2.3em;
  height: var(--bm-h);
  width: var(--bm-w);
  background-color: rgba(var(--bm-ui), .3);
  border-radius: var(--bm-h);
  font-size: 20px;
  display: block;
  position: relative;
}

.biscuitman label i:before {
  content: "";
  background: var(--bm-bg);
  height: var(--bm-h);
  width: var(--bm-h);
  border-radius: 100%;
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%) scale(.8);
}

.biscuitman label input {
  opacity: 0;
  position: absolute;
}

.biscuitman label :checked + i {
  background-color: var(--bm-c);
}

.biscuitman label :checked + i:before {
  left: auto;
  right: 0;
}

.biscuitman label :disabled + i {
  opacity: .5;
}

.biscuitman label :focus-visible + i {
  outline: auto highlight;
}

.bm-dialog-polyfill .biscuitman dialog {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
}
`;
	d.head.appendChild(css)
})(document);