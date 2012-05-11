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
/*global F5, IDE, JSONFormatter*/

F5.registerModule(function (F5) {	
	
	F5.Global.flowController.addWaitTask(function (cb) {
		var model;
		var dot;
		var modelListeners = {};

		function Root() {
			this.initialize = function () {

			};

			this.load = function (data) {			
				this.node.children.app.view.delegate.load(data);
			};

			this.send = function (message) {

			};
		}			

		function App() {
			this.initialize = function () {
				this.frame = F5.getElementById(this.el, 'frame');
			};

			this.load = function (data) {
				if (data.url) {
					var geometry = data.geometry.split('x');
					this.frame.style.width = geometry[0];
					this.frame.style.height = geometry[1];
					
					document.getElementById('root-app').style.display = '';

					this.frame.widget.open(data.url + '&bridge=true&pkg=' + data.pkg);					
				} else {
					document.getElementById('root-app').style.display = 'none';
				}

				IDE.cache.pkg = data.pkg;
				IDE.cache.url = data.url;
				IDE.cache.geometry = data.geometry;

				if (this.pipe) {
					this.pipe.close();
				}
				
				var that = this;				
				F5.openPipe(F5.query.pkg, data.pkg + '.listener', function (pipe) {
					that.pipe = pipe;
					
					function listen() {		
						pipe.listen(function (result) {
							try {
								var result = JSON.parse(result);
								if (result && result.model) {
									model = JSON.parse(result.model);
									dot = result.dot;

									F5.forEach(modelListeners, function (id, listener) {
										listener.update();
									});			
								} else {
//									console.log(result && result.message && JSON.stringify(result.message));
								}							
							} catch (e) {
								console.log(e.message);
							}
							listen();									
							
						});
					}																									
					listen();					
				});

				
			};

			this.viewWillBecomeActive = function () {
				if (IDE.cache.geometry && IDE.cache.url) {
					this.load(IDE.cache);								
				}
			};
		}

		function Dev() {
			this.initialize = function () {

			};
		}

		function Config() {
			this.initialize = function () {
				var form = F5.getElementById(this.el, 'form');

				form.widget.setOnSubmit(function () {
					F5.Global.flow.root.view.delegate.load(form.widget.getFormData());
				});			
			};
		}


		function Model() {

			this.initialize = function () {
				this.json = F5.getElementById(this.el, 'json');
			};	

			this.viewWillBecomeActive = function () {
				this.update();

				modelListeners[this.node.path] = this;
			};

			this.viewWillBecomeInactive = function () {
				delete modelListeners[this.node.path];
			};


			this.update = function () {
				if (!model) {
					return;
				}

				var jsonFormatter = new IDE.JSONFormatter();
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
				this.svgFrame = F5.getElementById(this.el, 'svgframe');
			};

			this.viewWillBecomeActive = function () {
				this.update();

				modelListeners[this.node.path] = this;
			};

			this.viewWillBecomeInactive = function () {
				delete modelListeners[this.node.path];
			};		

			this.update = function () {

				if (!dot) {
					return;
				}

				var that = this;

				sequenceNumber += 1;					

				F5.upload('POST', 'dot2svg', dot, function (response, status, headers) {

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

										F5.Global.flowController[method](F5.Global.flow.diags.getNodeFromPath(nodePath), id, function () {

										});										
									}									
								}
							} catch (e) {
								console.log('Exception: ' + e.message);
							}													

						};
					}

					that.svgFrame.innerHTML = response;

					var svg = that.svgFrame.querySelector('svg');

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
					var activeLeafNode = F5.Global.flow.diags.getActiveLeafNode();

					var svgElementBBox = document.getElementById('svg-' + activeLeafNode.path).getBBox();
					var svgRootBBox = svg.getBBox();

					var offset = {x: svgElementBBox.x - svgRootBBox.width * 0.4, 
									y: svgRootBBox.height + svgElementBBox.y + svgRootBBox.height * 0.4};

	//				that.svgFrame.style['-webkit-transform'] = 
	//								'translate3d(' + -offset.x * 0.4 + 'px,' + -offset.y * 0.4 + 'px, 0px)';
				}, function (error) {
					console.log('error');
				}, {'sequence-number': sequenceNumber});
			};
		}	

		F5.Prototypes.ViewDelegates.root = new Root();
		F5.Prototypes.ViewDelegates.app = new App();
		F5.Prototypes.ViewDelegates.dev = new Dev();
		F5.Prototypes.ViewDelegates.config = new Config();
		F5.Prototypes.ViewDelegates.model = new Model();
		F5.Prototypes.ViewDelegates.graph = new Graph();
					
		cb();
	});
});	



/*
backbuttonEl.widget.setAction(function () {
	try {
		F5.Global.flowController.doBack();								
	} catch (e) {
		console.log('Exception: ' + e.message);
	}
});				

if (F5.platform() === 'android') {
	menubuttonEl.widget.setAction(function () {
        var e = document.createEvent('Events'); 
        e.initEvent('menubutton');
        document.dispatchEvent(e);
	});			
} else {
	menubuttonEl.style.display = 'none';
}

// TODO: show hide and update the jsonDiv rather than adding/removing
jsonbuttonEl.widget.setAction(function () {
	if (jsonframeEl.style.display === 'none') {
		jsonframeEl.style.display = '';
		updateJson();
	} else {
		jsonframeEl.style.display = 'none';
	}
});	

framesbuttonEl.widget.setAction(function () {
	var selected = true;
	if (F5.hasClass(appframeEl, 'f5frames')) {
		F5.removeClass(appframeEl, 'f5frames');
		selected = false;				
	} else {
		F5.addClass(appframeEl, 'f5frames');
	}
});		

resetbuttonEl.widget.setAction(function () {
	var showViewer = localStorage.showViewer;		
	localStorage.clear();
	localStorage.showViewer = showViewer;

	location.reload();
});		

viewerbuttonEl.widget.setState(localStorage.showViewer === 'true');
viewerbuttonEl.widget.setAction(function () {
	if (F5.hasClass(document.body, 'f5viewer')) {
		localStorage.showViewer = false;
		F5.removeClass(document.body, 'f5viewer');
	} else {
		F5.addClass(document.body, 'f5viewer');
		localStorage.showViewer = true;				
	}
});	

if (localStorage.showViewer && JSON.parse(localStorage.showViewer)) {
	F5.addClass(document.body, 'f5viewer');
}
*/
