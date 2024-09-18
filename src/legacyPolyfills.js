// These are ES5 polyfills for use in the WIP legacy build of the app.

Object.entries = Object.entries ? Object.entries : function(obj) {
	var allowedTypes = ['[object String]', '[object Object]', '[object Array]', '[object Function]']
	  var objType = Object.prototype.toString.call(obj)

	  if(obj === null || typeof obj === 'undefined') {
		  throw new TypeError('Cannot convert undefined or null to object')
	  } else if(!~allowedTypes.indexOf(objType)) {
		  return []
	  } else {
		  // if ES6 is supported
		  if (Object.keys) {
			  return Object.keys(obj).map(function (key) {
				  return [key, obj[key]]
			  })
		  }
		  var result = []
		  for (var prop in obj) {
			  if(obj.hasOwnProperty(prop)) {
				  result.push([prop, obj[prop]])
			  }
		  }

		  return objType === '[object Array]' ? result : result.sort(function(a, b) {return a[1]-b[1]})
	  }
}

if (!Array.prototype.forEach) {
	Array.prototype.forEach = function (fn, scope) {
		'use strict'
		var i, len
		for (i = 0, len = this.length; i < len; ++i) {
			if (i in this) {
				fn.call(scope, this[i], i, this)
			}
		}
	}
}

if (!NodeList.prototype.forEach) {
	NodeList.prototype.forEach = function(callback, thisArg) {
		var i
		for (i = 0; i < this.length; i++) {
			callback.call(thisArg, this[i], i, this)
		}
	}
}

if (!String.prototype.endsWith) {
	String.prototype.endsWith = function(search, this_len) {
		if (this_len === undefined || this_len > this.length) {
			this_len = this.length
		}
		return this.substring(this_len - search.length, this_len) === search
	}
}

if (!String.prototype.startsWith) {
	String.prototype.startsWith = function(searchString, position) {
		position = position || 0
		return this.substring(position, position + searchString.length) === searchString
	}
}

// Polyfill for creating CustomEvents on IE9/10/11

// code pulled from:
// https://github.com/d4tocchini/customevent-polyfill
// https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent#Polyfill

(function() {
	if (typeof window === 'undefined') {
		return
	}

	try {
		var ce = new window.CustomEvent('test', { cancelable: true })
		ce.preventDefault()
		if (ce.defaultPrevented !== true) {
			// IE has problems with .preventDefault() on custom events
			// http://stackoverflow.com/questions/23349191
			throw new Error('Could not prevent default')
		}
	} catch (e) {
		var CustomEvent = function(event, params) {
			var evt, origPrevent

			// We use here some version of `Object.assign` implementation, to create a shallow copy of `params`.
			// Based on https://github.com/christiansany/object-assign-polyfill/blob/213cc63df14515fb543117059d1576204bfaa8a7/index.js
			var newParams = {}
			// Skip over if undefined or null
			if (params != null) {
				for (var nextKey in params) {
					// Avoid bugs when hasOwnProperty is shadowed
					if (Object.prototype.hasOwnProperty.call(params, nextKey)) {
						newParams[nextKey] = params[nextKey]
					}
				}
			}

			newParams.bubbles = !!newParams.bubbles
			newParams.cancelable = !!newParams.cancelable

			evt = document.createEvent('CustomEvent')
			evt.initCustomEvent(
				event,
				newParams.bubbles,
				newParams.cancelable,
				newParams.detail
			)
			origPrevent = evt.preventDefault
			evt.preventDefault = function() {
				origPrevent.call(this)
				try {
					Object.defineProperty(this, 'defaultPrevented', {
						get: function() {
							return true
						}
					})
				} catch (e) {
					this.defaultPrevented = true
				}
			}
			return evt
		}

		CustomEvent.prototype = window.Event.prototype
		window.CustomEvent = CustomEvent // expose definition to window
	}
})()
