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
			// TODO: maybe allow client to install hidden image handler
			var that = this;
			this.el.style.visibility = '';					
			this.onerror = function () {
				that.el.style.visibility = 'hidden';
			};
			this.onload = function () {
				this.el.style.visibility = '';					
			};
			if (!F5.isTouchDevice()) {
				F5.addTouchStartListener(this.el, function (e) {
					e.preventDefault();
				});
			}																	
			this.refresh(data);							
		};
		
		this.refresh = function (data) {			
			if (data) {					
				var src;	
				if (F5.ImagePreloader.isImagePreloader(data)) {
					src = data.src();
				} else {
					src = data;
				}
				
				if (this.el.tagName.toLowerCase() === 'img') {
					this.el.src = src;					
				} else {
					this.el.style['background-image'] = 'url(' + src + ')';
				}
			}			
		};				
	}
	
	F5.Prototypes.Widgets.Picture = new Picture();
		
});