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

F5.registerModule(function (F5) {

	function instrument (cb) {
		var flow = F5.Global.flow;

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

		flow.diags.isSubflowActive = function (node) {
			while (!node.activeSubflow && node.parent) {
				node = node.parent;
			}
			return node.activeSubflow;
		};

		// TODO: use with caution. there may eventually be more than one
		flow.diags.getActiveLeafNode = function () {
			var node = flow.root;
			while (node.selection) {
				node = node.selection;
			}
			if (node.activeSubflow) {
				node = node.activeSubflow;
			}
			return node;
		};		

		// creates JSON representation of the current Flow graph
		flow.diags.toJSON = function (node) {
			
			var filteredCopy = {};

			function isReference(id) {
				return {parent: true,
						selection: true,
						node: true,
						to: true,
						back: true}[id];
			}

			function copyForPrettyPrintRecursive(obj) {
				/*global HTMLDivElement */
				if (obj.constructor === HTMLDivElement) {
					console.log('div');
				}
				
				var copy = {};
				F5.forEach(obj, function (id, child) {
					if (child && typeof child === 'object') {
						if (id === 'pending') {
							copy[id] = '[' + child.length +']';
						} else if (child.constructor === Array) {
							copy[id] = [];
							F5.forEach(child, function (item) {
								copy[id].push(copyForPrettyPrintRecursive(item));
							});
						} else {
							// break cycles and use paths to indicate references
							if (isReference(id)) {
								copy[id] = '[-> ' + child.path + ']';
							} else if (id !== 'view' && id !== 'menu' && id !== 'flowDelegate') {
								copy[id] = copyForPrettyPrintRecursive(child);
							}							
						}
					} else {
						copy[id] = child;
					}
				});
				return copy;
			}	

			// NOTE: stringify strips out any fields with function objects
			return JSON.stringify(copyForPrettyPrintRecursive(node || flow.root, ''));
		};

		// creates DOT representation of the current Flow graph
		flow.diags.toDOT = function () {

			var that = this;

			var result = '';

			// TODO: I think this can go away
			var visited = {};	

			// used for cluster/edge workaround below
			function getAProperty(obj) {
				var name;
				for (name in obj) {
					if (obj.hasOwnProperty(name)) {
						return obj[name];
					}
				}
			}
			function getAnId(obj) {
				var name;
				for (name in obj) {
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

				F5.forEach(attributes, function (attribute) {
					statement += attribute + ',';
				});

				statement += ']';

				return statement;
			}

			function isCluster(node) {
				return node.transitions || node.children || node.subflows || 
									(node.parent && node.parent.type === 'set');
			}

			function activeColorAttribute(attr) {
				var colors = {
					color: '="white"',
					fillcolor: '="lightgrey"'
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
				var pathActive = flow.isNodePathActive(node);

				if (flow.diags.isSubflowActive(node)) {
					pathActive = false;
					nodeActive = false;
				}

				if (pathActive) {
					return ['color="white"', 'penwidth=1.5', 'fillcolor="darkgrey"'];
				} else if (nodeActive) { 
					return ['color="lightgrey"', 'penwidth=1', 'fillcolor="grey"'];
				} else {
					return ['color="black"', 'penwidth=1.0', 'fillcolor="grey"'];
				}
			}

			function addNode(node) {
				var attributes = [
					makeLabel(node.id),
					'fontname="Arial"',
					'style="filled"',
					'shape=box',
					'fontsize=18',		
					'id=' + quote('svg-' + node.path)			
				].concat(getActiveNodeStyle(node));				

				result += quote(node.path) + formatAttributes(attributes);
			}

			function addSelectionButton(node, parent, id) {
				var fillColor, color;
				if (flow.isNodePathActive(parent) && !flow.diags.isSubflowActive(parent) && !node.active) {
					fillColor = activeColorAttribute('fillcolor');
					color = activeColorAttribute('color');					
				} else {
					fillColor = inactiveColorAttribute('fillcolor');
					color = 'color="black"';					
				}				
				var idAttribute = 'id=' + quote('svg-' + parent.path + ':doSelection' + '_' + id);
				var attributes = [
					makeLabel('Select'),
					'fontname="Arial"',
					'style="filled"',
					'shape=box',
					'width=0',
					'height=0',
					'fontsize=16',
					fillColor,
					color,
					idAttribute
				];				

				result += quote(parent.path + '_' + id) + formatAttributes(attributes);
			}

			function addTransitionSource(node, id) {
				var fillColor, color;
				if (flow.isNodePathActive(node) && !flow.diags.isSubflowActive(node)) {
					fillColor = activeColorAttribute('fillcolor');
					color = activeColorAttribute('color');
				} else {
					fillColor = inactiveColorAttribute('fillcolor');
					color = 'color="black"';
				}

				// height=0 and width=0 makes the box just accomodate the text				
				var attributes = [
					makeLabel(id),
					'fontname="Arial"',
					'fontsize=16',
					'style="filled"',					
					'margin="0.25,0.0"',
					'penwidth=1',
					fillColor,
					color,					
					'shape=box', 
					'height=0', 
					'width=0',
					'id=' + quote('svg-' + node.path + ':doTransition' + '_' + id)
				];				
				result += quote(node.path + '_' + id) + formatAttributes(attributes); 
			}

			function addSubflowSource(node, id) {
				var fillColor, color;
				if (flow.isNodePathActive(node) && !flow.diags.isSubflowActive(node)) {
					fillColor = activeColorAttribute('fillcolor');
					color = activeColorAttribute('color');
				} else {
					fillColor = inactiveColorAttribute('fillcolor');
					color = 'color="black"';
				}

				var shape;
				if (id === 'WillBecomeActive' || id === 'DidBecomeActive') {
					shape = 'shape=octagon';
				} else {
					shape = 'shape=box';
				}

				// height=0 and width=0 makes the box just accomodate the text				
				var attributes = [
					makeLabel(id),
					'fontname="Arial"',
					'fontsize=16',
					'style="filled"',					
					'margin="0.25,0.0"',
					'penwidth=1',
					fillColor,
					color,					
					shape, 
					'height=0', 
					'width=1.25',
					'id=' + quote('svg-' + node.path + ':doSubflow' + '_' + id)
				];				
				result += quote(node.path + '_' + id) + formatAttributes(attributes); 
			}									

			function addEdge(from, to, head) {																																
				var attributes = [
					'fontname="Arial"',
					'arrowhead="vee"',
					'arrowsize=.5',
					'minlen=2',
	//				'dir="both"',
	//				'arrowtail="odot"',
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
					'fontname="Arial"',
	//				'splines="ortho"',
					'nodesep=.25'				
				].join(';');
				result += 'digraph {' + attributes + ';';
			}

			function digraphFinish() {
				result += '}';				
			}

			function clusterStart(node) {
				var attributes = [
					'style="filled"',
					'fontname="Arial"',
					'fontsize=18',	
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
				if (node.activeSubflow === subflow) {
					fillColor = 'fillcolor="darkgrey"';
				} else {
					fillColor = inactiveColorAttribute('fillcolor');
				}

				var attributes = [
					'fontname="Arial"',
					'fontsize=16',
					'fontcolor="black"',
					'color="black"',
					'penwidth=1',
					'style="filled"',
					fillColor,
					'id=' + quote('svg-' + subflow.path)
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

					return node.activeSubflow === subflow;
				}	
				function isTerminal() {
					return !subflow.choices[choice] || (typeof subflow.choices[choice] === 'string');
				}			
				function isSubflowAvailable() {		
					return node.activeSubflow === subflow;			
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
					'fontname="Arial"',
					'style="filled"',
					fillColor,
					color,
					shapeAttribute,
					'penwidth=1',
					'width=0',
					'height=0',
					'margin="0.25,0.0"',
					'fontsize=16',
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
						F5.forEach(subflow.choices, function (id, child) {
							addChoiceNode(subflow, id, node);													
						});
						subflowFinish();										
						F5.forEach(subflow.choices, function (id, child) {
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

					if (node.subflows) {
						F5.forEach(node.subflows, function (id, subflow) {
							addSubflowSource(node, id);	
							visitSubflow(id, subflow, node);
							addEdgeToSubflow(node, node.path + '_' + id, subflow);
						});
					}										

					if (parent && parent.type === 'set') {
						addSelectionButton(node, parent, node.id);
					}

					if (node.transitions) {
						F5.forEach(node.transitions, function (id) {
							addTransitionSource(node, id);								
						});						
					}

					if (node.children) {
						F5.forEach(node.children, function (id, child) {
							visitNodeRecursive(child, node);
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
			visitNodeRecursive(flow.root);

			// create the transition edges
			F5.forEach(visited, function (path, fromNode) {
				if (fromNode.transitions) {
					F5.forEach(fromNode.transitions, function (id, transition) {
						var toNode = transition.to;
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
							// if the toNode is the child of a set then it's a cluster
							// because of the selection button. so grab the button
							else if (toNode.parent.type === 'set') {
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
		
		cb();
	}
	
	if (typeof document === 'undefined') {
		instrument(function () {});
	} else {
		F5.Global.flowController.addWaitTask(instrument);
	}
	
});
