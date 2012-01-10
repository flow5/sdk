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

/* setting up for android version specific css
   TODO: probably going to want to be more specific here */
	
F5.addF5ReadyListener(function () {
	if (navigator.userAgent.match(/Android 4.0/)) {
		F5.addClass(document.body, 'f5ics');
	} else {
		F5.addClass(document.body, 'f5not-ics');
	}	
	
	document.addEventListener('backbutton', function () {
		if (F5.Global.flowController.hasBack()) {
			F5.Global.flowController.doBack();
		} else {
			PhoneGap.exec(null, null, "App", "exitApp", [false]);		
		}
	});
	
	
	/* TODO: Initial pass at hooking up settings. Initially tying it to what would normally be in nav bar.
	   this is just to illustrate the navbar-less style in Android */
	function MenuHelper() {

		this.start = function () {
			this.updateConfiguration(F5.Global.flow.root);
		};

		this.doSelection = function (node, id) {
			this.updateConfiguration(node.children[id]);		
			return function (cb) {cb();};
		};

		this.doTransition = function (container, id, to, animation) {
			this.updateConfiguration(to);				
			return function (cb) {cb();};
		};

		this.startSubflow = function () {
			this.updateConfiguration(F5.Global.flow.root);
		};

		this.syncSet = function (node) {
			this.updateConfiguration(node);
		};

		this.completeSubflow = function () {
			this.updateConfiguration(F5.Global.flow.root);
		};			
	}
	MenuHelper.prototype = F5.Widgets.NavController;	

	var menuHelper = new MenuHelper();
	F5.Global.flowController.addFlowObserver(menuHelper);	
	var menu;

	document.addEventListener('menubutton', function () {
		function removeMenu() {
			var tmp = menu;
			menu = null;			
			tmp.widget.dismiss();
		}
		
		if (menu) {
			removeMenu();
		} else {
			if (menuHelper.configuration.left || menuHelper.configuration.right) {
				
				var data = {choices:[]};
				if (menuHelper.configuration.left) {
					data.choices.push(menuHelper.configuration.left.label);
				}
				if (menuHelper.configuration.right) {
					data.choices.push(menuHelper.configuration.right.label);
				}

				menu = F5.createWidget('AndroidSettingsMenu', data);
				
				menu.widget.setAction(function (id) {
					if (id) {
						if (menuHelper.configuration.left && menuHelper.configuration.left.label === id) {
							menuHelper.configuration.left.action();
						} else if (menuHelper.configuration.right && menuHelper.configuration.right.label === id) {
							menuHelper.configuration.right.action();					
						}				
					}
					removeMenu();
				});
				menu.widget.present();
			}			
		}			
	});	
	
	
	function AndroidSettingsMenu() {
		this.construct = function (data) {	

			var that = this;

			F5.addClass(this.el, 'f5androidsettingsmenu');
			
			F5.addTouchStartListener(this.el, function (e) {
				e.stopPropagation();
				if (that.action) {
					that.action(null);
				}
			});
			
			this.container = document.createElement('div');
			F5.addClass(this.container, 'f5androidsettingscontainer');
			this.el.appendChild(this.container);

			F5.forEach(data.choices, function (choice) {
				var choiceEl = document.createElement('div');
				F5.addClass(choiceEl, 'f5androidsetting');
				choiceEl.innerText = choice;
				that.container.appendChild(choiceEl);
				F5.addTouchStartListener(choiceEl, function () {
					if (that.action) {
						that.action(choice);
					}					
				});
			});					
		};

		this.setAction = function (cb) {
			this.action = cb;
		};
		
		this.present = function () {
			var that = this;
			F5.Global.flow.root.view.el.appendChild(this.el);				
			setTimeout(function () {
				that.container.style.opacity = 1;	
				that.container.style['-webkit-transform'] = 'scale(1)';	
			}, 0);
			
		};
		
		this.dismiss = function () {
			var that = this;
			F5.removeTouchEventListenersRecursive(this.el);			
			setTimeout(function () {
				that.container.style.opacity = 0;
				that.container.style['-webkit-transform'] = '';					
				// TODO: use transition end listener?
				setTimeout(function () {
					that.el.parentElement.removeChild(that.el);
				}, 500);
			});			
			
		};
	}	

	F5.Widgets.AndroidSettingsMenu = new AndroidSettingsMenu();	
});
	
}());