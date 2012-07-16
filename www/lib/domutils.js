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
			
	F5.alert = function (title, message, action) {
		if (message) {
			message += '';
		}		
		
		var alert = F5.createWidget('f5.widgets.Alert', {alert: {title: title, message: message}}, 'alert');
		alert.widget.setAction(action);
		alert.widget.present();
		return alert.widget;
	};

	F5.confirm = function (title, message, action) {
		if (message) {
			message += '';
		}		
		
		var confirm = F5.createWidget('f5.widgets.Confirm', {confirm: {title: title, message: message}}, 'confirm');
		confirm.widget.setAction(action);
		confirm.widget.present();
		return confirm.widget;
	};
	
	F5.assert = function(condition, message) {
		if (!condition) {
			if (F5.isDebug()) {
				alert(message);				
			}
			throw new Error(message);
		}
	};
		
	F5.screen = function () {
		return document.getElementById('f5screen');
	};
	
	F5.reset = function () {
		document.body.innerHTML = '';
		document.body.style['background-color'] = 'black';
		localStorage.clear();
		setTimeout(function () {
			location.reload();					
		}, 0);
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

	F5.elementAbsolutePosition = function(el) {
		var x = 0, y = 0;
		while (el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop )) {
			x += el.offsetLeft;
			y += el.offsetTop;

			el = el.parentNode;			
		}
		return {x: x, y: y};
	};
			
	F5.elementOffsetGeometry = function (el) {
		return {top: el.offsetTop,
				left: el.offsetLeft,
				width: el.offsetWidth,
				height: el.offsetHeight};
	};		
	
	F5.getElementById = function (el, f5id) {
		var result = el.querySelector('[f5id="' + f5id + '"]');
		if (!result) {
			console.log('Did not find element with f5id=' + f5id + ' in element with id: ' + el.id);			
		}
		return result;
	};
			
	var activityEl;
	F5.startActivity = function (el) {
		if (!activityEl) {
			activityEl = document.createElement('div');
			F5.attachWidget(activityEl, 'f5.widgets.Activity');			
		}
		
		activityEl.widget.start(el);
	};
	
	F5.stopActivity = function (el) {	
		if (activityEl) {
			activityEl.widget.stop(el);					
		}	
	};
	
	F5.firef5StatusBarTouchedEvent = function () {
        var e = document.createEvent('Events'); 
        e.initEvent('f5StatusBarTouched');
        document.dispatchEvent(e);						
	};
		
	F5.reflow = function () {
		var reflow = document.body.offsetTop;		
	};
	
	F5.clear = function (el) {
		// workaround for pre-ios 5 touch listener memory leak
		F5.removeTouchEventListenersRecursive(el);
		el.innerHTML = '';
	};			
	
	// TODO; move mapping to manifest user agent targets	
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
		var mapping;
		if (navigator.userAgent.match('Firefox')) {
			mapping = {
				transform: 'MozTransform',
				transform_rhs: '-moz-transform',
				transition: 'MozTransition',
				'transition-property': 'MozTransitionProperty',
				'transition-duration': 'MozTransitionDuration'
			};			
		} else if (navigator.userAgent.match('MSIE')){
			mapping = {
				transform: '-ms-transform',
				transform_rhs: '-ms-transform',
				transition: '-ms-transition',
				'transition-property': '-ms-transition-property',
				'transition-duration': '-ms-transition-duration'
			};						
		} else {
			mapping = {
				transform: '-webkit-transform',
				transform_rhs: '-webkit-transform',
				transition: '-webkit-transition',
				'transition-property': '-webkit-transition-property',
				'transition-duration': '-webkit-transition-duration'
			};									
		}
		
		return mapping[canonicalName];
	};
	
	F5.isTouchDevice = function() {
		return navigator.userAgent.match(/iphone|ipad|android|silk/i);
	};
	
	F5.doWidgetLifecycleEventRecursive = function(el, event) {
		F5.forEach(el.childNodes, function doWidgetLifecycleEvent(childEl) {
			if (childEl.getAttribute && childEl.getAttribute('f5widget')) {
				if (childEl.widget['widget' + event]) {
					childEl.widget['widget' + event]();							
				}
			}
			// don't recurse through other views. they'll get handled
			// via the associated node
			if (!childEl.view) {
				F5.doWidgetLifecycleEventRecursive(childEl, event);
			}
		});					
	};		
	
	F5.parseUrlParameters = function (url) {
		url = url || location.href;
		
		var parameters = {};
		
		var search = url.split('?')[1];
		if (search) {
			search.split('&').forEach(function (param) {
				var key = param.split('=')[0];
				var value = param.split('=')[1];
				parameters[key] = decodeURIComponent(value);
			});
		}		
		
		return parameters;
	};	
}());


/*

function pointInElement(el, point) {
	var pos = elementAbsolutePosition(el);
	return point.x >= pos.x && point.x < pos.x + el.offsetWidth &&
			point.y >= pos.y && point.y < pos.y + el.offsetHeight;
}

*/