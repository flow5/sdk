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

F5.registerModule(function(F5) {
	
	function Picture() {
		this.initialize = function (data) {	
			this.el.style.visibility = 'hidden';
			if (!F5.isTouchDevice()) {
				F5.addTouchStartListener(this.el, function (e) {
					e.preventDefault();
				});
			}																	
			this.refresh(data);							
		};
				
		this.refresh = function (data) {
			var that = this;			
			this.image = new Image();
							
			function complete() {
				function show() {
					if (that.el.tagName.toLowerCase() === 'img') {
						that.el.src = that.image.src;					
					} else {
						that.el.style['background-image'] = 'url(' + that.image.src + ')';
					}	
					that.el.style.visibility = '';
				}
				
				var trackingScroller = that.el;
				while (trackingScroller) {
					if (trackingScroller.widget && 
						trackingScroller.widget instanceof F5.Prototypes.Widgets.Scroller.constructor &&
						trackingScroller.widget.tracking) {
						break;
					}
					
					trackingScroller = trackingScroller.parentElement;
				}
				
				if (trackingScroller) {
					trackingScroller.widget.deferQueue.push(show);
				} else {
					show();															
				}				
			}
			
			if (data) {	
				if (F5.ImagePreloader.isImagePreloader(data)) {
					this.image.src = data.src();
				} else {
					this.image.src = data;
				}
				if (this.image.complete) {
					setTimeout(complete, 0);
				} else {
					this.image.onload = complete;
					// TODO: maybe allow client to install image load error handler									
				}
			}			
		};				
	}
	
	F5.Prototypes.Widgets.Picture = new Picture();
		
});