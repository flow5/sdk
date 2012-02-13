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
/*global F5, PhoneGap*/

(function () {
	
	function WebFrame() {
		
		this.construct = function (data) {
			F5.addClass(this.el, 'f5webframe');
			this.el.style.display = 'none';	
			this.el.style.opacity = 0;
			
			this.frame = document.createElement('iframe');
			this.frame.style.border = 'none';
			this.frame.scrolling = 'no';
						
			this.el.appendChild(this.frame);
			
			var closeButton = F5.createWidget('Button', data, 'closeButton', 'closeButton');
			F5.addClass(closeButton, 'f5closebutton');
			this.el.appendChild(closeButton);																																					
			
			var that = this;
			closeButton.widget.setAction(function () {
				that.close();
			});
		};
		
		this.setCloseAction = function (cb) {
			this.closeAction = cb;
		};
		
		this.open = function (url, referrer, options, cb) {
			this.el.style.display = '';
			this.el.style.opacity = 0;			
			var that = this;
		
			var radius = window.getComputedStyle(this.el)['border-top-left-radius'];
			if (radius) {
				this.frame.style['border-radius'] = radius;
			}
			if (options.zoom) {
//				this.frame.style.zoom = options.zoom;
				this.frame.style['-webkit-transform'] = 'scale(' + options.zoom + ')';
				this.frame.style['-webkit-transform-origin'] = '0% 0%';
				this.frame.width = 100/options.zoom + '%';
				this.frame.height = 100/options.zoom + '%';				
			}
						
			this.frame.onload = function () {
				that.el.style.opacity = 1;												
			}
			this.frame.src = url;
		};
		
		this.close = function () {	
			this.el.style.opacity = 0;
			
			var that = this;
			function hide() {
				that.frame.src = null;						
				that.el.style.display = 'none';
				F5.removeTransitionEndListener(that.el, hide);				
			}
			
			F5.addTransitionEndListener(this.el, hide);
			if (this.closeAction) {
				this.closeAction();
			}
		};
	}
	
	F5.Prototypes.Widgets.WebFrame = new WebFrame();	
}());