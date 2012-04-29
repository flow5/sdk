/***********************************************************************************************************************

	Copyright (c) 2011 Paul Greyson

	Permission is hereby granted, free of charge, to any person 
	obtaining a copy of this software and associated documentation 
	files (the "Software"), to deal in the Software without 
	restriction, including without limitation the rights to use, 
	copy, modify, merge, publish, distribute, sublicense, and/or 
	sell copies of the Software, and to permit persons to whom the 
	Software is furnished to do so, subject to the following 
	conditions:

	The above copyright notice and this permission notice shall be 
	included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, 
	EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES 
	OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
	NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
	HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, 
	WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
	FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR 
	OTHER DEALINGS IN THE SOFTWARE.

***********************************************************************************************************************/
/*global F5, RegExp*/

F5.registerModule(function (F5) {
		
	function startEventName() {
		if (F5.isMobile()) {
			return 'touchstart';		
		}
		else {
			return 'mousedown';				
		}
	}

	function stopEventName() {
		if (F5.isMobile()) {
			return 'touchend';		
		}
		else {
			return 'mouseup';				
		}
	}

	function moveEventName() {
		if (F5.isMobile()) {
			return 'touchmove';		
		}
		else {
			return 'mousemove';		
		}
	}	
	
	// OPTION: retain references to the DOM elements to help track down dangling listeners
	var eventListenerCount = 0;
		
	function addEventListener(el, eventType, cb, eventName) {
		if (!el.F5) {
			el.F5 = {};
		}
		if (!el.F5.listeners) {
			el.F5.listeners = {};
		}
		eventName = eventName || eventType;
		
		// triggers a very expensive outerHTML call!
//		F5.assert(!el.F5.listeners[eventName], 'Already listening for: ' + eventName + ' on: ' + el.outerHTML);
		F5.assert(!el.F5.listeners[eventName], 'Already listening for: ' + eventName + ' on element with id: ' + el.id);
		
		el.F5.listeners[eventName] = function f5eventListenerWrapper(e) {
			// TODO: check for transitioning for all event callbacks?
			if (!F5.synchronousXHRReentryWorkaround) {
				F5.callback(cb, e);				
			} else {
				console.log('Ignoring event dispatched during synchronous xhr.send: ' + eventName);
			}			
		};
		el.addEventListener(eventType, el.F5.listeners[eventName], false);	
		eventListenerCount += 1;
	}
	
	function removeEventListener(el, eventType, eventName) {
		eventName = eventName || eventType;
		if (el.F5 && el.F5.listeners && el.F5.listeners[eventName]) {
			el.removeEventListener(eventType, el.F5.listeners[eventName]);
			delete el.F5.listeners[eventName];
			eventListenerCount -= 1;
		}
	}
	
	// TODO: move this to diags layer
	F5.logEventListenerCount = function () {
		console.log('event listeners: ' + eventListenerCount);
	};
	
	// NOTE: used by the view controller as a workaround for an iOS 4.x memory leak
	// when an element is removed from the DOM when there is a touch event listener attached
	F5.removeTouchEventListenersRecursive = function (el) {
		function removeTouchEventListeners(el) {
			F5.removeTouchStartListener(el);
			F5.removeTouchStopListener(el);
			F5.removeTouchMoveListener(el);
			F5.removeTapListener(el);			
		}
		
		removeTouchEventListeners(el);
		F5.forEach(el.querySelectorAll('*'), function (el) {
			removeTouchEventListeners(el);
		});		
	};
	
				
	F5.addTouchStartListener = function (el, cb) {
		addEventListener(el, startEventName(), cb);
	};
	
	F5.removeTouchStartListener = function (el) {
		removeEventListener(el, startEventName());		
	};
	
	F5.addTouchStopListener = function (el, cb) {
		addEventListener(el, stopEventName(), cb);
	};
	
	F5.removeTouchStopListener = function (el) {
		removeEventListener(el, stopEventName());		
	};
	
	F5.addTouchMoveListener = function (el, cb) {
		addEventListener(el, moveEventName(), function (e) {
			e.preventDefault();
			cb(e);
		});
	};
	
	F5.removeTouchMoveListener = function (el) {
		removeEventListener(el, moveEventName());		
	};	
	
	F5.maxClickDistance = 30;
	F5.maxClickTime = 1000;
	
	F5.addTapListener = function (el, cb, pressTime) {		
		addEventListener(el, startEventName(), function (startEvent) {	
			var cancel = false;
								
			startEvent.preventDefault();
			
			var startLoc = F5.eventLocation(startEvent);
			removeEventListener(el, startEventName(), 'tap');
			
			addEventListener(el, moveEventName(), function (moveEvent) {
				var moveLoc = F5.eventLocation(moveEvent);				
				var moveDistance = F5.eventDistance(startLoc, moveLoc);
				if (moveDistance > F5.maxClickDistance) {
					cancel = true;
				}
			}, 'tapMove');
			
			addEventListener(el, stopEventName(), function (stopEvent) {
				stopEvent.preventDefault();
				
				var stopLoc = F5.eventLocation(stopEvent);
				removeEventListener(el, stopEventName(), 'tap');
				removeEventListener(el, moveEventName(), 'tapMove');
				
				var clickTime = stopEvent.timeStamp - startEvent.timeStamp;
				var clickMove = F5.eventDistance(startLoc, stopLoc);
				
				if (pressTime) {
					if (clickTime >= pressTime && clickMove <= F5.maxClickDistance) {
						F5.callback(cb, stopEvent);
					}										
				} else {
					if (clickTime <= F5.maxClickTime && clickMove <= F5.maxClickDistance && !cancel) {
						F5.callback(cb, stopEvent);
					}					
				}				
				
				F5.addTapListener(el, cb, pressTime);
				
			}, 'tap');
		}, 'tap');
	};
	
	F5.removeTapListener = function (el) {
		removeEventListener(el, startEventName(), 'tap');
		removeEventListener(el, moveEventName(), 'tapMove');
		removeEventListener(el, stopEventName(), 'tap');
	};
	
	F5.addTransitionEndListener = function (el, cb) {
		addEventListener(el, F5.eventName('transitionEnd'), function (e) {
			// TODO: originalTarget is for Firefox. srcElement is for webkit and IE. break these out?
			if (e.originalTarget === el || e.srcElement === el) {
				cb(e);				
			}
		});
	};
	
	F5.removeTransitionEndListener = function (el) {
		removeEventListener(el, F5.eventName('transitionEnd'));		
	};
	
	F5.alert = function (title, message, action) {
		if (message) {
			message += '';
		}		
		
		var alert = F5.createWidget('Alert', {title: title, message: message});
		alert.widget.setAction(action);
		alert.widget.present();
		return alert.widget;
	};

	F5.confirm = function (title, message, action) {
		if (message) {
			message += '';
		}		
		
		var confirm = F5.createWidget('Confirm', {title: title, message: message});
		confirm.widget.setAction(action);
		confirm.widget.present();
		return confirm.widget;
	};
	
	F5.screen = function () {
		return document.getElementById('f5screen');
	};
	
	F5.eventLocation = function(event) {
		var x, y;
		if (F5.isMobile()) {
			if (event.touches[0]) {
				x = event.touches[0].screenX;
				y = event.touches[0].screenY;					
			} else {
				x = event.changedTouches[0].screenX;
				y = event.changedTouches[0].screenY;			
			}	
		}		
		else {
			// in browser, there may be a zoom on the screen element
			// TODO: cache this value
			var zoom = window.getComputedStyle(document.getElementById('f5screen')).zoom || 1;
			x = event.clientX / zoom;
			y = event.clientY / zoom; 
		}	

		return {x: x, y: y};
	};	
	
	F5.eventDistance = function(loc1, loc2) {		
		var deltaX = loc2.x - loc1.x;
		var deltaY = loc2.y - loc1.y;

		return Math.sqrt(deltaX*deltaX+deltaY*deltaY);
	};
	
	F5.modifyCSSRule = function (selectorText, properties) {	
		var styleSheets = document.styleSheets;
		var i;
		for (i = 0; i < styleSheets.length; i += 1) {
			var cssRules = styleSheets.item(i).cssRules;
			if (cssRules) {
				var j;
				for (j = 0; j < cssRules.length; j += 1) {
					var rule = cssRules.item(j);
					if (rule && rule.selectorText) {
						if (rule.selectorText === selectorText){
							var id;
							for (id in properties) {
								if (properties.hasOwnProperty(id)) {
									rule.style[id] = properties[id];									
								}
							}
						}										
					}
				}				
			}
		}
	};
	
	F5.elementAbsolutePosition = function(el) {
		var x = 0, y = 0;
		while (el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop )) {
			x += el.offsetLeft;
			y += el.offsetTop;

			el = el.parentNode;			
		}
		return {x: x, y: y};
	};
	
	F5.hasClass = function (el, className) {
		F5.assert(!className.match(' '), 'className should not have a space: ' + className);
				
		var startRegEx = new RegExp('^' + className + ' ');
		var stopRegEx = new RegExp(' ' + className + '$');
		var middleRegEx = new RegExp(' '  + className + ' ');
		return el.className === className || 
				el.className.match(startRegEx) ||
				el.className.match(middleRegEx) || 
				el.className.match(stopRegEx);
	};

	F5.removeClass = function (el, className) {
		F5.assert(!className.match(' '), 'className should not have a space: ' + className);	
			
		if (el.className === className) {
			el.className = '';
		} else {
			var startRegEx = new RegExp('^' + className + ' ');
			var middleRegEx = new RegExp(' '  + className + ' ');
			var stopRegEx = new RegExp(' ' + className + '$');
			el.className = el.className.replace(startRegEx, '').replace(middleRegEx, ' ').replace(stopRegEx, '');			
		}
	};
	
	F5.addClass = function (el, className) {
		F5.assert(!className.match(' '), 'className should not have a space: ' + className);
		
		if (!F5.hasClass(el, className)) {
			if (el.className) {
				el.className += ' ' + className;				
			} else {
				el.className = className;
			}
		}
	};
		
	F5.setupScreenGeometry = function (isMobile, isNative) {
		var geometry = F5.query.geometry;
		
		if (F5.isDebug()) {
//			F5.addClass(document.body, 'f5debug');
		}
		
		var style, width, height;
		if (geometry) {
			var size;
			switch (geometry) {
			case 'iphone-portrait':
				width = 320;
				height = 460;
				break;
			case 'iphone-landscape':
				width = 480;
				height = 300;
				break;
			case 'ipad-portrait':
				height = 1004;
				width = 768;
				break;
			case 'ipad-landscape':
				height = 748;
				width = 1024;
				break;
			default:			
				size = geometry.split('x');
				width = size[0];
				height = size[1];
				break;
			}
			style = document.createElement('style');
			style.innerHTML = '#f5screen {width:' + width + 'px; height:' + height + 'px;}';
			document.body.appendChild(style);
		} else if (isMobile && !isNative) {
			if (window.innerWidth > window.innerHeight) {
				width = window.innerHeight;
				height = window.innerWidth;
			} else {
				width = window.innerWidth;
				height = window.innerHeight;
			}
			var statusbar;
			if (screen.width > screen.height) {
				statusbar = screen.width - screen.availWidth;
			} else {
				statusbar = screen.height - screen.availHeight;
			}
			
			// on iOS the window can be scrolled so that the location bar is clipped
			// TODO: would love to be able to determine these sizes programtically but so far no luck
			var portraitToolbar = 0;
			var landscapeToolbar = 0;
			
			// NOTE: this handles the ios webapp case. android still needs wo
			if (window.innerHeight !== screen.availHeight) {
				portraitToolbar = 44;
				landscapeToolbar = 30;			
			}
			
			style = document.createElement('style');			
			style.innerHTML = '@media screen and (orientation: portrait)\n\
								{\n\
									.f5mobile #f5screen {\n\
										width:' + screen.width + 'px;\n\
										height:' + (screen.height - (statusbar + portraitToolbar)) + 'px;\n\
									}\n\
								}\n\
								@media screen and (orientation: landscape)\n\
								{\n\
									.f5mobile #f5screen {\n\
										width:' + screen.height + 'px;\n\
										height:' + (screen.width - (statusbar + landscapeToolbar)) + 'px;\n\
									}\n\
								}';
			document.body.appendChild(style);						

			document.addEventListener('orientationchange', function () {
				setTimeout(function () {
					window.scrollTo(0, 0);
				}, 0);			
			});		
		} else {
			var screenEl = document.getElementById('f5screen');
			height = screenEl.offsetHeight;
			width = screenEl.offsetWidth;			
		}
		
		/* for resolution independence, sizes should be expressed in em */
		/* by specifying a default size of 100px
		   em = px * 100. default sizes are based on iOS screen densities */
		// default is based on iPhone height
		var metric = width/320;
		if (metric > 1.5) {
			metric = 1.5;
		}
		
		document.getElementById('f5appframe').style.fontSize = metric*100 + 'px';		
	};	
		
	F5.elementOffsetGeometry = function (el) {
		return {top: el.offsetTop,
				left: el.offsetLeft,
				width: el.offsetWidth,
				height: el.offsetHeight};
	};
	
	F5.isMobile = function () {
		return F5.query.mobile === 'true';
	};
	
	F5.platform = function () {
		return F5.query.platform;
	};
	
	F5.isDebug = function () {
		return F5.query.debug === 'true';
	};
	
	F5.isNative = function () {
		// F5.query.native confuses the JavaScript compressor
		return F5.query['native'] === 'true';		
	};
	
	F5.attachWidget = function(el, f5widget, data) {
		F5.assert(!el.widget, 'Widget already attached to element');
		
		// NOTE: this is just for readability in the DOM inspector
		if (!el.getAttribute('f5widget')) {
			el.setAttribute('f5widget', f5widget);
		}
		F5.assert(F5.Prototypes.Widgets[f5widget], 'No widget: ' + f5widget);
		var widget = F5.objectFromPrototype(F5.Prototypes.Widgets[f5widget]);
		widget.el = el;
		el.widget = widget;
		
		var className = el.getAttribute('f5class');
		if (className) {
			F5.addClass(el, className);
		}
		widget.construct(data);		
	};
	
	// finds all of the elements marked with f5applyscope and then
	// scopes the elements with ids using scope
	F5.scopeTemplates = function () {
		F5.forEach(document.querySelectorAll('[f5id=f5applyscope]'), function (scope) {
			var pkg = scope.getAttribute('f5pkg');
			F5.forEach(scope.querySelectorAll('[id]'), function (template) {
				template.id = pkg + '.' + template.id;
			});			
			
//			console.log(el.id);
		});	
	};
	
	F5.createWidget = function(f5widget, data, f5id, f5class) {
		var el = document.createElement('div');
		if (f5id) {
			el.setAttribute('f5id', f5id);			
		}
		if (f5class) {
			el.setAttribute('f5class', f5class);			
		}		
		F5.attachWidget(el, f5widget, data);
		return el;		
	};
	
	F5.getElementById = function (el, f5id) {
		var result = el.querySelector('[f5id="' + f5id + '"]');
		if (!result) {
			console.log('Did not find element with f5id=' + f5id + ' in element with id: ' + el.id);			
		}
		return result;
	};
		
	F5.parseResources = function () {
		
		function isImageResource(resource) {
			return resource.indexOf('.png') !== -1 || 
					resource.indexOf('.jpg') !== -1 ||
					resource.indexOf('.svg') !== -1 ||
					resource.indexOf('data:image') !== -1;
		}
		
		function isHTMLResource(resource) {
			return resource.indexOf('.html') !== -1;
		}
		
		function preloadImagesRecursive(resources) {
			F5.forEach(resources, function (id, resource) {
				if (typeof resource === 'object' && resource.constructor !== Array) {
					preloadImagesRecursive(resource);
				} else if (isImageResource(resource)){
					resources[id] = F5.objectFromPrototype(F5.ImagePreloader);
					resources[id].load(resource);
				} else if (isHTMLResource(resource)) {
					resources[id] = 'apps/' + F5.query.pkg.split('.')[0] + '/' + resource;
				}
			});			
		}
		preloadImagesRecursive(F5.Resources);		
	};
	
	var activityEl;
	F5.startActivity = function (el) {
		if (!activityEl) {
			activityEl = document.createElement('div');
			F5.attachWidget(activityEl, 'Activity');			
		}
		
		activityEl.widget.start(el);
	};
	
	F5.stopActivity = function (el) {	
		if (activityEl) {
			activityEl.widget.stop(el);					
		}	
	};
	
	F5.fireStatusBarTouchedEvent = function () {
        var e = document.createEvent('Events'); 
        e.initEvent('statusBarTouched');
        document.dispatchEvent(e);						
	};
	
	F5.reflow = function () {
		var reflow = document.body.offsetTop;		
	};
	
	F5.eventName = function (canonicalName) {
		// TODO; move mapping to manifest user agent targets
		var mapping;
		if (navigator.userAgent.match('Firefox')) {
			mapping = {
				transitionEnd: 'transitionend'
			};			
		} else if (navigator.userAgent.match('MSIE')){
			mapping = {
				transitionEnd: 'MSTransitionEnd'
			};						
		} else {
			mapping = {
				transitionEnd: 'webkitTransitionEnd'
			};						
		}
		
		return mapping[canonicalName];
	};	

	F5.styleName = function (canonicalName) {
		// TODO; move mapping to manifest user agent targets
		var mapping;
		if (navigator.userAgent.match('Firefox')) {
			mapping = {
				transform: 'MozTransform',
				transition: 'MozTransition',
				'transition-property': 'MozTransitionProperty',
				'transition-duration': 'MozTransitionDuration'
			};			
		} else if (navigator.userAgent.match('MSIE')){
			mapping = {
				transform: '-ms-transform',
				transition: '-ms-transition',
				'transition-property': '-ms-transition-property',
				'transition-duration': '-ms-transition-duration'
			};						
		} else {
			mapping = {
				transform: '-webkit-transform',
				transition: '-webkit-transition',
				'transition-property': '-webkit-transition-property',
				'transition-duration': '-webkit-transition-duration'
			};						
			
		}
		
		return mapping[canonicalName];
	};
			
});


/*

function pointInElement(el, point) {
	var pos = elementAbsolutePosition(el);
	return point.x >= pos.x && point.x < pos.x + el.offsetWidth &&
			point.y >= pos.y && point.y < pos.y + el.offsetHeight;
}

*/