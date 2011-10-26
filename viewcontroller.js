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
/*global define F5*/


define('viewcontroller', exports, function (exports) {
		
	function ViewController(flow, applicationFrame) {
		
		function nodeToDOM(node) {

			function makeFlowElement(node) {
				var div = document.createElement('div');
				div.className = 'node';
				div.id = node.path;
				if (!node.active) {
					div.style.visibility = 'hidden';
				}												
				return div;
			}
			function makeSubflowElement(node, subflow) {
				var div = document.createElement('div');
				div.className = 'subflow';
				div.id = subflow.path;				
				if (!subflow.active) {
					div.style.visibility = 'hidden';
				}
				div.innerHTML = subflow.method;
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
				var div  = makeFlowElement(node);

				if (node.children) {
					// OPTION: to minimize transition time, could
					// only construct the active child for selections as well
					// then construct the new child when doing a selection
					// might cause latency on tab switching though
					if (node.type === 'selector') {
						// TODO: addClass
						div.className += ' selector';
						var container = document.createElement('div');
						container.className = 'container';
						div.appendChild(container);	
						
						node.children.forEach(function (id, child) {
							container.appendChild(generateDivsRecursive(child));
						});					
					} else {
						div.appendChild(generateDivsRecursive(node.activeChild));
					}
				} 
								
				// TODO: look for delegates
				node.view = new F5.Views.Defaults[node.type](div, node);				

				if (node.subflows) {
					node.subflows.forEach(function (id, subflow) {
						doSubflowRecursive(div, node, id, subflow);
					});
				}
				

				return div;
			}

			return generateDivsRecursive(node);
		}		
		
		this.activateNode = function (node) {
			console.log('ViewController.activateNode');
			// TODO: call viewDidBecomeActive recursively
		};				
		
		this.start = function () {						
			applicationFrame.appendChild(nodeToDOM(flow.root));			
		};
		
		this.doSelection = function (node, id, cb) {
			console.log('ViewController.doSelection');									
			
			var oldEl = document.getElementById(node.activeChild.path);
			var newEl = document.getElementById(node.children[id].path);
			
			// TODO: call viewWillBecomeInactive, viewWillBecomeActive
			
			// TODO: get animation name from mapping
			
			F5.Animation.fadeOut(oldEl, newEl, function () {
				
				// TODO: call viewDidBecomeInactive
				cb();
			});			
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
			
			// TODO: get animation name from mapping
			var method = id === 'back' ? 'pushRight' : 'pushLeft';
			
			// TODO: call viewWillBecomeInactive, viewWillBecomeActive			

			F5.Animation[method](containerElement, oldEl, newEl, function () {
				// TODO: call viewDidBecomeInactive
				
				if (id === 'back') {
					// TODO: call viewRelease?
					containerElement.removeChild(oldEl);
				}
				
				cb();
			});	
		};		

		this.startSubflow = function (subflow) {
			var subflowElement = document.getElementById(subflow.path);
			subflowElement.style.visibility = '';
			subflowElement.style.opacity = 1;
		};

		this.completeSubflow = function (subflow) {
			var subflowElement = document.getElementById(subflow.path);
			subflowElement.style.opacity = 0;
			
			function fadeComplete() {
				subflowElement.style.visibility = 'hidden';
				subflowElement.removeEventListener('webkitAnimationEnd', fadeComplete);
			}
			subflowElement.addEventListener('webkitAnimationEnd', fadeComplete);
		};
				
		this.doSubflowChoice = function (subflow, choice) {
			var oldSubflowELement = document.getElementById(subflow.path);
			oldSubflowELement.style.opacity = 0;
			function fadeComplete() {
				oldSubflowELement.style.visibility = 'hidden';
				oldSubflowELement.removeEventListener('webkitAnimationEnd', fadeComplete);
			}
			oldSubflowELement.addEventListener('webkitAnimationEnd', fadeComplete);
						
			var newSubflowSlement = document.getElementById(subflow.choices[choice].path);
			newSubflowSlement.style.visibility = '';			
			newSubflowSlement.style.opacity = 1;
		};
	}
		
	exports.ViewController = ViewController;
});