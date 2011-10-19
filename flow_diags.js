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
	
	var Utils = require('./utils.js');
	
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
		// TODO: highlight active children and double highlight active paths
		flow.toDOT = function (outputStream) {
			
			var that = this;

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
			
			function isCluster(node) {
				// all but leaf nodes which don't specify type
				return node.type;
			}
			
			function getActiveStyle(node) {
				var nodeActive = node.active;
				var pathActive = node.active;
				while (pathActive && node.parent) {
					node = node.parent;
					pathActive = node.active;
				}
				
				if (pathActive) {
					return ['color="blue"', 'penwidth=2.0', 'fillcolor="white"'];
				} else if (nodeActive) {
					return ['color="black"', 'penwidth=1.0', 'fillcolor="lightgrey"'];
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
				].concat(getActiveStyle(node));				
				
				result += quote(node.path) + formatAttributes(attributes);
			}
			
			function addTransitionSource(node) {
				// height=0 and width=0 makes the box just accomodate the text				
				var attributes = [
					makeLabel(node.id),
					'fontname="courier new"',
					'fontsize=10',
					'style="filled"',					
					'margin="0.1,0.0"',
					'penwidth=0.6',
					'fillcolor="lightblue"',
					'shape=box', 
					'height=0', 
					'width=1.25',
					'id=' + quote('xx' + node.path)
				];				
				result += quote(node.path) + formatAttributes(attributes); 
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
				].concat(getActiveStyle(node)).join(';');

				result += 'subgraph ' + quote(makeClusterLabel(node.path)) + ' {' + attributes;
				result += makeLabel(node.id);
			}
			
			function clusterFinish() {
				result += '}';
			}
			
			function subflowStart(path, id) {
				var attributes = [
					'fontname="courier"',
					'fontsize=12',
					'fontcolor="green"',
					'color="black"',
					'penwidth=.6',
					'style="filled"',
					'fillcolor="lightgreen"'
				].join(';');
				
				var clusterLabel = quote(makeClusterLabel(path));
				result += 'subgraph ' + clusterLabel + ' {' + attributes;
				result += makeLabel('');
			}				
			
			function subflowFinish() {
				result += '}';
			}
			
			function addSubflowNode(id, path, terminate) {
				var attributes = [
					makeLabel(id),
					'fontname="courier new"',
					'style="filled"',
					terminate ? 'fillcolor="lightblue"' : 'fillcolor="white"',
					'shape=box',
					'penwidth=.6',
					'width=0',
					'height=0',
					'margin="0.1,0.0"',
					'fontsize=10',
				];				
				
				result += quote(path) + formatAttributes(attributes);
			}
									
			function visitSubflow(subflow) {
				function visitSubflowRecursive(id, path, spec) {					
					if (spec && typeof spec === 'object') {
						addSubflowNode(id, path);						
						spec.forEach(function (id, child) {
							var childPath = path + '.' + id;
							addEdge(path, childPath);						
							visitSubflowRecursive(id, childPath, child);							
						});
					} else if (spec) {
						addSubflowNode(spec, path, 'terminate');
					} else {
						addSubflowNode(id, path);
					}
				}
				
				subflowStart(subflow.path, subflow.id);
								
				var spec = subflow.spec;
				delete spec.type;
				visitSubflowRecursive(subflow.id, subflow.path, spec);
				
				subflowFinish();				
			}
																			
			function visitNodeRecursive(node) {
				if (isCluster(node)) {
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
					
					if (node.subflows) {
						node.subflows.forEach(function (id, subflow) {
							visitSubflow(subflow);
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
			this.root.children.forEach(function (id, node) {
				visitNodeRecursive(node);
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
						var head;
						var toPath = toNode.path			
						if (isCluster(toNode)) {
							head = makeClusterLabel(toNode.path);
							while (toNode.children) {
								toNode = getAProperty(toNode.children);
							}
							toPath = toNode.path;

							// if the to node has transitions, then use one of them
							if (toNode.transitions) {
								toPath = toNode.path + '.' + getAnId(toNode.transitions);
							}
						}												
						addEdge(fromNode.path + '.' + id, toPath, head);																						
					});
				}
			});						
										
			digraphFinish();
			
			// TODO: REFACTOR
			if (outputStream === 'stderr') {
				console.error(result);
			} else if (outputStream === 'devserv') {
				Utils.post('dot2svg', result, function (response) {
					function makeClick(el) {
						el.onclick = function () {	
							var parts = el.id.replace('xx', '').split('.');
							var path = parts[0];
							var id = parts[1];
							
							flowController.doTransition(that.getNode(path), id);							
						};
					}
					if (typeof document !== 'undefined') {
						document.body.style['background-color'] = 'darkslategray';
						document.body.innerHTML = response;
						document.body.style['text-align'] = 'center';
						
						document.getElementById('graph1').querySelector('polygon').setAttribute('fill', 'darkslategray');
						document.getElementById('graph1').querySelector('polygon').setAttribute('stroke', '');
						var clickable = document.querySelectorAll('[id*=xx]');
						for (var i = 0; i < clickable.length; i += 1) {
							makeClick(clickable[i]);
						}
					}
				});
			} else {
				console.log(result);								
			}
		};		
	}
	
	exports.instrument = instrument;
});