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

define('flow', exports, function (exports) {
	
	function P_Flow() {

		var that = this;
		
				
		that.nodes = {};
				
		// NOTE: considering making it possible to inject graphs, children, transitions on the fly
		// NOTE: in debug builds, validateSpec is called first. 
			// So this function does not need to do error checking
		that.injectGraph = function (graphSpec) {
			
			var nodes = {};			
			
			function injectNodeRecursive(id, nodeSpec, parent) {										
				var node = {id: id, type: nodeSpec.type, parent: parent, spec: nodeSpec};
								
				switch (nodeSpec.type) {
				case 'selector':
					node.children = {};
					nodeSpec.children.forEach(function (id, nodeSpec) {
						injectNodeRecursive(id, nodeSpec, node);
					});
					break;
				case 'flow':
					node.children = {};
					injectNodeRecursive(nodeSpec.active, nodeSpec.children[nodeSpec.active], node);
					break;
				}
				
				if (node.parent) {
					parent.children[id] = node;
				} else {
					nodes[node.id] = node;
				}
								
				return node;
			}
			
			function getContainer(node, containerLevel) {
				if (!containerLevel) {
					return null;
				}
				while (containerLevel) {
					node = node.parent;
					containerLevel -= 1;
				}
				return node;
			}
			
			function getPath(node) {
				var path = [];
				while (node) {
					path.push(node.id);
					node = node.parent;
				}
				return path.reverse().join('/');
			}
						
			function resolveTransitionsRecursive(node) {
				if (node.spec.transitions) {
					node.transitions = {};
					node.spec.transitions.forEach(function (id, transition) {	
														
						// inject states based on requested transitions
						// NOTE: containerLevel = 0 means use the root
						var container = getContainer(node, transition.containerLevel);

						// TODO: Move to validation
						if (container && container.type === 'selector') {
							throw new Error('Cannot transition inside a selector');
						}

						var target = nodes[transition.to];	
						
						// look for this state in the container
						var child;
						if (container) {
							child = container.children[target.id];
						} else {
							child = nodes[target.id];
						}
						
						if (child) {
							target = child;
						} else {
							target = injectNodeRecursive(target.id, target.spec, container);							
						}
												
						resolveTransitionsRecursive(target);

						node.transitions[id] = target;							
					});
				}
				if (node.children) {
					node.children.forEach(function (id, child) {
						resolveTransitionsRecursive(child);
					});
				}				
			}
			
			function setPathRecursive(node) {
				node.path = getPath(node);
				if (node.children) {
					node.children.forEach(function (id, child) {
						setPathRecursive(child);
					});
				}
			}
									
			// inject nodes
			graphSpec.forEach(function (id, nodeSpec) {
				injectNodeRecursive(id, nodeSpec);
			});	
			
			// resolve transitions
			nodes.forEach(function (id, node) {
				resolveTransitionsRecursive(node);								
			});	

			// set paths
			nodes.forEach(function (id, node) {
				setPathRecursive(node);				
				// only record the top level states
				that.nodes[node.path] = node;					
			});	
			
			// TODO: prune unreachable paths after initialization
			// OPTION: remove the node specs?
		};				
	}
	

	function Flow() {
		
	}
	Flow.prototype = new P_Flow();
	
	exports.Flow = Flow;
});





/*

Flow Documentation

- each step in the flow can have:
		
	- selection
		legal only for selector type step
		activates a child
		no interaction with controller

	- transition
		specifies the field of the data model which is passed
			on step initialization, there's a hook to transform input parameters into a form that can be used this way
			default behavior is that the input parameters to a step are used as its model			
		passes parameters to a new step
		no interaction with controller
		
		transitions: {
			viewSlideshow: {
				to:'slideshow'
				value:'selection'			
			}
		}

		itemElement.addTapListener(function () {
			step.setValue('selection',list[index]);
			step.transition('viewSlideshow');		
		});
						
				
	- invocation
		delegates to the controller method of that name
		controller can do whatever it likes		
			- perform a computation
			- request user input
			- request data from a network service
			- examine the data model
		calls back with result
		result can be evaluated and further invocations can be chained into a decision tree
		
		invocations: {
			simple:null, // just invoke
			complex:{ // result selects next action
				yes:{
					type:invocation, ??
					
				}
				no:
			}
		}

flowcontroller prototype is what does everything except the delegate methods which include
	initialize
	valueChange




	static definition of a state represents the full state hierarchy at the time the state is entered
	
	
	usually transitions and conditions will not be implemented on states of type selection or flow.
	they usually are implemented
	at the leaf node level
	
	
	generic state schema:	
		*type selection | flow | undefined=leaf
		*transitions

	transition schema:
		name: {spec} | [option1:{spec},option2:{spec}]
	
		transition spec:
			*to: State
			parameters (maybe): {}
		
		if the transition is simple (just an object) then the transition executes immediately
		if the transition is complex (array) the the flow will call up through the hierachy to get the option
			this may result in a web service call or a modal dialog
				
	selection schema: state with multiple children only one of which may be active at a time. 
		movement between states is controlled by selection
	
		selection
		children
		
	flow schema: state with multiple children only one of which may be active. 
		movement between states is controlled by transitions
	
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