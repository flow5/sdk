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
/*global WebKitCSSMatrix, F5*/

(function () {
				
	function attachTracker(el, cb) {
		var tracking;
		var startLocation;
		var startTransform;
		
		function moveHandler(e) {
			var currentLocation = F5.eventLocation(e);
			if (tracking) {
				var deltaH = currentLocation.x - startLocation.x;
				var deltaY = currentLocation.y - startLocation.y;
				el.style['-webkit-transform'] = 'translate3d(' + (deltaH + startTransform.x) +
						'px,' + (deltaY + startTransform.y) + 'px, 0px)';								
						
				if (cb) {
					cb({deltaH: deltaH, deltaY: deltaY});
				}
			}
		}
		
		function stopHandler(e) {
			tracking = false;
			el.style['-webkit-transition'] = '';
			F5.removeTouchMoveListener(document.body, moveHandler);			
			F5.removeTouchStopListener(document.body, stopHandler);						
		}

		F5.addTouchStartListener(el, function (e) {
			tracking = true;
			startLocation = F5.eventLocation(e);
			var transformMatrix = new WebKitCSSMatrix(el.style.webkitTransform);
			startTransform = {x: transformMatrix.m41, y: transformMatrix.m42};
			el.style['-webkit-transition'] = 'opacity 1s';	
			
			F5.addTouchMoveListener(document.body, moveHandler);	
			F5.addTouchStopListener(document.body, stopHandler);										
		});
	}			
					
	F5.attachWidget = function(el, data) {
		var type = el.getAttribute('f5_widget');
		F5.assert(F5.WidgetPrototypes[type], 'No widget: ' + type);
		var widget = F5.objectFromPrototype(F5.WidgetPrototypes[type]);
		widget.el = el;
		el.widget = widget;
		
		var className = el.getAttribute('f5_class');
		if (className) {
			F5.addClass(el, className);
		}
		widget.construct(data);		
	};
	
	// TODO: replace tracker with x/y scroller
	F5.UI = {
		attachTracker: attachTracker
	};
}());
