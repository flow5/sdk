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
			
	function NavigationController() {
	
		var navbarEl, leftButtonEl, rightButtonEl, titleEl;
	
		this.setup = function (container) {
			navbarEl = document.createElement('div');
			F5.addClass(navbarEl, 'navbar');
			container.insertBefore(navbarEl, container.firstChild);	

			leftButtonEl = document.createElement('div');
			F5.addClass(leftButtonEl, 'leftbutton');
			leftButtonEl.style.visibility = 'hidden';
			navbarEl.appendChild(leftButtonEl);

			titleEl = document.createElement('div');
			F5.addClass(titleEl, 'title');
			navbarEl.appendChild(titleEl);

			rightButtonEl = document.createElement('div');
			F5.addClass(rightButtonEl, 'rightbutton');
			rightButtonEl.style.visibility = 'hidden';
			navbarEl.appendChild(rightButtonEl);

			F5.addTapListener(leftButtonEl, function () {
				F5.Global.navigationControllerConfiguration.left.action();
			});																					

			F5.addTapListener(rightButtonEl, function () {
				F5.Global.navigationControllerConfiguration.right.action();
			});		
		};
	
		function configure() {								

			var configuration = F5.Global.navigationControllerConfiguration;											
		
			if (configuration.hide) {
				navbarEl.style.visibility = 'hidden';
				leftButtonEl.style['pointer-events'] = '';
				rightButtonEl.style['pointer-events'] = '';				
			} else {
				navbarEl.style.visibility = '';
				titleEl.innerHTML = configuration.title;																	
				if (configuration.left) {
					leftButtonEl.style.visibility = '';
					leftButtonEl.style['pointer-events'] = '';
					leftButtonEl.innerText = configuration.left.label;					
				} else {
					leftButtonEl.style.visibility = 'hidden';					
					leftButtonEl.style['pointer-events'] = 'none';
				}
				if (configuration.right) {
					rightButtonEl.style.visibility = '';
					rightButtonEl.style['pointer-events'] = '';				
					rightButtonEl.innerText = configuration.right.label;					
				} else {
					rightButtonEl.style.visibility = 'hidden';					
					rightButtonEl.style['pointer-events'] = 'none';
				}				
			}				
		}
			
		this.start = function () {
			this.updateConfiguration(F5.Global.flow.root);
			configure();
		};
	
		this.doSelection = function (node, id) {
			this.updateConfiguration(node.children[id]);
			configure();
			
			return function (cb) {cb();};
		};
	
		this.doTransition = function (container, id, to, animation) {
			this.updateConfiguration(to);		
			configure();
			
			return function (cb) {cb();};
		};
	
		this.startSubflow = function () {
			leftButtonEl.style.visibility = 'hidden';	
			configure();
		};
	
		this.syncSet = function (node) {
			this.updateConfiguration(node);
			configure();
		};
	
		this.completeSubflow = function () {
			this.updateConfiguration(F5.Global.flow.root);
			configure();
		};
	}
	NavigationController.prototype = F5.Prototypes.navigationConfigurator;

	F5.Prototypes.navigationController = new NavigationController();

}());
