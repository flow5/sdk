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
	
	function ViewController(flow, applicationFrame) {
		
		var F5 = require('/f5.js').F5;
		
		this.activateNode = function (node) {
			console.log('ViewController.activateNode');
		};
		
		function toDOM(node) {
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

			generateDivsRecursive(node);
			
			var div = document.createElement('div');
			div.innerHTML = result;
			return div;
		}
		
		// generate all of the active elements
		// OPTION: generate all children of a selector to reduce inital tab switch latency
		this.start = function () {						
			applicationFrame.appendChild(toDOM(flow.root));			
		};
		
		this.doSelection = function (node, id, cb) {
			console.log('ViewController.doSelection');									
			
			var oldEl = document.getElementById(node.activeChild.path);
			var newEl = document.getElementById(node.children[id].path);
			
			F5.Animation.fadeOut(oldEl, newEl, cb);			
		};
		
		this.doTransition = function (container, to, cb) {
			console.log('ViewController.doTransition');	
			
			document.getElementById(container.activeChild.path).style.visibility = 'hidden';
			document.getElementById(to.path).style.visibility = '';			
											
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