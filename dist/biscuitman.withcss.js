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
    const setConsents = (consents)=>{
        w[o.global] = consents;
        applyCssClasses();
    };
    const getConsents = ()=>w[o.global];
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
    // Wipe matching cookies without consent 
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
;
((d)=>{
	let css=d.createElement('style');
	css.textContent=`.biscuitman {
  --t: #444;
  --b: #fff;
  --c: #105d89;
  background: var(--b);
  box-sizing: border-box;
  z-index: 3;
  width: 100%;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  position: fixed;
  bottom: 0;
  box-shadow: 0 -2px 10px #00000029;
}

.biscuitman * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-size: 16px;
  line-height: 1.4em;
}

.biscuitman:has([open]) {
  transform: translateY(100%);
}

.biscuitman.bm-hide {
  padding: 0;
}

.biscuitman.bm-hide article {
  display: none;
}

.biscuitman article {
  position: relative;
}

@media (min-width: 770px) {
  .biscuitman article {
    padding-right: calc(max(300px, 30vw) + 20px);
  }

  .biscuitman article nav {
    width: 30vw;
    min-width: 300px;
    position: absolute;
    bottom: 50%;
    right: 0;
    transform: translateY(50%);
  }
}

.biscuitman article p {
  color: var(--t);
  margin: 10px 0;
  font-size: 13px;
}

@media (min-width: 575px) {
  .biscuitman article p {
    font-size: 14px;
  }
}

.biscuitman button {
  background: var(--b);
  border: 2px solid var(--c);
  color: var(--c);
  cursor: pointer;
  border-radius: 3px;
  margin-top: 10px;
  padding: .8em;
  font-size: 13px;
  line-height: 1em;
}

.biscuitman button[data-id="accept"] {
  background: var(--c);
  color: var(--b) !important;
}

.biscuitman button[data-id="close"] {
  color: #000;
  opacity: .6;
  -webkit-user-select: none;
  user-select: none;
  z-index: 2;
  background: none;
  border: none;
  outline: none;
  padding: 10px;
  font-size: 24px;
  line-height: 1em;
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

@media (min-width: 576px) {
  .biscuitman nav {
    flex-direction: row-reverse;
    gap: 10px;
    width: 100%;
    display: flex;
  }

  .biscuitman nav button {
    flex-grow: 1;
    margin-bottom: 0;
  }
}

@media (max-width: 575px) {
  .biscuitman nav {
    flex-direction: column;
    flex-grow: 1;
    display: flex;
  }
}

.biscuitman dialog {
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
    height: 890px;
  }
}

.biscuitman dialog nav {
  justify-self: flex-end;
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

.biscuitman .bm-dialog > b:after {
  content: "";
  background: linear-gradient(180deg, var(--b) 20%, transparent);
  pointer-events: none;
  z-index: 1;
  width: 100%;
  height: 25px;
  margin-bottom: -24px;
  position: absolute;
  bottom: 0;
  left: 0;
}

.biscuitman .bm-dialog nav:after {
  content: "";
  background: linear-gradient(0deg, var(--b) 20%, transparent);
  pointer-events: none;
  width: 100%;
  height: 25px;
  position: absolute;
  top: -24px;
  left: 0;
}

.biscuitman .bm-sections {
  scrollbar-color: #ddd var(--b);
  flex-shrink: 1;
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
  line-height: 18px;
}

.biscuitman .bm-sections > p span {
  padding-bottom: 5px;
  font-size: 13px;
  display: block;
}

@media (min-width: 576px) {
  .biscuitman .bm-sections > p span {
    font-size: 14px;
  }
}

.biscuitman .bm-sections > p span:has(.more) ~ span {
  display: none;
}

.biscuitman a {
  font-size: inherit;
  color: var(--c);
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
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 10px;
  list-style: none;
  box-shadow: 0 2px 4px #0000001a;
}

.biscuitman details[open] summary b:after {
  margin: -3px 0 0 -2px;
  transform: rotate(45deg)scale(.3);
}

.biscuitman summary {
  cursor: pointer;
  flex-direction: column;
  width: 100%;
  padding: 5px 80px 10px 10px;
  list-style: none;
  display: flex;
  position: relative;
}

.biscuitman summary b {
  margin-bottom: 3px;
}

.biscuitman summary b:after {
  content: "";
  border: 5px solid #777;
  border-color: #0000 #777 #777 #0000;
  border-radius: 2px;
  width: 1em;
  height: 1em;
  margin: -2px 0 0 -4px;
  display: block;
  transform: rotate(-45deg)scale(.3);
}

.biscuitman summary p {
  color: var(--t);
  font-size: 14px;
}

.biscuitman summary > * {
  display: inline-flex;
}

.biscuitman summary::marker {
  display: none;
}

.biscuitman summary::-webkit-details-marker {
  display: none;
}

.biscuitman dl {
  background: #eee;
  margin: 10px;
  padding: 10px;
  display: flex;
}

.biscuitman dl dt, .biscuitman dl dd {
  color: var(--t);
  font-size: 13px;
}

.biscuitman dl dt {
  min-width: 120px;
  padding-right: 30px;
  font-weight: bold;
}

.biscuitman label {
  --height: 1.2em;
  --width: 2.3em;
  --gap: 2px;
  height: var(--height);
  width: var(--width);
  border-radius: var(--height);
  background-color: #999;
  margin-top: -2px;
  display: block;
  position: absolute;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  font-size: 20px !important;
}

.biscuitman label:before {
  content: "";
  background: var(--b);
  height: calc(var(--height)  - calc(var(--gap) * 2));
  width: calc(var(--height)  - calc(var(--gap) * 2));
  height: var(--height);
  width: var(--height);
  left: var(--gap);
  transform-origin: center;
  border-radius: 100%;
  display: block;
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%)scale(.8);
}

.biscuitman label:has(:checked) {
  background-color: var(--c);
}

.biscuitman label:has(:checked):before {
  left: auto;
  right: 0;
}

.biscuitman label:has(:focus-visible) {
  outline: auto highlight;
}

.biscuitman label:has([disabled]:checked) {
  opacity: .6;
}

.biscuitman label input {
  opacity: 0;
}
`;
	d.head.appendChild(css)
})(document);