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
	
	// Tabset works by looking for elements with f5_tab attribute set
	// TODO: customize with images or alternate text
	// TODO: can't really go querySelectorAll since there might be nested tab sets
	function Tabset() {
	
		this.construct = function (data) {
			var that = this;
		
			var tabset = document.createElement('div');
			F5.addClass(tabset, 'tabset');
			that.el.insertBefore(tabset);
		
			that.tabs = {};
		
			that.el.querySelectorAll('[f5_tab]').forEach(function (el) {
				var id = el.getAttribute('f5_tab');
			
				var tab = document.createElement('div');
				tab.setAttribute('f5_widget', 'TabButton');
				tab.setAttribute('f5_id', id);								
				F5.addClass(tab, 'tab');

				that.tabs[id] = tab;
				tabset.appendChild(tab);
								
				F5.UI.attachWidget(tab, data);				

				tab.widget.setAction(function (e) {
					that.tabs.forEach(function (tabid, tab) {
						if (tabid !== id) {
							tab.widget.setState(false);
						}
					});
					
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
			this.tabs.forEach(function (id, tab) {
				tab.widget.setState(selection === id);
			});
		};
	}

	F5.WidgetPrototypes.Tabset = new Tabset();

}());
