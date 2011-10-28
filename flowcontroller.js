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

define('flowcontroller', exports, function (exports) {
					
	function FlowController(flow, observerCb) {

		var that = this;
				
		flow.controller = this;
		
		// TODO: fix the case where the recursive flow terminates in a selection or transition
		// before a leaf node is reached
		function doLifecycleSubflowRecursive(name, node, cb) {
			if (node) {
				console.log('doLifecycleSubflowRecursive: ' + node.path);
				if (node.subflows && node.subflows[name]) {
					that.doSubflow(node, name, function () {
						doLifecycleSubflowRecursive(name, node.selection, cb);
					});							
				} else {
					doLifecycleSubflowRecursive(name, node.selection, cb);
				}	
			} else {
				cb();
			}		
		}		
		
		function nodeDidBecomeActive(node, cb) {								
			node.active = true;
			if (F5.Global.viewController) {
				F5.Global.viewController.nodeDidBecomeActive(node);
			}
			doLifecycleSubflowRecursive('didBecomeActive', node, function () {
				cb();
			});
		}									

		function nodeWillBecomeActive(node, cb) {								
			if (F5.Global.viewController) {
				F5.Global.viewController.nodeWillBecomeActive(node);
			}
			doLifecycleSubflowRecursive('willBecomeActive', node, function () {
				cb();
			});
		}									
		
		// TODO: move this to debug layer
		function doSubflowPrompt(node) {
			node.activeSubflow.choices.forEach(function (id, choice) {
				console.log('* ' + id);
			});
		}	
			
		// TODO: cb doesn't execute until didBecomeActive subflows complete
		// that doesn't seem right
		this.start = function (cb) {						
			if (!cb) {
				cb = function () {
					console.log('start complete');
				};
			}
			
			if (F5.Global.viewController) {
				F5.Global.viewController.start();
			}
			nodeWillBecomeActive(flow.root, function () {
				// TODO: this is redundant if there's a final onactive step, right?
				observerCb();

				nodeDidBecomeActive(flow.root, function () {
					// TODO: this is redundant if there's a final onactive step, right?
					observerCb();

					cb();
				});
			});									
		};
		
		// cancel out of any current subflow
		// NOTE: this might be annoying because when selecting away in the middle
		// of a subflow the subflow gets cancelled out
		// the problem is that the subflow might be related to didBecomeActive logic
		// which should run top to bottom
		// e.g., if the active subflow is the didBecomeActive subflow that checks for logged in
		// then tab away, login from another tab and then come back, the didBecomeActive subflow
		// needs to run again
		// TODO: this has an effect at the widget layer
		function cancelSubflowRecursive(node) {
			if (F5.Global.viewController && node.activeSubflow) {
				F5.Global.viewController.completeSubflow(node.activeSubflow);					
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
			F5.assert(node.type === 'switcher', 'Can only select on node of type switcher');
			F5.assert(node.children[id], 'No child with id: ' + id);				
			
			function completeSelection() {				
				node.selection.active = false;
				node.selection = node.children[id];
							
				nodeDidBecomeActive(node.selection, function () {
					// TODO: does this delay the selection?
					// I don't think so.
				});

				observerCb();	
			
				cb();			
			}					

			if (node.selection !== node.children[id]) {
						
				if (!cb) {
					cb = function () {
						console.log('selection complete');
					};
				}						
				cancelSubflowRecursive(node);
				
				nodeWillBecomeActive(node.children[id], function () {
					if (F5.Global.viewController) {
						F5.Global.viewController.doSelection(node, id, completeSelection);
					} else {
						completeSelection();
					}												
				});				
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
			
			// find the transition target
			// for a back transition, climb the hierarchy to find the node which 
			// was the transition target. this means that back can be executed from any level
			// of nesting
			// TODO: this is asymmetrical with forward transitions where currently the transition
			// has to be defined on the node itself. should forward transitions also be allowed to
			// climb scope as well? Haven't found a case where it's needed yet. . .
			var backNode;
			if (id === 'back') {
				backNode = node;		
				while (!backNode.back) {
					backNode = backNode.parent;
				}		
				container = backNode.parent;
			} else {
				container = node.transitions[id].parent;											
			}
						
			F5.assert(container.type === 'flow' || container.type === 'set', 
				'Transition container is not a flow or set');
				
			// a set doesn't have any notion of a nav stack
			// transitions can be from any node to any node
			// the widget layer can still attach the back button to a transition
			if (container.type === 'flow' && id !== 'back') {
				// find the correct back target
				var back = node;
				while (back.parent !== container) {
					back = back.parent;
				}
				node.transitions[id].back = back;				
			}
												
			function complete() {
				container.selection.active = false;								
				if (id === 'back') {
					container.selection = backNode.back;
					delete node.back;
				} else {
					container.selection = node.transitions[id];
				}			
				
				nodeDidBecomeActive(container.selection, function () {
					// TODO: does this delay the selection?
					// I don't think so
					// TODO: maybe allow passing null here. otherwise pretty confusing
				});		
					
				observerCb();					
				
				cb();
			}
			
			cancelSubflowRecursive(node);			
			
			var target = id === 'back' ? backNode.back : node.transitions[id];
			nodeWillBecomeActive(target, function () {			
				if (F5.Global.viewController) {
					F5.Global.viewController.doTransition(container, id, target, complete);										
				} else {
					complete();
				}			
			});		
		};	
				
		this.doSubflowChoice = function (node, id) {	
			F5.assert(node.activeSubflow, 'No active subflow');

			console.log('choose: ' + id);
			F5.assert(node.activeSubflow.choices.hasOwnProperty(id), 'No such choice');			

			var newSubflow = node.activeSubflow.choices[id];
			var oldSubflow = node.activeSubflow;
			var completionCb = oldSubflow.completionCb;
			
			delete oldSubflow.completionCb;
			oldSubflow.active = false;
			
			function completeChoice() {
				observerCb();

				if (node.activeSubflow) {
					if (F5.Global.viewController) {
						F5.Global.viewController.doSubflowChoice(oldSubflow, id);
					} else {
						doSubflowPrompt(node);												
					}
				} else {
					if (F5.Global.viewController) {
						F5.Global.viewController.completeSubflow(oldSubflow);
					}
					if (completionCb) {
						completionCb();
					}
				}
			}

			if (newSubflow && newSubflow.type === 'subflow') {
				newSubflow.completionCb = completionCb;
				newSubflow.active = true;
				node.activeSubflow = newSubflow;
				completeChoice();
			} else {
				delete node.activeSubflow;					
				
				if (newSubflow) {
					if (node.type === 'flow') {
						completeChoice();							
						that.doTransition(node, newSubflow, function () {

						});																			
					} else if (node.type === 'switcher') {
						completeChoice();							
						that.doSelection(node, newSubflow, function () {
						});
					} else if (node.type === 'set') {
						node.selection = node.children[newSubflow];
						node.children.forEach(function (id, child) {
							child.active = false;
						});
						node.selection.active = true;
						if (F5.Global.viewController) {
							F5.Global.viewController.syncSet(node);
						}
						completeChoice();						
					}					
				} else {
					completeChoice();					
				}
			}		
		};	
		
		// find an active leaf node
		// then climb up the stack for the first node with 'back'		
		this.getBackNode = function () {
			var leaf = flow.root;
			while (leaf.selection) {
				leaf = leaf.selection;
			}

			while (!leaf.back && leaf.parent) {
				leaf = leaf.parent;
			}
			
			if (leaf.back) {
				return leaf;
			} else {
				return null;
			}
		};			
		
		this.doSubflow = function (node, id, cb) {
			F5.assert(id === 'willBecomeActive' || flow.diags.isNodePathActive(node), 
				'Attempt to execute subflow from an inactive node');	
			F5.assert(node.subflows && node.subflows[id], 'No such subflow');
			F5.assert(!flow.diags.isSubflowActive(node), 'Subflow already in progress');						
			
			var subflow = node.subflows[id];
			subflow.completionCb = cb;
			subflow.active = true;
			node.activeSubflow = subflow;
				
			if (F5.Global.viewController) {
				F5.Global.viewController.startSubflow(node.activeSubflow);
			} else {
				doSubflowPrompt(node);												
			}

			console.log(node.path + '.' + id + ' started');

			observerCb();					
		};
				
		this.hasBack = function () {
			return this.getBackNode() !== null;
		};
		
		this.doBack = function () {			
			var backNode = this.getBackNode();
			F5.assert(backNode, 'Cannot go back');
			
			F5.assert(!flow.diags.isSubflowActive(backNode), 'Cannot go back with a subflow active');							
			

			this.doTransition(backNode, 'back');
		};
	}	
	
	exports.FlowController = FlowController;	
});