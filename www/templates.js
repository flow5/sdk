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
/*global define, F5*/


define('templates', exports, function (exports) {
		
	function loadTemplate(arg1, arg2) {
		
		var id;
		var node;
		if (typeof arg1 === 'string') {
			id = arg1;
		} else {
			node = arg1;
			id = node.id;
		}
				
		var instance = document.getElementById(id).cloneNode(true);
		instance.removeAttribute('id');
		
		var widgetEls = [];
		
		if (instance.hasAttribute('f5_widget')) {
			widgetEls.push(instance);
		}

		instance.querySelectorAll('[f5_widget]').forEach(function (el) {
			widgetEls.push(el);			
		});
		
		// if arg2 is provided, copy out its fields
		var data = {};
		function assign(id, value) {
			if (!data[id]) {
				data[id] = value;				
			} else {
				console.log('Data field name shadowed');
			}
		}
		if (arg2 && typeof arg2 === 'object') {
			arg2.forEach(assign);
		}
		
		// then add all of the strings resources associated with this node and ancestors
		while (node) {
			var strings = F5.Strings[node.id];
			if (strings) {
				strings.forEach(assign);				
			}
			var images = F5.Images[node.id];
			if (images) {
				images.forEach(assign);
			}
			node = node.parent;
		}				
		
		widgetEls.forEach(function (el) {
			F5.UI.attachWidget(el, data);
		});
		
		return instance;
	}
	
	F5.Templates = {loadTemplate: loadTemplate};
});