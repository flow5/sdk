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
				
		var that = this;
				
		flow.controller = this;
		
		// TODO: move this to debug layer
		function doSubflowPrompt(node) {
			console.log(node.activeSubflow.diags.path);
			node.activeSubflow.choices.forEach(function (id, choice) {
				console.log('* ' + id);
			});
		}		
						
		function activateNode(node, cb) {
			function doOnActiveSubflowsRecursive(node, cb) {
				if (node) {
					if (node.subflows && node.subflows.onactivate) {
						that.doSubflow(node, 'onactivate', function () {
							doOnActiveSubflowsRecursive(node.activeChild, cb);
						});							
					} else {
						doOnActiveSubflowsRecursive(node.activeChild, cb);
					}				
				} else {
					cb();
				}		
			}
						
			node.active = true;
			doOnActiveSubflowsRecursive(node, function () {
//				console.log('activated');
			});
		}
	
		this.start = function (cb) {						
			if (!cb) {
				cb = function () {
					console.log('start complete');
				};
			}
			
			activateNode(flow.root, function () {
				// TODO: this is redundant if there's a final onactive step, right?
				observerCb(this, flow, cb);
			});
		};
		
		// select the child of node with the given id
		this.doSelection = function (node, id, cb) {		
			Utils.assert(flow.diags.isNodePathActive(node), 'Attempt to select on an inactive node');	
			Utils.assert(!flow.diags.isSubflowActive(node), 'Cannot select with a subflow active');				
			Utils.assert(node.type === 'selector', 'Can only select on node of type selector');
			Utils.assert(node.children[id], 'No child with id: ' + id);
			
			if (!cb) {
				cb = function () {
					console.log('selection complete');
				};
			}
			
			// cancel out of any current subflow
			// NOTE: this might be annoying because when selecting away in the middle
			// of a subflow the subflow gets cancelled out
			// the problem is that the subflow might be related to onactivate logic
			// which should run top to bottom
			// e.g., if the active subflow is the onactivate subflow that checks for logged in
			// then tab away, login from another tab and then come back, the onactivate subflow
			// needs to run again
			// TODO: this has an effect at the widget layer
			function cancelSubflowRecursive(node) {
				node.activeSubflow = null;
				if (node.children) {
					node.children.forEach(function (id, child) {
						cancelSubflowRecursive(child);
					});					
				}
			}
			cancelSubflowRecursive(node.activeChild);
			
			node.children.forEach(function (id, child) {
				child.active = false;
			});
			node.activeChild = node.children[id];
			
			activateNode(node.activeChild, function () {
				// TODO: does this delay the selection?
				// I don't think so.
			});
			
			observerCb(this, flow, cb);
		};
				
		// use the transition on the node with the given id 
		// NOTE: parameters are specified in the flowgraph
		this.doTransition = function (node, id, cb) {
			Utils.assert(flow.diags.isNodePathActive(node), 'Attempt to transition from an inactive node');
			Utils.assert(!flow.diags.isSubflowActive(node), 'Cannot transition with a subflow active');	
			Utils.assert(id === 'back' || node.transitions, 'No transitions defined for node: ' + node.diags.path);
			Utils.assert(id === 'back' || node.transitions[id], 'No transition with id: ' + id);
			
			if (!cb) {
				cb = function () {
					console.log('transition complete');
				};
			}

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
									
			container.children.forEach(function (id, child) {
				child.active = false;
			});									
			if (id === 'back') {
				container.activeChild = node.back;
				delete node.back;
			} else {
				container.activeChild = node.transitions[id];
				// find the correct back target
				var back = node;
				while (back.parent !== container) {
					back = back.parent;
				}
				container.activeChild.back = back;
			}			
			activateNode(container.activeChild, function () {
				// TODO: does this delay the selection?
				// I don't think so
			});			

			observerCb(this, flow, cb);			
		};	
		
		this.doSubflowChoice = function (node, id) {	
			Utils.assert(node.activeSubflow, 'No active subflow');
			console.log('choose: ' + id);
			node.activeSubflow.cb(node, id);						
		};	
		
		// calls back when the subflow is complete
		this.doSubflow = function (node, id, cb) {
			Utils.assert(flow.diags.isNodePathActive(node), 'Attempt to execute subflow from an inactive node');	
			Utils.assert(node.subflows && node.subflows[id], 'No such subflow');
			Utils.assert(!flow.diags.isSubflowActive(node), 'Subflow already in progress');
			
			node.activeSubflow = {node: node, id: id, choices: node.subflows[id], diags: {path: node.diags.path + '.' + id}};
			
			function doSubflowChoice(node, id) {												
				Utils.assert(node.activeSubflow.choices.hasOwnProperty(id), 'No such choice');			
				
				delete node.activeSubflow.cb;
								
				var choice = node.activeSubflow.choices[id];
				if (choice && typeof choice === 'object') {
					node.activeSubflow = {choices: choice, diags: {path: node.activeSubflow.diags.path + '.' + id}};
												
				} else {
					node.activeSubflow = null;
					// TODO: should use node controller method
					// null spec means just end the subflow
					// TODO: could always delegate up to the controller
					// rather than hard code the semantics, but then there's
					// redundant code since often it's just a transition
					if (choice) {
						that.doTransition(node, choice);					
					}
				}
																			
				observerCb(that, flow, function () {
					if (node.activeSubflow) {
						node.activeSubflow.cb = doSubflowChoice;
						doSubflowPrompt(node);
					} else {
						console.log('subflow complete');

						// TODO: I think this will be required
						if (cb) {
							cb();
						}
					}
				});									
			}
			
			node.activeSubflow.cb = doSubflowChoice;
			doSubflowPrompt(node);								

			observerCb(that, flow, function () {
				console.log('subflow started');
			});	
		};
		
		// find an active leaf node
		// then climb up the stack for the first node with 'back'
		function findBackNode() {
			var leaf = flow.root;
			while (leaf.activeChild) {
				leaf = leaf.activeChild;
			}

			while (!leaf.back && leaf.parent) {
				leaf = leaf.parent;
			}
			
			if (leaf.back) {
				return leaf;
			} else {
				return null;
			}
		}
		
		this.hasBack = function () {
			return findBackNode();
		};
		
		this.doBack = function () {			
			var backNode = findBackNode();
			
			Utils.assert(!flow.diags.isSubflowActive(backNode), 'Cannot go back with a subflow active');							
			
			Utils.assert(backNode, 'Cannot go back');

			this.doTransition(backNode, 'back');
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

subflow rules:
	can select away from a node that contains an active subflow
	can't select or transition away from a node that has an ancestor with an active subflow
	


*/