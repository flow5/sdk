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

	F5.FlowController = function (flow) {

		var that = this;

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
			if (!node) {
				cb();
				return;
			}

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

			if (event === 'Initialize') {
				if (!node.flowDelegate) {
					var id = F5.getNodePackage(node) + '.' + node.id;
					var flowDelegatePrototype = F5.getPrototype('FlowDelegates', id);
					if (flowDelegatePrototype) {
						node.flowDelegate = F5.objectFromPrototype(flowDelegatePrototype);
						node.flowDelegate.node = node;

						if (node.flowDelegate.initialize) {
							node.flowDelegate.initialize();
						}
					}
				}
			} else {
				if (node.flowDelegate) {
					doLifecycleEvent(node.flowDelegate);
				}
			}

			if (event === 'WillBecomeInactive') {
				that.cancelPending(node);
			}

			if (event === 'WillBecomeActive') {
				// save away the original selection so it can be restored
				// when the node is released
				if (node.selection && !node.defaultSelection) {
					node.defaultSelection = node.selection.id;
				}
			}

			flushWaitTasks(function () {
				flowObservers.forEach(doLifecycleEvent);

				if (node.selection) {
					doLifecycleEventRecursive(event, node.selection, cb);
				} else {
					var tasks = [];
					F5.forEach(node.children, function (id, child) {
						tasks.push(function (cb) {
							doLifecycleEventRecursive(event, child, cb);
						});
					});
					F5.parallelizeTasks(tasks, cb);
				}
			});
		}

		function nodeInitialize(node, cb) {
			F5.importPackage(F5.getNodePackage(node), function () {
				doLifecycleEventRecursive('Initialize', node, cb);
			});
		}

		function nodeDidBecomeActive(node, cb) {
			node.active = true;
			doLifecycleEventRecursive('DidBecomeActive', node, cb);
		}

		function nodeDidBecomeInactive(node, cb) {
			node.active = false;
			doLifecycleEventRecursive('DidBecomeInactive', node, function () {
				if (node.modal) {
					that.release(node);
				}
				cb();
			});
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
				var tmp = waitTasks;
				waitTasks = [];
				F5.flushTasks(tmp, function () {
					complete();
				});
			}, 0);
		}

		this.refresh = function () {
			flowObservers.forEach(function (observer) {
				if (observer.refresh) {
					observer.refresh();
				}
			});
		};

		this.release = function (node) {
			if (node.flowDelegate && node.flowDelegate.release) {
				node.flowDelegate.release();
			}
			delete node.flowDelegate;
			if (node.defaultSelection) {
				node.selection = node.children[node.defaultSelection];
				F5.forEach(node.children, function (id, child) {
					child.active = child === node.selection;
				});
			}
			delete node.defaultSelection;
			node.data.reset();
			var that = this;
			if (node.children) {
				F5.forEach(node.children, function (id, child) {
					that.release(child);
				});
			}

			flowObservers.forEach(function (observer) {
				if (observer.release) {
					observer.release(node);
				}
			});
		};

		this.cancelPending = function (node) {
			if (node.pending) {
				node.pending.forEach(function (pending) {
					pending.abort();
				});
				node.pending = [];
			}
		};

		this.start = function (cb) {
			var that = this;

			cb = cb || function () {
				console.log('start complete');
			};

			var stateKey = F5.appPkg + '_state';
			if (localStorage[stateKey]) {
				// load any previously dynamically imported packages
				// statically declared package dependencies are handled before start() in domstart.js
				var packageListKey = F5.appPkg + '_packages';
				if (localStorage[packageListKey]) {
					JSON.parse(localStorage[packageListKey]).forEach(function (pkg) {
						var contents = JSON.parse(localStorage[pkg]).result;
						that.addWaitTask(function (cb) {
							F5.unpackPackage(pkg, contents, cb);
						});
					});
				}
			}

			// flush any tasks that were waiting on init
			flushWaitTasks(function () {

				if (localStorage[stateKey]) {
					F5.Global.flow.initialize(F5.appPkg, JSON.parse(localStorage[stateKey]));
				} else {
					F5.Global.flow.initialize(F5.appPkg, F5.Flows[F5.appPkg]);
				}

				// TODO: sloppy. why isn't initialize part of observer?
				if (F5.Global.viewController) {
					F5.Global.viewController.initialize();
				}

				flowObservers.forEach(function (observer) {
					if (observer.start) {
						observer.start();
					}
				});

				nodeInitialize(flow.root, function () {
					nodeWillBecomeActive(flow.root, function () {
						nodeDidBecomeActive(flow.root, function () {
							that.refresh();
							// flush any tasks that were queued up during lifecycle events
							flushWaitTasks(function () {
								flowObservers.forEach(function (observer) {
									if (observer.update) {
										observer.update();
									}
								});
								cb();
							});
						});
					});
				});
			});
		};

		this.addWaitTask = function (task) {
			waitTasks.push(task);
		};

		// TODO: handle the case of importNode being called outside a lifecycle event?
		// e.g., a view might call importNode in response to a click. In that case the node
		// would not be called with WillBecomeActive/DidBecomeActive
		this.importNode = function (id, flowspec, parent, pkg, cb) {
			var lifecycleEvent = F5.lifecycleEvent;

			function complete() {
				F5.lifecycleEvent = lifecycleEvent;
				cb();
			}

			var node = F5.Global.flow.importNode(id, flowspec, parent, pkg);
			if (node.active) {
				nodeInitialize(node, function () {
					if (lifecycleEvent === 'WillBecomeActive' || lifecycleEvent === 'DidBecomeActive') {
						nodeWillBecomeActive(node, function () {
							if (lifecycleEvent === 'DidBecomeActive') {
								nodeDidBecomeActive(node, function () {
									flushWaitTasks(function () {
										flowObservers.forEach(function (observer) {
											if (observer.update) {
												observer.update();
											}
										});
										complete();
									});
								});
							} else {
								complete();
							}
						});
					} else {
						complete();
					}
/*
							that.refresh();
							// flush any tasks that were queued up during lifecycle events
							flushWaitTasks(function () {
								flowObservers.forEach(function (observer) {
									if (observer.update) {
										observer.update();
									}
								});
								cb();
							});
*/
				});
			}
		};

		this.deleteNode = function (node) {
			this.release(node);
			delete node.parent.children[node.id];
		};

		this.selectChild = function (node, id) {
			node.selection = node.children[id];
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

		// select the child of node with the given id
		this.doSelection = function (node, id, cb) {
			F5.assert(node.type === 'tabset', 'Can only doSelection on a tabset');
			F5.assert(node.children[id], 'No child with id: ' + id);

			if (lockout) {
				console.log('Cannot doSelection. Locked out.');
				return;
			}
			if (!flow.isNodePathActive(node)) {
				console.log('Cannot doSelection. Node is not active.');
				return;
			}

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

			nodeWillBecomeInactive(oldSelection, function () {
				nodeInitialize(node.children[id], function () {
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

									flowObservers.forEach(function (observer) {
										if (observer.update) {
											observer.update();
										}
									});

									cb();
								});
							});
						});
					});
				});
			});
		};

		// use the transition on the node with the given id
		this.doTransition = function (node, id, parameters, cb) {
			F5.assert(id === 'back' || node.transitions, 'No transitions defined for node: ' + node.path);
			F5.assert(id === 'back' || node.transitions[id], 'No transition with id: ' + id);

			if (lockout) {
				console.log('Cannot doSelection. Locked out.');
				return;
			}
			if (!flow.isNodePathActive(node)) {
				console.log('Cannot doTransition. Node is not active.');
				return;
			}

			var that = this;

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
			if (node.transitions && node.transitions[id]) {
				container = node.transitions[id].to.parent;
			} else if (id === 'back') {
				var backNode = node;
				while (!backNode.back && !(backNode.transitions && backNode.transitions['back'])) {
					backNode = backNode.parent;
				}
				container = backNode.parent;
				node = backNode;
			}

			F5.assert(container.type === 'flow', 'Can only doTransition within a container which is a flow');

			if (id !== 'back') {
				// find the correct back target
				var back = node;
				while (back.parent !== container) {
					back = back.parent;
				}
				node.transitions[id].to.back = back;
			}

			// sets allow transition with 'back' semantics (cleanup views) where the
			var target = id === 'back' && node.back ? node.back : node.transitions[id].to;
			var animation = node.transitions && node.transitions[id] ? node.transitions[id].animation : null;

			if (parameters) {
				// TODO: sync going forward makes sense since it's the initial population of the model
				// and shouldn't trigger a change. but what about on back?
				F5.forEach(parameters, function (id, value) {
					target.data.sync(id, value);
				});
			}

			nodeWillBecomeInactive(node, function () {
				nodeInitialize(target, function () {
						nodeWillBecomeActive(target, function () {

						// queue up all of the transition completion functions from flow observers
						var tasks = [];
						flowObservers.forEach(function (observer) {
							if (observer.doTransition) {
								that.addWaitTask(observer.doTransition(container, node, id, target, animation));
							}
						});

						// execute all of the transition competion functions
						flushWaitTasks(function transitionComplete() {
							var oldSelection = container.selection;
							nodeDidBecomeInactive(oldSelection, function () {
								if (id === 'back') {
									container.selection = target;
								} else {
									container.selection = node.transitions[id].to;
								}
								nodeDidBecomeActive(container.selection, function () {
									if (id === 'back') {
										delete node.back;
									}

									flowObservers.forEach(function (observer) {
										if (observer.update) {
											observer.update();
										}
									});

									lockout = false;
									cb();
								});
							});
						});
					});
				});
			});
		};

		// find an active leaf node
		// then climb up the stack for the first node with 'back'

		// NOTE: global navigation does not work unless the node has a selection
		this.getBackNode = function (leaf) {
			if (!leaf) {
				leaf = flow.root;
				while (leaf.selection) {
					leaf = leaf.selection;
				}
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

		this.doBack = function (node, cb) {
			var backNode = that.getBackNode(node);
			F5.assert(backNode, 'Cannot go back');
			that.doTransition(backNode, 'back', {}, cb);
		};
	};
}());
