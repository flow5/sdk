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

// TODO: move animation definitions into a F5.Animations namespace to parallel Widgets etc.
(function () {
		
	function pushHorizontal(container, oldEl, newEl, distance) {
		
		oldEl.style[F5.styleName('transform')] = 'translate3d(0px, 0px, 0px)';			
		newEl.style[F5.styleName('transform')] = 'translate3d(' + distance + 'px, 0px, 0px)';
		newEl.style.visibility = '';
							
		return function (cb) {
			function complete() {
				F5.removeTransitionEndListener(oldEl);							
				cb();
			}			
		
			if (F5.platform() === 'android') {
				// Android: transition stutters if the event listener is used
				setTimeout(complete, 325);				
			} else {
				F5.addTransitionEndListener(oldEl, complete);	
			}
			
			var transition = F5.styleName('transform_rhs') + ' .25s ease-out';
			oldEl.style[F5.styleName('transition')] = transition;
			newEl.style[F5.styleName('transition')] = transition;
			
			oldEl.style[F5.styleName('transform')] = 'translate3d(' + -distance + 'px, 0px, 0px)';
			newEl.style[F5.styleName('transform')] = 'translate3d(0px, 0px, 0px)';							
		};			
	}
	
	function sheetVertical(container, overEl, underEl, distance) {
		
		if (distance < 0) {
			overEl.style[F5.styleName('transform')] = 'translate3d(0px, 0px, 0px)';						
		} else {
			overEl.style[F5.styleName('transform')] = 'translate3d(0px, ' + -distance + 'px, 0px)';			
		}
		overEl.style.visibility = '';

		if (distance < 0) {
			underEl.style.visibility = '';
		}
							
		return function (cb) {
			function complete() {

				// Android pre-ICS: screen flashes if -webkit-transform is cleared while el is visible
				if (F5.platform() !== 'android') {
					overEl.style[F5.styleName('transform')] = '';					
				}
				overEl.style[F5.styleName('transition')] = '';
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
			
			var transition = F5.styleName('transform_rhs') + ' .25s ease-in ';
			overEl.style[F5.styleName('transition')] = transition;
			
			if (distance < 0) {
				overEl.style[F5.styleName('transform')] = 'translate3d(0px, ' + distance + 'px, 0px)';			
			} else {
				overEl.style[F5.styleName('transform')] = 'translate3d(0px, 0px, 0px)';						
			}
		};			
	}
	
	function drawerVertical(container, overEl, underEl, distance) {
		
		if (distance < 0) {
			overEl.style[F5.styleName('transform')] = 'translate3d(0px, 0px, 0px)';						
		} else {
			overEl.style[F5.styleName('transform')] = 'translate3d(0px, ' + -distance + 'px, 0px)';			
		}
		overEl.style.visibility = '';

		if (distance < 0) {
			underEl.style.visibility = '';
		}
							
		return function (cb) {
			function complete() {				
				F5.removeTransitionEndListener(overEl);							
				cb();
			}			
		
			F5.addTransitionEndListener(overEl, complete);	
			
			var transition = F5.styleName('transform_rhs') + ' .25s ease-in ';
			overEl.style[F5.styleName('transition')] = transition;
			
			if (distance < 0) {
				overEl.style[F5.styleName('transform')] = 'translate3d(0px, ' + distance + 'px, 0px)';			
			} else {
				overEl.style[F5.styleName('transform')] = 'translate3d(0px, 0px, 0px)';						
			}
		};			
	}	
	
	function sheetHorizontal(container, el, distance) {
		
		if (distance < 0) {
			el.style[F5.styleName('transform')] = 'translate3d(' + -distance + 'px, 0px, 0px)';			
		} else {
			el.style[F5.styleName('transform')] = 'translate3d(0px, 0px, 0px)';						
		}
		el.style.visibility = '';
							
		return function (cb) {
			function complete() {

				// Android pre-ICS: screen flashes if -webkit-transform is cleared while el is visible
				if (F5.platform() !== 'android') {
					el.style[F5.styleName('transform')] = '';					
				}
				el.style[F5.styleName('transition')] = '';
				
				F5.removeTransitionEndListener(el);			
				
				cb();
			}			
		
			if (F5.platform() === 'android') {
				// Android: transition stutters if the event listener is used
				setTimeout(complete, 325);				
			} else {
				F5.addTransitionEndListener(el, complete);	
			}
			
			var transition = F5.styleName('transform_rhs') + ' .25s ease-in';
			el.style[F5.styleName('transition')] = transition;
			
			if (distance < 0) {
				el.style[F5.styleName('transform')] = 'translate3d(0px, 0px, 0px)';						
			} else {
				el.style[F5.styleName('transform')] = 'translate3d(' + distance + 'px, 0px, 0px)';			
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
			newEl.style.display = '';
			
			return function (cb) {
				function completeFadeIn() {
					newEl.style[F5.styleName('transition')] = '';
					F5.removeTransitionEndListener(newEl);
					cb();
				}

				F5.addTransitionEndListener(newEl, completeFadeIn);				
				newEl.style[F5.styleName('transition')] = 'opacity .25s';	
				newEl.style.opacity = 1;					
			};						
		},
		
		overlayFadeOut: function (container, oldEl, newEl) {
			return function (cb) {
				function completeFadeOut() {
					oldEl.style[F5.styleName('transition')] = '';
					oldEl.style.display = 'none';
					F5.removeTransitionEndListener(oldEl);
					cb();
				}

				F5.addTransitionEndListener(oldEl, completeFadeOut);				
				oldEl.style[F5.styleName('transition')] = 'opacity .25s';	
				oldEl.style.opacity = 0;					
			};			
		},
		
		// oldElement sits on top, fades out to reveal newEl
		fadeIn: function (container, oldEl, newEl) {
			
			newEl.style.visibility = '';	
			newEl.style.opacity = 0;
			// move to end so this draws last
			newEl.parentElement.appendChild(newEl);
								
			newEl.style[F5.styleName('transition')] = 'opacity .25s';	
																		
			return function (cb) {
				function completeFadeIn() {

					newEl.style[F5.styleName('transition')] = '';

					// setting opacity causes flickering on Android (Gingerbread)
//					if (F5.platform() !== 'android') {
						oldEl.style.visibility = 'hidden';
						setTimeout(function () {
							oldEl.style.opacity = '';													
						});
//					};

//					F5.removeTransitionEndListener(newEl);

					cb();
				}
				
//				F5.addTransitionEndListener(newEl, completeFadeIn);				
				
				setTimeout(completeFadeIn, 250);			
				
				newEl.style.opacity = 1;					
			};		
		},
		
		fadeOut: function (container, oldEl, newEl) {
			
			newEl.style.visibility = '';
			newEl.style.opacity = 1;
			newEl.parentElement.insertBefore(newEl, oldEl);	

			oldEl.style[F5.styleName('transition')] = 'opacity .25s';	
																					
			return function (cb) {
				function completeFadeOut() {

					newEl.style[F5.styleName('transition')] = '';

					// setting opacity causes flickering on Android (Gingerbread)
//					if (F5.platform() !== 'android') {
						oldEl.style.visibility = 'hidden';
						setTimeout(function () {
							oldEl.style.opacity = '';													
						});
//					}

//					F5.removeTransitionEndListener(oldEl);

					cb();
				}
				
//				F5.addTransitionEndListener(oldEl, completeFadeOut);				
				oldEl.style.opacity = 0;		
				setTimeout(completeFadeOut, 250);			
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

		drawerDown: function (container, oldEl, newEl) {
			return drawerVertical(container, newEl, oldEl, container.offsetHeight);						
		},

		drawerUp: function (container, oldEl, newEl) {
			return drawerVertical(container, oldEl, newEl, -container.offsetHeight);						
		},

		sheetLeft: function (container, oldEl, newEl) {
			return sheetHorizontal(container, newEl, -container.offsetWidth);						
		},

		sheetRight: function (container, oldEl, newEl) {
			return sheetHorizontal(container, oldEl, container.offsetWidth);						
		},
		
		flipBack: function (container, oldEl, newEl) {
			
			return function (cb) {
				function completeFlip() {
					F5.removeTransitionEndListener(newEl);
					cb();			
				}
				F5.addTransitionEndListener(newEl, completeFlip);
				oldEl.style['-webkit-transform'] = 'rotateY(180deg)';
				newEl.style['-webkit-transform'] = 'rotateY(0deg)';
			};
		},	
			
		flip: function (container, oldEl, newEl) {
			
			container.style['-webkit-perspective'] = 1000;
			
			oldEl.style['-webkit-backface-visibility'] = 'hidden';
			oldEl.style['-webkit-transition'] = 'all .5s ease-in-out';

			newEl.style['-webkit-backface-visibility'] = 'hidden';
			newEl.style['-webkit-transition'] = 'all .5s ease-in-out';
			
			oldEl.style['-webkit-transform'] = 'rotateY(0deg)';
			newEl.style['-webkit-transform'] = 'rotateY(180deg)';
			
			return function (cb) {
				function completeFlip() {
					F5.removeTransitionEndListener(newEl);
					cb();			
				}
				F5.addTransitionEndListener(newEl, completeFlip);
				oldEl.style['-webkit-transform'] = 'rotateY(-180deg)';
				newEl.style['-webkit-transform'] = 'rotateY(0deg)';
			};
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
			case 'drawerDown':
				inverse = 'drawerUp';
				break;
			case 'drawerUp':
				inverse = 'drawerDown';
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
			case 'flip':
				inverse = 'flipBack';
				break;
			case 'flipBack':
				inverse = 'flip';
				break;
			}

			return inverse;
		}		
	};
}());

