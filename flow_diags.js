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
		
	var Utils = require('./utils.js');
	
	function instrument(flow) {
		
		// OPTION: consider https://github.com/akidee/schema.js or related as a general schema validation solution
		
		flow.diags = {};		
		
		flow.diags.getNodeFromPath = function (path) {
			function getChildRecursive(node, components) {
				if (components.length && components[0]) {
					var child = node.children[components[0]];
					Utils.assert(child, 'Bad path');
					return getChildRecursive(child, components.slice(1));
				} else {
					return node;
				}
			}
			// slice(1) because paths start with '/'
			return getChildRecursive(flow.root, path.split('/').slice(1));
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
							copy[id] = '->(' + child.diags.path + ')';
						} else {
							copy[id] = copyForPrettyPrintRecursive(child, id);
						}
					} else {
						copy[id] = child;
					}
				});
				return copy;
			}	
						
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
				// all but leaf nodes which don't specify type
				return node.type || node.parent.type === 'selector' || node.subflows;
			}
			
			function activeColorAttribute(attr) {
				var colors = {
					color: '="blue"',
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
					return ['color="blue"', 'penwidth=2.5', 'fillcolor="lightskyblue"'];
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
					'id=' + quote(node.diags.path)			
				].concat(getActiveNodeStyle(node));				
				
				result += quote(node.diags.path) + formatAttributes(attributes);
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
				var idAttribute = 'id=' + quote(parent.diags.path + '.' + id + '-doSelection');
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
				
				result += quote(parent.diags.path + '.' + id) + formatAttributes(attributes);
			}
											
			function addTransitionSource(source, node) {
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
					makeLabel(source.id),
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
					'id=' + quote(source.diags.path + '-doTransition')
				];				
				result += quote(source.diags.path) + formatAttributes(attributes); 
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
					'id=' + quote(node.diags.path)												
				].concat(getActiveNodeStyle(node)).join(';');

				result += 'subgraph ' + quote(makeClusterLabel(node.diags.path)) + ' {' + attributes;
				result += makeLabel(node.id);
			}
			
			function clusterFinish() {
				result += '}';
			}
			
			function subflowStart(node, path, id) {
				var fillColor;
				// TODO: this can do the wrong thing if the name of one subflow
				// is a substring of another one
				if (flow.diags.isNodePathActive(node) && node.activeSubflow && node.activeSubflow.diags.path.match(path)) {
					fillColor = 'fillcolor="lightskyblue"';
				} else {
					fillColor = inactiveColorAttribute('fillcolor');
				}
				
				var attributes = [
					'fontname="courier"',
					'fontsize=12',
					'fontcolor="green"',
					'color="black"',
					'penwidth=.6',
					'style="filled"',
					fillColor,
					'id=' + quote(node.diags.path + id)
				].join(';');
				
				var clusterLabel = quote(makeClusterLabel(path));
				result += 'subgraph ' + clusterLabel + ' {' + attributes;
				result += makeLabel('');
			}				
			
			function subflowFinish() {
				result += '}';
			}
			
			function addSubflowNode(id, path, spec, node) {
				function isSubflowStart() {	
					return path.split('.')[1] === id;					
				}
				function isCurrentSubflowChoice() {
					if (!node.activeSubflow) {
						return false;
					}
					
					// pulls /a/b/c.d.e out of /a/b/c.d.e.f leaving 'f'					
					return node.activeSubflow.choices.hasOwnProperty(path.replace(node.activeSubflow.diags.path + '.', ''));
				}	
				function isTransition() {
					return (typeof spec === 'string') && 
						(node.transitions && node.transitions[spec]) || spec === 'back';
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
				if (path.split('.').length > 2) {
					idAttribute = 'id=' + quote(path + '-doSubflowChoice');	
				} else {
					idAttribute = 'id=' + quote(path + '-doSubflow');	
				}
				
				var shapeAttribute;
				if (isSubflowStart() || isTransition()) {
					shapeAttribute = 'shape=box';
				} else {
					shapeAttribute = 'shape=ellipse';
				}
				
				var label;
				if (isTransition()) {
					label = id + ' (>' + spec + ')';
				} else {
					label = id;
				}
				
				var attributes = [
					makeLabel(label),
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
				
				result += quote(path) + formatAttributes(attributes);
			}
									
			function visitSubflow(id, subflow, subflowPath, node) {
				function visitSubflowRecursive(id, path, spec) {					
					if (spec && typeof spec === 'object') {
						addSubflowNode(id, path, spec, node);						
						spec.forEach(function (id, child) {
							var childPath = path + '.' + id;
							addEdge(path, childPath);						
							visitSubflowRecursive(id, childPath, child);							
						});
					} else {
						addSubflowNode(id, path, spec, node);
					}
				}
				
				subflowStart(node, subflowPath, id);
								
				visitSubflowRecursive(id, subflowPath, subflow);
				
				subflowFinish();				
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
							addTransitionSource({diags: {path: node.diags.path + '.' + id}, id: id}, node);							
						});						
					}

					if (node.children) {
						node.children.forEach(function (id, child) {
							visitNodeRecursive(child, node);
						});						
					}
					
					if (node.subflows) {
						node.subflows.forEach(function (id, subflow) {
							visitSubflow(id, subflow, node.diags.path + '.' + id, node);
						});
					}					

					clusterFinish();
				} else {			
					addNode(node);					
				}	
												
				visited[node.diags.path] = node;									
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
						var toPath = toNode.diags.path;

						// NOTE: graphviz doesn't support edges between clusters
						// the workaround is to make the edge between leaf nodes
						// then set the edge head or tail to the clusters
						// in this case only the head needs the workaround since the tail
						// is always attached to the transitionSource node
						// see: https://mailman.research.att.com/pipermail/graphviz-interest/2010q3/007276.html						
						var head;
						if (isCluster(toNode)) {
							head = makeClusterLabel(toNode.diags.path);
							
							while (toNode.children) {
								toNode = getAProperty(toNode.children);
							}
							toPath = toNode.diags.path;

							// if the toNode has transitions, then use one of them
							if (toNode.transitions) {
								toPath = toNode.diags.path + '.' + getAnId(toNode.transitions);
							} 
							// if the toNode is the child of a selector then it's a cluster
							// because of the selection button. so grab the button
							else if (toNode.parent.type === 'selector') {
								toPath = toNode.parent.diags.path + '.' + toNode.id;
							} 
							// if the toNode has subflows then it's a cluster, so grab
							// one of the subflow elements
							else if (toNode.subflows) {
								toPath = toNode.diags.path + '.' + getAnId(toNode.subflows);
							}
						}												
						addEdge(fromNode.diags.path + '.' + id, toPath, head);																						
					});
				}
			});						
										
			digraphFinish();
			
			return result;			
		};	
		
		function getPath(node) {
			var path = [];
			if (node.children) {
				path.push('');
			}
			while (node) {
				path.push(node.id);
				node = node.parent;
			}
			return path.reverse().join('/');
		}			
		function addDiagsRecursive(node) {
			node.diags = {path: getPath(node)};
			if (node.children) {
				node.children.forEach(function (id, child) {
					addDiagsRecursive(child);
				});
			}				
		}			
		addDiagsRecursive(flow.root);	
	}
	
	exports.instrument = instrument;
});