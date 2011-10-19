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
		
		flow.controller = this;
		
		this.start = function (id) {
			observerCb(this, flow);
		};
		
		// select the child of node with the given id
		this.doSelection = function (node, id) {		
			Utils.assert(isActive(node), 'Attempt to select on an inactive node');	
			Utils.assert(!flow.activeSubflow, 'Cannot select with a subflow active');				
			Utils.assert(node.type === 'selector', 'Can only select on node of type selector');
			Utils.assert(node.children[id], 'No child with id: ' + id);
			
			node.children.forEach(function (id, child) {
				child.active = false;
			});
			node.children[id].active = true;
			
			observerCb(this, flow);
		};
				
		// use the transition with the given id 
		this.doTransition = function (node, id, parameters) {
			Utils.assert(isActive(node), 'Attempt to transition from an inactive node');
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
		
		this.doSubflowPrompt = function () {
			Utils.assert(flow.activeSubflow, 'No active subflow');
			console.log(flow.activeSubflow.id);
			flow.activeSubflow.spec.forEach(function (id, subflowSpec) {
				console.log('* ' + id);
			});
		};
		
		this.doSubflowChoice = function (node, id) {
			Utils.assert(flow.activeSubflow, 'No active subflow');
			Utils.assert(flow.activeSubflow.spec.hasOwnProperty(id), 'No such choice');
			
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
		
		// callback?
		this.doSubflow = function (node, id) {
			Utils.assert(isActive(node), 'Attempt to execute subflow from an inactive node');	
			Utils.assert(node.subflows && node.subflows[id], 'No such subflow');
			Utils.assert(!flow.activeSubflow, 'Subflow already in progress');
			
			flow.activeSubflow = {node: node, id: id, spec: node.subflows[id].spec, path: node.path + '.' + id};
			this.doSubflowPrompt();
			
			observerCb(this, flow);			
		};
		
		function findBackNode() {
			// find an active leaf node
			// then look for the first node with 'back' set
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
		
		this.canGoBack = function () {
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