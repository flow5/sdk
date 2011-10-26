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

define('flow_diags', exports, function (exports) {
			
	function instrument(flow) {

		// OPTION: consider https://github.com/akidee/schema.js or related as a general schema validation solution
		
		flow.diags = {};		
		
		flow.diags.getNodeFromPath = function (path) {
			function getChildRecursive(node, components) {
				if (components.length && components[0]) {
					var child = node.children[components[0]];
					F5.assert(child, 'Bad path');
					return getChildRecursive(child, components.slice(1));
				} else {
					return node;
				}
			}
			return getChildRecursive(flow.root, path.split('-').slice(1));
		};	
		
		flow.diags.isNodePathActive = function (node) {
			var active = node.active;
			while (active && node.parent) {
				node = node.parent;
				active = node.active;
			}
			return active;
		};	
			
		flow.diags.isSubflowActive = function (node) {
			while (!node.activeSubflow && node.parent) {
				node = node.parent;
			}
			return node.activeSubflow;
		};
		
		// TODO: use with caution. there may eventually be more than one
		flow.diags.getActiveLeafNode = function () {
			var node = flow.root;
			while (node.activeChild) {
				node = node.activeChild;
			}
			return node;
		};		
					
		flow.diags.toJSON = function () {
			
			var filteredCopy = {};
			
			function copyForPrettyPrintRecursive(obj, objId) {
				var copy = {};
				obj.forEach(function (id, child) {
					if (child && typeof child === 'object') {
						// break cycles and use paths to indicate references
						if (id === 'parent' || id === 'activeChild' || id === 'node' || objId === 'transitions') {
							copy[id] = '[-> ' + child.path + ']';
						} else if (id !== 'view') {
							copy[id] = copyForPrettyPrintRecursive(child, id);
						}
					} else {
						copy[id] = child;
					}
				});
				return copy;
			}	
						
			// NOTE: stringify strips out any fields with function objects
			return JSON.stringify(copyForPrettyPrintRecursive(flow.root, ''));
		};

		// creates DOT output representing the current Flow graph
		flow.diags.toDOT = function () {
			
			var that = this;

			var result = '';
			
			// TODO: I think this can go away
			var visited = {};	
			
			// used for cluster/edge workaround below
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

			function quote(s) {
				return '\"' + s + '\"';
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
			
			function isCluster(node) {
				return node.transitions || node.children || node.subflows;
			}
			
			function activeColorAttribute(attr) {
				var colors = {
					color: '="white"',
					fillcolor: '="lightblue"'
				};
				return attr + colors[attr];
			}
			function inactiveColorAttribute(attr) {
				var colors = {
					color: '="grey"',
					fillcolor: '="grey"'
				};
				return attr + colors[attr];
			}
						
			function getActiveNodeStyle(node) {
				var nodeActive = node.active;
				var pathActive = flow.diags.isNodePathActive(node);
				
				if (flow.diags.isSubflowActive(node)) {
					pathActive = false;
					nodeActive = false;
				}
				
				if (pathActive) {
					return ['color="white"', 'penwidth=1.5', 'fillcolor="lightskyblue"'];
				} else if (nodeActive) { 
					return ['color="blue"', 'penwidth=.5', 'fillcolor="grey"'];
				} else {
					return ['color="black"', 'penwidth=1.0', 'fillcolor="grey"'];
				}
			}
						
			function addNode(node) {
				var attributes = [
					makeLabel(node.id),
					'fontname=courier',
					'style="filled,rounded"',
					'shape=box',
					'fontsize=12',		
					'id=' + quote('svg-' + node.path)			
				].concat(getActiveNodeStyle(node));				
				
				result += quote(node.path) + formatAttributes(attributes);
			}

			function addSelectionButton(node, parent, id) {
				var fillColor, color;
				if (flow.diags.isNodePathActive(parent) && !flow.diags.isSubflowActive(parent) && !node.active) {
					fillColor = activeColorAttribute('fillcolor');
					color = activeColorAttribute('color');					
				} else {
					fillColor = inactiveColorAttribute('fillcolor');
					color = 'color="black"';					
				}				
				var idAttribute = 'id=' + quote('svg-' + parent.path + ':doSelection' + '_' + id);
				var attributes = [
					makeLabel('Select'),
					'fontname=courier',
					'style="filled,rounded"',
					'shape=box',
					'width=0',
					'height=0',
					'fontsize=10',
					fillColor,
					color,
					idAttribute
				];				
				
				result += quote(parent.path + '_' + id) + formatAttributes(attributes);
			}
											
			function addTransitionSource(node, id) {
				var fillColor, color;
				if (flow.diags.isNodePathActive(node) && !flow.diags.isSubflowActive(node)) {
					fillColor = activeColorAttribute('fillcolor');
					color = activeColorAttribute('color');
				} else {
					fillColor = inactiveColorAttribute('fillcolor');
					color = 'color="black"';
				}
				
				// height=0 and width=0 makes the box just accomodate the text				
				var attributes = [
					makeLabel(id),
					'fontname="courier new"',
					'fontsize=10',
					'style="filled"',					
					'margin="0.1,0.0"',
					'penwidth=0.6',
					fillColor,
					color,					
					'shape=box', 
					'height=0', 
					'width=1.25',
					'id=' + quote('svg-' + node.path + ':doTransition' + '_' + id)
				];				
				result += quote(node.path + '_' + id) + formatAttributes(attributes); 
			}
			
			function addSubflowSource(node, id) {
				var fillColor, color;
				if (flow.diags.isNodePathActive(node) && !flow.diags.isSubflowActive(node)) {
					fillColor = activeColorAttribute('fillcolor');
					color = activeColorAttribute('color');
				} else {
					fillColor = inactiveColorAttribute('fillcolor');
					color = 'color="black"';
				}
				
				// height=0 and width=0 makes the box just accomodate the text				
				var attributes = [
					makeLabel(id),
					'fontname="courier new"',
					'fontsize=10',
					'style="filled"',					
					'margin="0.1,0.0"',
					'penwidth=0.6',
					fillColor,
					color,					
					'shape=box', 
					'height=0', 
					'width=1.25',
					'id=' + quote('svg-' + node.path + ':doSubflow' + '_' + id)
				];				
				result += quote(node.path + '_' + id) + formatAttributes(attributes); 
			}									
									
			function addEdge(from, to, head) {																																
				var attributes = [
					'fontname="courier new"',
					'arrowhead="vee"',
					'arrowsize=.5',
					'minlen=2',
//					'dir="both"',
//					'arrowtail="odot"',
				];			
				if (head) {
					attributes.push(makeHead(head));					
				}	
				result += makeEdge(from, to) + formatAttributes(attributes);
			}
			
			function digraphStart() {
				var attributes = [
					'compound=true',
					'rankdir=LR',
					'fontname=courier',
//					'splines="ortho"',
//					'nodesep=.25'				
				].join(';');
				result += 'digraph {' + attributes + ';';
			}
			
			function digraphFinish() {
				result += '}';				
			}

			function clusterStart(node) {
				var attributes = [
					'style="filled,rounded"',
					'fontname="courier"',
					'fontsize=12',	
					'bgcolor="gray"',
					'id=' + quote('svg-' + node.path)												
				].concat(getActiveNodeStyle(node)).join(';');

				result += 'subgraph ' + quote(makeClusterLabel(node.path)) + ' {' + attributes;
				result += makeLabel(node.id);
			}
			
			function clusterFinish() {
				result += '}';
			}
			
			function subflowStart(node, subflow, id) {
				var fillColor;
				// TODO: this can do the wrong thing if the name of one subflow
				// is a substring of another one
				if (flow.diags.isNodePathActive(node) && subflow.active) {
					fillColor = 'fillcolor="lightskyblue"';
				} else {
					fillColor = inactiveColorAttribute('fillcolor');
				}
				
				var attributes = [
					'fontname="courier"',
					'fontsize=10',
					'fontcolor="black"',
					'color="black"',
					'penwidth=.6',
					'style="filled"',
					fillColor,
					'id=' + quote('svg-' + node.path + id)
				].join(';');
				
				var clusterLabel = quote(makeClusterLabel(subflow.path));
				result += 'subgraph ' + clusterLabel + ' {' + attributes;
				result += makeLabel(subflow.method);
			}				
			
			function subflowFinish() {
				result += '}';
			}
			
			function addChoiceNode(subflow, choice, node) {
				function isSubflowStart() {	
					return  subflow.path.split('_')[1] === choice;					
				}
				function isCurrentSubflowChoice() {
					if (!node.activeSubflow) {
						return false;
					}
					
					return node.activeSubflow.path === subflow.path;
				}	
				function isTerminal() {
					return !subflow.choices[choice] || (typeof subflow.choices[choice] === 'string');
				}			
				function isSubflowAvailable() {					
					return flow.diags.isNodePathActive(node) && !flow.diags.isSubflowActive(node.parent) && 
						(!flow.diags.isSubflowActive(node) && isSubflowStart() || isCurrentSubflowChoice());
				}				
				
				var fillColor, color;				
				if (isSubflowAvailable()) {
					fillColor = activeColorAttribute('fillcolor');	
					color = activeColorAttribute('color');	
				} else {
					fillColor = inactiveColorAttribute('fillcolor');
					color = inactiveColorAttribute('fillcolor');
				}
				var idAttribute;
				if (subflow.path.split('_').length > 1) {
					idAttribute = 'id=' + quote('svg-' + subflow.path + ':doSubflowChoice' + '_' + choice);	
				} else {
					idAttribute = 'id=' + quote('svg-' + subflow.path + ':doSubflow' + '_' + choice);	
				}
				
				var shapeAttribute;
				if (isSubflowStart() || isTerminal()) {
					shapeAttribute = 'shape=box';
				} else {
					shapeAttribute = 'shape=ellipse';
				}
				
				var attributes = [
					makeLabel(choice),
					'fontname="courier new"',
					'style="filled"',
					fillColor,
					color,
					shapeAttribute,
					'penwidth=.6',
					'width=0',
					'height=0',
					'margin="0.1,0.0"',
					'fontsize=10',
					idAttribute
				];				
				
				result += quote(subflow.path + '_' + choice) + formatAttributes(attributes);
			}
									
			function addEdgeToSubflow(node, fromPath, target) {
				var head = makeClusterLabel(target.path);
				var toPath = target.path + '_' + getAnId(target.choices);
				addEdge(fromPath, toPath, head);
				
			}
									
			function visitSubflow(id, subflow, node) {
				function visitSubflowRecursive(id, subflow) {															
					if (subflow && subflow.type === 'subflow') {
						subflowStart(node, subflow, subflow.method);
						subflow.choices.forEach(function (id, child) {
							addChoiceNode(subflow, id, node);													
						});
						subflowFinish();										
						subflow.choices.forEach(function (id, child) {
							visitSubflowRecursive(id, child);
														
							if (child && child.type === 'subflow') {
								addEdgeToSubflow(node, subflow.path + '_' + id, subflow.choices[id]);
							}
						});
					}
				}								
																
				visitSubflowRecursive(id, subflow);
				
			}
									
			var count = 0;
			function visitNodeRecursive(node, parent) {
				if (isCluster(node)) {
					clusterStart(node);		
					
					if (parent.type === 'selector') {
						addSelectionButton(node, parent, node.id);
					}
										
					if (node.transitions) {
						node.transitions.forEach(function (id, transition) {
							addTransitionSource(node, id);							
						});						
					}

					if (node.children) {
						node.children.forEach(function (id, child) {
							visitNodeRecursive(child, node);
						});						
					}
					
					if (node.subflows) {
						node.subflows.forEach(function (id, subflow) {
							addSubflowSource(node, id);	
							visitSubflow(id, subflow, node);
							addEdgeToSubflow(node, node.path + '_' + id, subflow);
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
			flow.root.children.forEach(function (id, node) {
				visitNodeRecursive(node, flow.root);
			});	
			
			// create the transition edges
			visited.forEach(function (path, fromNode) {
				if (fromNode.transitions) {
					fromNode.transitions.forEach(function (id, toNode) {
						var toPath = toNode.path;

						// NOTE: graphviz doesn't support edges between clusters
						// the workaround is to make the edge between leaf nodes
						// then set the edge head or tail to the clusters
						// in this case only the head needs the workaround since the tail
						// is always attached to the transitionSource node
						// see: https://mailman.research.att.com/pipermail/graphviz-interest/2010q3/007276.html						
						var head;
						if (isCluster(toNode)) {
							head = makeClusterLabel(toNode.path);
							
							while (toNode.children) {
								toNode = getAProperty(toNode.children);
							}
							toPath = toNode.path;

							// if the toNode has transitions, then use one of them
							if (toNode.transitions) {
								toPath = toNode.path + '_' + getAnId(toNode.transitions);
							} 
							// if the toNode is the child of a selector then it's a cluster
							// because of the selection button. so grab the button
							else if (toNode.parent.type === 'selector') {
								toPath = toNode.parent.path + '_' + toNode.id;
							} 
							// if the toNode has subflows then it's a cluster, so grab
							// one of the subflow elements
							else if (toNode.subflows) {
								toPath = toNode.path + '_' + getAnId(toNode.subflows);
							}
						}												
						addEdge(fromNode.path + '_' + id, toPath, head);																						
					});
				}
			});						
										
			digraphFinish();
			
			return result;			
		};			
	}
	
	exports.instrument = instrument;
});