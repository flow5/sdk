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

define('viewcontroller', exports, function (exports) {
	
	function ViewController(flow, rootEl) {
		
		this.activateNode = function (node) {
			
		};
		
		this.start = function () {
			
			function toHtml() {
				var result = '';
				function beginNode(node) {
					result += '<div class="node" ';
					result += ' id="' + node.path + '"';
					if (!node.active) {
						result += 'style="visibility:hidden"';
					}
					result += '>';
				}
				function endNode() {
					result += '</div>';
				}
				function insertNodeWidget(node) {
					result += '<div class="node-widget">' +  node.id + '</div>';
				}
				function insertSubflowWidget(subflow) {
					result += '<div class="subflow-widget">' +  subflow.method + '</div>';

				}
				function doSubflowRecursive(node, id, subflow) {
					if (subflow && typeof subflow === 'object') {
						result += '<div class="subflow" ';
						result += ' id="' + subflow.path + '"';
						if (!node.activeSubflow || node.activeSubflow.path !== subflow.path) {
							result += 'style="visibility:hidden"';
						}
						result += '>';
						insertSubflowWidget(subflow);
						result += '</div>';					
						subflow.choices.forEach(function (id, child) {
							doSubflowRecursive(node, id, child);
						});			
					}
				}

				function generateDivsRecursive(node) {
					beginNode(node);

					if (node.children) {
						node.children.forEach(function (id, child) {
							generateDivsRecursive(child);							
						});
					} else {
						insertNodeWidget(node);									
					}

					if (node.subflows) {
						node.subflows.forEach(function (id, subflow) {
							doSubflowRecursive(node, id, subflow);
						});

					}

					endNode();
				}

				generateDivsRecursive(flow.root);

				return result;
			}
			
			rootEl.innerHTML = toHtml();
			
		};
		
		this.doSelection = function (node, id, cb) {
			console.log('ViewController.doSelection');									
			
			var containerElement = document.getElementById(node.path);
			containerElement.childNodes.forEach(function (el) {
				el.style.visibility = 'hidden';
			});
			var activeElement = document.getElementById(node.activeChild.path);
			activeElement.style.visibility = '';
						
			cb();
		};
		
		this.doTransition = function (fromNode, toNode, cb) {
			console.log('ViewController.doTransition');	
			
			var toElement = document.getElementById(toNode.path);			
			var containerElement = document.getElementById(toNode.parent.path);
			
			containerElement.childNodes.forEach(function (el) {
				el.style.visibility = 'hidden';
			});			
			toElement.style.visibility = '';			
											
			cb();
		};
		

		this.startSubflow = function (subflow) {
			document.getElementById(subflow.path).style.visibility = '';
		};

		this.completeSubflow = function (subflow) {
			document.getElementById(subflow.path).style.visibility = 'hidden';
		};
				
		this.doSubflowChoice = function (subflow, choice) {
			console.log('ViewController.doSubflow');		
			document.getElementById(subflow.path).style.visibility = 'hidden';			
			document.getElementById(subflow.choices[choice].path).style.visibility = '';			
		};
	}
		
	exports.ViewController = ViewController;
});