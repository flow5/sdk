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
	
	// NOTE: TabButton shouldn't be used standalone
	function IOSTabButton() {
		this.state = false;			
		
		/* for tab button, the state is managed by the owning tabset */
		this.setAction = function (cb) {
			var that = this;
			F5.addTouchStartListener(this.el, function touchStartListenerCb(e) {
				e.stopPropagation();
				if (!that.state) {
					// do the callback first
					// if it errors out the state doesn't change
					cb();
				}
			});												
		};
	}
	IOSTabButton.prototype = F5.Widgets.Button;
	
	// TODO: not sure I want this decision in the framework
	if (F5.platform() === 'ios') {
		F5.Widgets._TabButton = new IOSTabButton();			
	} else {
		F5.Widgets._TabButton = F5.Widgets.Button;			
	}
	
	// Tabset works by looking for elements with f5tab attribute set
	// TODO: customize with images or alternate text
	// TODO: can't really go querySelectorAll since there might be nested tab sets
	function Tabset() {
		
		// NOTE: all tabs have to be at the same level of hierarchy
		function findTabs(el) {
			var tabs = [];
			F5.forEach(el.childNodes, function (child) {
				if (child.getAttribute && child.getAttribute('f5tab')) {
					tabs.push(child);
				}
			});
			if (tabs.length) {
				return tabs;
			} else {
				var i;
				for (i = 0; i < el.childNodes.length; i += 1) {
					tabs = findTabs(el.childNodes[i]);
					if (tabs.length) {
						return tabs;
					}
				}
			}
			return tabs;
		}
		
	
		this.construct = function (data) {
			var that = this;
		
			var tabset = document.createElement('div');
			F5.addClass(tabset, 'f5tabset');
								
			that.tabs = {};
		
			F5.forEach(findTabs(this.el), function (el) {
				var id = el.getAttribute('f5tab');
			
				var tab = F5.createWidget('_TabButton', data, id);
												
				F5.addClass(tab, 'f5tab');
				tabset.appendChild(tab);								
				that.tabs[id] = tab;

				tab.widget.setAction(function (e) {
					// do the action first. if it errors out, the state of the
					// controls doesn't change
					if (that.action) {
						that.action(id);
					}

					F5.forEach(that.tabs, function (tabid, tab) {
						tab.widget.setState(tabid === id);
					});					
				});				
			});	
			
			var position = that.el.getAttribute('f5tabsetposition');
			if (position && position === 'top') {
				that.el.insertBefore(tabset, that.el.childNodes[0]);
			} else {
				that.el.appendChild(tabset);				
			}					
		};
	
		this.setAction = function (cb) {
			this.action = cb;
		};
	
		this.select = function (selection) {
			F5.forEach(this.tabs, function (id, tab) {
				tab.widget.setState(selection === id);
			});
		};
	}

	F5.Widgets.Tabset = new Tabset();

}());
