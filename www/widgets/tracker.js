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
/*global F5, WebKitCSSMatrix*/

(function () {
	
	function Tracker() {
		this.construct = function () {
			
			var that = this;

			var tracking;
			var startLocation;
			var startTransform;
			
			var constrain = this.el.getAttribute('f5constrain');

			function moveHandler(e) {
				var currentLocation = F5.eventLocation(e);
				if (tracking) {
					var delta = {
						x: constrain === 'vertical' ? 0 : currentLocation.x - startLocation.x,
						y: constrain === 'horizontal' ? 0 : currentLocation.y - startLocation.y						
					};
					
					delta.x += startTransform.x;
					delta.y += startTransform.y;
					
					
					if (that.delegate && that.delegate.moveHandler) {
						that.delegate.moveHandler(delta, startTransform);
					}
					
					that.el.style['-webkit-transform'] = 'translate3d(' + delta.x + 'px,' + delta.y + 'px, 0px)';							
				}
			}

			function stopHandler(e) {
				var currentLocation = F5.eventLocation(e);
				var delta = {
					x: constrain === 'vertical' ? 0 : currentLocation.x - startLocation.x,
					y: constrain === 'horizontal' ? 0 : currentLocation.y - startLocation.y						
				};				
				tracking = false;
				
				F5.removeTouchMoveListener(document.body, moveHandler);			
				F5.removeTouchStopListener(document.body, stopHandler);						
				
				if (that.delegate && that.delegate.stopHandler) {
					var transformMatrix = new WebKitCSSMatrix(that.el.style.webkitTransform);					
					that.delegate.stopHandler(delta, startTransform);
					
					if (delta.x !== transformMatrix.m41 || delta.y !== transformMatrix.m42) {
						that.animateTo(delta);						
					}
				}
			}

			F5.addTouchStartListener(this.el, function (e) {
				tracking = true;
				startLocation = F5.eventLocation(e);
				var transformMatrix = new WebKitCSSMatrix(that.el.style.webkitTransform);
				startTransform = {x: transformMatrix.m41, y: transformMatrix.m42};
				that.el.style['-webkit-transition'] = '';

				F5.addTouchMoveListener(document.body, moveHandler);	
				F5.addTouchStopListener(document.body, stopHandler);										
			});									
		};
		
		this.animateTo = function (delta) {
			this.el.style['-webkit-transition'] = '-webkit-transform .15s';
			this.el.style['-webkit-transform'] = 'translate3d(' + delta.x + 'px,' + delta.y + 'px, 0px)';			
		};
	}
	
	F5.Prototypes.Widgets.Tracker = new Tracker();
}());