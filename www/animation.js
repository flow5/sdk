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
/*global F5*/

(function () {
		
	function pushHorizontal(container, oldEl, newEl, distance, cb) {			
		oldEl.style['-webkit-transform'] = 'translate3d(0px, 0px, 0px)';			
		newEl.style['-webkit-transform'] = 'translate3d(' + distance + 'px, 0px, 0px)';
		newEl.style.visibility = '';
					
		function completePushLeft() {
			oldEl.style.visibility = 'hidden';
			oldEl.style['-webkit-transform'] = '';
			oldEl.style['-webkit-transition'] = '';

			newEl.style['-webkit-transform'] = '';
			newEl.style['-webkit-transition'] = '';
			
			F5.removeTransitionEndListener(oldEl);			

			cb();
		}			
		F5.addTransitionEndListener(oldEl, completePushLeft);		
		
		setTimeout(function () {
			var transition = '-webkit-transform ease-in .25s';
			oldEl.style['-webkit-transition'] = transition;
			newEl.style['-webkit-transition'] = transition;
			
			oldEl.style['-webkit-transform'] = 'translate3d(' + -distance + 'px, 0px, 0px)';
			newEl.style['-webkit-transform'] = 'translate3d(0px, 0px, 0px)';							
		}, 0);			
	}
	
	F5.Animation = {
		
		// oldElement sits on top, fades out to reveal newEl
		fadeIn: function (container, oldEl, newEl, cb) {
			
			oldEl.style['z-index'] = 0;

			newEl.style['z-index'] = 1;
			newEl.style.visibility = '';	
			newEl.style.opacity = 0;
															
			function completeFadeIn() {
				
				oldEl.style['z-index'] = '';
				newEl.style['z-index'] = '';
				newEl.style['-webkit-transition'] = '';
				
				oldEl.style.opacity = '';
				oldEl.style.visibility = 'hidden';
				
				F5.removeTransitionEndListener(newEl);
				
				cb();
			}
						
			F5.addTransitionEndListener(newEl, completeFadeIn);
			
			setTimeout(function () {
				newEl.style['-webkit-transition'] = 'opacity .5s';				
				newEl.style.opacity = 1;
			}, 0);		
		},
		
		pushLeft: function (container, oldEl, newEl, cb) {
			pushHorizontal(container, oldEl, newEl, container.offsetWidth, cb);			
		},
		
		pushRight: function (container, oldEl, newEl, cb) {
			pushHorizontal(container, oldEl, newEl, -container.offsetWidth, cb);						
		}
	};
}());

