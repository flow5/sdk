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

(function () {
		
	function startEventName() {
		if (navigator.userAgent.match(/(iPhone)|(iPad)|(Android)/i)) {
			return 'touchstart';		
		}
		else {
			return 'mousedown';				
		}
	}

	function stopEventName() {
		if (navigator.userAgent.match(/(iPhone)|(iPad)|(Android)/i)) {
			return 'touchend';		
		}
		else {
			return 'mouseup';				
		}
	}

	function moveEventName() {
		if (navigator.userAgent.match(/(iPhone)|(iPad)|(Android)/i)) {
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
		
		F5.assert(!el.F5.listeners[eventName], 'Already listening for: ' + eventName + ' on: ' + el.outerHTML);
		
		el.F5.listeners[eventName] = function (e) {
			// TODO: check for transitioning for all event callbacks?
			F5.callback(cb, e);
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
		addEventListener(el, moveEventName(), cb);
	};
	
	F5.removeTouchMoveListener = function (el) {
		removeEventListener(el, moveEventName());		
	};	
	
	// TODO: if stop event is outside div, don't fire
	F5.addTapListener = function (el, cb) {
		var maxClickTime = 1000;
		var maxClickMove = 10;
				
		addEventListener(el, startEventName(), function (startEvent) {
			var startLoc = F5.eventLocation(startEvent);
			removeEventListener(el, startEventName(), 'tap');
			addEventListener(el, stopEventName(), function (stopEvent) {
				var stopLoc = F5.eventLocation(stopEvent);
				removeEventListener(el, stopEventName(), 'tap');
				
				var clickTime = stopEvent.timeStamp - startEvent.timeStamp;
				var clickMove = F5.eventDistance(startLoc, stopLoc);
				
				if (clickTime <= maxClickTime && clickMove <= maxClickMove) {
					F5.callback(cb, stopEvent);
				}
				
				F5.addTapListener(el, cb);
				
			}, 'tap');
		}, 'tap');
	};
	
	F5.removeTapListener = function (el) {
		// TODO: maybe include the event name with the el.F5 object so this is guaranteed
		// to work even if called before the stop event fires
		removeEventListener(el, startEventName(), 'tap');
	};
	
	F5.addTransitionEndListener = function (el, cb) {
		addEventListener(el, 'webkitTransitionEnd', cb);
	};
	
	F5.removeTransitionEndListener = function (el) {
		removeEventListener(el, 'webkitTransitionEnd');		
	};
	
	F5.addF5ReadyListener = function (cb) {
		document.addEventListener('f5ready', cb);
	};	
	
	F5.eventLocation = function(event) {
		var x, y;
		if (navigator.userAgent.match(/(iPhone)|(iPad)|(Android)/i)) {
			if (event.touches[0]) {
				x = event.touches[0].screenX;
				y = event.touches[0].screenY;					
			} else {
				x = event.changedTouches[0].screenX;
				y = event.changedTouches[0].screenY;			
			}	
		}		
		else {
			// divide by 2 in browser because of the use of zoom: 2 on the 'screen' div
			// TODO: link this and the zoom level. annoying
			x = event.clientX / 2;
			y = event.clientY / 2; 
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
		while (el) {
			x += el.offsetLeft;
			y += el.offsetTop;

			el = el.offsetParent;			
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
		// TODO: get toolbar deltas based on platform lookup table
		var portraitToolbarDelta = 20;
		var landscapeToolbarDelta = 20;
		if (isMobile) {
			var isFullScreen = (window.innerHeight === screen.height - portraitToolbarDelta);		
			if (!isNative) {
				// TODO: get toolbar deltas based on platform lookup table
				if (!isFullScreen) {
					portraitToolbarDelta += 44;	
					landscapeToolbarDelta += 32;						
				}
			}
			var style = document.createElement('style');
			style.innerHTML = '@media screen and (orientation: portrait)\n\
								{\n\
									.f5mobile #screen {\n\
										width:' + screen.width + 'px;\n\
										height:' + (screen.height - portraitToolbarDelta) + 'px;\n\
									}\n\
								}\n\
								@media screen and (orientation: landscape)\n\
								{\n\
									.f5mobile #screen {\n\
										width:' + screen.height + 'px;\n\
										height:' + (screen.width - landscapeToolbarDelta) + 'px;\n\
									}\n\
								}';
			document.head.appendChild(style);

			document.addEventListener('orientationchange', function () {
				setTimeout(function () {
					window.scrollTo(0, 1);
				}, 0);			
			});		
		}
		// otherwise should get the dimensions from the url parameters		
	};	
	
	F5.setStyles = function(el, styles) {
		F5.forEach(styles, function (id, value) {
			el.style[id] = value;
		});
	};		
		
}());


/*

function pointInElement(el, point) {
	var pos = elementAbsolutePosition(el);
	return point.x >= pos.x && point.x < pos.x + el.offsetWidth &&
			point.y >= pos.y && point.y < pos.y + el.offsetHeight;
}

*/