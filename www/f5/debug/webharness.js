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
/*global define, F5, localStorage, JSONFormatter*/

(function () {		
	F5.Global.flowController.addWaitTask(function (cb) {
		var appframeEl = document.getElementById('f5appframe');

		var viewerframeEl = F5.loadTemplate('viewerframe');
		viewerframeEl.id = 'viewerFrame';
		document.body.appendChild(viewerframeEl);

		var viewerbuttonEl = F5.loadTemplate('viewerbutton');
		document.body.appendChild(viewerbuttonEl);

		var viewerEl = F5.getElementById(viewerframeEl, 'viewer'),
			svgframeEl = F5.getElementById(viewerframeEl, 'svgframe'),
			jsonframeEl = F5.getElementById(viewerframeEl, 'jsonframe'),
			jsonbuttonEl = F5.getElementById(viewerframeEl, 'jsonbutton'),
			framesbuttonEl = F5.getElementById(viewerframeEl, 'framesbutton'),
			resetbuttonEl = F5.getElementById(viewerframeEl, 'resetbutton'),
			backbuttonEl = F5.getElementById(viewerframeEl, 'backbutton'),
			menubuttonEl = F5.getElementById(viewerframeEl, 'menubutton'),
			jsonDiv = F5.getElementById(viewerframeEl, 'json');
			
			F5.addTouchStartListener(jsonDiv, function (e) {
				e.stopPropagation();
			});
		
		function updateJson() {
			jsonDiv.innerHTML = '';
			
			var jsonFormatter = new JSONFormatter();
			var json = jsonFormatter.valueToHTML(JSON.parse(F5.Global.flow.diags.toJSON()));
							
			jsonDiv.innerHTML = json;						
			jsonFormatter.attachListeners();																	
			
			F5.forEach(jsonDiv.querySelectorAll('.collapser'), function (collapser) {
				jsonFormatter.collapse(collapser);
			});
			
			var activeNode = F5.Global.flow.diags.getActiveLeafNode();
			if (activeNode.type === 'subflow') {
				activeNode = activeNode.node;
			}
			var activeId = 'json-' + activeNode.id;
			var activeDiv = document.getElementById(activeId);
			while (activeDiv.parentElement !== jsonDiv) {
				var collapser = activeDiv.parentElement.firstChild;
				if (F5.hasClass(collapser, 'collapser')) {
					jsonFormatter.collapse(collapser);						
				}
				activeDiv = activeDiv.parentElement;
			}			
		}
		
		var sequenceNumber = 0;
		function update() {	
			updateJson();
			
			sequenceNumber += 1;						
			F5.upload('POST', 'dot2svg', F5.Global.flow.diags.toDOT(), function (response, status, headers) {

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

				svgframeEl.innerHTML = response;

				var svg = svgframeEl.querySelector('svg');

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

				svgframeEl.style['-webkit-transform'] = 
								'translate3d(' + -offset.x * 0.4 + 'px,' + -offset.y * 0.4 + 'px, 0px)';
			}, function (error) {
				console.log('error');
			}, {'sequence-number': sequenceNumber});
		}	

		F5.Global.flowController.addFlowObserver({
			start: function () {
				setTimeout(update,0);
//				update();
			},
			startSubflow: function () {
				setTimeout(update,0);
				//				update();
			},
			syncSelection: function (node) {
				setTimeout(update,0);
				//				update();
			},
			completeSubflow: function () {
				setTimeout(update,0);
				//				update();
			},
			asyncOperationComplete: function () {
				setTimeout(update,0);
				//				update();
			}
		});
		update();

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
			if (viewerframeEl.style.display === 'none') {
				viewerframeEl.style.display = '';
				localStorage.showViewer = true;
			} else {
				localStorage.showViewer = false;
				viewerframeEl.style.display = 'none';				
			}
		});	

		if (localStorage.showViewer && JSON.parse(localStorage.showViewer)) {
			viewerframeEl.style.display = '';
		} else {
			viewerframeEl.style.display = 'none';
		}	
		
		cb();	
	});	
}());	
