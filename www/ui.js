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
/*global WebKitCSSMatrix, F5*/

(function () {
	
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
	
	F5.Prototypes.navigationConfigurator = {
		updateConfiguration: function (node) {
			// find the leaf node
			while (node.selection) {
				node = node.selection;
			}
						
			var configuration = {title: node.id, node: node};
			while (node && (!configuration.left || !configuration.right)) {
				var nodeConfiguration = node.view.getNavConfig();
				if (nodeConfiguration) {
					if (!configuration.left && nodeConfiguration.left) {
						configuration.left = nodeConfiguration.left;
						configuration.left.node = node;
					}
					if (!configuration.right && nodeConfiguration.right) {
						configuration.right = nodeConfiguration.right;
						configuration.right.node = node;
					}	
					if (nodeConfiguration.hide) {
						configuration.hide = nodeConfiguration.hide;									
					}
				}
				
				node = node.parent;
			}
			
			if (configuration.left) {
				configuration.left.action = function () {
					var transition = F5.Global.navigationControllerConfiguration.left.transition;
					var node = F5.Global.navigationControllerConfiguration.left.node;
					F5.Global.flowController.doTransition(node, transition);				
				};
			}
			
			if (configuration.right) {
				configuration.right.action = function () {
					var transition = F5.Global.navigationControllerConfiguration.right.transition;
					var node = F5.Global.navigationControllerConfiguration.right.node;
					F5.Global.flowController.doTransition(node, transition);				
				};			
			}
			
			F5.Global.navigationControllerConfiguration = configuration;
		}
	};	
	
	// TODO: there can only be one nav bar. move this to a framework only location
	function attachNavbar(container) {
		F5.Global.navigationController = F5.object(F5.Prototypes.navigationController);
		F5.Global.navigationController.setup(container);																
	}	
	
	// Tabset works by looking for elements with f5_tab attribute set
	// TODO: customize with images or alternate text
	// TODO: can't really go querySelectorAll since there might be nested tab sets
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

				addTouchListener(tab, function (e) {
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
	
	function StaticText() {
		this.construct = function (data) {
			var id = this.el.getAttribute('f5_id');
			this.el.innerText = data[id];
		};
	}
	
	function Picture() {
		this.construct = function (data) {
			var id = this.el.getAttribute('f5_id');

			var img = document.createElement('img');
			if (data[id].match('data:image')) {
				img.src = data[id];
			} else {
				img.src = F5.imageServerHost + data[id];				
			}
			this.el.appendChild(img);
		};
	}
	
	function Button() {		
		this.construct = function (data) {
			var id = this.el.getAttribute('f5_id');
			if (data[id]) {
				this.el.innerText = data[id];				
			}
			// TODO: use f5_image to get the base name of an image
			// say f5_image='buttonStandard' then look for data.buttonStandard.up/down
			// for the srcs of the two images
			// and buttonStandard can be defined at root scope
		};
		
		this.setAction = function (cb) {
			var that = this;
			var startTime;
			var startLoc;
			this.el.addEventListener(startEventName(), function (e) {
				that.el.style.color = 'darkslategray';
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
		Picture: new Picture(),
		StaticText: new StaticText(),
		Button: new Button(),
		Tabset: new Tabset()
	};
	
	function attachWidget(el, data) {
		var type = el.getAttribute('f5_widget');
		F5.assert(widgetPrototypes[type], 'No widget: ' + type);
		var widget = F5.object(widgetPrototypes[type]);
		widget.el = el;
		el.widget = widget;
		widget.construct(data);		
	}
	
	// TODO: unify all of the widgets under the same API
		
	F5.UI = {
		attachWidget: attachWidget,
		attachNavbar: attachNavbar,
		attachTracker: attachTracker
	};
}());
