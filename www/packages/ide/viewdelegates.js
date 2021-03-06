/***********************************************************************************************************************

	Copyright (c) 2012 Paul Greyson

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
/*global F5, IDE, JSONFormatter, io*/

F5.registerModule(function (F5) {

	var socket;
	var modelListeners = {};

	F5.Global.flowController.addWaitTask(function (cb) {
		var socketioScript = document.createElement('script');
		socketioScript.src = F5.query.devserv + '/socket.io/socket.io.js';
		document.head.appendChild(socketioScript);
		socketioScript.onload = function () {
			socket = io.connect(F5.query.devserv);

			socket.on('message', function (message) {
				try {
					if (message && message.model) {
						var model = JSON.parse(message.model);
						F5.forEach(modelListeners, function (id, listener) {
							listener.update(model);
						});
					} else {

					}
				} catch (e) {
					console.log(e.message);
				}
			});
		};
		cb();
	});


	function Root() {

		function send(command) {
			if (socket) {
				socket.emit('message', command);
			}
		}

		this.initialize = function () {
			var that = this;
			this.widgets.resetbutton.setAction(function () {
				send({type: 'reset'});
			});
			this.widgets.refreshbutton.setAction(function () {
				that.update();
			});
			this.widgets.backbutton.setAction(function () {
				send({type: 'back'});
			});
			this.widgets.framesbutton.setAction(function () {
				send({type: 'frames'});
			});
		};

		this.update = function () {
			send({type: 'update'});
		};

		this.viewDidBecomeActive = function () {
			this.update();

			var parameters = F5.parseUrlParameters();
			if (parameters['openid.identity']) {
				parameters.url = location.origin + location.pathname;
				F5.execService(this.node, 'verify', parameters,
					function success(result, status) {
						if (result.status === 'ok') {
							F5.alert('Welcome', result.authentication.email);
						} else {
							F5.alert('Sorry', 'Authentication Failed');
						}
						console.log(result);
					},
					function error(status) {
						console.log(status);
					});
			}
		};
	}

	function Model() {

		this.initialize = function () {
			this.json = F5.getElementById(this.el, 'json');
		};

		this.viewWillBecomeActive = function () {
			modelListeners[this.node.path] = this;
			F5.Global.flow.root.view.delegate.update();
		};

		this.viewWillBecomeInactive = function () {
			delete modelListeners[this.node.path];
		};


		this.update = function (model) {
			var jsonFormatter = new JSONFormatter();
			this.json.innerHTML = jsonFormatter.valueToHTML(model);
			jsonFormatter.attachListeners();


			function collapse(node) {
				if (!node.active) {
					var div = document.getElementById('json-' + node.path);

					var collapser = div.parentElement.firstChild;
					if (F5.hasClass(collapser, 'collapser')) {
						jsonFormatter.collapse(collapser);
					}
				}
				if (node.children) {
					F5.forEach(node.children, function (id, child) {
						collapse(child);
					});
				}
			}

			collapse(model);
		};
	}

	function Graph() {
		var sequenceNumber = 0;

		this.initialize = function () {
			this.svg = F5.getElementById(this.el, 'svg');
		};

		this.viewWillBecomeActive = function () {
			modelListeners[this.node.path] = this;
			F5.Global.flow.root.view.delegate.update();
		};

		this.viewWillBecomeInactive = function () {
			delete modelListeners[this.node.path];
		};

		this.update = function (model) {

			var dot = this.toDOT(model);

			var that = this;

			sequenceNumber += 1;

			F5.doXHR('POST', 'dot2svg', dot, function (response, status, headers) {

				if (parseInt(headers['sequence-number'], 10) !== sequenceNumber) {
					return;
				}

				function makeClick(el) {
					el.onclick = function () {
						try {
							var parts = el.id.replace('svg-', '').split(':');
							var nodePath = parts[0].split('_')[0];
							if (parts[1]) {
								var method = parts[1].split('_')[0];

								if (method) {
									var components = nodePath.split('-').splice(1);
									var id = parts[1].split('_')[1];

									F5.Global.flowController[method](F5.Global.flow.getNodeFromPath(nodePath), id, function () {

									});
								}
							}
						} catch (e) {
							console.log('Exception: ' + e.message);
						}

					};
				}

				that.svg.innerHTML = response;

				var svg = that.svg.querySelector('svg');

				var transform = svg.querySelector('g').getAttribute('transform');
				transform = transform.replace('scale(1 1)', 'scale(0.4 0.4)');
				svg.querySelector('g').setAttribute('transform', transform);

				// Make the main poly the same color as background
				// OPTION: would be nice to do this on the DOT side
				document.getElementById('graph1').querySelector('polygon').setAttribute('fill', 'darkslategray');
				document.getElementById('graph1').querySelector('polygon').setAttribute('stroke', '');

				// the clickable elements have id with / prefix
				F5.forEach(document.querySelectorAll('[id^="svg-"]'), function (el) {
					makeClick(el);
				});

				// determine the offset of the current node
//				var activeLeafNode = F5.Global.flow.getActiveLeafNode();

//				var svgElementBBox = document.getElementById('svg-' + activeLeafNode.path).getBBox();
//				var svgRootBBox = svg.getBBox();

//				var offset = {x: svgElementBBox.x - svgRootBBox.width * 0.4,
//								y: svgRootBBox.height + svgElementBBox.y + svgRootBBox.height * 0.4};

//				that.svgFrame.style['-webkit-transform'] =
//								'translate3d(' + -offset.x * 0.4 + 'px,' + -offset.y * 0.4 + 'px, 0px)';
			}, function (error) {
				console.log('error');
			}, {'sequence-number': sequenceNumber});
		};

		// creates DOT representation of the current Flow graph
		this.toDOT = function (model) {
			// deserialize from the model
			var flow = F5.objectFromPrototype(F5.Flow);

			// TODO: is F5.query.app really required? thinks work so far without. . .
			flow.initialize(F5.query.app, model);

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
				return node.transitions || (node.children && Object.keys(node.children).length) ||
									(node.parent && node.parent.type === 'tabset');
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
				if (flow.isNodePathActive(parent) && !node.active) {
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
				if (flow.isNodePathActive(node)) {
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

			var count = 0;
			function visitNodeRecursive(node, parent) {
				if (isCluster(node)) {
					clusterStart(node);

					if (parent && parent.type === 'tabset') {
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

							while (toNode.children && Object.keys(toNode.children).length) {
								toNode = getAProperty(toNode.children);
							}
							toPath = toNode.path;

							// if the toNode has transitions, then use one of them
							if (toNode.transitions) {
								toPath = toNode.path + '_' + getAnId(toNode.transitions);
							}
							// if the toNode is the child of a set then it's a cluster
							// because of the selection button. so grab the button
							else if (toNode.parent.type === 'tabset') {
								toPath = toNode.parent.path + '_' + toNode.id;
							}
						}
						addEdge(fromNode.path + '_' + id, toPath, head);
					});
				}
			});

			digraphFinish();

			return result;
		};
	}


	function Test() {
		this.initialize = function () {
			var that = this;

			var iframe = this.el.querySelector('iframe');

			window.addEventListener('message', function (e) {
				that.widgets.data.setValue(e.data);
				console.log(e.data);
			});

			this.widgets.put.setAction(function () {
				var formData = that.widgets.form.getFormData();

				var content = formData.data;
				F5.execService(that.node, 's3',
					{
						method: 'PUT',
						resourceName:'up/' + formData.resource,
						contentType: 'text/plain',
						contentSize: content.length
					},
					function success(result, status) {
						result.body = content;
						iframe.contentWindow.postMessage(result, '*');
					},
					function error(status) {

					});
			});

			this.widgets.get.setAction(function () {
				var formData = that.widgets.form.getFormData();

				F5.execService(that.node, 's3', {method: 'GET', resourceName:'up/' + formData.resource},
					function success(result, status) {
						iframe.contentWindow.postMessage(result, '*');
					},
					function error(status) {

					});
			});

			this.widgets.authorize.setAction(function () {
				F5.execService(that.node, 'authenticate',
					{
						provider: 'google',
						url: location.origin + location.pathname
					},
					function success(result, status) {
//						console.log(result);
						// load the auth page
						location.href = result.authUrl;
					},
					function error(status) {
						console.log('error');
					});
			});
		};
	}

	F5.Prototypes.ViewDelegates.root = new Root();
	F5.Prototypes.ViewDelegates.model = new Model();
	F5.Prototypes.ViewDelegates.graph = new Graph();
	F5.Prototypes.ViewDelegates.test = new Test();
});



/*
function Config() {
	this.initialize = function () {
		var that = this;
		this.widgets.form.setOnSubmit(function () {
			var data = that.widgets.form.getFormData();
			var parameters = [];
			F5.forEach({
				debug: true,
				inline: false,
				compress: false,
				platform: 'ios',
				mobile: true,
				native: false,
				pkg: data.pkg,
				console: true
			}, function (id, value) {
				parameters.push(id + '=' + value);
			});

			var url = location.protocol + '//' + location.host + '/generate?' + parameters.join('&');
			console.log(url);
			window.open(url, data.pkg);

			location.href = location.protocol + '//' + location.host + '/ide?app=' + data.pkg;
		});
	};
}

*/