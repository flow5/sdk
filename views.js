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
/*global define F5 WebKitCSSMatrix*/

define('views', exports, function (exports) {

	function DefaultFlowView(el, node) {
		var div = document.createElement('div');
		div.innerHTML = node.id;
		el.appendChild(div);
	}
	
	function DefaultSelectorView(el, node) {
		var tabset = document.createElement('div');
		tabset.className = 'tabset';
		el.appendChild(tabset);
		
		node.children.forEach(function (id, child) {
			var tab = document.createElement('div');
			tab.className = 'tab';
			tab.innerHTML = id;
			tabset.appendChild(tab);
		
			F5.Widgets.Utils.addTouchListener(tab, function () {
				F5.Global.flowController.doSelection(node, id);
			});
		});
	}
	
	function DefaultSubflowView() {
		
	}
	
	exports.Views = {
		Defaults: {
			flow: DefaultFlowView,
			selector: DefaultSelectorView,
			subflow: DefaultSubflowView
		}
	};
});