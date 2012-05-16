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
		this.construct = function (data) {	
			this.refresh(data);				
		};
		
		this.refresh = function (data) {			
			if (data) {
				if (!this.img) {
					this.img = document.createElement('img');	
					this.el.appendChild(this.img);	
					
					// TODO: maybe allow client to install hidden image handler
					var that = this;
					this.img.onerror = function () {
						that.img.style.visibility = 'hidden';
					};
					
					// prevent image dragging in browser
					if (!F5.isMobile()) {
						F5.addTouchStartListener(this.img, function (e) {
							e.preventDefault();
						});
					}														
				}
				
				this.img.style.visibility = '';					
				if (F5.ImagePreloader.isImagePreloader(data)) {
					this.img.src = data.src();					
				} else {
					this.img.src = data;
				}
			}			
		};
	}
	
	F5.Prototypes.Widgets.Picture = new Picture();
		
});