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

F5.Prototypes.Widgets.NavController = {
	updateConfiguration: function (node) {		
		// find the leaf node
		while (node.selection) {
			node = node.selection;
		}
		
		function defined(value) {
			return value !== undefined;
		}
					
		var defaultTitle = node.id;
		var config = {node: node};
		while (node && (!defined(config.left) || !defined(config.right) || !defined(config.title))) {
			var nodeConfiguration = node.view.getNavConfig();
			if (nodeConfiguration) {
				if (!defined(config.title) && defined(nodeConfiguration.title)) {
					config.title = nodeConfiguration.title;
				}
				if (!defined(config.left) && defined(nodeConfiguration.left)) {
					config.left = nodeConfiguration.left;
					if (config.left) {
						config.left.node = node;						
					}
				}
				if (!defined(config.right) && defined(nodeConfiguration.right)) {
					config.right = nodeConfiguration.right;
					if (config.right) {
						config.right.node = node;						
					}
				}	
				if (nodeConfiguration.hide) {
					config.hide = nodeConfiguration.hide;									
				}
			}
			
			node = node.parent;
		}
		if (!defined(config.title)) {
			config.title = defaultTitle;
		}
		
		var that = this;
		
		if (config.left && !config.left.action) {
			F5.assert(config.left.transition, 'Nav config must specify transition or action');
			config.left.action = function () {
				var transition = that.config.left.transition;
				var node = that.config.left.node;
				F5.Global.flowController.doTransition(node, transition, node.data);				
			};
		}
		
		if (config.right && !config.right.action) {
			F5.assert(config.right.transition, 'Nav config must specify transition or action');
			config.right.action = function () {
				var transition = that.config.right.transition;
				var node = that.config.right.node;
				F5.Global.flowController.doTransition(node, transition, node.data);				
			};			
		}
		
		this.configuration = config;
	}
};