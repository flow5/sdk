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
/*global define F5 localStorage*/

define('webharness', exports, function (exports) {
	
	function attach(screenEl) {
		var viewerEl = document.getElementById('viewer'),
			viewerFrameEl = document.getElementById('viewerframe'),
			appframeEl = document.getElementById('appframe'),
			svgframeEl = document.getElementById('svgframe'),
			jsonframeEl = document.getElementById('jsonframe'),
			jsonbuttonEl = document.getElementById('jsonbutton'),
			framesbuttonEl = document.getElementById('framesbutton'),
			resetbuttonEl = document.getElementById('resetbutton'),
			viewerbuttonEl = document.getElementById('viewerbutton'),			
			backbuttonEl = document.getElementById('backbutton');

		F5.UI.Utils.addTracker(svgframeEl);

		function setStyles(el, styles) {
			styles.forEach(function (id, value) {
				el.style[id] = value;
			});
		}		
		
		var sequenceNumber = 0;
		function observer() {	
			setStyles(backbuttonEl, {
				'background-color': F5.Global.flowController.hasBack() ? 'lightblue' : 'grey',
				'border': '2px solid ' + (F5.Global.flowController.hasBack() ? 'white' : 'black'),
			});				

			sequenceNumber += 1;						
			F5.post('dot2svg', F5.Global.flow.diags.toDOT(), function (response, headers) {
				
				if (headers['sequence-number'] !== sequenceNumber + '') {
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

				var svg = document.querySelector('svg');

				var transform = svg.querySelector('g').getAttribute('transform');
				transform = transform.replace('scale(1 1)', 'scale(0.4 0.4)');
				svg.querySelector('g').setAttribute('transform', transform);

				// Make the main poly the same color as background
				// OPTION: would be nice to do this on the DOT side
				document.getElementById('graph1').querySelector('polygon').setAttribute('fill', 'darkslategray');
				document.getElementById('graph1').querySelector('polygon').setAttribute('stroke', '');

				// the clickable elements have id with / prefix
				var clickable = document.querySelectorAll('[id^="svg-"]');
				for (var i = 0; i < clickable.length; i += 1) {
					makeClick(clickable[i]);
				}


				// determine the offset of the current node
				var activeLeafNode = F5.Global.flow.diags.getActiveLeafNode();

				var svgElementBBox = document.getElementById('svg-' + activeLeafNode.path).getBBox();
				var svgRootBBox = svg.getBBox();

				var offset = {x: svgElementBBox.x - svgRootBBox.width * 0.4, y: svgRootBBox.height + svgElementBBox.y + svgRootBBox.height * 0.4};

				svgframeEl.style['-webkit-transform'] = 'translate3d(' + -offset.x * 0.4 + 'px,' + -offset.y * 0.4 + 'px, 0px)';
			}, function (error) {
				console.log('error');
			}, {'sequence-number': sequenceNumber});
		}	
						
		F5.Global.flowController.setObserver(observer);

		// make the back button
		backbuttonEl.addEventListener('click', function () {
			try {
				F5.Global.flowController.doBack();								
			} catch (e) {
				console.log('Exception: ' + e.message);
			}
		});				

		var jsonDiv;

		jsonbuttonEl.addEventListener('click', function () {
			if (jsonDiv) {
				jsonframeEl.removeChild(jsonDiv);
				jsonDiv = null;
				jsonframeEl.style.display = '';
			} else {
				try {					
					var jsonFormatter = new F5.Diags.JSON.Formatter();
					jsonDiv = document.createElement('div');
					jsonDiv.className = 'json';
					jsonDiv.innerHTML = jsonFormatter.valueToHTML(JSON.parse(F5.Global.flow.diags.toJSON()));
					jsonDiv.className = 'json';

					jsonframeEl.appendChild(jsonDiv);
					jsonframeEl.style.display = 'block';
					jsonFormatter.attachListeners();																
				} catch (e) {
					console.log('Exception: ' + e.message);
				}	
			}
			setStyles(jsonbuttonEl, {
				'background-color': jsonDiv ? 'lightblue' : 'grey',
				'border': '2px solid ' + (jsonDiv ? 'white' : 'black')								
			});							
		});	
		
		framesbuttonEl.addEventListener('click', function () {
			var selected = true;
			if (appframeEl.className.match('frames')) {
				appframeEl.className = appframeEl.className.replace('frames', '');
				selected = false;				
			} else {
				appframeEl.className += ' frames';
			}
			setStyles(framesbuttonEl, {
				'background-color': selected ? 'lightblue' : 'grey',
				'border': '2px solid ' + (selected ? 'white' : 'black')								
			});										
		});		
		
		resetbuttonEl.addEventListener('click', function () {
			var showViewer = localStorage.showViewer;
			localStorage.clear();
			localStorage.showViewer = showViewer;
			
			location.reload();
		});		
		
		if (!localStorage.showViewer) {
			localStorage.showViewer = true;
		}
		function updateViewerButton() {
			var showViewer  = JSON.parse(localStorage.showViewer);
			setStyles(viewerbuttonEl, {
				'background-color': showViewer ? 'lightblue' : 'grey',
				'border': '2px solid ' + (showViewer ? 'white' : 'black')								
			});																
		}
		viewerbuttonEl.addEventListener('click', function () {
			if (viewerFrameEl.style.display === 'none') {
				viewerFrameEl.style.display = '';
				localStorage.showViewer = true;
			} else {
				localStorage.showViewer = false;
				viewerFrameEl.style.display = 'none';				
			}
			updateViewerButton();
		});	
		updateViewerButton();
		
		if (localStorage.showViewer && JSON.parse(localStorage.showViewer)) {
			viewerFrameEl.style.display = '';
		} else {
			viewerFrameEl.style.display = 'none';
		}
	}

	F5.Webharness = {attach: attach};

});