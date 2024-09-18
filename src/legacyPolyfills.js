// These are ES5 polyfills for use in the WIP legacy build of the app. See notes in run.js' buildLegacy()

// Object.entries
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

// Array|NodeList.forEach
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
// String.endsWith
if (!String.prototype.endsWith) {
	String.prototype.endsWith = function(search, this_len) {
		if (this_len === undefined || this_len > this.length) {
			this_len = this.length
		}
		return this.substring(this_len - search.length, this_len) === search
	}
}
// String.startsWith
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
})();

// Array.from
function arrayFrom(arr, callbackFn, thisArg)
{
    //if you need you can uncomment the following line
    //if(!arr || typeof arr == 'function')throw new Error('This function requires an array-like object - not null, undefined or a function');

    var arNew = [],
        k = [], // used for convert Set to an Array
        i = 0;

    //if you do not need a Set object support then
    //you can comment or delete the following if statement
    if(window.Set && arr instanceof Set)
    {
        //we use forEach from Set object
        arr.forEach(function(v){k.push(v)});
        arr = k
    }

    for(; i < arr.length; i++)
        arNew[i] = callbackFn
            ? callbackFn.call(thisArg, arr[i], i, arr)
            : arr[i];

    return arNew
}

Array.from = Array.from || arrayFrom;

// Object.fromEntries
function defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function toConsumableArray(arr) { return arrayWithoutHoles(arr) || iterableToArray(arr) || nonIterableSpread(); }

function nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

if (!Object.fromEntries) {
  Object.fromEntries = function (iterable) {
    return toConsumableArray(iterable).reduce(function (obj, ref) {
      var key = ref[0],
          val = ref[1];
      return Object.assign(obj, defineProperty({}, key, val));
    }, {});
  };
}

// Object.assign
if (typeof Object.assign !== 'function') {
	Object.assign = function(target) {
	  'use strict'
	  if (target == null) {
		throw new TypeError('Cannot convert undefined or null to object')
	  }

	  target = Object(target)
	  for (var index = 1; index < arguments.length; index++) {
		var source = arguments[index]
		if (source != null) {
		  for (var key in source) {
			if (Object.prototype.hasOwnProperty.call(source, key)) {
			  target[key] = source[key]
			}
		  }
		}
	  }
	  return target
	}
  }

  // Symbol.iterator
  if (typeof Symbol !== 'function') {
	window.Symbol = function(description) {
		return '@@' + description;
	};
}

if (!Symbol.iterator) {
	Symbol.iterator = Symbol('iterator');
}

if (!Array.prototype[Symbol.iterator]) {
	var iteratorMethod = function() {
		var index = 0;
		var self = this;
		return {
			next: function() {
				return index < self.length ?
					{ value: self[index++], done: false } :
					{ done: true };
			}
		};
	};

	if (Object.defineProperty) {
		Object.defineProperty(Array.prototype, Symbol.iterator, {
			enumerable: false,
			writable: false,
			configurable: false,
			value: iteratorMethod
		});
	} else {
		Array.prototype[Symbol.iterator] = iteratorMethod;
	}
}

// String.replaceAll
if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function(str, newStr){
      if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
        return this.replace(str, newStr);
      }
      return this.replace(new RegExp(str, 'g'), newStr);
    };
  }

  // Intl
  if (window.Intl === undefined) {
	window.Intl = {
		DateTimeFormat: function() {
			return {
				format: function(date) {
					return date.toLocaleString();
				},
				resolvedOptions: function() {
					return {
						timeZone: (Date().toLocaleString().match(/\S+$/) || [''])[0]
					}
				}
			};
		}
	};
  }

  // <details> polyfill
  /*
Details Element Polyfill 2.4.0
Copyright © 2019 Javan Makhmali
 */
(function() {
	"use strict";
	var element = document.createElement("details");
	var elementIsNative = typeof HTMLDetailsElement != "undefined" && element instanceof HTMLDetailsElement;
	var support = {
	  open: "open" in element || elementIsNative,
	  toggle: "ontoggle" in element
	};
	var styles = '\ndetails, summary {\n  display: block;\n}\ndetails:not([open]) > *:not(summary) {\n  display: none;\n}\nsummary::before {\n  content: "►";\n  padding-right: 0.3rem;\n  font-size: 0.6rem;\n  cursor: default;\n}\n[open] > summary::before {\n  content: "▼";\n}\n';
	var _ref = [], forEach = _ref.forEach, slice = _ref.slice;
	if (!support.open) {
	  polyfillStyles();
	  polyfillProperties();
	  polyfillToggle();
	  polyfillAccessibility();
	}
	if (support.open && !support.toggle) {
	  polyfillToggleEvent();
	}
	function polyfillStyles() {
	  document.head.insertAdjacentHTML("afterbegin", "<style>" + styles + "</style>");
	}
	function polyfillProperties() {
	  var prototype = document.createElement("details").constructor.prototype;
	  var setAttribute = prototype.setAttribute, removeAttribute = prototype.removeAttribute;
	  var open = Object.getOwnPropertyDescriptor(prototype, "open");
	  Object.defineProperties(prototype, {
		open: {
		  get: function get() {
			if (this.tagName == "DETAILS") {
			  return this.hasAttribute("open");
			} else {
			  if (open && open.get) {
				return open.get.call(this);
			  }
			}
		  },
		  set: function set(value) {
			if (this.tagName == "DETAILS") {
			  return value ? this.setAttribute("open", "") : this.removeAttribute("open");
			} else {
			  if (open && open.set) {
				return open.set.call(this, value);
			  }
			}
		  }
		},
		setAttribute: {
		  value: function value(name, _value) {
			var _this = this;
			var call = function call() {
			  return setAttribute.call(_this, name, _value);
			};
			if (name == "open" && this.tagName == "DETAILS") {
			  var wasOpen = this.hasAttribute("open");
			  var result = call();
			  if (!wasOpen) {
				var summary = this.querySelector("summary");
				if (summary) summary.setAttribute("aria-expanded", true);
				triggerToggle(this);
			  }
			  return result;
			}
			return call();
		  }
		},
		removeAttribute: {
		  value: function value(name) {
			var _this2 = this;
			var call = function call() {
			  return removeAttribute.call(_this2, name);
			};
			if (name == "open" && this.tagName == "DETAILS") {
			  var wasOpen = this.hasAttribute("open");
			  var result = call();
			  if (wasOpen) {
				var summary = this.querySelector("summary");
				if (summary) summary.setAttribute("aria-expanded", false);
				triggerToggle(this);
			  }
			  return result;
			}
			return call();
		  }
		}
	  });
	}
	function polyfillToggle() {
	  onTogglingTrigger(function(element) {
		element.hasAttribute("open") ? element.removeAttribute("open") : element.setAttribute("open", "");
	  });
	}
	function polyfillToggleEvent() {
	  if (window.MutationObserver) {
		new MutationObserver(function(mutations) {
		  forEach.call(mutations, function(mutation) {
			var target = mutation.target, attributeName = mutation.attributeName;
			if (target.tagName == "DETAILS" && attributeName == "open") {
			  triggerToggle(target);
			}
		  });
		}).observe(document.documentElement, {
		  attributes: true,
		  subtree: true
		});
	  } else {
		onTogglingTrigger(function(element) {
		  var wasOpen = element.getAttribute("open");
		  setTimeout(function() {
			var isOpen = element.getAttribute("open");
			if (wasOpen != isOpen) {
			  triggerToggle(element);
			}
		  }, 1);
		});
	  }
	}
	function polyfillAccessibility() {
	  setAccessibilityAttributes(document);
	  if (window.MutationObserver) {
		new MutationObserver(function(mutations) {
		  forEach.call(mutations, function(mutation) {
			forEach.call(mutation.addedNodes, setAccessibilityAttributes);
		  });
		}).observe(document.documentElement, {
		  subtree: true,
		  childList: true
		});
	  } else {
		document.addEventListener("DOMNodeInserted", function(event) {
		  setAccessibilityAttributes(event.target);
		});
	  }
	}
	function setAccessibilityAttributes(root) {
	  findElementsWithTagName(root, "SUMMARY").forEach(function(summary) {
		var details = findClosestElementWithTagName(summary, "DETAILS");
		summary.setAttribute("aria-expanded", details.hasAttribute("open"));
		if (!summary.hasAttribute("tabindex")) summary.setAttribute("tabindex", "0");
		if (!summary.hasAttribute("role")) summary.setAttribute("role", "button");
	  });
	}
	function eventIsSignificant(event) {
	  return !(event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.target.isContentEditable);
	}
	function onTogglingTrigger(callback) {
	  addEventListener("click", function(event) {
		if (eventIsSignificant(event)) {
		  if (event.which <= 1) {
			var element = findClosestElementWithTagName(event.target, "SUMMARY");
			if (element && element.parentNode && element.parentNode.tagName == "DETAILS") {
			  callback(element.parentNode);
			}
		  }
		}
	  }, false);
	  addEventListener("keydown", function(event) {
		if (eventIsSignificant(event)) {
		  if (event.keyCode == 13 || event.keyCode == 32) {
			var element = findClosestElementWithTagName(event.target, "SUMMARY");
			if (element && element.parentNode && element.parentNode.tagName == "DETAILS") {
			  callback(element.parentNode);
			  event.preventDefault();
			}
		  }
		}
	  }, false);
	}
	function triggerToggle(element) {
	  var event = document.createEvent("Event");
	  event.initEvent("toggle", false, false);
	  element.dispatchEvent(event);
	}
	function findElementsWithTagName(root, tagName) {
	  return (root.tagName == tagName ? [ root ] : []).concat(typeof root.getElementsByTagName == "function" ? slice.call(root.getElementsByTagName(tagName)) : []);
	}
	function findClosestElementWithTagName(element, tagName) {
	  if (typeof element.closest == "function") {
		return element.closest(tagName);
	  } else {
		while (element) {
		  if (element.tagName == tagName) {
			return element;
		  } else {
			element = element.parentNode;
		  }
		}
	  }
	}
  })();

  //Array.includes
  // https://tc39.github.io/ecma262/#sec-array.prototype.includes
if (!Array.prototype.includes) {
	Object.defineProperty(Array.prototype, 'includes', {
	  value: function(searchElement, fromIndex) {

		if (this == null) {
		  throw new TypeError('"this" is null or not defined')
		}

		// 1. Let O be ? ToObject(this value).
		var o = Object(this)

		// 2. Let len be ? ToLength(? Get(O, "length")).
		var len = o.length >>> 0

		// 3. If len is 0, return false.
		if (len === 0) {
		  return false
		}

		// 4. Let n be ? ToInteger(fromIndex).
		//    (If fromIndex is undefined, this step produces the value 0.)
		var n = fromIndex | 0

		// 5. If n ≥ 0, then
		//  a. Let k be n.
		// 6. Else n < 0,
		//  a. Let k be len + n.
		//  b. If k < 0, let k be 0.
		var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0)

		function sameValueZero(x, y) {
		  return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y))
		}

		// 7. Repeat, while k < len
		while (k < len) {
		  // a. Let elementK be the result of ? Get(O, ! ToString(k)).
		  // b. If SameValueZero(searchElement, elementK) is true, return true.
		  if (sameValueZero(o[k], searchElement)) {
			return true
		  }
		  // c. Increase k by 1.
		  k++
		}

		// 8. Return false
		return false
	  }
	})
  }
