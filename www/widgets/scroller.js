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
	
	var maxVelocity = 2.0;
	var standardBounceDistance = 40;		
	var flickVelocityThreshold = 0.05;		
	var bounceBackDuration = 500;
			
	function transform(scroller, offset, duration, bezier) {
		if (duration) {
			scroller.el.style['-webkit-transition'] = '-webkit-transform ' + duration + 's ' + bezier;				
		} else {
			scroller.el.style['-webkit-transition'] = '';
		}
		scroller.el.style['-webkit-transform'] = scroller.horizontal ? 'translate3d(' + offset + 'px,0px,0px)' : 
																'translate3d(0px,' + offset + 'px,0px)';				
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
		if (Math.abs(velocity) > maxVelocity) {
			velocity = F5.sign(velocity)*maxVelocity;
		}		
		return velocity;	
	}
	
	function stopScrollingAt(scroller, offset) {
		scroller.staticOffset = scroller.currentOffset = offset;
		transform(scroller, scroller.staticOffset);
	}
		
	function eventPosition(scroller, e) {
		var location = F5.eventLocation(e);
		return {x:location.x-scroller.container.left,y:location.y-scroller.container.top};
	}	
			
	// don't do instantaneous updating of velocity
	function updateVelocity(scroller, e) {
		var weighting = 0.5;

		var newTouchLoc = eventPosition(scroller, e);
		var delta = scroller.horizontal ? newTouchLoc.x - scroller.touchLoc.x : newTouchLoc.y - scroller.touchLoc.y;			
		scroller.touchLoc = newTouchLoc;

		var deltaT = e.timeStamp - scroller.touchTime;
		scroller.touchTime = e.timeStamp;

		var newVelocity = pinVelocity((1.0 - weighting) * scroller.lastVelocity + weighting * (delta / deltaT));

		scroller.lastVelocity = newVelocity;	

		return newVelocity;
	}
	
	function finishScrolling(scroller) {				

		F5.removeTransitionEndListener(scroller.el);	

		// bounce back						
		if (Math.abs(scroller.staticOffset) > Math.abs(pinOffset(scroller, scroller.staticOffset, 0))) {

			var offset = pinOffset(scroller, scroller.staticOffset, 0);	

			// sharp snapback if stretched
			var bezier;
			if (Math.abs(scroller.currentOffset-offset) > standardBounceDistance) {
				bezier = scroller.curves.hardSnap;
			} else {
				bezier = scroller.curves.softSnap;
			}
			transform(scroller, offset, 0.5, bezier);

			scroller.currentOffset = scroller.staticOffset = offset;
		}	
	}
		
	function startHandler(scroller, e) {
		scroller.tracking = true;					
		scroller.touchLoc = eventPosition(scroller, e);
		scroller.startLoc = scroller.touchLoc;
		scroller.touchTime = e.timeStamp;
		scroller.lastVelocity = 0;

		var transformMatrix = new WebKitCSSMatrix(scroller.el.style.webkitTransform);
		stopScrollingAt(scroller, scroller.horizontal ? transformMatrix.m41 : transformMatrix.m42);					
	}	
	
	
	function doMomentum(scroller) {
	  var velocity = this.getEndVelocity();
	}		

	function stopHandler(scroller, e) {	

		if (!scroller.tracking) {
			return;
		}		

		scroller.staticOffset = scroller.currentOffset;				
		scroller.tracking = false;		
		
		function overDragged(velocity) {
			return (F5.sign(velocity) === 1 && scroller.staticOffset > standardBounceDistance) || 
				   (F5.sign(velocity) === -1 && scroller.staticOffset < scroller.minOffset - standardBounceDistance);
		}

		var velocity = updateVelocity(scroller, e);	
		if (Math.abs(velocity) > flickVelocityThreshold && !overDragged(velocity)) {						
			velocity = pinVelocity(velocity);

			// based on http://code.google.com/mobile/articles/webapp_fixed_ui.html
			var acceleration = velocity < 0 ? 0.0005 : -0.0005;
			var momentumDistance = -(velocity * velocity) / (2 * acceleration);
			var scrollDuration = -velocity / acceleration;
			
			var maxFlickDistance = standardBounceDistance;
			var pinnedOffset = pinOffset(scroller, scroller.staticOffset + momentumDistance, maxFlickDistance);										
			var scrollDistance = pinnedOffset - scroller.staticOffset;

			// Note quite right because of decelleration
			scrollDuration *= Math.abs(scrollDistance/momentumDistance);

			F5.removeTransitionEndListener(scroller.el);				
			F5.addTransitionEndListener(scroller.el, function (e) {
				finishScrolling(scroller);
			});						

			transform(scroller, pinnedOffset, scrollDuration/1000, scroller.curves.flick);

			scroller.staticOffset = pinnedOffset;	
			// also update the currentOffset since we're animating a move				
			scroller.currentOffset = scroller.staticOffset;										
		} else {
			finishScrolling(scroller);
		}				
	}	

	function moveHandler(scroller, e) {

		// browser compatibility
		if (!scroller.tracking) {
			return;
		}	

		function constrainDrag(offset, delta) {		

			// limit is the furthest it's possible to drag without leaving the container
			var limit = scroller.horizontal ? scroller.container.width : scroller.container.height;		
							
			// maxDrag is the furthest it's possible to drag without leaving the container
			// given the initial touch position
			var maxDrag = scroller.horizontal ? limit - scroller.startLoc.x : limit - scroller.startLoc.y;				
			if (F5.sign(delta) < 0 ) {
				maxDrag = scroller.horizontal ? -scroller.startLoc.x : -scroller.startLoc.y;
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
			} else if (F5.sign(delta) < 0 && offset+maxDrag < scroller.minOffset) {
				maxOverdrag = offset+maxDrag-scroller.minOffset;
			}

			// see if the drag is past the maximum drag position
			var overDrag = 0;
			// logic is dependent on direction of drag
			if (F5.sign(delta) > 0 && offset+delta > 0) {
				overDrag = offset+delta;
			} else if (F5.sign(delta) < 0 && offset+delta < scroller.minOffset) {
				overDrag = offset+delta-scroller.minOffset;
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
		}

		updateVelocity(scroller, e);	

		var delta = scroller.horizontal ? eventPosition(scroller, e).x - scroller.startLoc.x : eventPosition(scroller, e).y - scroller.startLoc.y;

		scroller.currentOffset = constrainDrag(scroller.staticOffset, delta);

		transform(scroller, scroller.currentOffset);
	}	
		
	function Scroller(el) {

		// prototype functions
		this.curves = {
			easeOut: 'cubic-bezier(0, 0, 0.58, 1.0)',
			flick: 'cubic-bezier(0.33, 0.66, 0.66, 1)', // http://code.google.com/mobile/articles/webapp_fixed_ui.html
			hardSnap: 'cubic-bezier(0, .75, 0.55, 1.0)',
			softSnap: 'cubic-bezier(.10, .45, 0.55, 1.0)'
		};
		
		this.construct = function () {
			var that = this;
			
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
			
			F5.addTouchStartListener(this.el, function (e) {
				startHandler(that, e);
			});
			
			F5.addTouchStopListener(this.el, function (e) {
				stopHandler(that, e);
			});
			
			F5.addTouchMoveListener(this.el, function (e) {
				moveHandler(that, e);
			});
			
			transform(this, this.staticOffset);
		};
		
		this.widgetWillBecomeInactive = function () {
			this.tracking = false;
			finishScrolling(this);
		};
				
		// TODO: may run into the large div problem again in which case the content size
		// may not be derivable from offsetHeight
		this.refresh = function () {
			this.container = F5.elementOffsetGeometry(this.el.parentElement);
			this.minOffset = Math.min(this.container.height - this.el.offsetHeight, 0);
		};
	}

	F5.WidgetPrototypes.Scroller = new Scroller();
		
}());