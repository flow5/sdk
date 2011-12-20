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
			F5.addClass(div, 'f5' + node.type);
			div.id = node.path;
			div.view = this;

			// TODO: node.id should always exist after subflow reworkd is done
			if (node.id) {
				F5.addClass(div, node.id);				
			}
						
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
				F5.addClass(container, 'f5container');
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
		
		F5.Global.flowController.addFlowObserver(this);						
		
		function doLifecycleEvent(node, event) {			
			node.view['view' + event]();
						
			function doWidgetLifecycleEventRecursive(el, event) {
				F5.forEach(el.childNodes, function doWidgetLifecycleEvent(childEl) {
					if (childEl.getAttribute && childEl.getAttribute('f5_widget')) {
						if (childEl.widget['widget' + event]) {
							childEl.widget['widget' + event]();							
						}
					}
					// don't recurse through other views. they'll get handled
					// via the associated node
					if (!childEl.view) {
						doWidgetLifecycleEventRecursive(childEl, event);
					}
				});					
			}			
			doWidgetLifecycleEventRecursive(node.view.el, event);
		}
				
		this.nodeDidBecomeActive = function (node) {
			doLifecycleEvent(node, 'DidBecomeActive');
		};				

		this.nodeDidBecomeInactive = function (node) {
			doLifecycleEvent(node, 'DidBecomeInactive');
		};		
		
		this.nodeWillBecomeInactive = function (node) {
			doLifecycleEvent(node, 'WillBecomeInactive');
		};				

		this.nodeWillBecomeActive = function (node) {
			if (!node.view) {
				buildViewForNode(node);
				if (node === F5.Global.flow.root) {
					screenFrame.appendChild(node.view.el);
				} else {
					// TODO: this is slightly ugly
					node.parent.view.el.querySelector('[class=f5container]').appendChild(node.view.el);												
				}
			}
			
			doLifecycleEvent(node, 'WillBecomeActive');		
		};				
		
		this.start = function () {	
			// NOTE: the root node was already built by nodeWillBecomeActive
		};
		
		this.doSelection = function (node, id) {
			if (F5.Global.navigationController) {
				F5.Global.navigationController.doSelection(node, id);
			}				
			
			if (node.view.delegate.doSelection) {
				node.view.delegate.doSelection(node, id);
			}												
			
			var oldEl = document.getElementById(node.selection.path);
			var newEl = document.getElementById(node.children[id].path);
			
			// TODO: get animation name from the node
					
			return F5.Animation.cut(node.view.el, oldEl, newEl);
		};
						
		this.doTransition = function (container, id, to, animation) {
			var that = this;

			if (id === 'back') {
				animation = F5.Animation.inverseAnimation(container.selection.animation);
			}			
			if (!animation)  {
				animation = 'pushLeft'; // default
			}
			if (id !== 'back') {
				to.animation = animation;
			}									
									
			var containerElement = container.view.el.querySelector('[class=f5container]');
			var oldNode = container.selection;
			
			var oldEl = oldNode.view.el;
			var newEl = to.view.el;						
			
			var animationFunction = F5.Animation[animation](containerElement, oldEl, newEl);
			return function (cb) {
				animationFunction(function () {
					cb();
				});
			};
		};	
		
		this.release = function (node) {
			F5.forEach(node.view.el.querySelectorAll('[f5_widget]'), function (el) {
				if (el.widget.release) {
					el.widget.release();
				}
			});

			F5.removeTouchEventListenersRecursive(node.view.el);
			node.view.el.parentElement.removeChild(node.view.el);
			
			function deleteViewsRecursive(node) {
				// TODO: call viewRelease?
				delete node.view;
				delete node.animation;
				if (node.children) {
					F5.forEach(node.children, function (id, child) {
						deleteViewsRecursive(child);
					});
				}
			}
			deleteViewsRecursive(node);			
		};
		
		// called in a WillBecomeActive context to conditionally pick a starting view
		this.syncSet = function (node) {
			F5.forEach(node.children, function (id, child) {
				child.view.el.style.visibility = 'hidden';
			});
			node.selection.view.el.style.visibility = '';
		};			
		
		this.startSubflow = function (subflow) {
			
			subflow.menu = document.createElement('div');
			subflow.menu.setAttribute('f5_widget', 'Menu');
			F5.attachWidget(subflow.menu, {method: subflow.method, choices: subflow.choices});
			
			F5.Global.flow.root.view.el.appendChild(subflow.menu);	
			
			subflow.menu.style.opacity = 1;			
			
			subflow.menu.widget.setAction(function (id) {
				F5.Global.flowController.doSubflowChoice(subflow.node, id);
			});
		};

		this.completeSubflow = function (subflow) {
			function fadeComplete() {
				F5.removeTouchEventListenersRecursive(subflow.menu);
				F5.Global.flow.root.view.el.removeChild(subflow.menu);
				F5.removeTransitionEndListener(subflow.menu);
			}

			F5.addTransitionEndListener(subflow.menu, fadeComplete);				
			
			subflow.menu.style.opacity = 0;
		};				
	}
		
	F5.ViewController = ViewController;	
}());
