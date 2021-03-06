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

	F5.ViewController = function (flow) {

		F5.Global.flowController.addFlowObserver(this);

		function doLifecycleEvent(node, event) {
			node.view['view' + event]();
			F5.doWidgetLifecycleEventRecursive(node.view.el, event);
		}

		this.nodeDidBecomeActive = function (node) {
			doLifecycleEvent(node, 'DidBecomeActive');
		};

		this.nodeDidBecomeInactive = function (node) {
			doLifecycleEvent(node, 'DidBecomeInactive');
		};

		this.nodeWillBecomeInactive = function (node) {
			F5.stopActivity(node.view.el);
			doLifecycleEvent(node, 'WillBecomeInactive');
		};

		this.nodeWillBecomeActive = function (node) {
			this.nodeInitialize(node);
			doLifecycleEvent(node, 'WillBecomeActive');
		};

		this.nodeInitialize = function (node) {
			if (!node.view) {
				F5.objectFromPrototype(F5.View).initialize(node);
			}
		};

		this.initialize = function () {

		};

		this.start = function () {

		};

		this.doSelection = function (node, id) {
			if (F5.Global.navigationController) {
				F5.Global.navigationController.doSelection(node, id);
			}

			node.view.doSelection(node, id);

			var oldEl = document.getElementById(node.selection.path);
			var newEl = document.getElementById(node.children[id].path);

			// TODO: get animation name from the node

			return F5.getAnimation('f5.animation.cut')(node.view.el, oldEl, newEl);
		};

		this.doTransition = function (container, from, id, to, animation) {
			var that = this;

			if (!animation && id === 'back') {
				var qualifiedAnimation = container.selection.animation;
				if (qualifiedAnimation.split('.').length == 1) {
					qualifiedAnimation = F5.getNodePackage(container) + '.' + qualifiedAnimation;
				}

				animation = F5.getInverseAnimation(qualifiedAnimation);
			}
			if (!animation)  {
				animation = 'f5.animation.pushLeft'; // default
			}
			if (id !== 'back') {
				to.animation = animation;
			}

			var containerElement = container.view.el.getElementsByClassName('f5container')[0];
			var oldNode = container.selection;

			var oldEl = oldNode.view.el;
			var newEl = to.view.el;

			var qualifiedAnimation = animation;
			if (qualifiedAnimation.split('.').length == 1) {
				qualifiedAnimation = F5.getNodePackage(container) + '.' + qualifiedAnimation;
			}

			var animationFunction = F5.getAnimation(qualifiedAnimation)(containerElement, oldEl, newEl);
			return function (cb) {
				animationFunction(cb);
			};
		};

		this.release = function (node) {
			if (!node.view) {
				return;
			}

			F5.forEach(node.view.el.querySelectorAll('[f5widget]'), function (el) {
				if (el.widget.release) {
					el.widget.release();
				}
			});

			if (node.view.delegate && node.view.delegate.release) {
				node.view.delegate.release();
			}

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
		// NOTE: the logic for sync'ing selection within a flow is a little wonky
		// This is possible under limited circumstances, and useful at times.
		this.syncSelection = function (node) {
			if (node.view) {
				node.view.syncSelection(node);

				F5.forEach(node.children, function (id, child) {
					if (child.view) {
						child.view.el.style.visibility = 'hidden';
					}
				});
				if (node.selection.view) {
					node.selection.view.el.style.visibility = '';
				}
			}
		};
	};
}());
