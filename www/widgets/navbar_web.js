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
	
		var navbarEl, leftButtonEl, leftButtonLabelEl, rightButtonEl, rightButtonLabelEl, titleEl;
	
		this.construct = function () {
			navbarEl = document.createElement('div');
			F5.addClass(navbarEl, 'f5navbar');
			this.el.appendChild(navbarEl);
//			this.el.insertBefore(navbarEl, this.el.firstChild);	

			leftButtonEl = document.createElement('div');
			F5.addClass(leftButtonEl, 'f5leftbutton');
			leftButtonEl.style.visibility = 'hidden';
			navbarEl.appendChild(leftButtonEl);
			leftButtonLabelEl = document.createElement('div');
			F5.addClass(leftButtonLabelEl, 'f5label');
			leftButtonEl.appendChild(leftButtonLabelEl);
			

			titleEl = document.createElement('div');
			F5.addClass(titleEl, 'f5title');
			navbarEl.appendChild(titleEl);

			rightButtonEl = document.createElement('div');
			F5.addClass(rightButtonEl, 'f5rightbutton');
			rightButtonEl.style.visibility = 'hidden';
			navbarEl.appendChild(rightButtonEl);
			rightButtonLabelEl = document.createElement('div');
			F5.addClass(rightButtonLabelEl, 'f5label');
			rightButtonEl.appendChild(rightButtonLabelEl);
			

			var that = this;
			
			F5.addTapListener(leftButtonEl, function () {
				that.configuration.left.action();
			});																					

			F5.addTapListener(rightButtonEl, function () {
				that.configuration.right.action();
			});		
			
			F5.Global.flowController.addFlowObserver(this);			
		};
	
		function configure() {								
		
			if (this.configuration.hide) {
				navbarEl.style.visibility = 'hidden';
				leftButtonEl.style['pointer-events'] = '';
				rightButtonEl.style['pointer-events'] = '';				
			} else {
				navbarEl.style.visibility = '';
				titleEl.innerHTML = this.configuration.title;																	
				if (this.configuration.left) {
					leftButtonEl.style.visibility = '';
					leftButtonEl.style['pointer-events'] = '';
					leftButtonLabelEl.innerText = this.configuration.left.label;					
				} else {
					leftButtonEl.style.visibility = 'hidden';					
					leftButtonEl.style['pointer-events'] = 'none';
				}
				if (this.configuration.right) {
					rightButtonEl.style.visibility = '';
					rightButtonEl.style['pointer-events'] = '';				
					rightButtonLabelEl.innerText = this.configuration.right.label;					
				} else {
					rightButtonEl.style.visibility = 'hidden';					
					rightButtonEl.style['pointer-events'] = 'none';
				}				
			}				
		}
			
		this.start = function () {
			this.updateConfiguration(F5.Global.flow.root);
			configure.apply(this);
		};
	
		this.doSelection = function (node, id) {
			this.updateConfiguration(node.children[id]);
			configure.apply(this);
			
			return function (cb) {cb();};
		};
	
		this.doTransition = function (container, id, to, animation) {
			this.updateConfiguration(to);		
			configure.apply(this);
			
			return function (cb) {cb();};
		};
	
		this.startSubflow = function () {
			this.updateConfiguration(F5.Global.flow.root);
			leftButtonEl.style.visibility = 'hidden';	
			configure.apply(this);
		};
	
		this.syncSet = function (node) {
			this.updateConfiguration(node);
			configure.apply(this);
		};
	
		this.completeSubflow = function () {
			this.updateConfiguration(F5.Global.flow.root);
			configure.apply(this);
		};
	}
	NavBar.prototype = F5.WidgetPrototypes.NavBarBase;

	F5.WidgetPrototypes.NavBar = new NavBar();
}());
