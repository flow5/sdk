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
/*global F5*/

(function () {
						
	function FlowController(flow) {

		var that = this;
		
		that.observer = function () {};
		
		that.setObserver = function (observer) {
			that.observer = observer;
		};
				
		flow.controller = this;
		
		var lockout = false;
		
		// TODO: fix the case where the recursive flow terminates in a selection or transition
		// before a leaf node is reached
		function doLifecycleSubflowRecursive(name, node, cb) {
			if (node) {
//				console.log('doLifecycleSubflowRecursive: ' + node.path);
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

		function nodeDidBecomeInactive(node, cb) {								
			node.active = false;
			if (F5.Global.viewController) {
				F5.Global.viewController.nodeDidBecomeInactive(node);
			}
			doLifecycleSubflowRecursive('didBecomeInactive', node, function () {
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

		function nodeWillBecomeInactive(node, cb) {								
			if (F5.Global.viewController) {
				F5.Global.viewController.nodeWillBecomeInactive(node);
			}
			doLifecycleSubflowRecursive('willBecomeInactive', node, function () {
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
		that.start = function (cb) {						
			if (!cb) {
				cb = function () {
					console.log('start complete');
				};
			}
			
			if (F5.Global.viewController) {
				F5.Global.viewController.start();
			}
			// TODO: this is redundant if there's a final onactive step, right?
			cb();

			nodeWillBecomeActive(flow.root, function () {
				that.observer();			
				nodeDidBecomeActive(flow.root, function () {
					that.observer();			
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
			if (F5.Global.viewController && node.activeSubflow && node.activeSubflow.userInput) {
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
		that.doSelection = function (node, id, cb) {	
			F5.assert(!lockout, 'Locked out');				
			F5.assert(node.type === 'switcher' || node.type === 'set', 
				'Can only doSelection on node of types switcher or set');
			F5.assert(node.children[id], 'No child with id: ' + id);
			
			// nothing to do
			if (id === node.selection.id) {
				cb();
			}			
			
			lockout = true;
			
			var oldSelection = node.selection;				
			
			function completeSelection() {				
				node.selection.active = false;
				node.selection = node.children[id];
				
				// TODO: should thse delay the callback?

				nodeDidBecomeInactive(oldSelection, function () {
					
				});
							
				nodeDidBecomeActive(node.selection, function () {

				});

				lockout = false;	

				that.observer();
							
				cb();			
			}					

			if (node.selection !== node.children[id]) {						
				if (!cb) {
					cb = function () {
//						console.log('selection complete');
					};
				}						
				cancelSubflowRecursive(node);
				
				nodeWillBecomeInactive(oldSelection, function () {
					nodeWillBecomeActive(node.children[id], function () {
						if (F5.Global.viewController) {
							F5.Global.viewController.doSelection(node, id, completeSelection);
						} else {
							completeSelection();
						}												
					});									
				});
			} else {
				cb();
			}
		};
				
		// use the transition on the node with the given id 
		that.doTransition = function (node, id, cb) {
			F5.assert(!lockout, 'Locked out');
			F5.assert(node.type === 'flow' || node.type === 'set', 
				'Can only doTransition on node of types flow or set');			
			F5.assert(id === 'back' || node.transitions, 'No transitions defined for node: ' + node.path);
			F5.assert(id === 'back' || node.transitions[id], 'No transition with id: ' + id);
			
			lockout = true;
						
			if (!cb) {
				cb = function () {
//					console.log('transition complete');
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
				container = node.transitions[id].to.parent;											
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
				node.transitions[id].to.back = back;				
			}
												
			function complete() {
				var oldSelection = container.selection;
				
				if (id === 'back') {
					container.selection = backNode.back;
					delete node.back;
				} else {
					container.selection = node.transitions[id].to;
				}		
				
				// TODO: should these delay the callback?

				nodeDidBecomeInactive(oldSelection, function () {

				});						
								
				nodeDidBecomeActive(container.selection, function () {

				});		
				
				lockout = false;				
					
				that.observer();	
								
				cb();
			}
			
			cancelSubflowRecursive(node);		
			
			var target = id === 'back' ? backNode.back : node.transitions[id].to;
			var animation = node.transitions && node.transitions[id] ? node.transitions[id].animation : null;
			
			// TODO: call nodeWillBecomeInactive
			nodeWillBecomeInactive(node, function () {
				nodeWillBecomeActive(target, function () {			
					if (F5.Global.viewController) {
						F5.Global.viewController.doTransition(container, id, target, animation, complete);										
					} else {
						complete();
					}			
				});				
			});
		};	
				
		that.doSubflowChoice = function (node, id) {	
			F5.assert(node.activeSubflow, 'No active subflow');

//			console.log('choose: ' + id);
			F5.assert(node.activeSubflow.choices.hasOwnProperty(id), 'No such choice');	
						
			// TODO: does this need to be asynchronous?			
			// give the flow delegate a chance to do something with the result
			if (node.activeSubflow.userInput) {
				var name = node.activeSubflow.method + 'Choice';
				var method = node.flowDelegate ? node.flowDelegate[name] : null;
				if (!method) {
					method = F5.Global.flow.root.flowDelegate ? F5.Global.flow.root.flowDelegate[name] : null;
				}
				if (method) {
					method(node, id);
				}
//				else {
//					console.log('No flowDelegate for method: ' + name);
//				}							
			}					

			var newSubflow = node.activeSubflow.choices[id];
			var oldSubflow = node.activeSubflow;
			var completionCb = oldSubflow.completionCb;
			
			delete oldSubflow.completionCb;
			oldSubflow.active = false;
			
			function completeChoice() {
				that.observer();

				if (node.activeSubflow) {
					if (node.activeSubflow.userInput && F5.Global.viewController) {
						F5.Global.viewController.doSubflowChoice(oldSubflow, id);
					} else {
						doSubflowPrompt(node);												
					}
				} else {
					if (oldSubflow.userInput && F5.Global.viewController) {
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
		that.getBackNode = function (leaf) {
			leaf = leaf || flow.root;
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
		
		that.doSubflow = function (node, id, cb) {
			F5.assert(node.subflows && node.subflows[id], 'No such subflow');
			
			var subflow = node.subflows[id];
			subflow.completionCb = cb;
			subflow.active = true;
			node.activeSubflow = subflow;
			
			
			var delegateMethod = node.flowDelegate ? node.flowDelegate[subflow.method] : null;
			if (!delegateMethod) {
				delegateMethod = F5.Global.flow.root.flowDelegate ? F5.Global.flow.root.flowDelegate[subflow.method] : null;
			}
						
			if (subflow.userInput || !delegateMethod) {
				if (!subflow.userInput) {
					// flag as requiring user input
					console.log('Subflow not flagged for user input but no delegate method found');
					subflow.userInput = true;						
				}
				if (F5.Global.viewController) {
					F5.Global.viewController.startSubflow(node.activeSubflow);
				} else {
					// TODO: need to sort out for headless testing
					doSubflowPrompt(node);												
				}				
			} else {			
				delegateMethod(node, function (choice) {
					that.doSubflowChoice(node, choice);
//					console.log(choice);
				});				
			}				

//			console.log(node.path + '.' + id + ' started');

			that.observer();					
		};
				
		that.hasBack = function () {
			return that.getBackNode() !== null;
		};
		
		that.doBack = function () {			
			var backNode = that.getBackNode();
			F5.assert(backNode, 'Cannot go back');
			that.doTransition(backNode, 'back');
		};
	}	
	
	F5.FlowController = FlowController;	

}());
