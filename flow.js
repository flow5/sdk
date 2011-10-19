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
	
	var Utils = require('./utils.js');
	
	function Flow() {

		var that = this;
						
		that.getNode = function (path) {
			function getChildRecursive(node, components) {
				if (components.length) {
					var child = node.children[components[0]];
					Utils.assert(child, 'Bad path');
					return getChildRecursive(child, components.slice(1));
				} else {
					return node;
				}
			}
			return getChildRecursive(that.root, path.split('/').slice(1));
		};
				
		// NOTE: in debug builds, validateSpec is called first. 
			// So this function does not need to do error checking
		that.injectGraph = function (graphSpec) {
			
			var nodes = {};	
						
			function getPath(node) {
				var path = [];
				while (node) {
					path.push(node.id);
					node = node.parent;
				}
				return path.reverse().join('/');
			}	
										
			function resolveSpec(node, spec) {
				// climbs up the hiearchy until a template with this name is found
				function resolveSpecRecursive(node, name) {
					if (node.children && node.children[name]) {
						return node.children[name];
					} else if (node.spec.templates && node.spec.templates[name]) {
						return node.spec.templates[name];
					} else if (node.parent) {
						return resolveSpecRecursive(node.parent, name);
					} else {
						Utils.assert(false, 'Could not find template: ' + name);
					}
				}
				
				if (typeof spec === 'object') {
					return spec;
				} else {
					return resolveSpecRecursive(node, spec);
				}
			}
			
			function findNodeUp(node, name) {
				if (node.children && node.children[name]) {
					return node.children[name];
				} else if (node.parent) {
					return findNodeUp(node.parent, name);
				} else {
					Utils.assert(false, 'Could not find name: ' + name);
				}
			}
			
			function injectNodeRecursive(id, nodeSpec, parent) {										
				var node = {id: id, type: nodeSpec.type, parent: parent, spec: nodeSpec, active: false};
								
				if (nodeSpec.children) {
					node.children = {};
					nodeSpec.children.forEach(function (id, childSpec) {
						var child = injectNodeRecursive(id, resolveSpec(node, childSpec), node);
						if (id === nodeSpec.active) {
							child.active = true;
						}
					});					
				}
												
				if (node.parent) {
					parent.children[id] = node;
				} else {
					nodes[node.id] = node;
				}
								
				return node;
			}			
						
			function resolveTransitionsRecursive(node) {				
				
				// normal flows
				if (node.spec.transitions) {
					node.transitions = {};
					node.spec.transitions.forEach(function (id, transition) {
						node.transitions[id] = findNodeUp(node, transition.to);
						resolveTransitionsRecursive(node.transitions[id]);

					});
				}
				
				if (node.spec.type === 'transition') {
					if (node.spec.to) {
						node.to = node.parent.children[node.spec.to];
						resolveTransitionsRecursive(node.to);						
					} else {
						node.to = null;
					}
				}
				
				// recurse
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
			that.root = injectNodeRecursive('root', graphSpec);
			
			// resolve transitions
			nodes.forEach(function (id, node) {
				resolveTransitionsRecursive(node);								
			});	
			
			setPathRecursive(that.root);

			that.root.active = true;
						
			// OPTION: remove the nodeSpecs?
		};				
	}
		
	exports.Flow = Flow;
});



/*
function injectSubflowRecursive(id, subflowSpec, parent, root) {					
	var node = {id: id, 
				type: subflowSpec.type, 
				path: getPath(root) + '.' + id,
				root: root, 
				spec: subflowSpec};
	if (subflowSpec.type === 'subflow') {
		node.subflows = {};
		subflowSpec.choices.forEach(function (id, choiceSpec) {
			injectSubflowRecursive(id, resolveSpec(root, choiceSpec), node, root);
		});
	} else if (subflowSpec.type === 'transition') {					
		// console.log('transition to: ' + node.to);
	}
	
	parent.subflows[id] = node;
}

if (nodeSpec.subflows) {
	node.subflows = {};
	nodeSpec.subflows.forEach(function (id, subflowSpec) {
		injectSubflowRecursive(id, resolveSpec(node, subflowSpec), node, node);
	});
}

*/


/*

SCHEMA

subflow
	subflows are flows that operate within a single node of the flow graph
	subflows allow a series of simple decisions to be made as in a flow chart
	each subflow corresponds to a controller method for getting a decision
		the children of the subflow represent the actions to follow the decision
		the choice is returned asynchronously by the controller
		the controller can decide however it likes:
			user input (via a standard diaglog interace, customizable)
			computation/examining the data model
			querying a webservice
		a subflow choice may not be 'to'
			'to' indicates that the subflow ends with a transition
			TODO: flag explicitly?





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
						
				
	- subflow
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