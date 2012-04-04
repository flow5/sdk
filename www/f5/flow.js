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
	
	function Flow(flowspec) {
		
		this.isNodePathActive = function (node) {
			var active = node.active;
			while (active && node.parent) {
				node = node.parent;
				active = node.active;
			}
			return active;
		};			
		
		this.parse = function () {
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
							data: {},
							type: nodeSpec.type || 'flow', 
							parent: parent,
							viewDelegate: nodeSpec.viewDelegate,
							spec: nodeSpec, 
							active: false};

				if (nodeSpec.children) {
					node.children = {};
					F5.assert(nodeSpec.selection, 'Parent node must declare child selection: ' + id);
					F5.forEach(nodeSpec.children, function (id, childSpec) {
						var child = injectNodeRecursive(id, childSpec, node);
						if (id === nodeSpec.selection) {
							node.selection = child;
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

				if (node.parent) {
					parent.children[id] = node;
				}

				return node;
			}	

			function resolveTransitionsRecursive(node) {								

				if (node.spec.transitions) {
	//				F5.assert(node.type === 'flow' || node.type === 'set', 
	//							'A node with transitions must be of type flow or set');
					node.transitions = {};
					F5.forEach(node.spec.transitions, function (transition) {
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

			// inject nodes
			that.root = injectNodeRecursive('root', flowspec);

			// resolve transitions
			resolveTransitionsRecursive(that.root);								

			// remove the cached specs
			function removeSpecsRecursive(obj) {
				delete obj.spec;
				// break cycles
				obj._mark = true;
				F5.forEach(obj, function (id, child) {
					if (child && typeof child === 'object' && !child._mark) {
						removeSpecsRecursive(child);
					}
				});
				delete obj._mark;
			}
			removeSpecsRecursive(that.root);

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
			addPathsRecursive(this.root);			

			that.root.active = true;						
		};
	}
	
		
	F5.Global.flow = new Flow(F5.flowspec);	
}());

