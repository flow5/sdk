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
/*global define F5*/

	
	// OPTION: to minimize transition time, could
	// only construct the active child for selections as well
	// then construct the new child when doing a selection
	// might cause latency on tab switching though
	
	
define('viewcontroller', exports, function (exports) {
	
	function ViewPrototype() {
		this.ConstructView = function (node) {
			
			var div = document.createElement('div');
			div.className = node.type;
			div.id = node.path;
			
			if (!node.active) {
				div.style.visibility = 'hidden';
			}			
			
			this.el = div;			
			this.node = node;
			node.view = this;
			
			if (node.children) {
				if (node.type === 'selector') {
					var container = document.createElement('div');
					container.className = 'container';
					node.view.el.appendChild(container);	

					node.children.forEach(function (id, child) {
						var view = new F5.DefaultViews[child.type](child);
						container.appendChild(view.el);
					});					
				} else {
					var view = new F5.DefaultViews[node.activeChild.type](node.activeChild);
					node.view.el.appendChild(view.el);
				}
			}

			function doSubflowRecursive(container, node, id, subflow) {
				if (subflow && typeof subflow === 'object') {
					subflow.view = new F5.DefaultViews[subflow.type](subflow);
					container.appendChild(subflow.view.el);
					subflow.choices.forEach(function (id, child) {
						doSubflowRecursive(container, node, id, child);
					});			
				}
			}

			if (node.subflows) {
				node.subflows.forEach(function (id, subflow) {
					doSubflowRecursive(node.view.el, node, id, subflow);
				});
			}											
		};
		
		this.attachViewsRecursive = function (node) {
			return new F5.DefaultViews[node.type](node);	
		};
		
		this.viewWillBecomeActive = function () {
			
		};
		
		this.viewWillBecomeInactive = function () {
						
		};
		
		this.viewDidBecomeActive = function () {
			
		};
		
		this.viewDidBecomeInactive = function () {
			
		};
		
		// OPTION: can use display:none for lower memory construction or z-index: -1 for speed
		this.show = function () {
			this.el.visibility = '';
		};
		
		this.hide = function () {
			this.el.visibility = 'hidden';
		};
	}
	F5.Prototypes.View = new ViewPrototype();
			
	function ViewController(flow, applicationFrame) {		
		
		this.activateNode = function (node) {
			console.log('ViewController.activateNode');
			// TODO: call viewDidBecomeActive recursively
		};				
		
		this.start = function () {	
			var rootView = new F5.DefaultViews[flow.root.type](flow.root);
			applicationFrame.appendChild(rootView.el);			
		};
		
		this.doSelection = function (node, id, cb) {
			console.log('ViewController.doSelection');									
			
			var oldEl = document.getElementById(node.activeChild.path);
			var newEl = document.getElementById(node.children[id].path);
			
			// TODO: call viewWillBecomeInactive, viewWillBecomeActive
			
			// TODO: get animation name from mapping
			
			F5.Animation.fadeOut(oldEl, newEl, function () {
				
				// TODO: call viewDidBecomeInactive
				cb();
			});			
		};
		
		this.doTransition = function (container, id, to, cb) {
			console.log('ViewController.doTransition');	
						
			var containerElement = document.getElementById(container.path);
			
			var oldEl = document.getElementById(container.activeChild.path);
			var newEl;
			if (id === 'back') {
				newEl = document.getElementById(to.path);				
			} else {			
				F5.Prototypes.View.attachViewsRecursive(to);
				newEl = to.view.el;
				containerElement.appendChild(newEl);
			}
			
			// TODO: get animation name from mapping
			var method = id === 'back' ? 'pushRight' : 'pushLeft';
			
			// TODO: call viewWillBecomeInactive, viewWillBecomeActive			

			F5.Animation[method](containerElement, oldEl, newEl, function () {
				// TODO: call viewDidBecomeInactive
				
				if (id === 'back') {
					// TODO: call viewRelease?
					containerElement.removeChild(oldEl);
				}
				
				cb();
			});	
		};		

		this.startSubflow = function (subflow) {
			var subflowElement = document.getElementById(subflow.path);
			subflowElement.style.visibility = '';
			subflowElement.style.opacity = 1;
		};

		this.completeSubflow = function (subflow) {
			var subflowElement = document.getElementById(subflow.path);
			subflowElement.style.opacity = 0;
			
			function fadeComplete() {
				subflowElement.style.visibility = 'hidden';
				subflowElement.removeEventListener('webkitAnimationEnd', fadeComplete);
			}
			subflowElement.addEventListener('webkitAnimationEnd', fadeComplete);
		};
				
		this.doSubflowChoice = function (subflow, choice) {
			var oldSubflowELement = document.getElementById(subflow.path);
			oldSubflowELement.style.opacity = 0;
			function fadeComplete() {
				oldSubflowELement.style.visibility = 'hidden';
				oldSubflowELement.removeEventListener('webkitAnimationEnd', fadeComplete);
			}
			oldSubflowELement.addEventListener('webkitAnimationEnd', fadeComplete);
						
			var newSubflowSlement = document.getElementById(subflow.choices[choice].path);
			newSubflowSlement.style.visibility = '';			
			newSubflowSlement.style.opacity = 1;
		};
	}
		
	exports.ViewController = ViewController;
});