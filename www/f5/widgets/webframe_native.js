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
			this.el.style.position = 'relative';			
		};

		this.setCloseAction = function (cb) {
			this.closeAction = cb;
		};
		
		this.open = function (url, referrer, options, cb) {
			
			this.el.style.display = '';
			
			var bounds = F5.elementOffsetGeometry(this.el);			
			var position = F5.elementAbsolutePosition(this.el);
			
			bounds.left = position.x;
			bounds.top = position.y;
						
			var parameters = {
				bounds: bounds,
				url: url
			};
			if (referrer) {
				parameters.referrer = referrer;
			}
			
			var radius = window.getComputedStyle(this.el)['border-top-left-radius'];
			if (radius) {
				parameters.radius = radius.replace('px', '');
			}
			
			F5.extend(parameters, options);
						
			PhoneGap.exec(
				function (result) { // success
					if (cb) {
						cb(result);						
					}
				}, 
				function (result) { // failure
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
	}
	
	F5.Prototypes.Widgets.WebFrame = new WebFrame();	
}());