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
	// only construct the selected child for selections as well
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
				var container = document.createElement('div');
				container.className = 'container';
				node.view.el.appendChild(container);	

				if (node.type === 'switcher' || node.type === 'set') {
					node.children.forEach(function (id, child) {
						var view = new F5.DefaultViews[child.type](child);
						container.appendChild(view.el);
					});					
				} else {
					var view = new F5.DefaultViews[node.selection.type](node.selection);
					container.appendChild(view.el);
				}
			}

			function doSubflowRecursive(node, id, subflow) {
				if (subflow && subflow.type === 'subflow') {
					subflow.view = new F5.DefaultViews[subflow.type](subflow);
					F5.Global.flow.root.view.el.appendChild(subflow.view.el);
					subflow.choices.forEach(function (id, child) {
						doSubflowRecursive(node, id, child);
					});			
				}
			}

			if (node.subflows) {
				node.subflows.forEach(function (id, subflow) {
					doSubflowRecursive(node, id, subflow);
				});
			}	
			
			// TODO: move to customization layer? or customization says where to put the navbar?
			// can there be multiple navbars? Sometimes that seems necessary. . .
			if (this.node.path === 'root-main') {
				F5.Widgets.Utils.attachNavbar(this.el);				
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
		
		this.getNavigationControllerConfiguration = function () {
			if (this.node.back) {
				return {label: this.node.back.id, action: function () {
					F5.Global.flowController.doBack();
				}};				
			} else {
				return null;
			}
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
				
		this.nodeDidBecomeActive = function (node) {
//			console.log('ViewController.nodeDidBecomeActive');
			// TODO: call viewDidBecomeActive recursively
		};				

		this.nodeWillBecomeActive = function (node) {
//			console.log('ViewController.nodeWillBecomeActive');
			if (!node.view) {
				F5.Prototypes.View.attachViewsRecursive(node);
				if (node === F5.Global.flow.root) {
					applicationFrame.appendChild(node.view.el);
				} else {
					node.parent.view.el.querySelector('[class=container]').appendChild(node.view.el);												
				}
			}
			// TODO: call viewWillBecomeActive recursively
		};				
		
		this.start = function () {	
			var rootView = new F5.DefaultViews[flow.root.type](flow.root);
			applicationFrame.appendChild(rootView.el);
			
			if (F5.Global.navigationController) {
				F5.Global.navigationController.start();
			}					
		};
		
		this.doSelection = function (node, id, cb) {
			console.log('ViewController.doSelection');	
			
			if (F5.Global.navigationController) {
				F5.Global.navigationController.doSelection(node, id);
			}																
			
			var oldEl = document.getElementById(node.selection.path);
			var newEl = document.getElementById(node.children[id].path);
			
			// TODO: get animation name from mapping			
			F5.Animation.fadeOut(oldEl, newEl, function () {
				
				// TODO: call viewDidBecomeInactive
				cb();
			});			
		};
						
		this.doTransition = function (container, id, to, cb) {
			console.log('ViewController.doTransition');	
			
			if (F5.Global.navigationController) {
				F5.Global.navigationController.doTransition(container, id, to);
			}																			
						
			var containerElement = container.view.el.querySelector('[class=container]');
			var oldNode = container.selection;
			
			var oldEl = oldNode.view.el;
			var newEl = to.view.el;
			
			// TODO: get animation name from mapping
			var method = id === 'back' ? 'pushRight' : 'pushLeft';			
			F5.Animation[method](containerElement, oldEl, newEl, function () {
				function deleteViewsRecursive(node) {
					delete node.view;
					if (node.children) {
						node.children.forEach(function (id, child) {
							deleteViewsRecursive(child);
						});
					}
				}
				if (id === 'back') {
					// TODO: call viewRelease?
					deleteViewsRecursive(oldNode);
					containerElement.removeChild(oldEl);
				}				
				cb();
			});	
		};		
		
		// called in a willBecomeActive context to conditionally pick a starting screen
		this.syncSet = function (node) {
			if (F5.Global.navigationController) {
				F5.Global.navigationController.syncSet(node);
			}
						
			node.children.forEach(function (id, child) {
				child.view.el.style.visibility = 'hidden';
			});
			node.selection.view.el.style.visibility = '';
		};			
		
		this.startSubflow = function (subflow) {
			if (F5.Global.navigationController) {
				F5.Global.navigationController.startSubflow(subflow);
			}																			
			
			subflow.view.el.style.visibility = '';
			subflow.view.el.style.opacity = 1;
			subflow.view.el.style['pointer-events'] = 'auto';
		};

		this.completeSubflow = function (subflow) {
			if (F5.Global.navigationController) {
				F5.Global.navigationController.completeSubflow(subflow);
			}																			
			
			subflow.view.el.style.opacity = 0;
			subflow.view.el.style['pointer-events'] = '';
			
			function fadeComplete() {
				subflow.view.el.style.visibility = 'hidden';
				subflow.view.el.removeEventListener('webkitAnimationEnd', fadeComplete);
			}
			subflow.view.el.addEventListener('webkitAnimationEnd', fadeComplete);
		};
				
		this.doSubflowChoice = function (subflow, choice) {
			function fadeComplete() {
				subflow.view.el.style.visibility = 'hidden';
				subflow.view.el.removeEventListener('webkitAnimationEnd', fadeComplete);
			}
			subflow.view.el.addEventListener('webkitAnimationEnd', fadeComplete);
			subflow.view.el.style['pointer-events'] = '';
			subflow.view.el.style.opacity = 0;
						
			var nextSubflow = subflow.choices[choice];
			nextSubflow.view.el.style.visibility = '';			
			nextSubflow.view.el.style.opacity = 1;
			nextSubflow.view.el.style['pointer-events'] = 'auto';
		};
	}
		
	exports.ViewController = ViewController;
});