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
				
		flow.controller = this;
		
		this.start = function () {
			observerCb(this, flow);
		};
		
		// select the child of node with the given id
		this.doSelection = function (node, id) {		
			Utils.assert(flow.isNodePathActive(node), 'Attempt to select on an inactive node');	
			Utils.assert(!flow.activeSubflow, 'Cannot select with a subflow active');				
			Utils.assert(node.type === 'selector', 'Can only select on node of type selector');
			Utils.assert(node.children[id], 'No child with id: ' + id);
			
			node.children.forEach(function (id, child) {
				child.active = false;
			});
			node.children[id].active = true;
			
			observerCb(this, flow);
		};
				
		// use the transition on the node with the given id 
		// NOTE: parameters are specified in the flowgraph
		this.doTransition = function (node, id) {
			Utils.assert(flow.isNodePathActive(node), 'Attempt to transition from an inactive node');
			Utils.assert(!flow.activeSubflow, 'Cannot transition with a subflow active');	
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
			

			observerCb(this, flow);			
		};	
		
		// TODO: MOVE TO DEBUG LAYER
		this.doSubflowPrompt = function () {
			Utils.assert(flow.activeSubflow, 'No active subflow');
			console.log(flow.activeSubflow.id);
			flow.activeSubflow.spec.forEach(function (id, subflowSpec) {
				console.log('* ' + id);
			});
		};
		
		// move on to the next stage of the subflow
		this.doSubflowChoice = function (node, id) {
			Utils.assert(flow.activeSubflow, 'No active subflow');
			Utils.assert(flow.activeSubflow.spec.hasOwnProperty(id), 'No such choice');
			Utils.assert(node === flow.activeSubflow.node, 'Wrong node for current subflow');
			
			var spec = flow.activeSubflow.spec[id];
			if (spec && typeof spec === 'object') {
				flow.activeSubflow = {node: flow.activeSubflow.node, 
										id: id, 
										spec: spec, 
										path: flow.activeSubflow.path + '.' + id};				
			} else {
				var subflow = flow.activeSubflow;
				flow.activeSubflow = null;
				// TODO: should use node controller method
				// null spec means just end the subflow
				if (spec) {
					this.doTransition(subflow.node, spec);					
				}
			}
			if (flow.activeSubflow) {
				this.doSubflowPrompt();
			} else {
				console.log('subflow complete');
			}
			
			observerCb(this, flow);			
		};	
		
		this.doSubflow = function (node, id) {
			Utils.assert(flow.isNodePathActive(node), 'Attempt to execute subflow from an inactive node');	
			Utils.assert(node.subflows && node.subflows[id], 'No such subflow');
			Utils.assert(!flow.activeSubflow, 'Subflow already in progress');
			
			flow.activeSubflow = {node: node, id: id, spec: node.subflows[id].spec, path: node.path + '.' + id};
			this.doSubflowPrompt();
			
			observerCb(this, flow);			
		};
		
		// find an active leaf node
		// then climb up the stack for the first node with 'back'
		function findBackNode() {
			var leaf = flow.root;
			function findActiveChild(node) {
				var activeChild;
				node.children.forEach(function (id, child) {
					if (child.active) {
						activeChild = child;
					}
				});
				return activeChild;
			}
			while (leaf.active && leaf.children) {
				leaf = findActiveChild(leaf);
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
			Utils.assert(!flow.activeSubflow, 'Cannot go back with a subflow active');				
			
			var backNode = findBackNode();
			
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



*/