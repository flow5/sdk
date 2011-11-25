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
/*global F5*/

(function () {	
	var buildViewForNode;
	function ViewPrototype() {
		this.ConstructView = function (node) {	

			var that = this;
																
			var div = document.createElement('div');
			F5.addClass(div, node.type);
			div.id = node.path;
						
			that.el = div;			
			that.node = node;
			node.view = that;
			
			
			var viewDelegatePrototype = F5.ViewDelegates[node.id];
			if (!viewDelegatePrototype) {
				viewDelegatePrototype = F5.DefaultViewDelegates[that.node.type];
			}			
			that.delegate = F5.objectFromPrototype(viewDelegatePrototype);
						
						
			if (node.children) {
				var container = document.createElement('div');
				F5.addClass(container, 'container');
				that.el.appendChild(container);	

				if (node.type === 'switcher' || node.type === 'set') {
					F5.forEach(node.children, function (id, child) {
						buildViewForNode(child);
						container.appendChild(child.view.el);
					});					
				} else {
					buildViewForNode(node.selection);
					container.appendChild(node.selection.view.el);
				}
			}


			// TODO: dump this. just put up widgets from the view controller when needed
			function doSubflowRecursive(node, id, subflow) {
				if (subflow && subflow.type === 'subflow') {
					buildViewForNode(subflow);
					F5.Global.flow.root.view.el.appendChild(subflow.view.el);						

					F5.forEach(subflow.choices, function (id, child) {
						doSubflowRecursive(node, id, child);
					});			
				}
			}
			if (node.subflows) {
				F5.forEach(node.subflows, function (id, subflow) {
					doSubflowRecursive(node, id, subflow);
				});
			}	


			that.delegate.initialize(that.el, that.node);
			
			if (!node.active) {
				div.style.visibility = 'hidden';
			}										
		};
				
		this.viewWillBecomeActive = function () {
			if (this.delegate.viewWillBecomeActive) {
				this.delegate.viewWillBecomeActive(this.el, this.node);
			}			
		};
		
		this.viewWillBecomeInactive = function () {
			if (this.delegate.viewWillBecomeInactive) {
				this.delegate.viewWillBecomeInactive(this.el, this.node);
			}			
		};
		
		this.viewDidBecomeActive = function () {
			if (this.delegate.viewDidBecomeActive) {
				this.delegate.viewDidBecomeActive(this.el, this.node);
			}						
		};
		
		this.viewDidBecomeInactive = function () {
			if (this.delegate.viewDidBecomeInactive) {
				this.delegate.viewDidBecomeInactive(this.el, this.node);
			}						
		};
		
		this.getNavConfig = function () {
			if (this.delegate.getNavConfig) {
				return this.delegate.getNavConfig(this.node);
			} else {
				if (this.node.back) {
					var leaf = this.node.back;
					while (leaf.selection) {
						leaf = leaf.selection;
					}
										
					return {
						left: {
							label: leaf.id, 
							transition: 'back'
						}											
					};
				} else {
					return null;
				}				
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
	var viewPrototype = new ViewPrototype();
	buildViewForNode = function (node) {
		F5.objectFromPrototype(viewPrototype).ConstructView(node);
	};

			
	function ViewController(flow, screenFrame) {						
		
		function doLifecycleEventRecursive(node, event) {
			while (node) {
				node.view[event]();
				node = node.selection;				
			}			
		}
				
		this.nodeDidBecomeActive = function (node) {
			doLifecycleEventRecursive(node, 'viewDidBecomeActive');
		};				

		this.nodeDidBecomeInactive = function (node) {
			doLifecycleEventRecursive(node, 'viewDidBecomeInactive');
		};		
		
		this.nodeWillBecomeInactive = function (node) {
			doLifecycleEventRecursive(node, 'viewWillBecomeInactive');
		};				

		this.nodeWillBecomeActive = function (node) {
			if (!node.view) {
				buildViewForNode(node);
				if (node === F5.Global.flow.root) {
					screenFrame.appendChild(node.view.el);
				} else {
					node.parent.view.el.querySelector('[class=container]').appendChild(node.view.el);												
				}
			}
			
			doLifecycleEventRecursive(node, 'viewWillBecomeActive');		
		};				
		
		this.start = function () {	
			// NOTE: the root node was already built by nodeWillBecomeActive
			if (F5.Global.navigationController) {
				F5.Global.navigationController.start();
			}					
		};
		
		this.doSelection = function (node, id, cb) {
			if (F5.Global.navigationController) {
				F5.Global.navigationController.doSelection(node, id);
			}				
			
			if (node.view.delegate.doSelection) {
				node.view.delegate.doSelection(node, id);
			}												
			
			var oldEl = document.getElementById(node.selection.path);
			var newEl = document.getElementById(node.children[id].path);
			
			// TODO: get animation name from the node		
			var animationFunction = F5.Animation.fadeIn(node.view.el, oldEl, newEl, function () {
				cb();
			});
			setTimeout(animationFunction, 0);
		};
						
		this.doTransition = function (container, id, to, animation, cb) {
			var that = this;
									
			var containerElement = container.view.el.querySelector('[class=container]');
			var oldNode = container.selection;
			
			var oldEl = oldNode.view.el;
			var newEl = to.view.el;
			
			
			// TODO: move to Animation module
			function inverseAnimation(animation) {
				var inverse;
				switch (animation) {
				case 'fadeIn':
					inverse = 'fadeIn';
					break;
				case 'pushRight':
					inverse = 'pushLeft';
					break;
				case 'pushLeft':
					inverse = 'pushRight';
					break;
				}
				
				return inverse;
			}
			if (id === 'back') {
				animation = inverseAnimation(oldNode.animation);
			}			
			if (!animation)  {
				animation = 'pushLeft';
			}
			if (id !== 'back') {
				to.animation = animation;
			}
																												
			var transitionFunction = F5.Animation[animation](containerElement, oldEl, newEl, function () {
				cb();
				
				function deleteViewsRecursive(node) {
					delete node.view;
					delete node.animation;
					if (node.children) {
						F5.forEach(node.children, function (id, child) {
							deleteViewsRecursive(child);
						});
					}
				}
				if (id === 'back') {
					// TODO: call viewRelease?
					deleteViewsRecursive(oldNode);

					F5.removeTouchEventListenersRecursive(oldEl);
					containerElement.removeChild(oldEl);
				}				
			});	
						
			that.animationFunction = function () {				
				// TODO: navigationController should also queue it's transition function
				if (F5.Global.navigationController) {
					F5.Global.navigationController.doTransition(container, animation, to);
				}				
				transitionFunction();
			};
			
			// TODO: setup a native queuing function 
			// then instead of setTimeout, trigger the webkit side animation from the native
			// so there's minimum delay in animation starts
			// move nav config into here as well to sync the nav bar
			// make a transition function on widgets that allows functions to be queued
			// from widgets
			setTimeout(function () {
				
				if (typeof PhoneGap !== 'undefined') {
					function doSync(which) {
						PhoneGap.exec(
							function (result) { // success
							console.log(result);
						}, function (result) { // failure
							console.log(result);
						}, "com.flow5.mapview", which, []);										
					}				

					if (to.id === 'categories') {
						doSync('pushMap');
					} else if (to.id === 'merchantListing') {
						doSync('popMap');
					} else {
						that.animationFunction();
					}					
				} else {
					that.animationFunction();
				}
			}, 0);
		};		
		
		// called in a willBecomeActive context to conditionally pick a starting view
		this.syncSet = function (node) {
			F5.forEach(node.children, function (id, child) {
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
			
			function fadeComplete() {
				subflow.view.el.style.visibility = 'hidden';
				F5.removeTransitionEndListener(subflow.view.el);
			}

			F5.addTransitionEndListener(subflow.view.el, fadeComplete);				
			
			subflow.view.el.style.opacity = 0;
			subflow.view.el.style['pointer-events'] = '';			
		};
				
		this.doSubflowChoice = function (subflow, choice) {
			function fadeComplete() {
				subflow.view.el.style.visibility = 'hidden';
				F5.removeTransitionEndListener(subflow.view.el);
			}

			F5.addTransitionEndListener(subflow.view.el, fadeComplete);

			subflow.view.el.style['pointer-events'] = '';
			subflow.view.el.style.opacity = 0;				
						
			var nextSubflow = subflow.choices[choice];
			if (nextSubflow.userInput) {
				nextSubflow.view.el.style.visibility = '';			
				nextSubflow.view.el.style.opacity = 1;
				nextSubflow.view.el.style['pointer-events'] = 'auto';				
			}
		};
	}
		
	F5.ViewController = ViewController;	
}());
