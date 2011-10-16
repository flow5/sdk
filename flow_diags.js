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


(function () {
	
	require('./jsext.js');
	
	
	function instrument(Flow) {
		
		// TODO: consider https://github.com/akidee/schema.js or related as a general schema validation solution
		
		
		Flow.prototype.validateGraphSpec = function (graphSpec) {
			
			var paths = {};

			function validateNodeSpecRecursive(nodeSpec, context) {
				
				if (context === undefined) {
					context = [];
				}
								
				function verify(condition, description) {
					if (!condition) {
						throw new Error(description + ' @' + JSON.stringify(nodeSpec)); // TODO: probably don't want to see the whole subtree						
					}
				}

				verify(nodeSpec.id, 'id field required');
				verify(typeof nodeSpec.id === 'string', 'id field must be a string');
				
				context = context.concat(nodeSpec.id);
				var path = context.join('/');
				verify(!paths[path], 'duplicate node path:' + path);
				paths[path] = true;
				
				
				if (nodeSpec.transitions) {
					verify(Array.isArray(nodeSpec.transitions), 'transitions must be array');
					nodeSpec.transitions.forEach(function (transition) {
						verify(typeof transition === 'object', 'transitions must be any object');
						verify(transition.name, 'transition requires a name field');
						verify(transition.to, 'transition requires a to field');
					});
				}
				
				if (nodeSpec.decisions) {
					verify(Array.isArray(nodeSpec.decisions), 'decisions must be array');
					nodeSpec.decisions.forEach(function (decision) {
						verify(decision.id, 'decision requires an id field');
						verify(decision.to, 'decision requires a to field');
						verify(typeof decision.to === 'object', 'a decision to field must be an object');
						decision.to.forEach(function (name, to) {
							verify(!to || typeof to === 'string', 'type of a decision choice must be null or string');
						});
					});
				}
				
				if (nodeSpec.type) {
					verify(typeof nodeSpec.type === 'string', 'type must be string');						
					
					switch (nodeSpec.type) {
					case 'mutex':
						verify(nodeSpec.selection, 'mutex requries a selection field');
						verify(nodeSpec.children, 'mutex requires a children field');				
						nodeSpec.children.forEach(function (nodeSpec) {
							validateNodeSpecRecursive(nodeSpec, context);
						});
						break;
					case 'flow':
						verify(nodeSpec.start, 'No start defined for flow');
						validateNodeSpecRecursive(nodeSpec.start, context);
						break;
					default:
						verify(false, 'Unknow node type:' + nodeSpec.type);
					}
				}

			
			}

			graphSpec.forEach(function (nodeSpec) {
				validateNodeSpecRecursive(nodeSpec);
			});
		};

		// creates DOT output representing the current Flow graph
		// TODO: highlight active children and double highlight active paths
		Flow.prototype.logToDOT = function () {

			var result = '';

			function quote(s) {
				return '\"' + s + '\"';
			}
			
			result += 'digraph {compound=true;rankdir=LR;';
			
			
			var visited = {};					
			function visitNode(path, node) {
				if (visited[path]) {
					return;			
				}
				visited[path] = true;

				if (node.children) {
					result += 'subgraph ' + quote('cluster:' + path) + ' {';			
					result += 'label=' + quote(node.id);

					node.children.forEach(function (child) {
						visitNode(child.path, child);
					});

					result += '}';
				} else {			
					result += quote(path) + ' [label=' + quote(node.id) + '];';					
				}									
			}
			
			this.nodes.forEach(function (path, node) {
				visitNode(path, node);
			});	
			
			result += '}';
			
			return result;		

		};		
	}
	
	exports.instrument = instrument;
	
}());