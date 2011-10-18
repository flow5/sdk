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
			
			function makeNodeLabel(s) {
				return 'label=' + quote(s);
			}
			
			function makeHead(head) {
				if (!head) {
					console.log('wtf?');
				}
				
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
				result += quote(node.path) + formatAttributes([makeNodeLabel(node.id), 
						'shape=box', 'style=rounded', 'fontname=courier']);
			}
			
			function addTransitionSource(node) {
				result += quote(node.path) + formatAttributes([makeNodeLabel(node.id), 
						'shape=none', 'fontname="courier new italic"', 'fontsize=12', 'margin="0.02"', 'height=0', 'width=0']);
			}
			
			
			function getProperty(obj) {
				for (var name in obj) {
					if (obj.hasOwnProperty(name)) {
						return obj[name];
					}
				}
			}

			function getId(obj) {
				for (var name in obj) {
					if (obj.hasOwnProperty(name)) {
						return name;
					}
				}
			}

			
			function cluster(node) {
				return node.children || node.transitions;
			}
						
			function addEdge(id, from, to) {
																								
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
						to = getProperty(to.children);
					}
					// if the to node has transitions, then use one of them
					if (to.transitions) {
						to = {path: to.path + '.' + getId(to.transitions)};
					}
				}
				
				result += makeEdge(from.path + '.' + id, to.path) + formatAttributes(
					[makeHead(head), 'fontname="courier new"', 
						'arrowhead="vee"', 'minlen=2', 'tailport="e"']);
			}
			
			function digraphStart() {
				result += 'digraph {compound=true;rankdir=LR;fontname=courier;splines="orthoX";';
			}
			
			function digraphFinish() {
				result += '}';				
			}

			function clusterStart(node) {
				result += 'subgraph ' + quote(makeClusterLabel(node.path)) + ' {style=rounded;';
				result += makeNodeLabel(node.id);
			}
			
			function clusterFinish() {
				result += '}';
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

					clusterFinish();
				} else {			
					addNode(node);					
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
			
			// create the simple transition edges			
			visited.forEach(function (path, fromNode) {
				if (fromNode.transitions) {
					fromNode.transitions.forEach(function (id, toNode) {						
						addEdge(id, fromNode, toNode);																						
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