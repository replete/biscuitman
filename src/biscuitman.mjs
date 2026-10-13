/*
	ESM wrapper

	The build inlines src/biscuitman.js in place of the marker comment in create(),
	reading options from `config` instead of window.biscuitman
*/
let instance

function create(config = {}) {
	if (instance) return instance

	/* biscuitman.js */

	const handlers = {}

	instance = {
		consent: sectionName => !!(window[config.global || 'Consent'] || {})[sectionName],
		invalidate: window.bmInvalidate,
		update: window.bmUpdate,
		on: (event, callback) => {
			const handler = e => callback(e.detail)
			if (!handlers[event]) handlers[event] = []
			handlers[event].push([callback, handler])
			document.addEventListener(`bm:${event}`, handler)
			return instance
		},
		off: (event, callback) => {
			if (!handlers[event]) return
			handlers[event] = handlers[event].filter(([cb, handler]) => {
				if (cb !== callback) return true
				document.removeEventListener(`bm:${event}`, handler)
			})
		}
	}

	return instance
}

export default { create }
