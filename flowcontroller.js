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

define('flowcontroller', exports, function (exports) {
		
	var Utils = require('./utils.js');	
		
	function FlowController(flow, observerCb) {
		
		function isActive(node) {
			var active = node.active;
			while (active && node.parent) {
				node = node.parent;
				active = node.active;
			}
			return active;
		}
		
		this.start = function (id) {
			flow.root.children[id].active = true;
			observerCb();
		};
		
		// select the child of node with the given id
		this.select = function (node, id) {		
			Utils.assert(isActive(node), 'Attempt to select on an inactive node');	
			Utils.assert(node.type === 'selector', 'Can only select on node of type selector');
			Utils.assert(node.children[id], 'No child with id: ' + id);
			
			node.children.forEach(function (id, child) {
				child.active = false;
			});
			node.children[id].active = true;
			
			observerCb();
		};
				
		// use the transition with the given id 
		this.transition = function (node, id, parameters) {
			Utils.assert(isActive(node), 'Attempt to transition from an inactive node');	
			Utils.assert(id === 'back' || node.transitions[id], 'No transition with id: ' + id);

			var container;
			
			// the back transition is always from the original target
			if (id === 'back') {
				container = node.parent;
			} else {
				container = node.transitions[id].parent;				
			}
			
			if (!container) {
				container = flow.root;
			}
			
			Utils.assert(container.type === 'flow', 'Transition container is not a flow. Why?');
									
			var newActiveChild;			
			if (id === 'back') {
				newActiveChild = container.children[node.back];
				delete node.back;
			} else {
				newActiveChild = node.transitions[id];
				// find the correct back target
				var find = node;
				while (find.parent !== container) {
					find = find.parent;
				}
				newActiveChild.back = find.id;
			}
			
			container.children.forEach(function (id, child) {
				child.active = false;
			});
			
			newActiveChild.active = true;
			

			observerCb();			
		};		
	}	
	
	exports.FlowController = FlowController;	
});


/*

Node controllers will probably just be initialized with approprate ID etc. and get their own 
parameter set. then they'll delegate through the singleton FlowController

FlowController manages the flow graph
It executions selections, transitions, subflows and arbitrary invocations on each node
On transitions the flow controller will construct a hierarchy of NodeControllers corresponding to the
nodes at that state. 
For subflows and invocations the controller will delegate to client provided delegate code (NodeControllerDelegate?)
Flow controller also manages transition state. e.g. during an async operation, the flow controller will 
indicate that there is a transition underway to lock out further operations



*/