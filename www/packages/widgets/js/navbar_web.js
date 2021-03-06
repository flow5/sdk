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

F5.registerModule(function (F5) {

	function NavBar() {

		var navbarEl;
		var title = {};
		var buttons = {};
		var containers = {};

		this.initialize = function (data) {

			var that = this;

			this.data = data;

			F5.addClass(this.el, 'f5navbar');

			navbarEl = document.createElement('div');
			F5.addClass(navbarEl, 'f5navbarcontainer');

			containers.title = document.createElement('div');
			F5.addClass(containers.title, 'f5titlecontainer');

			if (this.el.childNodes) {
				F5.forEach(this.el.childNodes, function (child) {
					containers.title.appendChild(child);
				});
			}

			this.el.appendChild(navbarEl);
			navbarEl.appendChild(containers.title);

			containers.left = document.createElement('div');
			navbarEl.appendChild(containers.left);

			containers.right = document.createElement('div');
			navbarEl.appendChild(containers.right);


			function makeButtons(which) {
				buttons[which] = {a:{}, b:{}};

				function makeButton(which) {
					var el = document.createElement('div');
					el.setAttribute('f5id', which);
					F5.attachWidget(el, 'Button', data);
					F5.addClass(el, 'f5' + which + 'button');
					el.style.opacity = 0;

					el.style['-webkit-transition'] = 'opacity .25s ease-in-out';

					el.widget.setAction(function () {
						that.configuration[which].action();
					});

					containers[which].appendChild(el);

					return el;
				}
				buttons[which].a = makeButton(which);
				buttons[which].b = makeButton(which);
				buttons[which].active = buttons[which].a;
				buttons[which].inactive = buttons[which].b;
			}

			makeButtons('left');
			makeButtons('right');

			function makeTitle() {
				var titleEl = document.createElement('div');
				F5.addClass(titleEl, 'f5title');
				containers.title.appendChild(titleEl);
				titleEl.style['-webkit-transition'] = 'opacity .25s ease-in-out';
				return titleEl;
			}
			title.a = makeTitle();
			title.b = makeTitle();
			title.active = title.a;

			F5.Global.flowController.addFlowObserver(this);
		};

		function chooseInactive(which) {
			return which.active === which.a ? which.b : which.a;
		}

		function different(a, b) {
			if (typeof a === typeof b) {
				if (typeof a === 'object') {
					if (a.constructor !== Object) {
						return a !== b;
					} else {
						var same = true;
						F5.forEach(a, function (id, value) {
							if (same && id !== 'action' && id !== 'node') {
								if (id === 'node') {
									same = a.node === b.node;
								} else {
									same = !different(value, b[id]);
								}
							}
						});
						F5.forEach(b, function (id, value) {
							if (same && id !== 'action' && id !== 'node') {
								if (id === 'node') {
									same = b.node === a.node;
								} else {
									same = !different(value, a[id]);
								}
							}
						});
						return !same;
					}
				} else {
					return a !== b;
				}
			} else {
				return true;
			}
		}

		function setup() {
			var that = this;

			buttons.left.inactive = chooseInactive(buttons.left);
			buttons.right.inactive = chooseInactive(buttons.right);

			function setupButton(which) {
				var currentConfigData;
				if (buttons[which].active) {
					currentConfigData = buttons[which].active.widget.getData();
				}
				var configData;
				if (that.configuration[which]) {
					configData = that.configuration[which];
				}

				if ((!currentConfigData && configData) ||
					(currentConfigData && different(currentConfigData, configData))) {
					if (configData) {
						buttons[which].inactive.widget.reset();
						var data = {};
						F5.merge(that.data && that.data[which], data);
						F5.merge(configData, data);
						buttons[which].inactive.widget.refresh(data);
					} else {
						buttons[which].inactive = null;
					}
					buttons[which].doAnimate = true;
				} else {
					buttons[which].doAnimate = false;
				}
			}

			if (this.configuration.hide) {
				buttons.left.inactive.style['pointer-events'] = '';
				buttons.right.inactive.style['pointer-events'] = '';
			} else {
				var currentTitle;
				if (title.active) {
					currentTitle = title.active.textContent;
				}
				if (currentTitle !== this.configuration.title) {
					title.doAnimate = true;
					title.inactive = chooseInactive(title);
					title.inactive.textContent = this.configuration.title;
				}
				setupButton('left');
				setupButton('right');
			}
		}

		function animate(animation) {
			var that = this;

			function swap(which) {
				var tmp = which.inactive;
				which.inactive = which.active;
				which.active = tmp;
			}

			function doAnimate(which) {
				var button = buttons[which];
				if (button.doAnimate) {
					if (button.inactive) {
						button.inactive.style.opacity = 1;
						button.inactive.style['pointer-events'] = '';
					}
					if (button.active) {
						button.active.style.opacity = 0;
						button.active.style['pointer-events'] = 'none';
					}
					swap(buttons[which]);
					button.doAnimate = false;
				}
			}
			doAnimate('left');
			doAnimate('right');

			if (that.configuration.hide) {
				navbarEl.style.opacity = 0;
				navbarEl.style['pointer-events'] = 'none';
			} else {
				navbarEl.style.opacity = 1;
				navbarEl.style['pointer-events'] = '';
			}

			if (title.doAnimate) {
				if (title.inactive) {
					title.inactive.style.opacity = 1;
				}
				if (title.active) {
					title.active.style.opacity = 0;
				}
				swap(title);
				title.doAnimate = false;
			}

		}

		this.refresh = function () {
			this.updateConfiguration(F5.Global.flow.root);
			setup.call(this);
			animate.call(this, 'fade');
		};

		this.start = function () {
			this.updateConfiguration(F5.Global.flow.root);
			setup.call(this);
		};

		this.doSelection = function (node, id) {
			this.updateConfiguration(node.children[id]);
			setup.call(this);

			var that = this;
			return function (cb) {
				animate.call(that, 'fade');
				cb();
			};
		};

		this.doTransition = function (container, from, id, to, animation) {
			this.updateConfiguration(to);
			setup.call(this);

			var that = this;
			return function (cb) {
				animate.call(that, animation);
				cb();
			};
		};

		this.syncSelection = function (node) {
			this.updateConfiguration(node);
			setup.call(this);
		};
	}
	NavBar.prototype = F5.Prototypes.Widgets.NavController;

	F5.Prototypes.Widgets.NavBar = new NavBar();
});
