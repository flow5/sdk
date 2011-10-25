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
/*global define*/

define('widgetmanager', exports, function (exports) {
	
	function WidgetManager() {
		
		this.activateNode = function (node) {
			
		};
		
		this.doSelection = function (node, id, cb) {
			console.log('WidgetManager.doSelection');									
			
			var containerElement = document.getElementById(node.diags.path);
			for (var i = 0; i < containerElement.children.length; i += 1) {
				containerElement.children[i].style.visibility = 'hidden';
			}
			var activeElement = document.getElementById(node.activeChild.diags.path);
			activeElement.style.visibility = '';
						
			cb();
		};
		
		this.doTransition = function (fromNode, toNode, cb) {
			console.log('WidgetManager.doTransition');	
			
			var toElement = document.getElementById(toNode.diags.path);			
			var containerElement = document.getElementById(toNode.parent.diags.path);
			
			for (var i = 0; i < containerElement.children.length; i += 1) {
				containerElement.children[i].style.visibility = 'hidden';
			}
			toElement.style.visibility = '';			
											
			cb();
		};
				
		this.doSubflow = function (node) {
			console.log('WidgetManager.doSubflow');		
			node.subflows.forEach(function (id, subflow) {
				document.getElementById(subflow.diags.path).style.visibility = 'hidden';
			});				
			if (node.activeSubflow) {
				document.getElementById(node.activeSubflow.diags.path).style.visibility = '';				
			}	
		};
	}
		
	exports.WidgetManager = WidgetManager;
});