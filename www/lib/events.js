/***********************************************************************************************************************

	Copyright (c) 2012 Paul Greyson

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
/*global F5*/

(function () {

	function startEventName() {
		if (F5.isTouchDevice()) {
			return 'touchstart';
		}
		else {
			return 'mousedown';
		}
	}

	function stopEventName() {
		if (F5.isTouchDevice()) {
			return 'touchend';
		}
		else {
			return 'mouseup';
		}
	}

	function moveEventName() {
		if (F5.isTouchDevice()) {
			return 'touchmove';
		}
		else {
			return 'mousemove';
		}
	}

	F5.eventLocation = function(event) {
		var x, y;
		if (F5.isTouchDevice()) {
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

	// OPTION: retain references to the DOM elements to help track down dangling listeners
	var eventListenerCount = 0;

	function addEventListener(el, eventType, cb, capturing, eventName) {
		if (!el.F5) {
			el.F5 = {};
		}
		if (!el.F5.listeners) {
			el.F5.listeners = {};
		}
		eventName = eventName || eventType;

		// triggers a very expensive outerHTML call!
//		F5.assert(!el.F5.listeners[eventName], 'Already listening for: ' + eventName + ' on: ' + el.outerHTML);
		if (F5.isDebug()) {
			F5.assert(!el.F5.listeners[eventName], 'Already listening for: ' + eventName + ' on element with id: ' + el.id);
		}

		el.F5.listeners[eventName] = function f5eventListenerWrapper(e) {
//			console.log('event: ' + eventName);
			// TODO: check for transitioning for all event callbacks?
			if (!F5.xhrSendBlocking) {
				F5.callback(cb, e);
			} else {
				console.log('Deferring event dispatched during synchronous xhr.send: ' + eventName);
				// This will cause input.focus() to fail because it will only work in the context of a touch event
				// Might also cause out of order events to occur under some circumstances
				// TODO: revisit. this might preclude the use of sync XHR (and sync bridge!)
				setTimeout(function () {
					F5.callback(cb, e);
				}, 0);
			}
		};
		el.addEventListener(eventType, el.F5.listeners[eventName], capturing);
		eventListenerCount += 1;
	}

	function removeEventListener(el, eventType, eventName) {
		eventName = eventName || eventType;
		if (el.F5 && el.F5.listeners && el.F5.listeners[eventName]) {
			el.removeEventListener(eventType, el.F5.listeners[eventName], false);
			el.removeEventListener(eventType, el.F5.listeners[eventName], true);
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
			F5.removeMouseOutListener(el);
			F5.removeTapListener(el);
		}

		removeTouchEventListeners(el);
		F5.forEach(el.querySelectorAll('*'), function (el) {
			removeTouchEventListeners(el);
		});
	};

	F5.addMouseOutListener = function (el, cb) {
		addEventListener(el, 'mouseout', cb);
	}

	F5.removeMouseOutListener = function (el) {
		removeEventListener(el, 'mouseout');
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

	F5.addTouchMoveListener = function (el, cb, capturing) {
		addEventListener(el, moveEventName(), function (e) {
			e.preventDefault();
			cb(e);
		}, capturing);
	};

	F5.removeTouchMoveListener = function (el) {
		removeEventListener(el, moveEventName());
	};

	F5.maxClickDistance = 20;
//	F5.maxClickTime = 1000;

	F5.addTapListener = function (el, cb, pressTime) {
		addEventListener(el, startEventName(), function (startEvent) {
			var cancel = false;

			startEvent.preventDefault();

			var startLoc = F5.eventLocation(startEvent);
			removeEventListener(el, startEventName(), 'tap');

			addEventListener(el, 'mouseout', function (moveEvent) {
				// var moveLoc = F5.eventLocation(moveEvent);
				// var moveDistance = F5.eventDistance(startLoc, moveLoc);
				// if (moveDistance > F5.maxClickDistance) {
					cancel = true;
				// }
			}, false, 'mouseout');

			addEventListener(el, stopEventName(), function (stopEvent) {
				stopEvent.preventDefault();

				var stopLoc = F5.eventLocation(stopEvent);
				removeEventListener(el, stopEventName(), 'tap');
				removeEventListener(el, 'mouseout', 'mouseout');

				var clickTime = stopEvent.timeStamp - startEvent.timeStamp;
				var clickMove = F5.eventDistance(startLoc, stopLoc);

				function complete() {
					if (!cancel) {
						F5.callback(cb, stopEvent);
					}
					// if (pressTime) {
					// 	if (clickTime >= pressTime && clickMove <= F5.maxClickDistance) {
							F5.callback(cb, stopEvent);
						// }
					// } else {
					// 	if (/*clickTime <= F5.maxClickTime &&*/ clickMove <= F5.maxClickDistance && !cancel) {
					// 		F5.callback(cb, stopEvent);
					// 	}
					// }
				}

				// NOTE: not sure why the set timeout is needed. but without, sometimes
				// the event gets delayed. possibly an interaction with animation
				// in any case, the small delay guarantees that touch feedback gets a chance
				// to display
				// On android, the setTimeout creates weird touch feedback latency inconsistency
				if (F5.platform() === 'android') {
					complete();
				} else {
					setTimeout(complete, 30);
				}

				F5.addTapListener(el, cb, pressTime);

			}, false, 'tap');
		}, false, 'tap');
	};

	F5.removeTapListener = function (el) {
		removeEventListener(el, startEventName(), 'tap');
		removeEventListener(el, 'mouseout', 'mouseout');
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
}());