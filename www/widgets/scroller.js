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

F5.registerModule(function(F5) {
		
	// see below
	var useAndroidTransformWorkaround = false;			
	function doTransform(scroller, offset, duration, bezierValues) {					
		var transform;
		if (scroller.horizontal) {
			transform = 'translate3d(' + offset + 'px, 0px, 0px)';				
		} else {
			transform = 'translate3d(0px, ' + offset + 'px, 0px)';				
		}
		
		// On MSIE, Firefox and Android the animation doesn't fire reliably if it's setup in the same frame
		// as the transition parameters
		if (duration) {
			setTimeout(function () {
				scroller.el.style[F5.styleName('transform')] = transform;									
			}, 10);
		} else {
			scroller.el.style[F5.styleName('transform')] = transform;									
		}

		if (duration) {
			var bezier = 'cubic-bezier(' + bezierValues.join(',') + ')';
			scroller.el.style[F5.styleName('transition')] = F5.styleName('transform_rhs') + ' ' + duration + 's ' + bezier;	

			if (F5.platform() === 'android') {
				useAndroidTransformWorkaround = true;
			}
			scroller.animating = true;
		} else {
			// Android has varous bugs where operations don't "take" during an animation if the operation
			// isn't also executing in the animation context
			// in this case, the change to -webkit-transform is ignored (sometimes) unless there
			// is still a transition in place
			if (useAndroidTransformWorkaround) {
				scroller.el.style[F5.styleName('transition')] = F5.styleName('transform_rhs') + ' .0001s linear';				
				useAndroidTransformWorkaround = false;
			} else {
				scroller.el.style[F5.styleName('transition')] = '';				
			}
		}
	}
	
	function pinOffset(scroller, offset, margin) {
		if (offset > margin) {
			offset = margin;			
		}
		if (offset < scroller.minOffset - margin) {
			offset = scroller.minOffset - margin;			
		}

		return offset;
	}	
	
	function pinVelocity(velocity) {
		if (Math.abs(velocity) > this.maxVelocity) {
			velocity = F5.sign(velocity)*this.maxVelocity;
		}		
		return velocity;	
	}
	
	function stopScrollingAt(scroller, offset) {
		scroller.staticOffset = scroller.currentOffset = Math.round(offset);
		doTransform(scroller, scroller.staticOffset);
	}
		
	function eventPosition(scroller, e) {
		var location = F5.eventLocation(e);
		return {x:location.x-scroller.container.left,y:location.y-scroller.container.top};
	}	
			
	function updateVelocity(scroller, e) {
		// don't do instantaneous updating of velocity
		var weighting = 0.25;

		var newTouchLoc = eventPosition(scroller, e);
		var delta = scroller.horizontal ? newTouchLoc.x - scroller.touchLoc.x : newTouchLoc.y - scroller.touchLoc.y;			
		scroller.touchLoc = newTouchLoc;

		var deltaT = e.timeStamp - scroller.touchTime;
				
		if (deltaT) {
			scroller.touchTime = e.timeStamp;

			var newVelocity = pinVelocity((1.0 - weighting) * scroller.lastVelocity + weighting * (delta / deltaT));

			scroller.lastVelocity = newVelocity;				
		}
		
		return scroller.lastVelocity;
	}
	
	function finishScrolling(scroller) {			
		var snapTo = scroller.snapTo();

		if (snapTo && scroller.staticOffset !== snapTo.offset) {
			if (snapTo.cb) {
				F5.addTransitionEndListener(scroller.el, function () {
					snapTo.cb();
					F5.removeTransitionEndListener(scroller.el);
				});				
			}		
			
			doTransform(scroller, snapTo.offset, snapTo.duration, snapTo.bezier);
			scroller.currentOffset = scroller.staticOffset = Math.round(snapTo.offset);
		}		
	}
		
	function startHandler(scroller, e) {
		if (!scroller.enabled) {
			return;
		}
				
		scroller.tracking = true;					
		scroller.touchLoc = eventPosition(scroller, e);
		scroller.startLoc = scroller.touchLoc;
		scroller.touchTime = e.timeStamp;
		scroller.lastVelocity = 0;
		if (scroller.bounceTimeout) {
			clearTimeout(scroller.bounceTimeout);
			scroller.bounceTimeout = null;		
		}

		if (typeof WebKitCSSMatrix !== 'undefined') {
			var transformMatrix = new WebKitCSSMatrix(window.getComputedStyle(scroller.el)['-webkitTransform']);
			stopScrollingAt(scroller, scroller.horizontal ? transformMatrix.m41 : transformMatrix.m42);								
		}
	}	
	
	
	function doMomentum(scroller) {
	  var velocity = this.getEndVelocity();
	}		

	function stopHandler(scroller, e) {	
		if (!scroller.enabled) {
			return;
		}
		
		if (!scroller.tracking) {
			return;
		}		
				
		scroller.staticOffset = Math.round(scroller.currentOffset);
		scroller.tracking = false;		
		
		var velocity = updateVelocity(scroller, e);	
		var flickTo = scroller.flickTo(velocity);		
		
		if (flickTo) {
			var flickDistance = Math.abs(scroller.staticOffset - flickTo.offset);
			
			F5.removeTransitionEndListener(scroller.el);			
			// if we use the transition end event, there's a tiny hickup in the transition from the
			// flick to the flickPast animation. so instead	use a setTimeout so that
			// the flickPast animation gets set while the flick animation is still running
//			F5.addTransitionEndListener(scroller.el, function (e) {
			scroller.bounceTimeout = setTimeout(function () {
				scroller.bounceTimeout = null;
				
//				F5.removeTransitionEndListener(scroller.el);				
				
				// handle a flick past the scroller end
				var now = Date.now();
				if (flickTo.bezier === scroller.curves.flickPast) {
					var bounceOffset;
					if (F5.sign(velocity) === 1) {
						bounceOffset = scroller.bounceDistance;
					} else {
						bounceOffset = scroller.minOffset - scroller.bounceDistance;
					}

					scroller.staticOffset = scroller.currentOffset = Math.round(bounceOffset);
					
					// match the starting velocity of the bounce to the ending velocity of the flick
					var t1, t2;		
								
					t1 = F5.cubicBezierAtTime.apply(F5, [0.99].concat(flickTo.bezier).concat(1));
					t2 = F5.cubicBezierAtTime.apply(F5, [1.00].concat(flickTo.bezier).concat(1));					
					var endVelocity = (t2 - t1)*flickDistance/(0.01*flickTo.duration);
					
					t1 = F5.cubicBezierAtTime.apply(F5, [0.00].concat(scroller.curves.easeOut).concat(1));
					t2 = F5.cubicBezierAtTime.apply(F5, [0.01].concat(scroller.curves.easeOut).concat(1));						
					var duration = 100 * ((t2 - t1) * scroller.bounceDistance) / endVelocity;
															
					F5.addTransitionEndListener(scroller.el, function () {
						F5.removeTransitionEndListener(scroller.el);									
						finishScrolling(scroller);					
					});										
					
					doTransform(scroller, bounceOffset, duration, scroller.curves.bounce);	
//					console.log(Date.now() - now);												
				} else {
					// TODO: not necessary?
					finishScrolling(scroller);										
				}				
			}, flickTo.duration * 1000 - 10);						


			if (flickTo.cb) {
				F5.addTransitionEndListener(scroller.el, function () {
					flickTo.cb();
					F5.removeTransitionEndListener(scroller.el);
				});				
			}		

			doTransform(scroller, flickTo.offset, flickTo.duration, flickTo.bezier);
						
			scroller.staticOffset = scroller.currentOffset = Math.round(flickTo.offset);
		} else {
			finishScrolling(scroller);			
		}			
	}	

	function moveHandler(scroller, e) {
		if (!scroller.enabled) {
			return;
		}
					
		// browser compatibility
		if (!scroller.tracking) {
			return;
		}			

		updateVelocity(scroller, e);	

		var delta = scroller.horizontal ? eventPosition(scroller, e).x - scroller.startLoc.x : 
											eventPosition(scroller, e).y - scroller.startLoc.y;

		scroller.currentOffset = scroller.constrainDrag(scroller.staticOffset, delta);

		doTransform(scroller, scroller.currentOffset);
	}	
		
	function TouchScroller(el) {

		// prototype functions
		this.curves = {
			bounce: [0.0, 0.0, 0.58, 1.0],
			easeOut: [0.0, 0.0, 0.58, 1.0],
			easeIn: [0.42, 0.0, 1.0, 1.0],
			flickTo: [0.33, 0.66, 0.76, 1],
			flickPast: [0.33, 0.55, 0.55, 0.75],
			hardSnap: [0, 0.75, 0.55, 1.0],
			softSnap: [0.25, 0.25, 0.55, 1.0]
		};

		this.maxVelocity = 5.0;
		this.enabled = true;
		this.bounceDistance = 40;	
		this.flickVelocityThreshold = 0.05;							
		
		this.initialize = function () {
			var that = this;
						
			F5.addClass(this.el, 'f5scroller');
						
			stopScrollingAt(this, 0);
			
			// TODO: let this do x/y with constraint to one or the other axis
			this.horizontal = false;
			
			// other parameters that get used
///			this.tracking			
//			this.minOffset
//			this.container
//			this.startLoc;									
//			this.touchLoc;	
//			this.touchTime;
//			this.lastVelocity;
			
			this.refreshFunction = function () {
				that.refresh();
			};
			
			this.scrollToTopFunction = function () {
				that.scrollTo(0);
			};			
			
			function moveHandlerWrapper(e) {
				moveHandler(that, e);
			}

			function stopHandlerWrapper(e) {
				if (!F5.isTouchDevice()) {		
					window.removeEventListener('mouseup', stopHandlerWrapper);
					window.removeEventListener('mousemove', moveHandlerWrapper);							
				}
				F5.removeTouchStopListener(that.el, stopHandlerWrapper);				
				F5.removeTouchMoveListener(that.el, moveHandlerWrapper);				
				stopHandler(that, e);
			}			
			
			F5.addTouchStartListener(this.el, function (e) {
				if (!that.enabled) {
					return;
				}
				
				startHandler(that, e);
				// makes the scroller play nice in a desktop browser
				if (!F5.isTouchDevice()) {
					window.addEventListener('mouseup', stopHandlerWrapper);
					window.addEventListener('mousemove', moveHandlerWrapper);
				}
				F5.addTouchStopListener(that.el, stopHandlerWrapper);			
				F5.addTouchMoveListener(that.el, moveHandlerWrapper);
			});
									
			doTransform(this, this.staticOffset);
		};
		
		// standard snapTo logic: bound to beginning and end of scroller
		this.snapTo = function () {
			var snapTo;
			// bounce back						
			if (Math.abs(this.staticOffset) > Math.abs(pinOffset(this, this.staticOffset, 0))) {

				var offset = pinOffset(this, this.staticOffset, 0);	

				// sharp snapback if stretched
				var bezier;
				if (Math.abs(this.currentOffset-offset) > this.bounceDistance) {
					bezier = this.curves.hardSnap;
				} else {
					bezier = this.curves.easeOut;
				}
				
				if (offset !== this.staticOffset) {
					snapTo = {offset: offset, duration: 0.5, bezier: bezier};					
				}
			}	
			
			return snapTo;			
		};
		
		this.constrainDrag = function(offset, delta) {	
			
			// limit is the furthest it's possible to drag without leaving the container
			var limit = this.horizontal ? this.container.width : this.container.height;		
							
			// maxDrag is the furthest it's possible to drag without leaving the container
			// given the initial touch position
			var maxDrag = this.horizontal ? limit - this.startLoc.x : limit - this.startLoc.y;				
			if (F5.sign(delta) < 0 ) {
				maxDrag = this.horizontal ? -this.startLoc.x : -this.startLoc.y;
			}

			// constrain the drag based on the container
			if (Math.abs(delta) > Math.abs(maxDrag)) {
				delta = maxDrag;
			}

			// now see how far it's possible to overdrag based on initial scroller position
			var maxOverdrag = maxDrag;
			// logic is dependent on direction of drag
			if (F5.sign(delta) > 0 && offset + maxDrag > 0) {
				maxOverdrag = offset + maxDrag;
			} else if (F5.sign(delta) < 0 && offset+maxDrag < this.minOffset) {
				maxOverdrag = offset+maxDrag-this.minOffset;
			}

			// see if the drag is past the maximum drag position
			var overDrag = 0;
			// logic is dependent on direction of drag
			if (F5.sign(delta) > 0 && offset+delta > 0) {
				overDrag = offset+delta;
			} else if (F5.sign(delta) < 0 && offset+delta < this.minOffset) {
				overDrag = offset+delta-this.minOffset;
			}

			// if overdragged, constrain and apply a rubbery effect using bezier
			if (overDrag) {								
				// limit the overdrag to half the 
				var overDragLimit = 0.5 * F5.sign(delta) * Math.min(Math.abs(maxOverdrag), limit);
				// make it stretchy
				var constrainedOverdrag = overDragLimit * F5.cubicBezierAtTime(overDrag/maxOverdrag, 0, 0, 0.5 ,1, 2.0);
				delta = delta - overDrag + constrainedOverdrag;
			}

			return offset + delta;
		};
		
		this.flickTo = function (velocity) {
			var that = this;			
			function overDragged(velocity) {
				return (F5.sign(velocity) === 1 && that.staticOffset > 0) || 
					   (F5.sign(velocity) === -1 && that.staticOffset < that.minOffset);
			}
			
			if (Math.abs(velocity) > this.flickVelocityThreshold && !overDragged(velocity)) {	
				velocity = pinVelocity(velocity);

				// based on http://code.google.com/mobile/articles/webapp_fixed_ui.html
				var acceleration = velocity < 0 ? 0.0005 : -0.0005;
				var momentumDistance = -(velocity * velocity) / (2 * acceleration);
				var scrollDuration = -velocity / acceleration;

				// flick to the bounce boundary. then the handler will create a second bezier
				// to decelerate to the end of the bounce
				var pinnedOffset = pinOffset(this, this.staticOffset + momentumDistance, 0);
				var flickPast = pinnedOffset !== this.staticOffset + momentumDistance;
				var scrollDistance = pinnedOffset - this.staticOffset;

				// Not quite right because of decelleration
				var scaler = Math.abs(scrollDistance/momentumDistance);
				
				// TODO: need to take a closer look at this. this should never be > 1
				if (scaler > 1) {
					scaler = 1;
				}
				scrollDuration *= scaler;
				
				var bezier;
				if (flickPast) {
					bezier = this.curves.flickPast;
				} else {
					bezier = this.curves.flickTo;
				}

				if (pinnedOffset !== this.staticOffset) {
					return {offset: pinnedOffset, duration: scrollDuration/1000, bezier: bezier};					
				}
			}			
		};
				
		this.widgetWillBecomeActive = function () {
			if (!this.initialized) {
				this.refresh();
				this.initialized = true;				
			}			
		};				
				
		this.widgetDidBecomeActive = function () {
			window.addEventListener('orientationchange', this.refreshFunction);
			document.addEventListener('f5StatusBarTouched', this.scrollToTopFunction);
			this.active = true;
		};
						
		this.widgetWillBecomeInactive = function () {
			this.tracking = false;
			finishScrolling(this);
			window.removeEventListener('orientationchange', this.refreshFunction);			
			document.removeEventListener('statusBarTouched', this.scrollToTopFunction);
		};
		
		this.widgetDidBecomeInactive = function () {
			this.active = false;
		};
		
		this.stopScrolling = function () {
			var transformMatrix = new WebKitCSSMatrix(window.getComputedStyle(this.el)['-webkitTransform']);			
			stopScrollingAt(this, this.horizontal ? transformMatrix.m41 : transformMatrix.m42);	
			this.tracking = false;				
		};
		
		this.disable = function () {
			this.enabled = false;
		};

		this.enable = function () {
			this.enabled = true;
		};
		
		this.scrollTo = function (offset, cb) {
			var that = this;
			
			function completeScroll() {
				F5.removeTransitionEndListener(that.el);
				cb();
			}

			if (this.staticOffset === offset) {
				if (cb) {
					cb();
				}				
			} else {
				this.staticOffset = this.currentOffset = Math.round(offset);
				doTransform(this, offset, 0.5, this.curves.softSnap);			

				if (cb) {
					F5.addTransitionEndListener(this.el, completeScroll);
				}				
			}
		};
		
		this.jumpTo = function (offset) {
			this.staticOffset = this.currentOffset = Math.round(offset);
			doTransform(this, offset);	
		};
		
		this.finishScrolling = function () {
			finishScrolling(this);
		};
				
		// TODO: may run into the large div problem again in which case the content size
		// may not be derivable from offsetHeight
		this.refresh = function () {
			
// NOTE: it may be important to make the scroller a fixed size so that it doesn't grow to the size of the contained
//		 divs. In the past I've seen glitches when a single div with -webkit-transform gets too big, probably
//       due to paging of textures			
//			this.el.style.width = '';
//			this.el.style.height = '';			
			
			this.container = F5.elementOffsetGeometry(this.el.parentElement);
			var absolutePosition = F5.elementAbsolutePosition(this.el.parentElement);
			this.container.left = absolutePosition.x;
			this.container.top = absolutePosition.y;
			
			var oldMinOffset = this.minOffset;
			if (this.horizontal) {
				this.minOffset = Math.min(this.container.width - this.el.offsetWidth, 0);				
			} else {
				this.minOffset = Math.min(this.container.height - this.el.offsetHeight, 0);
			}
			if (oldMinOffset !== this.minOffset) {
				this.staticOffset = 0;
				doTransform(this, 0);				
			}
			
			this.initialized = false;				
			
//			if (this.horizontal) {
//				this.el.style.width = '0px';				
//			} else {
//				this.el.style.height = '0px';				
//			}			
		};
	}
	

	// TODO: refactor. don't like having the non-generic methods (commented out below) in the TouchScroller
	function DesktopScroller() {
						
			this.initialize = function () {
				
			};

			this.refresh = function () {
				// noop. overflow logic handles this
			};	
			
			this.widgetWillBecomeActive = function () {
				this.el.parentElement.style.overflow = 'scroll';												
			};
			
			this.staticOffset = 0;
			
			// used by mobile forms (to keep scroller from moving when an input is focused)
			// but also by application layer (which it should not be)
			this.enable = F5.noop;				
			this.disable = F5.noop;								

			// this is only called by the touchscroller implementation and
			// mobile forms
			// also called by application layer occassionly (which it should not be)
			this.stopScrolling = F5.noop;

			// this is only called by the mobile version of forms
//			this.jumpTo
			
			// this is used by forms			
//			this.finishScrolling	
			
			// this is only called by Carousel (when going to detents) and by the 
			// status bar touch event handler
//			this.scrollTo

	}
	
	
	

	F5.Prototypes.Widgets.TouchScroller = new TouchScroller();
	
	if (F5.isMobile()) {
		F5.Prototypes.Widgets.Scroller = F5.Prototypes.Widgets.TouchScroller;
	} else {
		F5.Prototypes.Widgets.Scroller = new DesktopScroller();
	}
			
		
});