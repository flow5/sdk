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
				
	function attachTracker(el) {
		var tracking;
		var startLocation;
		var startTransform;

		F5.addTouchStartListener(el, function (e) {
			tracking = true;
			startLocation = F5.eventLocation(e);
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

		F5.addTouchMoveListener(document.body, function (e) {
			var currentLocation = F5.eventLocation(e);
			if (tracking) {
				var deltaH = currentLocation.x - startLocation.x;
				var deltaY = currentLocation.y - startLocation.y;
				el.style['-webkit-transform'] = 'translate3d(' + (deltaH + startTransform.x) +
						'px,' + (deltaY + startTransform.y) + 'px, 0px)';								
			}			
		});

		F5.addTouchStopListener(document.body, function (e) {
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
		F5.Global.navigationController = F5.objectFromPrototype(F5.Prototypes.navigationController);
		F5.Global.navigationController.setup(container);																
	}	
	
	// Tabset works by looking for elements with f5_tab attribute set
	// TODO: customize with images or alternate text
	// TODO: can't really go querySelectorAll since there might be nested tab sets
	function Tabset() {
		
		this.construct = function () {
			var that = this;
			
			var tabset = document.createElement('div');
			F5.addClass(tabset, 'tabset');
			that.el.insertBefore(tabset);
			
			that.tabs = {};
			
			that.el.querySelectorAll('[f5_tab]').forEach(function (el) {
				var id = el.getAttribute('f5_tab');
				
				var tab = document.createElement('div');
				F5.addClass(tab, 'tab');
				tab.innerHTML = id;
				that.tabs[id] = tab;

				tabset.appendChild(tab);

				F5.addTouchStartListener(tab, function (e) {
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
	
	/*
	
		data schema:
		
		
		nodeId: {
			ButtonClass: {
				image: {
					up: <url>,
					down: <url>
				}
				
					OR
					
				image: {
					up: {
						left: <url>,
						middle: <url>,
						right: <url>
					},
					down: etc.
				}
			}
			
			f5_id: {
				ButtonF5Id: <string>
			}
			
				OR
			
			f5_id: {
				label: <string>,
				image: {
					up: <url>,
					down: <url>
				}
			}
		}
		
		this allows button styles to be defined at any scope using ButtonClass (Toggle, Temporary, Tab)
		or to be defined for a specific button using f5_id or a combination (probably label for f5_id and 
		images for ButtonClass)	
		
		while CSS can be used to set button dimensions, buttons should be allowed to take dimensions from
		image and label size. buttons will use device pixel density to convert image dimensions to div dimensions.
	
	*/
	function Button() {		
		this.construct = function (data) {
			
			var that = this;
			
			F5.addClass(this.el, 'f5button');
			
			var imageContainer, up, down;
			
			var label = document.createElement('div');
			F5.addClass(label, 'f5button-label');
			this.el.appendChild(label);
			
			function makeImageContainer() {
				if (imageContainer) {
					this.el.removeChild(imageContainer);
				}
				imageContainer = document.createElement('div');
				F5.addClass(imageContainer, 'f5button-imagecontainer');

				this.up = document.createElement('img');
				F5.addClass(this.up, 'up');
				imageContainer.appendChild(this.up);
				
				this.down = document.createElement('img');
				F5.addClass(this.down, 'down');
				this.down.style.visibility = 'hidden';
				imageContainer.appendChild(this.down);
				
				this.el.insertBefore(imageContainer, label);
			}
						
			function makeStretchyButton(value) {
				makeImageContainer.apply(this);
			}
			
			function makeFixedButton(value) {
				makeImageContainer.apply(this);	
												
				this.up.src = value.up;
				this.down.src = value.down;
				
				F5.assert(this.up.width === this.down.width && this.up.height === this.down.height, 
					'Up and down images should have the same dimensions');
					
				// TODO: for now assume images are always at 2x pixel density
				// this can be extended so that a build preprocess step resizes images
				// and packages them into an app for each device target
				// Ultimately also need to take into account device dimensions and aspect ratio
				// for some skinning. Will get to that with Android work
				this.up.style.width = this.up.width / 2;
				this.up.style.height = this.up.height / 2;
				this.down.style.width = this.down.width / 2;
				this.down.style.height = this.down.height / 2;
			}
			
			function applyValue(value) {
				if (typeof value === 'object') {
					if (value.label) {
						label.innerText = value.label;
					}
					if (value.image.up) {
						F5.assert(value.image.down, 'Both up and down images should be defined together');
						
						if (typeof value.image.up === 'object') {
							makeStretchyButton.apply(this, [value.image]);
						} else {
							makeFixedButton.apply(this, [value.image]);
						}						
					}
				} else {
					label.innerText = value;
				}
			}

			// first apply styles from the Button class
			applyValue.apply(this, [data[this.el.getAttribute('f5_widget')]]);
			
			// then override with styles for the instance
			applyValue.apply(this, [data[this.el.getAttribute('f5_id')]]);			
		};
		
		this.setAction = function (cb) {
			var that = this;
			F5.addTouchStartListener(this.el, function (e) {
				if (that.up) {
					that.up.style.visibility = 'hidden';
					that.down.style.visibility = '';					
				}
				e.stopPropagation();
			});
			F5.addTouchStopListener(this.el, function (e) {
				if (that.up) {
					that.up.style.visibility = '';
					that.down.style.visibility = 'hidden';					
				}
			});				
			F5.addTapListener(this.el, cb);			
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
		var widget = F5.objectFromPrototype(widgetPrototypes[type]);
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
