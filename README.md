# biscuitman.js 🍪 Lightweight Consent Manager
![screenshot of main UI](media/readmebanner.webp)

#### [View demo](https://replete.github.io/biscuitman)

I didn't feel good about sending 100KB+ for a simple cookie consent solution so I wrote my own in vanilla JS. It's around 4kB compressed with brotli. The goal was to make something small and versatile _enough_ that I could drop it on my optimized sites for basic analytics that wouldn't break the rules.


- Stores consent in `localStorage`, exposes in `window.Consent` and through custom events fired on `document`
- Handles consent granulated by custom sections (e.g. essential, performance, analytics...)
- optionally shows user specific cookie details
- Fully customizable strings so you can serve localized strings if you want
- Simple configuration
- Injects scripts when consent is granted (`<script data-consent="analytics" type="text/plain" src="..."></script>`)
- Works without CSS (thanks to `<dialog>` and `<details>`)
- Mobile-first
- Modern browsers: No support for IE
- Not production-ready until 1.0

![screenshot of main UI](media/ui.webp)

### Next

Probably need to drop [CSS Nesting]() for now based on mobile browser support only recently arriving. In a year or so we should be able to use it more reliably. So that's the next thing.

- [ ] Support more mobile browsers by processing use of [CSS Nesting](https://caniuse.com/?search=CSS%20Nesting)
- [ ] Determine exact browser support
- ...

## How to use
```html
<!-- optional: Include critical CSS to ensure biscuitman works if CSS Nesting is not supported -->
<style>.biscuitman{position:fixed;bottom:0;left:0;background:#fff}</style>

<!-- 
    1. Add data-consent="{section}" and type="text/plain" properties
    (if you want to only load them upon consent)
    (the ids aren't used at the moment, but is probably a good idea)
-->
<script data-consent="analytics" async src="https://www.googletagmanager.com/gtag/js?id=G-TEST" type="text/plain" id="js-analytics-gtm"></script>
<script data-consent="analytics" type="text/plain" id="js-analytics-gtm-after">
    console.log('This script runs as soon as analytics consent is granted')
</script>
<script data-consent="analytics" type="text/plain" id="js-analytics-misc">
    console.log('This embedded script will be inserted when analytics consent is granted')
</script>

<!-- 
    2. Configure biscuitman global object
    (probably best served from a separate .js file)
    (see 'defaults' object in biscuitman.js to see other options)
-->
<script>
    // You must specify the copy in this object as the main library does not include defaults (seemed pointless)
    biscuitman = {
        msg: 'By clicking "Accept All", you agree to the use of cookies for improving browsing, providing personalized ads or content, and analyzing traffic.',
		info: `Cookies categorized as "Essential" are stored in your browser to enable basic site functionalities. 
Additionally, third-party cookies are utilized to analyze website usage, store preferences, and deliver relevant content and advertisements with your consent.
While you have the option to enable or disable some or all of these cookies, note that disabling certain ones may impact your browsing experience.`,
        // Have as many or few sections as you like, only include <name>{Title|Message|Cookies} properties if you use them. This is a key property.
        sections: ['essential','functional','analytics','advertisement','uncategorized'],
        // Essential is the only special section, it is hardcoded to be disabled in the UI
        essentialTitle: 'Essential',
        essentialMessage: 'Essential cookies are required to enable the basic features of this site',
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
        acceptNonEuropeTimezone: false
    }
</script>

<!-- 
    3. Include biscuitman.withcss.min.js if you want the CSS included
    or use biscuitmain{.js|.min.js} and include one of the biscuitman css files however you like
-->
<script src="biscuitman.withcss.min.js"></script>

```

## Notes
This is a brand new pre-1.0 project and needs more testing and iteration, and isn't going to suit all circumstances yet.

There are number of features we might want to add, such as forcing the popup to show and not allow use of the site until consent choice is made.

- docs will probably exist near a 1.0 release


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