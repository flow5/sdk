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
/*global define WebKitCSSMatrix F5*/

define('widgets', exports, function (exports) {

	function eventLocation(event) {
		var x, y;
		if (navigator.userAgent.match(/(iPhone)|(Android)/i)) {
			if (event.touches[0]) {
				x = event.touches[0].screenX;
				y = event.touches[0].screenY;					
			} else {
				x = event.changedTouches[0].screenX;
				y = event.changedTouches[0].screenY;			
			}	
		}		
		else {
			x = event.clientX;
			y = event.clientY; 
		}	

		return {x: x, y: y};
	}

	function startEventName() {
		if (navigator.userAgent.match(/(iPhone)|(Android)/i)) {
			return 'touchstart';		
		}
		else {
			return 'mousedown';				
		}
	}

	function stopEventName() {
		if (navigator.userAgent.match(/(iPhone)|(Android)/i)) {
			return 'touchend';		
		}
		else {
			return 'mouseup';				
		}
	}

	function moveEventName() {
		if (navigator.userAgent.match(/(iPhone)|(Android)/i)) {
			return 'touchmove';		
		}
		else {
			return 'mousemove';		
		}
	}
	
	function addTouchListener(el, cb) {
		el.addEventListener(startEventName(), cb);
	}

	function addMoveListener(el, cb) {
		el.addEventListener(moveEventName(), cb);
	}
	
	function addStopListener(el, cb) {
		el.addEventListener(stopEventName(), cb);
	}	
	
	function addTracker(el) {
		var tracking;
		var startLocation;
		var startTransform;

		addTouchListener(el, function (e) {
			tracking = true;
			startLocation = eventLocation(e);
			var transformMatrix = new WebKitCSSMatrix(el.style.webkitTransform);
			startTransform = {x: transformMatrix.m41, y: transformMatrix.m42};
			el.style['-webkit-transition'] = 'opacity 1s';						
		});

/*
		document.body.addEventListener('mousewheel', function (e) {
			var transformMatrix = new WebKitCSSMatrix(el.style.webkitTransform);
			startTransform = {x: transformMatrix.m41, y: transformMatrix.m42};																				

			el.style['-webkit-transform'] = 'translate3d(' + (-e.wheelDeltaX/10 + startTransform.x) +
					'px,' + (-e.wheelDeltaY/10 + startTransform.y) + 'px, 0px)';
					
			console.log(JSON.stringify({x: e.wheelDeltaX, y: e.wheelDeltaY}));
		});
*/

		addMoveListener(document.body, function (e) {
			var currentLocation = eventLocation(e);
			if (tracking) {
				var deltaH = currentLocation.x - startLocation.x;
				var deltaY = currentLocation.y - startLocation.y;
				el.style['-webkit-transform'] = 'translate3d(' + (deltaH + startTransform.x) +
						'px,' + (deltaY + startTransform.y) + 'px, 0px)';								
			}			
		});

		addStopListener(document.body, function (e) {
			tracking = false;
			el.style['-webkit-transition'] = '';
		});
	}
	
	function attachNavbar(container) {
		
		var navbarEl = document.createElement('div');
		navbarEl.className = 'navbar';
		container.insertBefore(navbarEl, container.firstChild);	
						
		var backButtonEl = document.createElement('div');
		backButtonEl.className = 'backbutton';
		backButtonEl.style.visibility = 'hidden';
		navbarEl.appendChild(backButtonEl);

		var titleEl = document.createElement('div');
		titleEl.className = 'title';
		navbarEl.appendChild(titleEl);

		var forwardButtonEl = document.createElement('div');
		forwardButtonEl.className = 'backbutton';
		forwardButtonEl.style.visibility = 'hidden';
		navbarEl.appendChild(forwardButtonEl);
		
		function configureNavbar(node) {
			// find the leaf node
			while (node.selection) {
				node = node.selection;
			}		
			
			titleEl.innerHTML = node.id;													

			F5.Global.navigationControllerConfiguration = null;
			while (!F5.Global.navigationControllerConfiguration && node) {
				F5.Global.navigationControllerConfiguration = node.view.getNavigationControllerConfiguration();
				if (!F5.Global.navigationControllerConfiguration) {
					node = node.parent;
				}
			}

			if (F5.Global.navigationControllerConfiguration) {
				backButtonEl.style.visibility = '';
				backButtonEl.innerText = F5.Global.navigationControllerConfiguration.label;
				forwardButtonEl.innerText = F5.Global.navigationControllerConfiguration.label;
			} else {
				backButtonEl.style.visibility = 'hidden';
			}					
		}				

		F5.Widgets.Utils.addTouchListener(backButtonEl, function () {
			F5.Global.navigationControllerConfiguration.action();
		});																					

		F5.Global.navigationController = {
			start: function () {
				configureNavbar(F5.Global.flow.root);
			},
			doSelection: function (node, id) {
				configureNavbar(node.children[id]);
			},
			doTransition: function (container, id, to) {
				configureNavbar(to);
			},
			startSubflow: function () {
				backButtonEl.style.visibility = 'hidden';						
			},
			syncSet: function (node) {
				configureNavbar(node);
			},
			completeSubflow: function () {
				configureNavbar(F5.Global.flow.root);
			}
		};		
	}	
		
	exports.Widgets = {
		Utils: {
			attachNavbar: attachNavbar,
			addTracker: addTracker,
			startEventName: startEventName,
			stopEventName: stopEventName,
			moveEventName: moveEventName,
			addTouchListener: addTouchListener,
			addMoveListener: addMoveListener,
			addStopListener: addStopListener					
		}
	};
	
});