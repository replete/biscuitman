# biscuitman.js 🍪 Lightweight Consent Manager
![screenshot of main UI](media/readmebanner.webp)

#### [View demo](https://replete.github.io/biscuitman)

I didn't like sending 100KB+ for a simple cookie consent solution so I wrote my own in vanilla JS. It's currently **3kB** brotli compressed, including CSS.

The goal was to make something as small as possible and versatile enough that I could drop it on my optimized sites for basic use, adhering to GDPR.


- Stores consent in `localStorage`, exposes in `window.Consent` and through custom events fired on `document`
- Handles consent granulated by custom sections (e.g. essential, performance, analytics...)
- Optionally shows user specific cookie details
- Fully customizable strings so you can serve localized strings if you want
- Simple flat configuration object
- Injects scripts when granular consent is granted (`<script data-consent="analytics" type="text/plain" src="..."></script>`)
- Works without CSS (thanks to `<dialog>` and `<details>`)
- Mobile-first
- Browser support: >= 2% browserlist (No IE support, but its not impossible)
  - Written with latest CSS / JS features and targetted to >= 2% using browserlist

![screenshot of main UI](media/ui.webp)

## How to use
```html
<!-- 
    1. Add data-consent="{sectionName}" and type="text/plain" properties
    (if you want to only load them upon consent of a section)
    (the ids are optional)
-->
<script data-consent="analytics" async src="https://www.googletagmanager.com/gtag/js?id=G-TEST" type="text/plain" id="js-analytics-gtm">
    console.log(google_tag_manager) // only evaluated once script loaded
</script>
<script data-consent="analytics" type="text/plain" id="js-analytics-gtm-after">
    console.log('This script runs as soon as analytics section consent is granted')
</script>
<!-- 
    2. Configure biscuitman global object
    (probably best served from a separate .js file)
    (see 'defaults' object in biscuitman.js to see other options)
-->
<script>
    // You must specify the copy in this object as the main library does not include the defaults because every site is different.
    // To localize this, serve a different object for each locale yourself on pageload, this could filename based like biscuitman.config.es.js or a backend solution
    biscuitman = {
        message: 'By clicking "Accept All", you agree to the use of cookies for improving browsing, providing personalized ads or content, and analyzing traffic. {link}',
		info: `Cookies categorized as "Essential" are stored in your browser to enable basic site functionalities. 
Additionally, third-party cookies are utilized to analyze website usage, store preferences, and deliver relevant content and advertisements with your consent.
While you have the option to enable or disable some or all of these cookies, note that disabling certain ones may impact your browsing experience.`,
        // {link} inside any string will be replaced with an <a> link using:
        linkText: 'Privacy Policy',
        linkURL: 'https://domain.com/privacy-policy',
        // Have as many or few sections as you like, only include <name>{Title|Message|Cookies} properties if you use them. This is a key property.
        sections: ['essential','functional','analytics','advertisement','uncategorized'],
        essentialTitle: 'Essential',
        essentialMessage: 'Essential cookies are required to enable the basic features of this site',
        // 'essential' is the only special section, it is hardcoded to be disabled in the UI
        functionalTitle: 'Functional',
        functionalMessage: 'Functional cookies help perform functions like sharing the content of the website on social media platforms, collecting feedback, and other third-party features',
        analyticsTitle: 'Analytics',
        analyticsMessage: 'Analytical cookies are used to understand how visitors interact with the website. These cookies help provide information on metrics such as the number of visitors, bounce rate, traffic source, etc.',
        // If you want to include details of the cookies in use, add them like a name/value dictionary like so
        analyticsCookies: {
            '_ga': 'This cookie, set by Google Analytics, computes visitor, session, and campaign data, tracking site usage for analytical reports. It stores information anonymously, assigning a randomly generated number to identify unique visitors',
            '_ga_*': 'Google Analytics uses this cookie for storing page view count'
        },
        advertisementTitle: 'Advertisement',
        advertisementMessage: 'Advertisement cookies serve to deliver tailored advertisements to visitors based on their previous page visits and to evaluate the efficacy of advertising campaigns',
        uncategorizedTitle: 'Uncategorized',
        uncategorizedMessage: 'Uncategorized cookies are those currently under analysis and have not yet been assigned to a specific category',
        // I wouldn't recommend using this just yet, but this enables an option
        // that tests the user's timezone and, if timezone not European, auto-consents
        acceptNonEuropeTimezone: false,
        force: false // open modal if no consent granted, and prevent access without consent
    }
</script>

<!-- 
    3. Include biscuitman.withcss.min.js if you want the CSS included
    or use biscuitmain{.js|.min.js} and include one of the biscuitman css files however you like
-->
<script src="biscuitman.withcss.min.js"></script>

```

## Globals
- `biscuitman` – configuration object, must be `window.biscuitman`
- `Consent` – object for accessing consents (add `global` config property to override)
    ```
    {
        "consentTime": 1717846660979,
        "functional": false,
        "analytics": false,
        "performance": false,
        "advertisement": false,
        "uncategorized": false
    }
    ```
    - example usage: `if (Consent && Consent.analytics) { doAnalyticsThing() }`
- `bmInvalidateConsent()` – Delete stored consent data and reinstate UI
- `bmUpdateConsent()` – Opens My Consent Settings modal
    - example usage: `<a href="javascript:bmUpdateConsent();"> Update my consent settings</a>` 

## Events

The easiest way to see how events work is to view the `console.debug()` calls in the [demo](https://replete.github.io/biscuitman)
- `biscuitman:openModal`
- `biscuitman:closeModel`
- `biscuitman:buttonPress`
- `biscuitman:saveConsent`
- `biscuitman:scriptInjected`
- `biscuitman:scriptLoaded`
- `biscuitman:invalidateConsent`
- `biscuitman:updateConsent`
    
You can watch for these events like this:
```js
document.addEventListener('biscuitman:openModal', (e) => {
    console.log('modal opened')
}, true);
```

## Notes
This is a brand new pre-1.0 project and needs more testing and iteration, and isn't going to suit all circumstances yet, although I'm using it on live sites.

There are number of features we might want to add, such as forcing the popup to show and not allow use of the site until consent choice is made.


## Development

Fire up a browsersync dev server on `:3000`. `index.html` will display as the dev sandbox.
```bash
npm install
npm run dev
```

### Building
`npm run build`

## Support development

<a href="https://www.buymeacoffee.com/replete"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=replete&button_colour=BD5FFF&font_colour=ffffff&font_family=Poppins&outline_colour=000000&coffee_colour=FFDD00" /></a>