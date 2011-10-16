(function () {
	

/*
	static definition of a state represents the full state hierarchy at the time the state is entered
	
	
	usually transitions and conditions will not be implemented on states of type mutex or flow. they usually are implemented
	at the leaf node level
	
	
	generic state schema:	
		*type mutex | flow | undefined=leaf
		*transitions

	transition schema:
		name: {spec} | [option1:{spec},option2:{spec}]
	
		transition spec:
			*to: State
			parameters (maybe): {}
		
		if the transition is simple (just an object) then the transition executes immediately
		if the transition is complex (array) the the flow will call up through the hierachy to get the option
			this may result in a web service call or a modal dialog
				
	mutex schema: state with multiple children only one of which may be active at a time. movement between states is controlled by selection
	
		selection
		children
		
	flow schema: state with multiple children only one of which may be active. movement between states is controlled by transitions
	
		start: State // the initial (sub) state

	(maybe) group schema: state with multiple children all of which are active simultaneously
		children
	

	the Flow() object manages 'activeChild' as transitions and selections occur
	it also synthesizes back transitions, parent child relationships etc, paths etc.
	it also synthesizes nested state hierarchies based on transitions
	
	
	??? how to specify the transition root ????


	flow_diags
		schema validation with rich reporting
		dot output

*/

	function P_Flow() {
		
		this.nodes = {};
				
		// NOTE: considering making it possible to inject graphs, children, transitions on the fly
		// NOTE: in debug builds, validateSpec is called first. So this function does not need to 
		// do error checking
		this.injectGraph = function (graphSpec) {
			
			function createNodesRecursive(nodeSpec, context) {
				if (context === undefined) {
					context = [];
				}
				
				context = context.concat(nodeSpec.id);
				var path = context.join('/');
								
				var node = {id: nodeSpec.id, path: path};
				this.nodes[path] = node;
				
				switch (nodeSpec.type) {
				case 'mutex':
					node.children = [];
					var that = this;
					nodeSpec.children.forEach(function (nodeSpec) {
						node.children.push(createNodesRecursive.apply(that, [nodeSpec, context]));
					});
					break;
				case 'flow':
					node.children = [];
					node.children.push(createNodesRecursive.apply(this, [nodeSpec.start, context]));
					break;
				}
				
				return node;
			}
			
			// TODO: utility to keep this around in forEach?
			var that = this;
			graphSpec.forEach(function (nodeSpec) {
				createNodesRecursive.apply(that, [nodeSpec]);
			});				
		};				
	}
	

	function Flow() {
		
	}
	Flow.prototype = new P_Flow();

	
	exports.Flow = Flow;
				
}());