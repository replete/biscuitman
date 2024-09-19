/*! biscuitman-legacy.js 0.5.0 */
(function () {
	'use strict';

	// biscuitman-legacy.js polyfills:

	// Object.entries
	Object.entries = Object.entries ? Object.entries : function(obj) {
		var allowedTypes = ['[object String]', '[object Object]', '[object Array]', '[object Function]'];
		var objType = Object.prototype.toString.call(obj);

		if (obj === null || typeof obj === 'undefined') {
			throw new TypeError('Cannot convert undefined or null to object')
		} else if (!~allowedTypes.indexOf(objType)) {
			return []
		} else {
			// if ES6 is supported
			if (Object.keys) {
				return Object.keys(obj).map(function(key) {
					return [key, obj[key]]
				})
			}
			var result = [];
			for (var prop in obj) {
				if (obj.hasOwnProperty(prop)) {
					result.push([prop, obj[prop]]);
				}
			}

			return objType === '[object Array]' ? result : result.sort(function(a, b) {
				return a[1] - b[1]
			})
		}
	};

	// Array|NodeList.forEach
	if (!Array.prototype.forEach) {
		Array.prototype.forEach = function(fn, scope) {
			var i, len;
			for (i = 0, len = this.length; i < len; ++i) {
				if (i in this) {
					fn.call(scope, this[i], i, this);
				}
			}
		};
	}
	if (!NodeList.prototype.forEach) {
		NodeList.prototype.forEach = function(callback, thisArg) {
			var i;
			for (i = 0; i < this.length; i++) {
				callback.call(thisArg, this[i], i, this);
			}
		};
	}
	// String.endsWith
	if (!String.prototype.endsWith) {
		String.prototype.endsWith = function(search, this_len) {
			if (this_len === undefined || this_len > this.length) {
				this_len = this.length;
			}
			return this.substring(this_len - search.length, this_len) === search
		};
	}
	// String.startsWith
	if (!String.prototype.startsWith) {
		String.prototype.startsWith = function(searchString, position) {
			position = position || 0;
			return this.substring(position, position + searchString.length) === searchString
		};
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
			var ce = new window.CustomEvent('test', {
				cancelable: true
			});
			ce.preventDefault();
			if (ce.defaultPrevented !== true) {
				// IE has problems with .preventDefault() on custom events
				// http://stackoverflow.com/questions/23349191
				throw new Error('Could not prevent default')
			}
		} catch (e) {
			var CustomEvent = function(event, params) {
				var evt, origPrevent;

				// We use here some version of `Object.assign` implementation, to create a shallow copy of `params`.
				// Based on https://github.com/christiansany/object-assign-polyfill/blob/213cc63df14515fb543117059d1576204bfaa8a7/index.js
				var newParams = {};
				// Skip over if undefined or null
				if (params != null) {
					for (var nextKey in params) {
						// Avoid bugs when hasOwnProperty is shadowed
						if (Object.prototype.hasOwnProperty.call(params, nextKey)) {
							newParams[nextKey] = params[nextKey];
						}
					}
				}

				newParams.bubbles = !!newParams.bubbles;
				newParams.cancelable = !!newParams.cancelable;

				evt = document.createEvent('CustomEvent');
				evt.initCustomEvent(
					event,
					newParams.bubbles,
					newParams.cancelable,
					newParams.detail
				);
				origPrevent = evt.preventDefault;
				evt.preventDefault = function() {
					origPrevent.call(this);
					try {
						Object.defineProperty(this, 'defaultPrevented', {
							get: function() {
								return true
							}
						});
					} catch (e) {
						this.defaultPrevented = true;
					}
				};
				return evt
			};

			CustomEvent.prototype = window.Event.prototype;
			window.CustomEvent = CustomEvent; // expose definition to window
		}
	})();

	// Array.from
	function arrayFrom(arr, callbackFn, thisArg) {
		//if you need you can uncomment the following line
		//if(!arr || typeof arr == 'function')throw new Error('This function requires an array-like object - not null, undefined or a function');

		var arNew = [],
			k = [], // used for convert Set to an Array
			i = 0;

		//if you do not need a Set object support then
		//you can comment or delete the following if statement
		if (window.Set && arr instanceof Set) {
			//we use forEach from Set object
			arr.forEach(function(v) {
				k.push(v);
			});
			arr = k;
		}

		for (; i < arr.length; i++)
			arNew[i] = callbackFn ?
			callbackFn.call(thisArg, arr[i], i, arr) :
			arr[i];

		return arNew
	}

	Array.from = Array.from || arrayFrom;

	// Object.fromEntries
	function defineProperty(obj, key, value) {
		if (key in obj) {
			Object.defineProperty(obj, key, {
				value: value,
				enumerable: true,
				configurable: true,
				writable: true
			});
		} else {
			obj[key] = value;
		}
		return obj;
	}

	function toConsumableArray(arr) {
		return arrayWithoutHoles(arr) || iterableToArray(arr) || nonIterableSpread();
	}

	function nonIterableSpread() {
		throw new TypeError("Invalid attempt to spread non-iterable instance");
	}

	function iterableToArray(iter) {
		if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
	}

	function arrayWithoutHoles(arr) {
		if (Array.isArray(arr)) {
			for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) {
				arr2[i] = arr[i];
			}
			return arr2;
		}
	}

	if (!Object.fromEntries) {
		Object.fromEntries = function(iterable) {
			return toConsumableArray(iterable).reduce(function(obj, ref) {
				var key = ref[0],
					val = ref[1];
				return Object.assign(obj, defineProperty({}, key, val));
			}, {});
		};
	}

	// Object.assign
	if (typeof Object.assign !== 'function') {
		Object.assign = function(target) {
			if (target == null) {
				throw new TypeError('Cannot convert undefined or null to object')
			}

			target = Object(target);
			for (var index = 1; index < arguments.length; index++) {
				var source = arguments[index];
				if (source != null) {
					for (var key in source) {
						if (Object.prototype.hasOwnProperty.call(source, key)) {
							target[key] = source[key];
						}
					}
				}
			}
			return target
		};
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
					return index < self.length ? {
						value: self[index++],
						done: false
					} : {
						done: true
					};
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
		String.prototype.replaceAll = function(str, newStr) {
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
		var element = document.createElement("details");
		var elementIsNative = typeof HTMLDetailsElement != "undefined" && element instanceof HTMLDetailsElement;
		var support = {
			open: "open" in element || elementIsNative,
			toggle: "ontoggle" in element
		};
		var styles = '\ndetails, summary {\n  display: block;\n}\ndetails:not([open]) > *:not(summary) {\n  display: none;\n}\nsummary::before {\n  content: "►";\n  padding-right: 0.3rem;\n  font-size: 0.6rem;\n  cursor: default;\n}\n[open] > summary::before {\n  content: "▼";\n}\n';
		var _ref = [],
			forEach = _ref.forEach,
			slice = _ref.slice;
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
			var setAttribute = prototype.setAttribute,
				removeAttribute = prototype.removeAttribute;
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
						var target = mutation.target,
							attributeName = mutation.attributeName;
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
			return (root.tagName == tagName ? [root] : []).concat(typeof root.getElementsByTagName == "function" ? slice.call(root.getElementsByTagName(tagName)) : []);
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
				var o = Object(this);

				// 2. Let len be ? ToLength(? Get(O, "length")).
				var len = o.length >>> 0;

				// 3. If len is 0, return false.
				if (len === 0) {
					return false
				}

				// 4. Let n be ? ToInteger(fromIndex).
				//    (If fromIndex is undefined, this step produces the value 0.)
				var n = fromIndex | 0;

				// 5. If n ≥ 0, then
				//  a. Let k be n.
				// 6. Else n < 0,
				//  a. Let k be len + n.
				//  b. If k < 0, let k be 0.
				var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

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
					k++;
				}

				// 8. Return false
				return false
			}
		});
	}

	// Fix IE11's missing second classList.toggle parameter:

	(function() {
		// Check if it's IE11
		var isIE11 = !!window.MSInputMethodContext && !!document.documentMode;

		if (!isIE11) return;

		// Store the original toggle function
		var originalToggle = DOMTokenList.prototype.toggle;

		// Override the toggle function
		DOMTokenList.prototype.toggle = function(token, force) {
			if (arguments.length === 1) {
				return originalToggle.call(this, token);
			}

			if (force === true) {
				this.add(token);
				return true;
			}
			if (force === false) {
				this.remove(token);
				return false;
			}

			return originalToggle.call(this, token);
		};
	})();

	var _excluded = ["consentTime"],
	  _excluded2 = ["consentTime"];
	function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
	function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var s = Object.getOwnPropertySymbols(e); for (r = 0; r < s.length; r++) o = s[r], t.includes(o) || {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
	function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (e.includes(n)) continue; t[n] = r[n]; } return t; }
	function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
	function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
	function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
	function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
	function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) ; else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
	function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
	function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
	function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
	function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
	function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
	function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
	(function (d, w, O, h) {
	  var defaults = {
	    key: 'myconsent',
	    global: 'Consent',
	    force: false,
	    enableMore: true,
	    sections: ['essential'],
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
	    dialogPolyfill: '/dist/dialog-polyfill.withcss.min.js' // set to false to disable dialog polyfill loading
	    // message: 'By clicking "Accept All", you agree to the use of cookies for improving browsing, providing personalized ads or content, and analyzing traffic. {link}',
	    // info: `Cookies categorized as "Essential" are stored in your browser to enable basic site functionalities.
	    // Additionally, third-party cookies are utilized to analyze website usage, store preferences, and deliver relevant content and advertisements with your consent.
	    // While you have the option to enable or disable some or all of these cookies, note that disabling certain ones may impact your browsing experience.`,
	    // linkText: 'Privacy Policy',
	    // linkURL: 'https://domain.com/privacy-policy',
	    // sections: ['essential','functional','analytics','performance','advertisement','uncategorized'],
	    // essentialTitle: 'Essential',
	    // essentialMessage: 'Essential cookies are required for basic site functionality',
	    // functionalTitle: 'Functional',
	    // functionalMessage: 'Functional cookies allow us to perform specific tasks such as sharing website content on social media platforms, gathering feedback, and enabling other third-party features',
	    // analyticsTitle: 'Analytics',
	    // analyticsMessage: 'Analytical cookies allow us to understand visitor interactions with the website, offering insights into metrics like visitor count, bounce rate, and traffic source',
	    // analyticsCookies: {
	    // 	'_ga': 'This cookie, set by Google Analytics, computes visitor, session, and campaign data, tracking site usage for analytical reports. It stores information anonymously, assigning a randomly generated number to identify unique visitors',
	    // 	'_ga_*': 'Google Analytics uses this cookie for storing page view count'
	    // },
	    // performanceTitle: 'Performance',
	    // performanceMessage: 'Performance cookies allow us to understand critical website performance indicators, contributing to an enhanced user experience for visitors',
	    // advertisementTitle: 'Advertisement',
	    // advertisementMessage: 'Advertisement cookies serve to deliver tailored advertisements to visitors based on their previous page visits and to evaluate the efficacy of advertising campaigns',
	    // uncategorizedTitle: 'Uncategorized',
	    // uncategorizedMessage: 'Uncategorized cookies are those currently under analysis and have not yet been assigned to a specific category',
	  };
	  var o = _objectSpread(_objectSpread({}, defaults), w.biscuitman);

	  // UI & Events:

	  var ui = d.createElement('div');
	  var dialog;
	  function render() {
	    ui.classList.add('biscuitman');
	    ui.innerHTML = "\n<article>\n\t<b>".concat(o.title, "</b>\n\t<p>").concat(o.message, "</p>\n\t<nav>\n\t\t<button data-id=\"accept\">").concat(o.accept, "</button>\n\t\t<button data-id=\"settings\">").concat(o.settings, "</button>\n\t\t<button data-id=\"reject\">").concat(o.reject, "</button>\n\t</nav>\n</article>\n<dialog>\n\t<div class=\"bm-dialog\">\n\t\t<b>").concat(o.settingsTitle, "</b>\n\t\t<button data-id=\"close\"").concat(o.force ? ' disabled' : '', ">\xD7</button>\n\t\t<div class=\"bm-sections\">\n\t\t\t<p><span>").concat(o.message, "</span></p>\n\t\t\t<p>").concat(o.info.split('\n').map(function (line, i, arr) {
	      return "<span>".concat(line, "</span>\n\t\t\t\t").concat(arr.length > 1 && o.enableMore && i == 0 ? "<a class=\"more\" href=\"javascript:void(0)\">".concat(o.more, "</a>") : '');
	    }).join(''), "\n\t\t\t</p>\n\t\t\t").concat(o.sections.map(function (section) {
	      var hasConsent = getConsents()[section];
	      var isEssential = section === 'essential';
	      var disabledProp = isEssential ? 'disabled' : '';
	      var checkedProp = isEssential ? 'checked' : '';
	      if (hasConsent !== undefined) checkedProp = hasConsent ? 'checked' : '';
	      var cookies = o["".concat(section, "Cookies")];
	      return "\n\t\t\t<section>\n\t\t\t\t<details>\n\t\t\t\t\t<summary>\n\t\t\t\t\t\t<b>".concat(o["".concat(section, "Title")], "</b>\n\t\t\t\t\t\t<label for=\"bm_").concat(section, "\" class=\"").concat(disabledProp, " ").concat(checkedProp, "\">\n\t\t\t\t\t\t\t<input type=\"checkbox\" id=\"bm_").concat(section, "\" ").concat(disabledProp, " ").concat(checkedProp, " data-s=\"").concat(section, "\"/>\n\t\t\t\t\t\t</label>\n\t\t\t\t\t\t<p>").concat(o["".concat(section, "Message")], "</p>\n\t\t\t\t\t</summary>\n\t\t\t\t\t").concat(cookies ? O.entries(cookies).map(function (_ref) {
	        var _ref2 = _slicedToArray(_ref, 2),
	          k = _ref2[0],
	          v = _ref2[1];
	        return "<dl><dt>".concat(k, "</dt><dd>").concat(v, "</dd></dl>");
	      }).join('') : "<dl><dd>".concat(o.noCookies, "</dd></dl>"), "\n\t\t\t\t</details>\n\t\t\t</section>");
	    }).join(''), "\n\t\t</div>\n\t\t<nav>\n\t\t\t<button data-id=\"accept\">").concat(o.accept, "</button>\n\t\t\t<button data-id=\"save\">").concat(o.save, "</button>\n\t\t\t<button data-id=\"reject\">").concat(o.reject, "</button>\n\t\t</nav>\n\t</div>\n</dialog>").replaceAll('{link}', "<a href=\"".concat(o.linkURL, "\">").concat(o.linkText, "</a>"));
	    ui.querySelectorAll('button').forEach(function (b) {
	      return b.addEventListener('click', buttonHandler);
	    });
	    dialog = ui.querySelector('dialog');
	    dialog.addEventListener('close', closeModalHandler);
	    dialog.addEventListener('cancel', cancelModalHandler);
	    if (o.dialogPolyfill && !dialog.close || !dialog.showModal) loadDialogPolyfill(dialog);
	    var moreLink = ui.querySelector('.more');
	    if (moreLink) moreLink.addEventListener('click', moreLink.remove);
	    ui.querySelectorAll('[data-s]').forEach(function (checkbox) {
	      return checkbox.addEventListener('change', function (e) {
	        checkbox.parentElement.classList.toggle('checked', e.target.checked);
	      });
	    });
	    d.body.appendChild(ui);
	    w.addEventListener('resize', updateBannerHeight);
	  }
	  var updateBannerHeight = function updateBannerHeight() {
	    h.style.setProperty('--bm-height', "".concat(ui.offsetHeight, "px"));
	  };
	  var displayUI = function displayUI(show) {
	    h.classList.toggle('bm-show', show);
	    updateBannerHeight();
	  };
	  var applyCssClasses = function applyCssClasses() {
	    var _getConsents = getConsents(),
	      consentTime = _getConsents.consentTime,
	      consents = _objectWithoutProperties(_getConsents, _excluded);
	    if (!consentTime) consents = O.fromEntries(o.sections.slice(1).map(function (sectionName) {
	      return [sectionName, false];
	    }));
	    for (var _i2 = 0, _O$entries2 = O.entries(consents); _i2 < _O$entries2.length; _i2++) {
	      var _O$entries2$_i = _slicedToArray(_O$entries2[_i2], 2),
	        name = _O$entries2$_i[0],
	        granted = _O$entries2$_i[1];
	      h.classList.toggle("bm-".concat(name), granted);
	      h.classList.toggle("bm-no-".concat(name), !granted);
	    }
	  };
	  function buttonHandler(e) {
	    var id = e.target.dataset.id;
	    dispatch('button', {
	      id: id
	    });
	    switch (id) {
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
	    var name = "bm:".concat(eventName);
	    var payload = _objectSpread(_objectSpread({}, data !== undefined && data), {}, {
	      time: +new Date()
	    });
	    d.dispatchEvent(new CustomEvent(name, {
	      detail: payload
	    }));
	    console.debug(name, payload);
	  }
	  function loadDialogPolyfill(dialog) {
	    function mount() {
	      d.documentElement.classList.add('bm-dialog-polyfill');
	      w.dialogPolyfill.registerDialog(dialog);
	    }
	    if (w.dialogPolyfill) mount();else {
	      var script = d.createElement('script');
	      script.onload = mount;
	      script.src = o.dialogPolyfill;
	      d.head.appendChild(script);
	    }
	  }

	  // Data:

	  var getConsents = function getConsents() {
	    return w[o.global] || {};
	  };
	  function setConsents(consents) {
	    w[o.global] = consents;
	    applyCssClasses();
	  }
	  function checkConsents(oldConsents, newConsents) {
	    for (var sectionName in oldConsents) if (oldConsents[sectionName] && newConsents[sectionName] === false) dispatch('revoke', {
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
	    var localStores = O.fromEntries(O.entries(localStorage));
	    var cookies = O.fromEntries(d.cookie.split('; ').map(function (cookie) {
	      return cookie.split('=');
	    }));
	    var _ref3 = loadConsents() || o.sections.slice(1).reduce(function (consents, section) {
	        consents[section] = false;
	        return _objectSpread({
	          consentTime: undefined
	        }, consents);
	      }, {});
	      _ref3.consentTime;
	      var consents = _objectWithoutProperties(_ref3, _excluded2);
	    var _loop = function _loop() {
	      var _O$entries4$_i = _slicedToArray(_O$entries4[_i4], 2),
	        section = _O$entries4$_i[0],
	        sectionConsent = _O$entries4$_i[1];
	      if (sectionConsent) return 1; // continue
	      var sectionCookieNames = O.keys(o["".concat(section, "Cookies")] || {});
	      sectionCookieNames.filter(function (name) {
	        return name.endsWith('*');
	      }).map(function (wildcardName) {
	        O.keys(_objectSpread(_objectSpread({}, cookies), localStores)).map(function (name) {
	          if (name.startsWith(wildcardName.slice(0, -1))) sectionCookieNames.push(name);
	        });
	      });
	      for (var _i6 = 0; _i6 < sectionCookieNames.length; _i6++) {
	        var name = sectionCookieNames[_i6];
	        if (cookies[name]) {
	          var expiredCookie = "".concat(name, "=;expires=Thu, 01 Jan 1970 00:00:01 UTC;path=/;");
	          d.cookie = expiredCookie;
	          d.cookie = "".concat(expiredCookie, "domain=").concat(location.hostname, ";"); // Safari iOS
	          d.cookie = "".concat(expiredCookie, "domain=.").concat(location.hostname, ";"); // Safari iOS
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
	    };
	    for (var _i4 = 0, _O$entries4 = O.entries(consents); _i4 < _O$entries4.length; _i4++) {
	      if (_loop()) continue;
	    }
	  }
	  function saveConsents(value) {
	    var willReadValues = value === undefined;
	    var consents = {
	      consentTime: +new Date()
	    };
	    o.sections.forEach(function (section) {
	      if (section === 'essential') return false;
	      var sectionElement = ui.querySelector("[data-s=".concat(section, "]"));
	      var sectionConsent = willReadValues ? sectionElement.checked : value;
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
	    var scripts = d.querySelectorAll('script[data-consent]');
	    scripts.forEach(function (script) {
	      if (!getConsents()[script.dataset.consent]) return false;
	      var newScript = d.createElement('script');
	      for (var _i8 = 0, _script$attributes2 = script.attributes; _i8 < _script$attributes2.length; _i8++) {
	        var _script$attributes2$_ = _script$attributes2[_i8],
	          name = _script$attributes2$_.name,
	          value = _script$attributes2$_.value;
	        if (name.startsWith('data-') || name === 'type') continue;
	        newScript.setAttribute(name, value);
	      }
	      newScript.setAttribute('type', script.dataset.type || 'text/javascript');
	      if (!script.src) newScript.textContent = script.textContent;
	      script.parentNode.replaceChild(newScript, script);
	      dispatch('inject', _objectSpread({
	        el: script
	      }, script.id && {
	        id: script.id
	      }));

	      // If tag has src AND tag content, inject new tag adjacent to parent after load
	      if (script.src && script.textContent.trim() !== '') newScript.addEventListener('load', function () {
	        var afterScript = d.createElement('script');
	        afterScript.textContent = script.textContent;
	        if (script.id) afterScript.id = script.id + '-after';
	        newScript.insertAdjacentElement('afterend', afterScript);
	        dispatch('inject', _objectSpread({
	          el: afterScript,
	          parent: script
	        }, afterScript.id && {
	          id: afterScript.id
	        }));
	      });
	    });
	  }

	  // Start:

	  setConsents(loadConsents() || {});

	  // Optional Non-EU auto-consent
	  var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
	  var isEuropeTimezone = /^(GMT|UTC)$/.test(tz) || /(Europe|BST|CEST|CET|EET|IST|WEST|WET|GMT-1|GMT-2|UTC+1|UTC+2|UTC+3)/.test(tz);
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
	  } else {
	    displayUI(true);
	    if (o.force) openModal();
	  }

	  // Helper  methods
	  // <a onclick="bmInvalidate()" href="javascript:void(0)">Delete Consent Preferences</a>
	  w.bmInvalidate = function () {
	    dispatch('invalidate', {
	      data: getConsents()
	    });
	    checkConsents({});
	    saveConsents(false);
	    setConsents({});
	    localStorage.removeItem(o.key);
	    displayUI(true);
	  };
	  // <a onclick="bmUpdate()" href="javascript:void(0)">Update Consent Preferences</a>
	  w.bmUpdate = function () {
	    dispatch('update', {
	      data: getConsents()
	    });
	    openModal();
	  };
	})(document, window, Object, document.documentElement);

})();
