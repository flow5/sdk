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
/*global F5, PhoneGap*/

(function () {
		
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
MenuHelper.prototype = F5.WidgetPrototypes.NavBarBase;

/* TODO: Initial pass at hooking up settings. Initially tying it to what would normally be in nav bar.
   this is just to illustrate the navbar-less style in Android */

F5.addF5ReadyListener(function () {
	document.addEventListener('backbutton', function () {
		if (F5.Global.flowController.hasBack()) {
			F5.Global.flowController.doBack();
		} else {
			PhoneGap.exec(null, null, "App", "exitApp", [false]);		
		}
	});

	var menuHelper = new MenuHelper();
	F5.Global.flowController.addFlowObserver(menuHelper);	

	document.addEventListener('menubutton', function () {
		if (menuHelper.configuration.left || menuHelper.configuration.right) {
			var menu = document.createElement('div');
			menu.setAttribute('f5_widget', 'Menu');
			var choices = {};
			if (menuHelper.configuration.left) {
				choices[menuHelper.configuration.left.label] = true;
			}
			if (menuHelper.configuration.right) {
				choices[menuHelper.configuration.right.label] = true;
			}
			choices['Cancel'] = true;
			
			F5.attachWidget(menu, {method: 'Options', choices: choices});

			F5.Global.flow.root.view.el.appendChild(menu);	

			menu.style.opacity = 1;			

			menu.widget.setAction(function (id) {
				if (menuHelper.configuration.left && menuHelper.configuration.left.label === id) {
					menuHelper.configuration.left.action();
				} else if (menuHelper.configuration.right && menuHelper.configuration.right.label === id) {
					menuHelper.configuration.right.action();					
				} 
				F5.Global.flow.root.view.el.removeChild(menu);
			});
		}	
	});	
});

}());

