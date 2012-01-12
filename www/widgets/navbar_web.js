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
			
	function NavBar() {
	
		var navbarEl;
		var titleEl;
		var buttons = {};
			
		this.construct = function (data) {
			
			var that = this;
			
			navbarEl = document.createElement('div');
			F5.addClass(navbarEl, 'f5navbar');
			navbarEl.style.opacity = 0;
			this.el.appendChild(navbarEl);
			
			
			function makeButtons(which) {												
				buttons[which] = {a:{}, b:{}};
				
				function makeButton(which) {
					var el = document.createElement('div');
					F5.attachWidget(el, 'Button', data);					
					F5.addClass(el, 'f5' + which + 'button');
					el.style.opacity = 0;
					
					el.widget.setAction(function () {
						that.configuration[which].action();						
					});
										
					navbarEl.appendChild(el);																			
					
					return el					
				}
				buttons[which].a = makeButton(which);
				buttons[which].b = makeButton(which);
				buttons[which].active = buttons[which].a;								
				buttons[which].inactive = buttons[which].b;								
			}
						
			makeButtons('left');		
			makeButtons('right');
			
			titleEl = document.createElement('div');
			F5.addClass(titleEl, 'f5title');
			navbarEl.appendChild(titleEl);
						
			F5.Global.flowController.addFlowObserver(this);			
		};
		
		function chooseInactive(which) {
			return buttons[which].active === buttons[which].a ? buttons[which].b : buttons[which].a;
		}
	
		function setup() {			
			var that = this;								
		
			buttons.left.inactive = chooseInactive('left');
			buttons.right.inactive = chooseInactive('right');
			
			function setupButton(which) {
				var currentLabel;
				if (buttons[which].active) {
					currentLabel = buttons[which].active.widget.getLabel();					
				}
				var value;
				if (that.configuration[which]) {
					value = that.configuration[which].label;
				}
				
				if (currentLabel !== value) {
					if (value) {
						buttons[which].inactive.widget.setLabel(value);
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
				titleEl.innerHTML = this.configuration.title;	
				setupButton('left');
				setupButton('right');														
			}				
		}
		
		function animate(animation) {
			var that = this;
			
			function swap(which) {
				var button = buttons[which].inactive;
				buttons[which].inactive = buttons[which].active;
				buttons[which].active = button;
			}
			
			function doAnimate(which) {
				
				if (that.configuration.hide) {
					navbarEl.style.opacity = 0;
				} else {
					navbarEl.style.opacity = 1;					
				}
				var button = buttons[which];
				if (button.doAnimate) {
					if (button.inactive) {
						button.inactive.style['-webkit-transition'] = 'opacity .15s';
						button.inactive.style.opacity = 1;					
						button.inactive.style['pointer-events'] = '';						
					}
					if (button.active) {
						button.active.style['-webkit-transition'] = 'opacity .15s';
						button.active.style.opacity = 0;					
						button.active.style['pointer-events'] = 'none';						
					}
					swap(which);
					button.doAnimate = false;					
				}								
			}
			doAnimate('left');
			doAnimate('right');
		}
			
		this.start = function () {
			this.updateConfiguration(F5.Global.flow.root);
			setup.apply(this);
		};
	
		this.doSelection = function (node, id) {
			this.updateConfiguration(node.children[id]);
			setup.apply(this);
			
			var that = this;
			return function (cb) {
				animate.apply(that, ['fade']);
				cb();
			};
		};
	
		this.doTransition = function (container, id, to, animation) {
			this.updateConfiguration(to);		
			setup.apply(this);
			
			var that = this;
			return function (cb) {
				animate.apply(that, [animation]);
				cb();
			};
		};
	
		this.startSubflow = function () {
			this.updateConfiguration(F5.Global.flow.root);
//			buttons.left.active.style.visibility = 'hidden';	
			setup.apply(this);
		};
	
		this.syncSelection = function (node) {
			this.updateConfiguration(node);
			setup.apply(this);
		};
	
		this.completeSubflow = function () {
			this.updateConfiguration(F5.Global.flow.root);
			setup.apply(this);
		};
	}
	NavBar.prototype = F5.Prototypes.Widgets.NavController;

	F5.Prototypes.Widgets.NavBar = new NavBar();
}());
