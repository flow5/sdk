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

F5.registerModule(function(F5) {
	
	function WebFrame() {
		
		this.initialize = function (data) {
			this.el.style.position = 'relative';	
			this.el.style.display = 'none';						
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
		
		this.show = function () {
			F5.callBridgeSynchronous('com.flow5.webview', 'show');
		};
		
		this.hide = function () {
			F5.callBridgeSynchronous('com.flow5.webview', 'hide');			
		};
		
		this.openHTML = function (html) {
			this.el.style.display = '';
			
			var bounds = F5.elementOffsetGeometry(this.el);			
			var position = F5.elementAbsolutePosition(this.el);
			
			bounds.left = position.x;
			bounds.top = position.y;
						
			var parameters = {
				bounds: bounds,
				html: html
			};
									
			var that = this;
			PhoneGap.exec(
				function (message) { // messages from frame
					if (message.type === 'onload') {
						if (that.onLoadAction) {
							that.onLoadAction();
						}
						that.show();
					} else	if (that.messageAction) {
						that.messageAction(message.message);
					}
				}, 
				function (result) { // failure
					if (that.onErrorAction) {
						that.onErrorAction();
					}					
					console.log(result);
				}, 
				'com.flow5.webview', // the plugin name
				'openHTML', // the method
				[parameters]
			);											
			
		};
		
		this.widgetWillBecomeInactive = function () {
			this.hide();
		};
				
		// TODO: releaseCallback
		
		this.open = function (url) {
			
			this.el.style.display = '';
			
			var bounds = F5.elementOffsetGeometry(this.el);			
			var position = F5.elementAbsolutePosition(this.el);
			
			bounds.left = position.x;
			bounds.top = position.y;
						
			var parameters = {
				bounds: bounds,
				url: url
			};
									
			var that = this;
			PhoneGap.exec(
				function (message) { // messages from frame
					if (message.type === 'onload') {
						if (that.onLoadAction) {
							that.onLoadAction();
						}
						that.show();						
					} else if (message.message && that.messageAction) {
						that.messageAction(message.message);
					}
				}, 
				function (result) { // failure
					if (that.onErrorAction) {
						that.onErrorAction();
					}					
					console.log(result);
				}, 
				'com.flow5.webview', // the plugin name
				'open', // the method
				[parameters]
			);											
		};
		
		this.close = function () {
			PhoneGap.exec(
				function (result) { // success
					console.log(result);
				}, 
				function (result) { // failure
					console.log(result);
				}, 
				'com.flow5.webview', // the plugin name
				'close', // the method
				[]
			);	
			this.el.style.display = 'none';
			if (this.closeAction) {
				this.closeAction();
			}										
			
		};
				
		this.postMessage = function (data) {
			var javascript = 'window.postMessage(' + JSON.stringify(data) + ', "*")';
			PhoneGap.exec(
				function (result) { // success
					console.log(result);
				}, 
				function (result) { // failure
					console.log(result);
				}, 
				'com.flow5.webview', // the plugin name
				'writeJavascript', // the method
				[javascript]
			);	
			
		};
	}
	
	F5.Prototypes.Widgets.WebFrame = new WebFrame();	
});