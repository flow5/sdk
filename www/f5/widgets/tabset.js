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
	IOSTabButton.prototype = F5.Prototypes.Widgets.Button;
	
	// TODO: not sure I want this decision in the framework
	if (F5.platform() === 'ios') {
		F5.Prototypes.Widgets._TabButton = new IOSTabButton();			
	} else {
		F5.Prototypes.Widgets._TabButton = F5.Prototypes.Widgets.Button;			
	}
	
	// Tabset works by looking for elements with f5tab attribute set
	// TODO: customize with images or alternate text
	// TODO: can't really go querySelectorAll since there might be nested tab sets
	function Tabset() {
					
		this.construct = function (data) {
			this.data = data;		
			F5.addClass(this.el, 'f5tabset');
		};
		
		this.attachToNode = function (node) {
			this.el.innerHTML = '';
			
			this.tabs = {};
			
			var that = this;
			F5.forEach(node.children, function (id, node) {
				if (!that.data[id]) {
					that.data[id] = id;
				}				
				var tab = F5.createWidget('_TabButton', that.data, id);

				F5.addClass(tab, 'f5tab');
				that.el.appendChild(tab);								
				that.tabs[id] = tab;

				tab.widget.setAction(function (e) {
					if (that.action) {
						that.action(id);
					}
				});							
			});
		};
		
		this.setAction = function (cb) {
			this.action = cb;
		};
			
		this.select = function (selection) {
			var that = this;
			
			// sync the tabset with the other deferred transition actions
			F5.Global.flowController.addWaitTask(function (cb) {
				F5.forEach(that.tabs, function (id, tab) {
					tab.widget.setState(selection === id);
					if (selection === id) {
						F5.addClass(that.el, id + '-selected');
					} else {
						F5.removeClass(that.el, id + '-selected');
					}
				});	
				cb();			
			});			
		};
	}

	F5.Prototypes.Widgets.Tabset = new Tabset();

}());
