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

define('ui', exports, function (exports) {

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
			// divide by 2 in browser because of the use of zoom: 2 on the 'screen' div
			// TODO: link this and the zoom level. annoying
			x = event.clientX / 2;
			y = event.clientY / 2; 
		}	

		return {x: x, y: y};
	}
	
	function elementAbsolutePosition(el) {
		var x = 0;
		var y = 0;
		while (el) {
			x += el.offsetLeft;
			y += el.offsetTop;

			el = el.offsetParent;			
		}
		return {x: x, y: y};
	}
	
	function pointInElement(el, point) {
		var pos = elementAbsolutePosition(el);
		return point.x >= pos.x && point.x < pos.x + el.offsetWidth &&
				point.y >= pos.y && point.y < pos.y + el.offsetHeight;
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
	
	// TODO: save the callback on the div
	function addTouchListener(el, cb) {
		el.addEventListener(startEventName(), cb);
	}

	function addMoveListener(el, cb) {
		el.addEventListener(moveEventName(), cb);
	}
	
	function addStopListener(el, cb) {
		el.addEventListener(stopEventName(), cb);
	}	
	
	function attachTracker(el) {
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
						
		var leftButtonEl = document.createElement('div');
		leftButtonEl.className = 'leftbutton';
		leftButtonEl.style.visibility = 'hidden';
		navbarEl.appendChild(leftButtonEl);

		var titleEl = document.createElement('div');
		titleEl.className = 'title';
		navbarEl.appendChild(titleEl);

		var rightButtonEl = document.createElement('div');
		rightButtonEl.className = 'rightbutton';
		rightButtonEl.style.visibility = 'hidden';
		navbarEl.appendChild(rightButtonEl);
		
		function configureNavbar(node) {
			// find the leaf node
			while (node.selection) {
				node = node.selection;
			}		
			
			titleEl.innerHTML = node.id;													

			var configuration = {};
			while (node && (!configuration.left || !configuration.right)) {
				var nodeConfiguration = node.view.getNavConfig();
				if (nodeConfiguration) {
					if (!configuration.left) {
						configuration.left = nodeConfiguration.left;
					}
					if (!configuration.right) {
						configuration.right = nodeConfiguration.right;
					}	
					if (nodeConfiguration.hide) {
						configuration.hide = nodeConfiguration.hide;									
					}
				}
				
				node = node.parent;
			}
			
			if (configuration.hide) {
				navbarEl.style.visibility = 'hidden';
				leftButtonEl.style['pointer-events'] = '';
				rightButtonEl.style['pointer-events'] = '';				
			} else {
				navbarEl.style.visibility = '';
				if (configuration.left) {
					leftButtonEl.style.visibility = '';
					leftButtonEl.style['pointer-events'] = '';
					leftButtonEl.innerText = configuration.left.label;					
				} else {
					leftButtonEl.style.visibility = 'hidden';					
					leftButtonEl.style['pointer-events'] = 'none';
				}
				if (configuration.right) {
					rightButtonEl.style.visibility = '';
					rightButtonEl.style['pointer-events'] = '';				
					rightButtonEl.innerText = configuration.right.label;					
				} else {
					rightButtonEl.style.visibility = 'hidden';					
					rightButtonEl.style['pointer-events'] = 'none';
				}				
			}
			
			F5.Global.navigationControllerConfiguration = configuration;
		}				

		F5.UI.addTouchListener(leftButtonEl, function () {
			F5.Global.navigationControllerConfiguration.left.action();
		});																					

		F5.UI.addTouchListener(rightButtonEl, function () {
			F5.Global.navigationControllerConfiguration.right.action();
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
				leftButtonEl.style.visibility = 'hidden';						
			},
			syncSet: function (node) {
				configureNavbar(node);
			},
			completeSubflow: function () {
				configureNavbar(F5.Global.flow.root);
			}
		};		
	}	
	
	// TODO: fix asymmtery between Tabset and Button construction. This is because Tabset is being
	// created programmatically from the switcher default view. Should all go through the same method
	function Tabset() {
		
		this.construct = function () {
			var that = this;
			
			var tabset = document.createElement('div');
			tabset.className = 'tabset';
			that.el.insertBefore(tabset);
			
			that.tabs = {};
			
			that.el.querySelectorAll('[f5_tab]').forEach(function (el) {
				var id = el.getAttribute('f5_tab');
				
				var tab = document.createElement('div');
				tab.className = 'tab';
				tab.innerHTML = id;
				that.tabs[id] = tab;

				tabset.appendChild(tab);

				F5.UI.addTouchListener(tab, function (e) {
					if (that.action) {
						that.action(id);
					}
				});				
			});			
		};
		
		this.setAction = function (cb) {
			this.action = cb;
		};
		
		this.select = function (selection) {
			this.tabs.forEach(function (id, tab) {
				if (selection === id) {
					tab.style.color = 'black';
				} else {
					tab.style.color = 'grey';
				}
			});
		};
	}
	
	function Button() {		
		this.construct = function () {
			// nothing to do yet
		};
		
		this.setAction = function (cb) {
			var that = this;
			var startTime;
			var startLoc;
			this.el.addEventListener(startEventName(), function (e) {
				that.el.style.color = 'grey';
				startTime = Date.now();
				startLoc = eventLocation(e);
				e.stopPropagation();
			});
			this.el.addEventListener(stopEventName(), function (e) {
				// TODO: if stop event is outside div, don't fire
				// however, pointInElement fails if there's a transform because
				// the event coordinates don't know about the transform
//				if (startTime && pointInElement(that.el, eventLocation(e))) {
				if (startTime) {
					that.el.style.color = 'black';
					cb();
					
					startTime = null;
					startLoc = null;					
				}
			});	
			// if the touch up is outside the button div, cancel out
			document.body.addEventListener(stopEventName(), function (e) {
				startTime = null;
				startLoc = null;	
				that.el.style.color = 'black';							
			});	
		};
	}
	
	var widgetPrototypes = {
		Button: new Button(),
		Tabset: new Tabset()
	};
	
	function attachWidget(el) {
		var type = el.getAttribute('f5_widget');
		F5.assert(widgetPrototypes[type], 'No widget: ' + type);
		var widget = F5.object(widgetPrototypes[type]);
		widget.el = el;
		el.widget = widget;
		widget.construct();		
	}
		
	F5.UI = {
		attachWidget: attachWidget,
		attachNavbar: attachNavbar,
		attachTracker: attachTracker,
		startEventName: startEventName,
		stopEventName: stopEventName,
		moveEventName: moveEventName,
		addTouchListener: addTouchListener,
		addMoveListener: addMoveListener,
	};
});