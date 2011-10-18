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

define('flow_diags', exports, function (exports) {
	
	require('./jsext.js');
	
	function instrument(Flow) {
		
		// OPTION: consider https://github.com/akidee/schema.js or related as a general schema validation solution
		
		// OPTION: maybe wrap injectGraphSpec and validate in debug builds
		Flow.prototype.validateGraphSpec = function (graphSpec) {
			
			var paths = {};

			function validateNodeSpecRecursive(id, nodeSpec, context) {
				
				if (context === undefined) {
					context = [];
				}
								
				function verify(condition, description) {
					if (!condition) {
						// OPTION: probably don't want to see the whole subtree
						throw new Error(description + ' @' + JSON.stringify(nodeSpec));						
					}
				}

				context = context.concat(id);
				var path = context.join('/');
				verify(!paths[path], 'duplicate node path:' + path);
				paths[path] = true;
				
				// TODO: make sure that the level for a transition is not too large for the hierarchy
				if (nodeSpec.transitions) {
					verify(Object.isObject(nodeSpec.transitions), 'transitions must be object');
					nodeSpec.transitions.forEach(function (id, transition) {
						verify(Object.isObject(transition), 'transitions must be an object');
						verify(transition.to, 'transition requires a to field');
					});
				}
				
				if (nodeSpec.decisions) {
					verify(Object.isObject(nodeSpec.decisions), 'decisions must be object');
					nodeSpec.decisions.forEach(function (id, decision) {
						verify(decision.to, 'decision requires a to field');
						verify(Object.isObject(decision.to), 'a decision to field must be an object');
						decision.to.forEach(function (name, to) {
							verify(!to || String.isString(to), 'type of a decision choice must be null or string');
						});
					});
				}
				
				if (nodeSpec.type) {
					verify(String.isString(nodeSpec.type), 'type must be string');						
					
					switch (nodeSpec.type) {
					case 'selector':
						verify(nodeSpec.active, 'selector requries a active field');
						verify(nodeSpec.children, 'selector requires a children field');				
						nodeSpec.children.forEach(function (id, nodeSpec) {
							validateNodeSpecRecursive(id, nodeSpec, context);
						});
						break;
					case 'flow':
						verify(nodeSpec.active, 'No start defined for flow');
						validateNodeSpecRecursive(nodeSpec.active, nodeSpec.children[nodeSpec.active], context);
						break;
					default:
						verify(false, 'Unknow node type:' + nodeSpec.type);
					}
				}

			
			}

			graphSpec.forEach(function (id, nodeSpec) {
				validateNodeSpecRecursive(id, nodeSpec);
			});
		};
		
		Flow.prototype.toJSON = function (outputStream) {
			
			var filteredCopy = {};
			
			function filterNodesRecursive(obj, filteredCopy) {
				for (var name in obj) {
					if (obj.hasOwnProperty(name)) {
						if (name === 'parent' && obj.parent) {
							filteredCopy.parent = obj.parent.path;
						} else if (name === 'to' && obj.to) {
							filteredCopy.to = obj.to.path;
						} else {
							if (typeof obj[name] === 'object') {
								if (name !== 'spec') {
									filteredCopy[name] = {};
									filterNodesRecursive(obj[name], filteredCopy[name]);									
								}
							} else {
								filteredCopy[name] = obj[name];
							}												
						}						
					}
				}
			}
			
			filterNodesRecursive(this.nodes, filteredCopy);
			
			if (outputStream === 'stderr') {
				console.error(JSON.stringify(filteredCopy));
			} else {
				console.log(JSON.stringify(filteredCopy));
			}
		};

		// creates DOT output representing the current Flow graph
		// TODO: highlight active children and double highlight active paths
		Flow.prototype.toDOT = function (outputStream) {

			var result = '';
			var visited = {};					

			function quote(s) {
				return '\"' + s + '\"';
			}
			
			function getAProperty(obj) {
				for (var name in obj) {
					if (obj.hasOwnProperty(name)) {
						return obj[name];
					}
				}
			}

			function getAnId(obj) {
				for (var name in obj) {
					if (obj.hasOwnProperty(name)) {
						return name;
					}
				}
			}			
			
			function makeLabel(s) {
				return 'label=' + quote(s);
			}
			
			function makeHead(head) {				
				return 'lhead=' + quote(head);
			}
						
			function makeClusterLabel(s) {
				return 'cluster:' + s;
			}
			
			function makeEdge(from, to) {
				return quote(from) + '->' + quote(to);
			}
			
			function formatAttributes(attributes) {
				var statement = ' [';
				
				attributes.forEach(function (attribute) {
					statement += attribute + ',';
				});
				
				statement += ']';
				
				return statement;
			}
			
			function addNode(node) {
				var attributes = [
					makeLabel(node.id),
					'fontname=courier',
					'style=rounded',
					'shape=box'
				];				
				result += quote(node.path) + formatAttributes(attributes);
			}
			
			function addTransitionSource(node) {
				// height=0 and width=0 makes the box just accomodate the text				
				var attributes = [
					makeLabel(node.id),
					'fontname="courier new italic"',
					'fontsize=12',
					'margin="0.02"',
					'shape=none', 
					'height=0', 
					'width=0'
				];				
				result += quote(node.path) + formatAttributes(attributes); 
				console.log(node.path);
			}						
			
			function cluster(node) {
				return node.children || node.transitions || node.subflows;
			}
						
			function addEdge(from, to) {
																												
				// NOTE: graphviz doesn't support edges between clusters
				// the workaround is to make the edge between leaf nodes
				// then explicitly set the edge head and tail to the clusters
				// in this case only the head needs the workaround since the tail
				// is always attached to the transitionSource node
				// see: https://mailman.research.att.com/pipermail/graphviz-interest/2010q3/007276.html
				var head = to.path;				
				if (cluster(to)) {
					head = makeClusterLabel(to.path);
					while (to.children) {
						to = getAProperty(to.children);
					}
					
					if (to.type === 'menu') {
						to = {path: to.path + '.' + getAnId(to.subflows)};
					}

					// if the to node has transitions, then use one of them
					if (to.transitions) {
						to = {path: to.path + '.' + getAnId(to.transitions)};
					}
				}
				
				var attributes = [
					makeHead(head),
					'fontname="courier new"',
					'arrowhead="vee"',
					'minlen=2',
					'tailport="e"'
//					'dir="both"',
//					'arrowtail="obox"',
				];				
				result += makeEdge(from, to.path) + formatAttributes(attributes);
			}
			
			function digraphStart() {
				// splines="ortho";
				result += 'digraph {compound=true; rankdir=LR; fontname=courier;';
			}
			
			function digraphFinish() {
				result += '}';				
			}

			function clusterStart(node) {
				result += 'subgraph ' + quote(makeClusterLabel(node.path)) + ' {style=rounded;fontname="courier bold";';
				result += makeLabel(node.id);
			}
			
			function clusterFinish() {
				result += '}';
			}
			
			function menuStart(id, subflow) {
				var clusterLabel = quote(makeClusterLabel(subflow.path));
//				console.log(clusterLabel);
				result += 'subgraph ' + clusterLabel + ' {style=square;fontname="courier";';
				result += makeLabel('choose');
				console.log(subflow.path);
			}				
			
			function menuFinish() {
				result += '}';
			}
						
			function visitSubflowRecursive(id, subflow) {
				if (subflow.type === 'menu') {
					menuStart(id, subflow);
					subflow.subflows.forEach(function (id) {
						addTransitionSource({path: subflow.path + '.' + id, id: id});
					});
					menuFinish();
					subflow.subflows.forEach(function (id, subflow) {
						visitSubflowRecursive(id, subflow);
					});
					
				} else if (subflow.type === 'transition') {
					
				}
				
				visited[subflow.root.path + '.' + id] = subflow;
			}
																			
			function visitNodeRecursive(node) {
				if (visited[node.path]) {
					return;			
				}

				if (cluster(node)) {
					clusterStart(node);		
					
					if (node.transitions) {
						node.transitions.forEach(function (id, transition) {
							addTransitionSource({path: node.path + '.' + id, id: id});							
						});						
					}

					if (node.children) {
						node.children.forEach(function (id, child) {
							visitNodeRecursive(child);
						});						
					}

					// subflows are treated as transitions out
					if (node.subflows) {
						node.subflows.forEach(function (id, subflow) {
							addTransitionSource({path: subflow.path, id: id});
						});							
					}

					clusterFinish();
				} else {			
					addNode(node);					
				}	
				
				// put the subflows outside the box for clarity
				if (node.subflows) {
					node.subflows.forEach(function (id, subflow) {
						visitSubflowRecursive(id, subflow);
					});							
				}
																	
				
				visited[node.path] = node;									
			}
			
			
			// traverse the graph
			// the DOT output is written into result
			
			digraphStart();
						
			// create the nodes
			this.nodes.forEach(function (id, node) {
				visitNodeRecursive(node);
			});	
			
			visited.forEach(function (path, fromNode) {
				// create the simple transition edges			
				if (fromNode.transitions) {
					fromNode.transitions.forEach(function (id, toNode) {						
						addEdge(fromNode.path + '.' + id, toNode);																						
					});
				}
				// create subflow edges
				if (fromNode.subflows) {
					fromNode.subflows.forEach(function (id, choice) {
						if (choice.type === 'transition') {
							var to = choice.to;
							// null transition
							if (!to) {
								to = fromNode.root;
							}
							addEdge(fromNode.path + '.' + id, to);							
						} else if (choice.type === 'menu') {
							// the choice and the cluster representing the menu are the same
							addEdge(fromNode.path + '.' + id, choice);
						}
					});
				}
			});						
										
			digraphFinish();
			
			
			if (outputStream === 'stderr') {
				console.error(result);
			} else {
				console.log(result);
			}			
		};		
	}
	
	exports.instrument = instrument;
});