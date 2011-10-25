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
					
	function FlowController(flow, observerCb) {

		var F5 = require('./f5.js').F5;	
				
		var that = this;
				
		flow.controller = this;
		
		function activateNode(node, cb) {
			function doOnActiveSubflowsRecursive(node, cb) {
				if (node) {
					// an onactivate subflow may terminate with a transition or selection
					// in which case a new onactivate chain will start for the new active node
					// and this one is abandoned
					// TODO: might be nice to make this more explicit because this looks like
					// it shouldn't ever happen
					if (node.active && !node.activeSubflow) {
						if (node.subflows && node.subflows.onactivate) {
							that.doSubflow(node, 'onactivate', function () {
								doOnActiveSubflowsRecursive(node.activeChild, cb);
							});							
						} else {
							doOnActiveSubflowsRecursive(node.activeChild, cb);
						}	
					}
				} else {
					cb();
				}		
			}
						
			node.active = true;
			if (that.viewController) {
				that.viewController.activateNode(node);
			}
			doOnActiveSubflowsRecursive(node, function () {
				cb();
			});
		}									
		
		// TODO: move this to debug layer
		function doSubflowPrompt(node) {
			node.activeSubflow.choices.forEach(function (id, choice) {
				console.log('* ' + id);
			});
		}	
			
		// TODO: cb doesn't execute until onactivate subflows complete
		// that doesn't seem right
		this.start = function (cb, viewController) {						
			if (!cb) {
				cb = function () {
					console.log('start complete');
				};
			}
			
			this.viewController = viewController;
			
			if (this.viewController) {
				this.viewController.start();
			}
			
			activateNode(flow.root, function () {
				// TODO: this is redundant if there's a final onactive step, right?
				observerCb();

				cb();
			});

		};
		
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
			if (that.viewController && node.activeSubflow) {
				that.viewController.completeSubflow(node.activeSubflow);					
			}
			delete node.activeSubflow;
			if (node.children) {
				node.children.forEach(function (id, child) {
					cancelSubflowRecursive(child);
				});					
			}
		}		
		
		// select the child of node with the given id
		this.doSelection = function (node, id, cb) {		
			F5.assert(flow.diags.isNodePathActive(node), 'Attempt to select on an inactive node');	
			F5.assert(!flow.diags.isSubflowActive(node), 'Cannot select with a subflow active');				
			F5.assert(node.type === 'selector', 'Can only select on node of type selector');
			F5.assert(node.children[id], 'No child with id: ' + id);				
			
			function completeSelection() {				
				node.activeChild.active = false;
				node.activeChild = node.children[id];
							
				activateNode(node.activeChild, function () {
					// TODO: does this delay the selection?
					// I don't think so.
				});

				observerCb();	
			
				cb();			
			}					

			if (node.activeChild !== node.children[id]) {
						
				if (!cb) {
					cb = function () {
						console.log('selection complete');
					};
				}						
				cancelSubflowRecursive(node.activeChild);
									
				if (this.viewController) {
					this.viewController.doSelection(node, id, completeSelection);
				} else {
					completeSelection();
				}							
			} else {
				cb();
			}
		};
				
		// use the transition on the node with the given id 
		// NOTE: parameters are specified in the flowgraph
		this.doTransition = function (node, id, cb) {
			F5.assert(flow.diags.isNodePathActive(node), 'Attempt to transition from an inactive node');
			F5.assert(!flow.diags.isSubflowActive(node), 'Cannot transition with a subflow active');	
			F5.assert(id === 'back' || node.transitions, 'No transitions defined for node: ' + node.path);
			F5.assert(id === 'back' || node.transitions[id], 'No transition with id: ' + id);
			
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
			
			F5.assert(container.type === 'flow', 'Transition container is not a flow');
												
			function complete() {
				container.activeChild.active = false;								
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
					// TODO: maybe allow passing null here. otherwise pretty confusing
				});		
					
				observerCb();					
				
				cb();
			}
			
			cancelSubflowRecursive(node);			
			
			if (this.viewController) {
				if (id === 'back') {
					this.viewController.doTransition(container, 'back', node.back, complete);					
				} else {
					this.viewController.doTransition(container, id, node.transitions[id], complete);										
				}
			} else {
				complete();
			}			
					
		};	
				
		this.doSubflowChoice = function (node, id) {	
			F5.assert(node.activeSubflow, 'No active subflow');

			console.log('choose: ' + id);
			F5.assert(node.activeSubflow.choices.hasOwnProperty(id), 'No such choice');			

			var subflow = node.activeSubflow.choices[id];
			var completionCb = node.activeSubflow.completionCb;

			var oldActiveSubflow = node.activeSubflow;
			
			function completeChoice() {
				observerCb();

				if (node.activeSubflow) {
					if (that.viewController) {
						that.viewController.doSubflowChoice(oldActiveSubflow, id);
					} else {
						doSubflowPrompt(node);												
					}
				} else {
					if (that.viewController) {
						that.viewController.completeSubflow(oldActiveSubflow);
					}
					if (completionCb) {
						completionCb();
					}
				}
			}

			if (subflow && typeof subflow === 'object') {
				node.activeSubflow = subflow;
				node.activeSubflow.completionCb = oldActiveSubflow.completionCb;
				completeChoice();
			} else {
				delete node.activeSubflow.completionCb;
				delete node.activeSubflow;					
				completeChoice();
				if (subflow) {
					if (node.type === 'flow') {
						that.doTransition(node, subflow, function () {
							
						});																			
					} else {
						that.doSelection(node, subflow, function () {
							
						});
					}
				}
			}		
		};				
		
		this.doSubflow = function (node, id, cb) {
			F5.assert(flow.diags.isNodePathActive(node), 'Attempt to execute subflow from an inactive node');	
			F5.assert(node.subflows && node.subflows[id], 'No such subflow');
			F5.assert(!flow.diags.isSubflowActive(node), 'Subflow already in progress');						
			
			node.activeSubflow = node.subflows[id];
			node.activeSubflow.completionCb = cb;
				
			if (this.viewController) {
				this.viewController.startSubflow(node.activeSubflow);
			} else {
				doSubflowPrompt(node);												
			}

			console.log(node.path + '.' + id + ' started');

			observerCb();					
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
			F5.assert(backNode, 'Cannot go back');
			
			F5.assert(!flow.diags.isSubflowActive(backNode), 'Cannot go back with a subflow active');							
			

			this.doTransition(backNode, 'back');
		};
	}	
	
	exports.FlowController = FlowController;	
});