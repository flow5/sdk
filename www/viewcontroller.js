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
		
	function ViewController(flow, screenFrame) {
		
		F5.Global.flowController.addFlowObserver(this);						
		
		function doLifecycleEvent(node, event) {			
			node.view['view' + event]();
						
			function doWidgetLifecycleEventRecursive(el, event) {
				F5.forEach(el.childNodes, function doWidgetLifecycleEvent(childEl) {
					if (childEl.getAttribute && childEl.getAttribute('f5widget')) {
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
				F5.objectFromPrototype(F5.Views[node.type]).initialize(node);
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
			
			node.view.doSelection(node, id);
			
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
			F5.forEach(node.view.el.querySelectorAll('[f5widget]'), function (el) {
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
						
			var data = {method: subflow.method, choices: subflow.choices};
			subflow.menu = F5.createWidget('Menu', data);			
			document.getElementById('f5screen').appendChild(subflow.menu);
						
			subflow.menu.widget.setAction(function (id) {
				F5.Global.flowController.doSubflowChoice(subflow.node, id);
			});
			
			setTimeout(function () {
				subflow.menu.style.opacity = 1;							
			}, 0);
		};

		this.completeSubflow = function (subflow) {
			function fadeComplete() {
				F5.removeTouchEventListenersRecursive(subflow.menu);
				subflow.menu.parentElement.removeChild(subflow.menu);
				F5.removeTransitionEndListener(subflow.menu);
			}

			F5.addTransitionEndListener(subflow.menu, fadeComplete);				
			
			subflow.menu.style.opacity = 0;	
			
			// wtf? workaround for a safari rendering bug. without this, the opacity
			// transition stops (window.getComputedStyle(menu).opacity reports .99999something)
			setTimeout(function () {
				subflow.menu.style.opacity = 0.01;				
			}, 100);
		};				
	}
		
	F5.ViewController = ViewController;	
}());
