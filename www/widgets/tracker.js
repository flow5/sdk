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
					var deltaX = constrain === 'vertical' ? 0 : currentLocation.x - startLocation.x;
					var deltaY = constrain === 'horizontal' ? 0 : currentLocation.y - startLocation.y;
					that.el.style['-webkit-transform'] = 'translate3d(' + (deltaX + startTransform.x) +
							'px,' + (deltaY + startTransform.y) + 'px, 0px)';	
							
					if (that.cb) {
						that.cb({x: deltaX, y: deltaY}, currentLocation, startLocation);
					}
				}
			}

			function stopHandler(e) {
				tracking = false;
				that.el.style['-webkit-transition'] = '';
				F5.removeTouchMoveListener(document.body, moveHandler);			
				F5.removeTouchStopListener(document.body, stopHandler);						
			}

			F5.addTouchStartListener(this.el, function (e) {
				tracking = true;
				startLocation = F5.eventLocation(e);
				var transformMatrix = new WebKitCSSMatrix(that.el.style.webkitTransform);
				startTransform = {x: transformMatrix.m41, y: transformMatrix.m42};
				that.el.style['-webkit-transition'] = 'opacity 1s';	

				F5.addTouchMoveListener(document.body, moveHandler);	
				F5.addTouchStopListener(document.body, stopHandler);										
			});									
		};
		
		this.setCallback = function (cb) {
			this.cb = cb;
		};
	}
	
	F5.WidgetPrototypes.Tracker = new Tracker();
}());