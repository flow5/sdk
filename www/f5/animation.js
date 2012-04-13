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
		
	function pushHorizontal(container, oldEl, newEl, distance) {
		
		oldEl.style['-webkit-transform'] = 'translate3d(0px, 0px, 0px)';			
		newEl.style['-webkit-transform'] = 'translate3d(' + distance + 'px, 0px, 0px)';
		newEl.style.visibility = '';
							
		return function (cb) {
			function complete() {
				oldEl.style.visibility = 'hidden';
				oldEl.style['-webkit-transform'] = '';
				oldEl.style['-webkit-transition'] = '';

				// Android pre-ICS: screen flashes if -webkit-transform is cleared while el is visible
				if (F5.platform() !== 'android') {
					newEl.style['-webkit-transform'] = '';					
				}
				newEl.style['-webkit-transition'] = '';

				F5.removeTransitionEndListener(oldEl);			
				
				cb();
			}			
		
			if (F5.platform() === 'android') {
				// Android: transition stutters if the event listener is used
				setTimeout(complete, 325);				
			} else {
				F5.addTransitionEndListener(oldEl, complete);	
			}
			
			var transition = '-webkit-transform .25s ease-out';
			oldEl.style['-webkit-transition'] = transition;
			newEl.style['-webkit-transition'] = transition;
			
			oldEl.style['-webkit-transform'] = 'translate3d(' + -distance + 'px, 0px, 0px)';
			newEl.style['-webkit-transform'] = 'translate3d(0px, 0px, 0px)';							
		};			
	}
	
	function sheetVertical(container, overEl, underEl, distance) {
		
		if (distance < 0) {
			overEl.style['-webkit-transform'] = 'translate3d(0px, 0px, 0px)';						
		} else {
			overEl.style['-webkit-transform'] = 'translate3d(0px, ' + -distance + 'px, 0px)';			
		}
		overEl.style.visibility = '';

		if (distance < 0) {
			underEl.style.visibility = '';
		}
							
		return function (cb) {
			function complete() {

				// Android pre-ICS: screen flashes if -webkit-transform is cleared while el is visible
				if (F5.platform() !== 'android') {
					overEl.style['-webkit-transform'] = '';					
				}
				overEl.style['-webkit-transition'] = '';
				if (distance >= 0) {
					underEl.style.visibility = 'hidden';					
				}
				
				F5.removeTransitionEndListener(overEl);			
				
				cb();
			}			
		
			if (F5.platform() === 'android') {
				// Android: transition stutters if the event listener is used
				setTimeout(complete, 325);				
			} else {
				F5.addTransitionEndListener(overEl, complete);	
			}
			
			var transition = '-webkit-transform .25s ease-in ';
			overEl.style['-webkit-transition'] = transition;
			
			if (distance < 0) {
				overEl.style['-webkit-transform'] = 'translate3d(0px, ' + distance + 'px, 0px)';			
			} else {
				overEl.style['-webkit-transform'] = 'translate3d(0px, 0px, 0px)';						
			}
		};			
	}
	
	function sheetHorizontal(container, el, distance) {
		
		if (distance < 0) {
			el.style['-webkit-transform'] = 'translate3d(' + -distance + 'px, 0px, 0px)';			
		} else {
			el.style['-webkit-transform'] = 'translate3d(0px, 0px, 0px)';						
		}
		el.style.visibility = '';
							
		return function (cb) {
			function complete() {

				// Android pre-ICS: screen flashes if -webkit-transform is cleared while el is visible
				if (F5.platform() !== 'android') {
					el.style['-webkit-transform'] = '';					
				}
				el.style['-webkit-transition'] = '';
				
				F5.removeTransitionEndListener(el);			
				
				cb();
			}			
		
			if (F5.platform() === 'android') {
				// Android: transition stutters if the event listener is used
				setTimeout(complete, 325);				
			} else {
				F5.addTransitionEndListener(el, complete);	
			}
			
			var transition = '-webkit-transform .25s ease-in';
			el.style['-webkit-transition'] = transition;
			
			if (distance < 0) {
				el.style['-webkit-transform'] = 'translate3d(0px, 0px, 0px)';						
			} else {
				el.style['-webkit-transform'] = 'translate3d(' + distance + 'px, 0px, 0px)';			
			}
		};			
	}	
	
	F5.Animation = {
		
		cut: function (container, oldEl, newEl) {
			return function (cb) {
				newEl.style.visibility = '';
				oldEl.style.visibility = 'hidden';
				setTimeout(cb, 0);				
			};
		},
		
		overlayFadeIn: function (container, oldEl, newEl) {
			newEl.style.visibility = '';				
			newEl.style.opacity = 0;
			
			return function (cb) {
				function completeFadeIn() {
					newEl.style['-webkit-transition'] = '';
					F5.removeTransitionEndListener(newEl);
					cb();
				}

				F5.addTransitionEndListener(newEl, completeFadeIn);				
				newEl.style['-webkit-transition'] = 'opacity .25s';	
				newEl.style.opacity = 1;					
			};						
		},
		
		overlayFadeOut: function (container, oldEl, newEl) {
			return function (cb) {
				function completeFadeOut() {
					oldEl.style['-webkit-transition'] = '';
					F5.removeTransitionEndListener(newEl);
					cb();
				}

				F5.addTransitionEndListener(oldEl, completeFadeOut);				
				oldEl.style['-webkit-transition'] = 'opacity .25s';	
				oldEl.style.opacity = 0;					
			};			
		},
		
		// oldElement sits on top, fades out to reveal newEl
		fadeIn: function (container, oldEl, newEl) {
			
			newEl.style.visibility = '';	
			newEl.style.opacity = 0;
			// move to end so this draws last
			newEl.parentElement.appendChild(newEl);
																		
			return function (cb) {
				function completeFadeIn() {

					newEl.style['-webkit-transition'] = '';

					// setting opacity causes flickering on Android (Gingerbread)
//					if (F5.platform() !== 'android') {
						oldEl.style.visibility = 'hidden';
						setTimeout(function () {
							oldEl.style.opacity = '';													
						});
//					};

					F5.removeTransitionEndListener(newEl);

					cb();
				}
				
				F5.addTransitionEndListener(newEl, completeFadeIn);				
				newEl.style['-webkit-transition'] = 'opacity .25s';	
				newEl.style.opacity = 1;					
			};		
		},
		
		fadeOut: function (container, oldEl, newEl) {
			
			newEl.style.visibility = '';
			newEl.style.opacity = 1;
			newEl.parentElement.insertBefore(newEl, oldEl);	
																					
			return function (cb) {
				function completeFadeOut() {

					newEl.style['-webkit-transition'] = '';

					// setting opacity causes flickering on Android (Gingerbread)
//					if (F5.platform() !== 'android') {
						oldEl.style.visibility = 'hidden';
						setTimeout(function () {
							oldEl.style.opacity = '';													
						});
//					}

					F5.removeTransitionEndListener(oldEl);

					cb();
				}
				
				F5.addTransitionEndListener(oldEl, completeFadeOut);				
				oldEl.style['-webkit-transition'] = 'opacity .25s';	
				oldEl.style.opacity = 0;					
			};		
		},
				
		pushLeft: function (container, oldEl, newEl) {
			return pushHorizontal(container, oldEl, newEl, container.offsetWidth);			
		},
		
		pushRight: function (container, oldEl, newEl) {
			return pushHorizontal(container, oldEl, newEl, -container.offsetWidth);						
		},

		sheetDown: function (container, oldEl, newEl) {
			return sheetVertical(container, newEl, oldEl, container.offsetHeight);						
		},

		sheetUp: function (container, oldEl, newEl) {
			return sheetVertical(container, oldEl, newEl, -container.offsetHeight);						
		},

		sheetLeft: function (container, oldEl, newEl) {
			return sheetHorizontal(container, newEl, -container.offsetWidth);						
		},

		sheetRight: function (container, oldEl, newEl) {
			return sheetHorizontal(container, oldEl, container.offsetWidth);						
		},
		
		inverseAnimation: function(animation) {
			var inverse;
			switch (animation) {
			case 'cut':
				inverse = 'cut';
				break;
			case 'fadeIn':
				inverse = 'fadeOut';
				break;
			case 'fadeOut':
				inverse = 'fadeIn';
				break;
			case 'pushRight':
				inverse = 'pushLeft';
				break;
			case 'pushLeft':
				inverse = 'pushRight';
				break;
			case 'sheetDown':
				inverse = 'sheetUp';
				break;
			case 'sheetUp':
				inverse = 'sheetDown';
				break;
			case 'sheetLeft':
				inverse = 'sheetRight';
				break;
			case 'sheetRight':
				inverse = 'sheetLeft';
				break;
			case 'overlayFadeIn':
				inverse = 'overlayFadeOut';
				break;
			}

			return inverse;
		}		
	};
}());

