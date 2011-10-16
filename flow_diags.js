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