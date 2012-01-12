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

		flow.controller = this;
		
		// lockout is set to true during async operations on the flow
		var lockout = false;

		// tasks to wait for in flushWaitTasks
		var waitTasks = [];
		
		var flowObservers = [];		
		this.addFlowObserver = function (observer) {
			flowObservers.push(observer);
		};		
		this.removeFlowObserver = function (observer) {
			flowObservers.splice(flowObservers.indexOf(observer), 1);
		};		
		
						
		// TODO: fix the case where the recursive flow terminates in a selection or transition
		// before a leaf node is reached. current impl the recursion may continue along the old branch
		// More concerning is that elements that have received "willBecomeActive" events will never
		// actually be activated (or inactivated) because of a transition or selection away
		function doLifecycleEventRecursive(event, node, cb) {	
			
			F5.lifecycleEvent = event;
			function callback() {
				delete F5.lifecycleEvent;
				cb();
			}

			function doLifecycleEvent(observer) {
				if (observer['node' + event]) {
					observer['node' + event](node);
				}
			}
			
			function subflowCallback(node) {
				return function () {
					flowObservers.forEach(doLifecycleEvent);
					doLifecycleEventRecursive(event, node.selection, cb);
				};
			}
					
			while (node) {
						
				// only recurse when an async operation requires it
				if (node.subflows && node.subflows[event]) {
					that.doSubflow(node, event, subflowCallback(node));		
					break;					
				} else {
				// otherwise just iterate to keep the stack minimal
					flowObservers.forEach(doLifecycleEvent);	
					node = node.selection;
				}	
				
			}
			if (!node) {
				cb();
			}
		}						
		
		function nodeDidBecomeActive(node, cb) {								
			node.active = true;			
			doLifecycleEventRecursive('DidBecomeActive', node, cb);
		}									

		function nodeDidBecomeInactive(node, cb) {								
			node.active = false;
			doLifecycleEventRecursive('DidBecomeInactive', node, cb);
		}									

		function nodeWillBecomeActive(node, cb) {											
			doLifecycleEventRecursive('WillBecomeActive', node, cb);
		}									

		function nodeWillBecomeInactive(node, cb) {											
			doLifecycleEventRecursive('WillBecomeInactive', node, cb);
		}									
						
		function flushWaitTasks(cb) {			
			function complete() {	
				cb();
				
				flowObservers.forEach(function (observer) {
					if (observer.asyncOperationComplete) {
						observer.asyncOperationComplete();
					}
				});									
			}
			
			// yield back to the event loop to allow any necessary reflow
			// then flush the remaining tasks (usually animations or queued native commands)
			setTimeout(function flushWaitTasksCb() {
				F5.flushTasks(waitTasks, function () {
					waitTasks = [];
					complete();
				});
			}, 0);
		}	
			
		this.start = function (cb) {	
			cb = cb || function () {
				console.log('start complete');
			};
			
			F5.parseResources();
			
			nodeWillBecomeActive(flow.root, function () {				
				// NOTE: cb executes here because nodeDidBecomeActive may pop a dialog
				// so this is the right time to flush any native side tasks that got queued
				// during startup
				flushWaitTasks(cb);		
				
				nodeDidBecomeActive(flow.root, function () {
					flowObservers.forEach(function (observer) {
						if (observer.start) {
							observer.start();
						}
					});					
				});
			});									
		};
		
		// cancel out of any current subflow
		// TODO: would like to limit this to lifecycle event subflows
		// other subflows should not have to be cancelled
		function cancelSubflowRecursive(node) {
			if (node.activeSubflow && node.activeSubflow.userInput) {
				flowObservers.forEach(function (observer) {
					if (observer.completeSubflow) {
						observer.completeSubflow(node.activeSubflow);
					}
				});				
			}
			delete node.activeSubflow;
			if (node.children) {
				F5.forEach(node.children, function (id, child) {
					cancelSubflowRecursive(child);
				});					
			}
		}	
		
		this.addWaitTask = function (task) {
			waitTasks.push(task);
		};
		
		// select the child of node with the given id
		this.doSelection = function (node, id, cb) {	
			F5.assert(!lockout, 'Locked out');				
			F5.assert(node.type === 'switcher' || node.type === 'set', 
				'Can only doSelection on node of types switcher or set');
			F5.assert(node.children[id], 'No child with id: ' + id);
			
			cb = cb || function () {
//				console.log('selection complete');
			};
			
			// nothing to do
			if (id === node.selection.id) {
				cb();
				return;
			}			
			
			lockout = true;
			
			var oldSelection = node.selection;				
			
			cancelSubflowRecursive(node);
			
			nodeWillBecomeInactive(oldSelection, function () {
				
				nodeWillBecomeActive(node.children[id], function () {
					
					var tasks = [];
					flowObservers.forEach(function (observer) {
						if (observer.doSelection) {
							that.addWaitTask(observer.doSelection(node, id));
						}
					});		
					
					flushWaitTasks(function selectionComplete() {
						node.selection.active = false;
						node.selection = node.children[id];

						nodeDidBecomeInactive(oldSelection, function () {
							nodeDidBecomeActive(node.selection, function () {
								lockout = false;	
								cb();			
							});					
						});							
					});
				});									
			});
		};
				
		// use the transition on the node with the given id 
		this.doTransition = function (node, id, parameters, cb) {
			F5.assert(!lockout, 'Locked out');
			F5.assert(node.type === 'flow' || node.type === 'set', 
				'Can only doTransition on node of types flow or set');			
			F5.assert(id === 'back' || node.transitions, 'No transitions defined for node: ' + node.path);
			F5.assert(id === 'back' || node.transitions[id], 'No transition with id: ' + id);
					
			parameters = parameters || {};
			cb = cb || function () {
				//					console.log('transition complete');				
			};
			
			lockout = true;			

			var container;
			
			// find the transition target
			// for a back transition, climb the hierarchy to find the node which 
			// was the transition target. this means that back can be executed from any level
			// of nesting
			// TODO: this is asymmetrical with forward transitions where currently the transition
			// has to be defined on the node itself. should forward transitions also be allowed to
			// climb scope as well? Haven't found a case where it's needed yet. . .
			var backNode;
			if (node.transitions && node.transitions[id]) {
				container = node.transitions[id].to.parent;					
			} else {
				backNode = node;		
				while (!backNode.back) {
					backNode = backNode.parent;
				}		
				container = backNode.parent;
			}
						
			F5.assert(container.type === 'flow' || container.type === 'set', 
				'Transition container is not a flow or set');
				
			if (id !== 'back') {
				// find the correct back target
				var back = node;
				while (back.parent !== container) {
					back = back.parent;
				}
				node.transitions[id].to.back = back;				
			}												
			
			cancelSubflowRecursive(node);		
			
			var target = id === 'back' ? backNode.back : node.transitions[id].to;
			var animation = node.transitions && node.transitions[id] ? node.transitions[id].animation : null;
									
			if (parameters) {
				if (id === 'back') {
					if (!target.data) {
						target.data = {};
					}					
					F5.extend(target.data, parameters);
				} else {
					target.data = parameters;
				}
			}										
															 
			nodeWillBecomeInactive(node, function () {
				
				nodeWillBecomeActive(target, function () {		
					
					// queue up all of the transition completion functions from flow observers
					var tasks = [];
					flowObservers.forEach(function (observer) {
						if (observer.doTransition) {
							that.addWaitTask(observer.doTransition(container, id, target, animation));
						}
					});		
					
					// execute all of the transition competion functions
					flushWaitTasks(function transitionComplete() {
						var oldSelection = container.selection;

						nodeDidBecomeInactive(oldSelection, function () {
							if (backNode) {
								container.selection = backNode.back;
								delete backNode.back;								
								flowObservers.forEach(function (observer) {
									if (observer.release) {
										observer.release(node);
									}
								});
							} else {
								container.selection = node.transitions[id].to;
							}		

							nodeDidBecomeActive(container.selection, function () {
								lockout = false;				
								cb();
							});		
						});						
					});
				});				
			});
		};	
		
		// find an active leaf node
		// then climb up the stack for the first node with 'back'		
		this.getBackNode = function (leaf) {
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
		
		this.hasBack = function () {
			return that.getBackNode() !== null;
		};
		
		this.doBack = function () {			
			var backNode = that.getBackNode();
			F5.assert(backNode, 'Cannot go back');
			that.doTransition(backNode, 'back');
		};
											
		this.doSubflow = function (node, id, cb) {
			F5.assert(node.subflows && node.subflows[id], 'No such subflow');
			
			cb = cb || function () {
//				console.log('subflow completed');				
			};
			
			// setup
			var subflow = node.subflows[id];
			subflow.completionCb = cb;
			subflow.active = true;
			node.activeSubflow = subflow;			
			
			// see if this subflow is handled by the flow delegate
			var delegate = node.flowDelegate;
			var delegateMethod = delegate ? delegate[subflow.method] : null;
			// if not, see if it's handled by the root delegate
			if (!delegateMethod) {
				delegate = F5.Global.flow.root.flowDelegate;
				delegateMethod = delegate ? delegate[subflow.method] : null;
			}

			if (delegateMethod) {
				delegateMethod.apply(delegate, [function subflowChoiceCb(choice) {
					that.doSubflowChoice(node, choice);
				}]);
			} else {
				// handle missing delegate method gracefully
				if (!subflow.userInput) {
					console.log('Subflow not flagged for user input but no delegate method found: ' + node.id + '-' + id);
					subflow.userInput = true;						
				}
				
				flowObservers.forEach(function (observer) {
					if (observer.startSubflow) {
						observer.startSubflow(node.activeSubflow);
					}
				});
			}
		};																		
				
		this.doSubflowChoice = function (node, id) {	
			F5.assert(node.activeSubflow, 'No active subflow');
			F5.assert(node.activeSubflow.choices.hasOwnProperty(id), 'No such choice');	
						
			// if the user made the choice, pass the result to a flowDelegate if a handler exists			
			if (node.activeSubflow.userInput) {
				// the flow delegate must name the method <methodName>Choice
				var name = node.activeSubflow.method + 'Choice';
				var delegate = node.flowDelegate;
				var delegateMethod = delegate ? delegate[name] : null;
				// try the root delegate
				if (!delegateMethod) {
					delegate = F5.Global.flow.root.flowDelegate;
					delegateMethod = delegate ? delegate[name] : null;
				}
				if (delegateMethod) {
					delegateMethod.apply(delegate, [id]);
				}
			}								

			// carry the completion callback forward
			var completionCb = node.activeSubflow.completionCb;

			// finish the old subflow
			var oldSubflow = node.activeSubflow;									
			delete oldSubflow.completionCb;
			oldSubflow.active = false;
			delete node.activeSubflow;	

			if (oldSubflow.userInput) {
				flowObservers.forEach(function (observer) {
					if (observer.completeSubflow) {
						observer.completeSubflow(oldSubflow);
					}
				});				
			}
																
			var nextAction = oldSubflow.choices[id];
			if (nextAction) {
				// if the next action is another subflow
				if (typeof nextAction === 'object') {
					F5.assert(nextAction.type === 'subflow', 'A subflow choice must be a node name or another subflow');
					var subflow = nextAction;
					
					subflow.completionCb = completionCb;
					subflow.active = true;
					node.activeSubflow = subflow;

					flowObservers.forEach(function (observer) {
						if (observer.startSubflow) {
							observer.startSubflow(node.activeSubflow);
						}
					});
				} else {
					F5.assert(typeof nextAction === 'string', 'A subflow choice must be a node name or another subflow');
					
					if (nextAction) {
						if (node.type === 'flow') {
							// for a flow, the string indicates a node to transition to
							completionCb();							
							that.doTransition(node, nextAction);																			
						} else if (node.type === 'switcher' && F5.lifecycleEvent !== 'WillBecomeActive') {
							// for a switcher, the string indicates a node to select
							completionCb();							
							that.doSelection(node, nextAction);
						} else if (node.type === 'set' || node.type === 'switcher') {
							// for a set, the string indicates a node to sync to
							// NOTE: this should only occur in a WillBecomeActive context
							if (node.selection.id !== nextAction) {
								node.selection = node.children[nextAction];
								F5.forEach(node.children, function (id, child) {
									child.active = false;
								});
								node.selection.active = true;
								flowObservers.forEach(function (observer) {
									if (observer.syncSelection) {
										observer.syncSelection(node);
									}
								});
							} 
							completionCb();	
						}					
					}					
				}
			} else {
				completionCb();					
			}
		};												
	}	
	
	F5.FlowController = FlowController;	

}());
