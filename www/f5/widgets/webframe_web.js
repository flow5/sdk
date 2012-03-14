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
			this.frame.style.width = '100%';
			this.frame.style.height = '100%';
			this.frame.scrolling = 'no';
						
			this.el.appendChild(this.frame);			
		};
		
		this.setOnLoadAction = function (cb) {
			this.onLoadAction = cb;
		};
		
		this.setOnErrorAction = function (cb) {
			this.onErrorAction = cb;
		};				
		
		this.setCloseAction = function (cb) {
			this.closeAction = cb;
		};
		
		this.setMessageAction = function (cb) {
			this.messageAction = cb;
		};		
		
		this.handleEvent = function (e) {
			if (e.type === 'message' && this.messageAction) {
				this.messageAction(e.data);
			}
		};
		
		this.show = function () {
//			F5.callBridgeSynchronous('com.flow5.webview', 'show');
		};
		
		this.hide = function () {
//			F5.callBridgeSynchronous('com.flow5.webview', 'hide');			
		}		
				
		this.open = function (url) {
			this.el.style.display = '';
			this.el.style.opacity = 0;			
			var that = this;
								
			this.frame.onload = function () {
				that.el.style.opacity = 1;												
				if (that.onLoadAction) {
					that.onLoadAction();
				}
			};
			
			// TODO: this doesn't work!
			// NOT sure it's possible to detect an iframe load error
			this.frame.onerror = function () {

			}
			
			// TODO: on error action
			
			this.frame.src = url;
			
			window.addEventListener("message", this, false);	
		};
		
		this.close = function () {	
			var that = this;
			
			function hide() {
				that.frame.src = null;						
				that.el.style.display = 'none';
				F5.removeTransitionEndListener(that.el, hide);				
			}

			if (!this.el.style.display) {
				this.el.style.opacity = 0;
				this.frame.onload = null;

				F5.addTransitionEndListener(this.el, hide);
				if (this.closeAction) {
					this.closeAction();
				}				
			}
			
			window.removeEventListener("message", this);				
		};
		
		this.postMessage = function (data) {
			this.frame.contentWindow.postMessage(data, '*');
		};
		
	}
	
	F5.Prototypes.Widgets.WebFrame = new WebFrame();	
}());