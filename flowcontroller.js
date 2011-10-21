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
			console.log(node.activeSubflow.id);
			node.activeSubflow.spec.forEach(function (id, subflowSpec) {
				console.log('* ' + id);
			});
		}		
				
		function activateNode(node, cb) {
			function doOnActiveSubflowsRecursive(node, cb) {
				if (node) {
					if (node.subflows && node.subflows.onactivate) {
						if (!flow.isSubflowActive(node)) {
							that.doSubflow(node, 'onactivate', function () {
								doOnActiveSubflowsRecursive(node.activeChild, cb);
							});							
						}
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
	
		// cb?
		this.start = function () {						
			activateNode(flow.root, function () {
				observerCb(this, flow);
			});
		};
		
		// select the child of node with the given id
		this.doSelection = function (node, id) {		
			Utils.assert(flow.isNodePathActive(node), 'Attempt to select on an inactive node');	
			Utils.assert(!flow.isSubflowActive(node), 'Cannot select with a subflow active');				
			Utils.assert(node.type === 'selector', 'Can only select on node of type selector');
			Utils.assert(node.children[id], 'No child with id: ' + id);
			
			node.children.forEach(function (id, child) {
				child.active = false;
			});
			node.activeChild = node.children[id];
			
			activateNode(node.activeChild, function () {
				// TODO: does this delay the selection?
				// I don't think so.
			});
			
			observerCb(this, flow);
		};
				
		// use the transition on the node with the given id 
		// NOTE: parameters are specified in the flowgraph
		this.doTransition = function (node, id) {
			Utils.assert(flow.isNodePathActive(node), 'Attempt to transition from an inactive node');
			Utils.assert(!flow.isSubflowActive(node), 'Cannot transition with a subflow active');	
			Utils.assert(id === 'back' || node.transitions, 'No transitions defined for node: ' + node.path);
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

			observerCb(this, flow);			
		};	
		
		this.doSubflowChoice = function (node, id) {	
			Utils.assert(node.activeSubflow, 'No active subflow');
			node.activeSubflow.cb(node, id);						
		};	
		
		this.doSubflow = function (node, id, cb) {
			Utils.assert(flow.isNodePathActive(node), 'Attempt to execute subflow from an inactive node');	
			Utils.assert(node.subflows && node.subflows[id], 'No such subflow');
			Utils.assert(!flow.isSubflowActive(node), 'Subflow already in progress');
			
			node.activeSubflow = {node: node, id: id, spec: node.subflows[id].spec, path: node.path + '.' + id};
			
			function doSubflowChoice(node, id) {												
				Utils.assert(node.activeSubflow.spec.hasOwnProperty(id), 'No such choice');			
				
				delete node.activeSubflow.cb;
								
				var spec = node.activeSubflow.spec[id];
				if (spec && typeof spec === 'object') {
					node.activeSubflow = {id: id, 
										  spec: spec, 
										  path: node.activeSubflow.path + '.' + id};
												
				} else {
					node.activeSubflow = null;
					// TODO: should use node controller method
					// null spec means just end the subflow
					// TODO: could always delegate up to the controller
					// rather than hard code the semantics, but then there's
					// redundant code since often it's just a transition
					if (spec) {
						that.doTransition(node, spec);					
					}
				}
															
				if (node.activeSubflow) {
					node.activeSubflow.cb = doSubflowChoice;
					doSubflowPrompt(node);
				} else {
					console.log('subflow complete');
					
					observerCb(that, flow);	
					
					// TODO: I think this will be required
					if (cb) {
						cb();
					}
				}					
			}
			
			node.activeSubflow.cb = doSubflowChoice;
			doSubflowPrompt(node);								

			observerCb(that, flow);	
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
			
			Utils.assert(!flow.isSubflowActive(backNode), 'Cannot go back with a subflow active');							
			
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