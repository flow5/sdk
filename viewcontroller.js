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
	
	function nodeToDOM(node) {
		function makeContainerElement(node) {
			var div = document.createElement('div');
			div.className = 'node';
			div.id = node.path;
			if (!node.active) {
				div.style.visibility = 'hidden';
			}
			return div;
		}
		function makeLeafElement(node) {
			var div = document.createElement('div');
			div.className = 'node';
			div.id = node.path;
			div.innerHTML = node.id;
			if (!node.active) {
				div.style.visibility = 'hidden';
			}
			return div;
		}
		function makeSubflowMethod(subflow) {
			var div = document.createElement('div');
			div.className = 'subflow-widget';
			div.innerHTML = subflow.method;
			return div;

		}
		function makeSubflowElement(node, subflow) {
			var div = document.createElement('div');
			div.className = 'subflow';
			div.id = subflow.path;				
			if (!node.activeSubflow || node.activeSubflow.path !== subflow.path) {
				div.style.visibility = 'hidden';
			}
			div.appendChild(makeSubflowMethod(subflow));
			return div;
		}

		function doSubflowRecursive(container, node, id, subflow) {
			if (subflow && typeof subflow === 'object') {
				container.appendChild(makeSubflowElement(node, subflow));
				subflow.choices.forEach(function (id, child) {
					doSubflowRecursive(container, node, id, child);
				});			
			}
		}

		function generateDivsRecursive(node) {
			var div;
			if (node.children) {
				div = makeContainerElement(node);
				
				// OPTION: to minimize transition time, could
				// only construct the active child for selections as well
				// then construct the new child when doing a selection
				// might cause latency on tab switching though
				if (node.type === 'selector') {
					node.children.forEach(function (id, child) {
						div.appendChild(generateDivsRecursive(child));
					});					
				} else {
					div.appendChild(generateDivsRecursive(node.activeChild));
				}
			} else {
				div = makeLeafElement(node);
			}

			if (node.subflows) {
				node.subflows.forEach(function (id, subflow) {
					doSubflowRecursive(div, node, id, subflow);
				});
			}

			return div;
		}
					
		return generateDivsRecursive(node);
	}
	
	function ViewController(flow, applicationFrame) {
		
		var F5 = require('/f5.js').F5;
		
		this.activateNode = function (node) {
			console.log('ViewController.activateNode');
		};				
		
		this.start = function () {						
			applicationFrame.appendChild(nodeToDOM(flow.root));			
		};
		
		this.doSelection = function (node, id, cb) {
			console.log('ViewController.doSelection');									
			
			var oldEl = document.getElementById(node.activeChild.path);
			var newEl = document.getElementById(node.children[id].path);
			
			F5.Animation.fadeOut(oldEl, newEl, cb);			
		};
		
		this.doTransition = function (container, id, to, cb) {
			console.log('ViewController.doTransition');	
						
			var containerElement = document.getElementById(container.path);
			
			var oldEl = document.getElementById(container.activeChild.path);
			var newEl;
			if (id === 'back') {
				newEl = document.getElementById(to.path);				
			} else {			
				newEl = nodeToDOM(to);
				containerElement.appendChild(newEl);
			}
			
			var method = id === 'back' ? 'pushRight' : 'pushLeft';

			F5.Animation[method](containerElement, oldEl, newEl, function () {
				if (id === 'back') {
					containerElement.removeChild(oldEl);
				}
				
				cb();
			});	
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