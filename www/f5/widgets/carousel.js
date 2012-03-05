/***********************************************************************************************************************

	Copyright (c) 2012 Paul Greyson

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
/*global F5, HTMLDivElement*/

(function () {
	
	function Carousel() {
		
		this.construct = function () {		
			Carousel.prototype.construct.call(this);														
			F5.addClass(this.el, 'f5carousel');				
			this.horizontal = true;
		};
		
		this.refresh = function () {			
			// calculate the widths of the child divs to set detents
			this.detents = [];
			var width = 0;
			var that = this;
			F5.forEach(this.el.childNodes, function (obj) {
				if (obj.constructor === HTMLDivElement) {
					var el = obj;
					that.detents.push(-width);
					width += el.offsetWidth;
					el.style.width = el.offsetWidth + 'px';
				}
			});
			this.el.style.width = width + 'px';	
			
			Carousel.prototype.refresh.call(this);																			
		};
		
		this.widgetWillBecomeActive = function () {
			if (!this.detents) {
				this.refresh();
			}
		};
		
		// snap to nearest detent
		this.snapTo = function () {
			var index;
			// find the first detent that's been scrolled past
			for (index = 0; index < this.detents.length; index += 1) {
				if (this.staticOffset > this.detents[index]) {
					break;
				}
			}
			
			var offset;
			// if scrolled all the way to the end, snap to the last div
			if (index === 0) {
				offset = this.detents[0];
			} else if (index === this.detents.length) {
				offset = this.detents[this.detents.length - 1];
			} else {
				// otherwise snap to whichever div is closest
				var midPoint = this.detents[index - 1] + (this.detents[index] - this.detents[index - 1])/2;
				if (this.staticOffset <= midPoint) {
					offset = this.detents[index];					
				} else {
					offset = this.detents[index - 1];										
				}
			}
			
			if (offset !== this.staticOffset) {
				return {offset: offset, duration: 0.25, bezier: this.curves.softSnap};				
			}
		};
		
		this.flickTo = function (velocity) {
			var index;
			// find the first detent that's been scrolled past
			for (index = 0; index < this.detents.length; index += 1) {
				if (this.staticOffset > this.detents[index]) {
					break;
				}
			}

			var offset;
			if (Math.abs(velocity) > this.flickVelocityThreshold) {
				if (velocity > 0 && index > 0) {
					offset = this.detents[index - 1];
				} else if (velocity < 0 && index < this.detents.length){
					offset = this.detents[index];
				}					
			}
			if (typeof offset !== 'undefined') {
				return {offset: offset, duration: 0.25, bezier: this.curves.softSnap};
			}					
		};		
	}
	Carousel.prototype = F5.Prototypes.Widgets.Scroller;
	
	F5.Prototypes.Widgets.Carousel = new Carousel();	
}());