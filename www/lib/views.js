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

	function View() {
		this.initialize = function (node) {
			var that = this;

			function attachTabset(el) {
				// TODO: still not happy with this
				var widget = el.getAttribute('f5widget');
				if (widget && widget.match('Tabset')) {
					that.tabset = el;
					that.tabset.widget.initialize();
					that.tabset.widget.attachToNode(node);
					that.tabset.widget.setAction(function selectionChangeCb(id) {
						F5.Global.flowController.doSelection(node, id);
					});
					that.tabset.widget.select(node.selection.id);
				}
			}

			var pkg = F5.getNodePackage(node);

			var nodeEl = F5.loadTemplate(node.id, node, null, true);
			if (!nodeEl) {
				nodeEl = document.createElement('div');
				F5.addClass(nodeEl, node.id);
			}
			F5.addClass(nodeEl, 'f5node');

			if (node.children) {
				var headerTemplate = F5.loadTemplate(node.id + '-header', node, null, true);
				if (headerTemplate) {
					attachTabset(headerTemplate);
					nodeEl.appendChild(headerTemplate);
				}

				this.container = F5.loadTemplate(node.id + '-container', node, null, true);
				if (!this.container) {
					this.container = document.createElement('div');
					F5.addClass(this.container, node.id + '-container');
				}

				F5.addClass(this.container, 'f5container');
				nodeEl.appendChild(this.container);

				var footerTemplate = F5.loadTemplate(node.id + '-footer', node, null, true);
				if (footerTemplate) {
					attachTabset(footerTemplate);
					nodeEl.appendChild(footerTemplate, this.container);
				}
			}

			if (F5.isDebug() && !F5.isMobile()) {
				var label = document.createElement('div');
				label.innerHTML = node.id;
				F5.addClass(label, 'f5nodelabel');
				nodeEl.insertBefore(label, nodeEl.firstChild);
			}

			var frameEl;
			if (node.parent && !node.parent.selection) {
				frameEl = nodeEl;
			} else  {
				frameEl = document.createElement('div');
				F5.addClass(frameEl, 'f5frame');
				frameEl.appendChild(nodeEl);
			}

			if (node.pkg) {
				F5.addClass(frameEl, F5.packageClass(node.pkg));
			}

			if (!node.active) {
				frameEl.style.visibility = 'hidden';
			}

			frameEl.id = node.path;
			this.el = frameEl;
			frameEl.view = this;
			this.node = node;
			node.view = this;

			var id = F5.getNodePackage(node) + '.' + node.id;
			var viewDelegatePrototype = this.getViewDelegatePrototype(id);
			if (viewDelegatePrototype) {
				var delegate = F5.objectFromPrototype(viewDelegatePrototype);

				this.delegate = delegate;
				this.delegate.node = node;
				this.delegate.el = nodeEl;

				// automatically populate the delegate with members for each identified element in the template
				delegate.widgets = {};
				F5.forEach(nodeEl.querySelectorAll('[f5widget]'), function (el) {
					delegate.widgets[el.getAttribute('f5id')] = el.widget;
				});

				if (this.delegate.initialize) {
					this.delegate.initialize();
				}
			}

			F5.initializeWidgets(pkg, this.node, this.el);

			// TODO: enable this with an additional URL parameter?
			// Would require an additional build target for device
			if (F5.isDebug() && (!this.delegate || this.delegate.devoverlay)) {
				this.addDevOverlay(node);
			}

			if (node.parent) {
				node.parent.view.container.appendChild(frameEl);
			} else {
				document.getElementById('f5screen').appendChild(frameEl);
			}
		};

		this.getViewDelegatePrototype = function (id) {
			return F5.getPrototype('ViewDelegates', id);
		};

		this.doSelection = function (node, id) {
			if (this.tabset) {
				this.tabset.widget.select(id);
			}
		};

		this.syncSelection = function (node) {
			if (this.tabset) {
				this.tabset.widget.select(node.selection.id);
			}
		};

		this.viewWillBecomeActive = function () {
			if (this.delegate && this.delegate.viewWillBecomeActive) {
				this.delegate.viewWillBecomeActive();
			}
		};

		this.viewWillBecomeInactive = function () {
			if (this.delegate && this.delegate.viewWillBecomeInactive) {
				this.delegate.viewWillBecomeInactive();
			}
		};

		this.viewDidBecomeActive = function () {
			if (this.delegate && this.delegate.viewDidBecomeActive) {
				this.delegate.viewDidBecomeActive();
			}
		};

		this.viewDidBecomeInactive = function () {
			if (this.delegate && this.delegate.viewDidBecomeInactive) {
				this.delegate.viewDidBecomeInactive();
			}
		};

		this.getNavConfig = function () {
			if (this.delegate && this.delegate.getNavConfig) {
				return this.delegate.getNavConfig();
			} else {
				return this.getDevNavConfig();
			}
		};

		// OPTION: can use display:none for lower memory construction or z-index: -1 for speed
		this.show = function () {
			this.el.visibility = '';
		};

		this.hide = function () {
			this.el.visibility = 'hidden';
		};




		// TODO: move to diags layer? neither of these would ever be used in production
		this.getDevNavConfig = function () {
			// TODO: this is really a dev thing only. would never use
			// the leaf.id as the label in practice
			if (this.node.back && this.node.parent.type === 'flow') {
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
		};

		this.addDevOverlay = function (node) {
			// default navigation controls
			var navControls;

			if (node.transitions) {
				var div = document.createElement('div');
				div.style.position = 'absolute';
				div.style.width = '100%';
				div.style['z-index'] = 1;
				this.el.insertBefore(div, this.el.firstChild);

				navControls = document.createElement('div');
				F5.addClass(navControls, 'f5navcontrols');
				div.appendChild(navControls);
			}

			if (node.transitions) {
				var transitionsEl = document.createElement('div');
				F5.addClass(transitionsEl, 'f5transitions');
				navControls.appendChild(transitionsEl);

				F5.forEach(node.transitions, function (id, transition) {

					var transitionEl = F5.createWidget('f5.widgets.Button', {id: id}, 'id');
					F5.addClass(transitionEl, 'f5dotransition');
					transitionsEl.appendChild(transitionEl);

					transitionEl.widget.setAction(function () {
						F5.Global.flowController.doTransition(node, id);
					});
				});
			}
		};
	}

	F5.View = new View();
}());
