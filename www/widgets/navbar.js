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

F5.WidgetPrototypes.NavBarBase = {
	updateConfiguration: function (node) {		
		// find the leaf node
		while (node.selection) {
			node = node.selection;
		}
					
		var defaultTitle = node.id;
		var configuration = {node: node};
		while (node && (!configuration.left || !configuration.right)) {
			var nodeConfiguration = node.view.getNavConfig();
			if (nodeConfiguration) {
				if (!configuration.title && nodeConfiguration.title) {
					configuration.title = nodeConfiguration.title;
				}
				if (!configuration.left && nodeConfiguration.left) {
					configuration.left = nodeConfiguration.left;
					configuration.left.node = node;
				}
				if (!configuration.right && nodeConfiguration.right) {
					configuration.right = nodeConfiguration.right;
					configuration.right.node = node;
				}	
				if (nodeConfiguration.hide) {
					configuration.hide = nodeConfiguration.hide;									
				}
			}
			
			node = node.parent;
		}
		if (!configuration.title) {
			configuration.title = defaultTitle;
		}
		
		var that = this;
		
		if (configuration.left) {
			configuration.left.action = function () {
				var transition = that.configuration.left.transition;
				var node = that.configuration.left.node;
				F5.Global.flowController.doTransition(node, transition, node.data);				
			};
		}
		
		if (configuration.right) {
			configuration.right.action = function () {
				var transition = that.configuration.right.transition;
				var node = that.configuration.right.node;
				F5.Global.flowController.doTransition(node, transition, node.data);				
			};			
		}
		
		this.configuration = configuration;
	}
};