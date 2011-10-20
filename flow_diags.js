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
	
	function instrument(flow) {
		
		// OPTION: consider https://github.com/akidee/schema.js or related as a general schema validation solution
				
		flow.toJSON = function (outputStream) {
			
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
			
			filterNodesRecursive(this.root.children, filteredCopy);
			
			if (outputStream === 'stderr') {
				console.error(JSON.stringify(filteredCopy));
			} else {
				console.log(JSON.stringify(filteredCopy));
			}
		};

		// creates DOT output representing the current Flow graph
		flow.toDOT = function () {
			
			var that = this;

			var result = '';
			
			// TODO: I think this can go away
			var visited = {};					

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
				var pathActive = that.isNodePathActive(node);
				
				if (that.activeSubflow) {
					pathActive = false;
					nodeActive = false;
				}
				
				if (pathActive) {
					return ['color="blue"', 'penwidth=1.0', 'fillcolor="lightskyblue"'];
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
				].concat(getActiveNodeStyle(node));				
				
				result += quote(node.path) + formatAttributes(attributes);
			}

			function addSelectionButton(node, parent, id) {
				var fillColor, color;
				if (that.isNodePathActive(parent) && !that.activeSubflow && !node.active) {
					fillColor = activeColorAttribute('fillcolor');
					color = activeColorAttribute('color');					
				} else {
					fillColor = inactiveColorAttribute('fillcolor');
					color = 'color="black"';					
				}				
				var idAttribute = 'id=' + quote(parent.path + '.' + id + '-doSelection');
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
				
				result += quote(parent.path + '.' + id) + formatAttributes(attributes);
			}
						
			function addBackButton() {
				var fillColor, color;
				if (that.controller.hasBack()) {
					fillColor = activeColorAttribute('fillcolor');
					color = activeColorAttribute('color');
				} else {
					fillColor = inactiveColorAttribute('fillcolor');
					color = inactiveColorAttribute('color');
				}				
				var attributes = [
					makeLabel('Back'),
					'fontname=courier',
					'style="filled,rounded"',
					'shape=box',
					'width=0',
					'height=0',
					'fontsize=10',
					'id="back-button"',
					fillColor,
					color				
				];				
				
				result += quote('back-button') + formatAttributes(attributes);
			}			
			
			function addTransitionSource(source, node) {
				var fillColor, color;
				if (that.isNodePathActive(node) && !that.activeSubflow) {
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
					'id=' + quote(source.path + '-doTransition')
				];				
				result += quote(source.path) + formatAttributes(attributes); 
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
//					'splines="ortho"'				
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
					'bgcolor="gray"'													
				].concat(getActiveNodeStyle(node)).join(';');

				result += 'subgraph ' + quote(makeClusterLabel(node.path)) + ' {' + attributes;
				result += makeLabel(node.id);
			}
			
			function clusterFinish() {
				result += '}';
			}
			
			function subflowStart(path, id) {
				var fillColor;
				// TODO: this can do the wrong thing if the name of one subflow
				// is a substring of another one
				if (that.activeSubflow && that.activeSubflow.path.match(path)) {
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
					fillColor
				].join(';');
				
				var clusterLabel = quote(makeClusterLabel(path));
				result += 'subgraph ' + clusterLabel + ' {' + attributes;
				result += makeLabel('');
			}				
			
			function subflowFinish() {
				result += '}';
			}
			
			function addSubflowNode(id, path, node) {
				// TODO: this logic fails if a subflow has more than one node with the same name
				function isSubflowAvailable() {
					function isSubflowStart() {	
						return !that.activeSubflow && node.subflows[id];					
					}
					function isCurrentSubflowChoice() {
						return that.activeSubflow &&
								that.activeSubflow.node === node && 
								that.activeSubflow.spec.hasOwnProperty(id);
					}
					
					return that.isNodePathActive(node) && (isSubflowStart() || isCurrentSubflowChoice());
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
				
				var attributes = [
					makeLabel(id),
					'fontname="courier new"',
					'style="filled"',
					fillColor,
					color,
					'shape=box',
					'penwidth=.6',
					'width=0',
					'height=0',
					'margin="0.1,0.0"',
					'fontsize=10',
					idAttribute
				];				
				
				result += quote(path) + formatAttributes(attributes);
			}
									
			function visitSubflow(subflow, subflowPath, node) {
				function visitSubflowRecursive(id, path, spec) {					
					if (spec && typeof spec === 'object') {
						addSubflowNode(id, path, node);						
						spec.forEach(function (id, child) {
							var childPath = path + '.' + id;
							addEdge(path, childPath);						
							visitSubflowRecursive(id, childPath, child);							
						});
					} else if (spec) {
						// TODO: show the transition name?
						addSubflowNode(id, path, node);
					} else {
						addSubflowNode(id, path, node);
					}
				}
				
				subflowStart(subflowPath, subflow.id);
								
				var spec = subflow.spec;
				delete spec.type;
				visitSubflowRecursive(subflow.id, subflowPath, spec);
				
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
							addTransitionSource({path: node.path + '.' + id, id: id}, node);							
						});						
					}

					if (node.children) {
						node.children.forEach(function (id, child) {
							visitNodeRecursive(child, node);
						});						
					}
					
					if (node.subflows) {
						node.subflows.forEach(function (id, subflow) {
							visitSubflow(subflow, node.path + '.' + id, node);
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
			
			addBackButton();
									
			// create the nodes
			this.root.children.forEach(function (id, node) {
				visitNodeRecursive(node, that.root);
			});	
			
			// create the transition edges
			visited.forEach(function (path, fromNode) {
				if (fromNode.transitions) {
					fromNode.transitions.forEach(function (id, toNode) {
						// NOTE: graphviz doesn't support edges between clusters
						// the workaround is to make the edge between leaf nodes
						// then explicitly set the edge head and tail to the clusters
						// in this case only the head needs the workaround since the tail
						// is always attached to the transitionSource node
						// see: https://mailman.research.att.com/pipermail/graphviz-interest/2010q3/007276.html
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
						var head;
						var toPath = toNode.path;
						if (isCluster(toNode)) {
							head = makeClusterLabel(toNode.path);
							while (toNode.children) {
								toNode = getAProperty(toNode.children);
							}
							toPath = toNode.path;

							// if the toNode has transitions, then use one of them
							if (toNode.transitions) {
								toPath = toNode.path + '.' + getAnId(toNode.transitions);
							} 
							// if the toNode is the child of a selector then it's a cluster
							// for the selection button. so grab the button
							else if (toNode.parent.type === 'selector') {
								toPath = toNode.parent.path + '.' + toNode.id;
							} else if (toNode.subflows) {
								toPath = toNode.path + '.' + getAnId(toNode.subflows);
							}
						}												
						addEdge(fromNode.path + '.' + id, toPath, head);																						
					});
				}
			});						
										
			digraphFinish();
			
			return result;			
		};		
	}
	
	exports.instrument = instrument;
});