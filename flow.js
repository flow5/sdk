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
		
		that.activeSubflow = null;
						
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
			// slice(1) because paths start with '/'
			return getChildRecursive(that.root, path.split('/').slice(1));
		};
		
		this.isNodePathActive = function (node) {
			var active = node.active;
			while (active && node.parent) {
				node = node.parent;
				active = node.active;
			}
			return active;
		};	
				
		// NOTE: in debug builds, validateSpec is called first. 
			// So this function does not need to do error checking
		that.injectGraph = function (graphSpec) {
			
			function getPath(node) {
				var path = [];
				while (node) {
					path.push(node.id);
					node = node.parent;
				}
				return path.reverse().join('/');
			}	
										
			// returns the spec if object or finds a matching template
			function resolveSpec(node, spec) {
				function resolveSpecUp(node, name) {
					if (node.spec.templates && node.spec.templates[name]) {
						return node.spec.templates[name];
					} else if (node.parent) {
						return resolveSpecUp(node.parent, name);
					} else {
						Utils.assert(false, 'Could not find template: ' + name);
					}
				}
				
				if (typeof spec === 'object') {
					return spec;
				} else {
					return resolveSpecUp(node, spec);
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
				var node = {id: id, 
							type: nodeSpec.type, 
							parent: parent, 
							spec: nodeSpec, 
							active: false};
								
				if (nodeSpec.children) {
					node.children = {};
					Utils.assert(nodeSpec.activeChild, 'Parent nodes must declare their active child');
					nodeSpec.children.forEach(function (id, childSpec) {
						var child = injectNodeRecursive(id, resolveSpec(node, childSpec), node);
						if (id === nodeSpec.activeChild) {
							node.activeChild = child;
							child.active = true;
						}
					});					
				}			
				
				if (nodeSpec.subflows) {
					node.subflows = {};
					nodeSpec.subflows.forEach(function (id, subflowSpec) {
						node.subflows[id] = {id: id, type: 'subflow', spec: resolveSpec(node, subflowSpec)};
					});
				}
												
				if (node.parent) {
					parent.children[id] = node;
				}
								
				return node;
			}			
						
			function resolveTransitionsRecursive(node) {				
				
				if (node.spec.transitions) {
					Utils.assert(node.type === 'flow', 'A node with transitions must be of type flow');
					node.transitions = {};
					node.spec.transitions.forEach(function (id, transition) {
						node.transitions[id] = findNodeUp(node, transition.to);
						resolveTransitionsRecursive(node.transitions[id]);

					});
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
			that.root = injectNodeRecursive('', graphSpec);
			
			// resolve transitions
			resolveTransitionsRecursive(that.root);								
			
			setPathRecursive(that.root);

			that.root.active = true;
						
			// OPTION: remove the nodeSpecs?
		};				
	}
		
	exports.Flow = Flow;
});



/*

TODO: CLEAN THIS UP

SCHEMA

(root): node
	type: selector|flow|subflow
	active: id 
	templates
		nodes
	children
		nodes
		alises (parser will go through templates until it finds a template with that name)
	transitions
		to: id (parser will go up until it finds a node with that name)
	



subflows
	subflows allow flowchart semantics to be attached to states
	subflows are a linked series of controller actions where the result of one action triggers the next
		callbacks are async
		default behavior is to request data from the user
		client may provide a subflow controller (uses same mapping logic) to delegate subflow actions
			to examine the data model
			to request data from a server
	
	the subflow has a reference to the node that uses it

	logically a subflow operates within a state

	a controller action may trigger a transition (I think this is needed for things like login flow)



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


flowcontroller prototype is what does everything except the delegate methods which include
	initialize
	valueChange


	static definition of a state represents the full state hierarchy at the time the state is entered
	
	
	usually transitions and conditions will not be implemented on states of type selection or flow.
	they usually are implemented
	at the leaf node level
	
	

	(maybe) group schema: state with multiple children all of which are active simultaneously
		children
	
*/