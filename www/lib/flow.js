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

(function (){
	
	function Flow() {
		
		this.getNodeFromPath = function (path, root) {
			function getChildRecursive(node, components) {
				if (components.length && components[0]) {
					var child = node.children[components[0]];
					F5.assert(child, 'Bad path');
					return getChildRecursive(child, components.slice(1));
				} else {
					return node;
				}
			}
			return getChildRecursive(root || this.root, path.split('-').slice(1));
		};	
				
		this.importNode = function (id, flowspec, parent, pkg) {
			var that = this;

			function findNodeUp(node, name) {
				if (node.children && node.children[name]) {
					return node.children[name];
				} else if (node.parent) {
					return findNodeUp(node.parent, name);
				} else {
					F5.assert(false, 'Could not find name: ' + name);
				}
			}

			function injectNodeRecursive(id, nodeSpec, parent) {
				var node = {id: id, 
							type: nodeSpec.type, 
							parent: parent,
							spec: nodeSpec,
							pkg: nodeSpec.pkg,
							animation: nodeSpec.animation,
							active: nodeSpec.active};
							
				node.data = F5.createModel().initialize(node, nodeSpec.schema);
				
				// can initialize node model from spec. used with mock data
				F5.forEach(nodeSpec.data || {}, function (id, value) {
					node.data.sync(id, value);
				});

				if (nodeSpec.children) {
					node.children = {};
					F5.assert(!nodeSpec.type || nodeSpec.selection, 'Node must declare selection: ' + id);
					F5.forEach(nodeSpec.children, function (id, childSpec) {
						var child = injectNodeRecursive(id, childSpec, node);
						if (nodeSpec.selection) {
							if (id === nodeSpec.selection) {
								node.selection = child;
								child.active = true;															
							}
						} else {
							child.active = true;
						}
					});					
				}		


				function decorateSubflowRecursive(subflow, node) {
					if (subflow && subflow.choices) {
						subflow.active = false;
						subflow.type = 'subflow';
						subflow.node = node;
						F5.forEach(subflow.choices, function (id, child) {
							decorateSubflowRecursive(child, node);
						});					
					}
				}

				if (nodeSpec.subflows) {
					node.subflows = {};					
					F5.forEach(nodeSpec.subflows, function (id, subflow) {
						subflow.node = node;
						node.subflows[id] = subflow;
						decorateSubflowRecursive(subflow, node);
					});					
				}

				if (parent) {
					// allows import into a vanilla node
					if (!parent.children) {
						parent.children = {};
					}
					parent.children[id] = node;
				}

				return node;
			}	
			
			function resolveBackNodesRecurive(node, root) {
				if (node.spec.back) {
					node.back = that.getNodeFromPath(node.spec.back, root);
				}
				
				// recurse
				if (node.children) {
					F5.forEach(node.children, function (id, child) {
						resolveBackNodesRecurive(child, root);
					});
				}				
			}

			function resolveTransitionsRecursive(node) {	
				
				if (node.spec.transitions) {
					node.transitions = {};
					F5.forEach(node.spec.transitions, function (arg1, arg2) {
						// handle both the case of an array or an object
						var transition = typeof arg2 === 'object' && arg2 || arg1;
						
						var id;
						if (typeof transition === 'object') {
							if (transition.id) {
								id = transition.id;
							} else {
								id = transition.to;								
							}
							node.transitions[id] = {to: findNodeUp(node, transition.to), animation: transition.animation};
						} else {
							id = transition;
							node.transitions[id] = {to: findNodeUp(node, id)};						
						}

						// break cycles
						if (!node.transitions[id].to.transitions) {
							resolveTransitionsRecursive(node.transitions[id].to);							
						}						
					});
				}

				// recurse
				if (node.children) {
					F5.forEach(node.children, function (id, child) {
						resolveTransitionsRecursive(child);
					});
				}				
			}
			
			function removeSpecsRecursive(obj) {
				if (obj.parent) {
					obj.parent._mark = true;
				}
				delete obj.spec;
				// break cycles
				obj._mark = true;
				F5.forEach(obj, function (id, child) {
					if (child && typeof child === 'object' && !child._mark) {
						removeSpecsRecursive(child);
					}
				});
				delete obj._mark;
				if (obj.parent) {
					delete obj.parent._mark;
				}				
			}
			
			function addPathsRecursive(node) {
				function getPath(node) {
					var path = [];
					while (node) {
						path.push(node.id);
						node = node.parent;
					}
					return path.reverse().join('-');
				}			

				node.path = getPath(node);
				if (node.children) {
					F5.forEach(node.children, function (id, child) {
						addPathsRecursive(child);
					});
				}	

				function addSubflowPathsRecursive(subflow, path) {
					if (subflow && subflow.choices) {
						subflow.path = path + '_' + subflow.method;
						subflow.active = false;
						F5.forEach(subflow.choices, function (id, child) {
							addSubflowPathsRecursive(child, subflow.path);
						});					
					}
				}
				if (node.subflows) {
					F5.forEach(node.subflows, function (id, subflow) {
						addSubflowPathsRecursive(subflow, node.path);
					});
				}			
			}	
			
			// inject nodes
			var node = injectNodeRecursive(id, flowspec, parent);

			// resolve transitions
			resolveTransitionsRecursive(node);								

			// resolve back nodes
			resolveBackNodesRecurive(node, node);								
		
			// remove the cached specs
			removeSpecsRecursive(node);
			
			addPathsRecursive(node);			

			node.pkg = pkg;	
			
			return node;
		};
						
		this.initialize = function (pkg, rootSpec) {
			this.root = this.importNode('root', rootSpec, null, pkg);
			this.root.active = true;		
		};
		
		// serialize to JSON
		this.toJSON = function (node) {
			function isReference(id) {
				return {parent: true,
						selection: true,
						node: true,
						to: true}[id];		
			}
						
			function replacer(key, value) {
				if (key === 'back') {
					return value && value.path;
				}
				else if (isReference(key)) {
					// break cycles by writing reference ids
					return value && value.id;
				} else if (!value || 
					value.constructor === Object || 
					value.constructor === Array ||
					value.constructor === Number ||
					value.constructor === String ||
					value.constructor === Boolean) {
						return value;
				} else if (F5.Cache.isPrototypeOf(value)) {
					return value.dump();
				} else {
					// everything else is filtered out
					return undefined;
				}
			}			
			return JSON.stringify(node || this.root, replacer);						
		};	
		
		// TODO: move to diags
		this.isNodePathActive = function (node) {
			var active = node.active;
			while (active && node.parent) {
				node = node.parent;
				active = node.active;
			}
			return active;
		};		
			
	}
	
	F5.Flow = new Flow();			
}());

