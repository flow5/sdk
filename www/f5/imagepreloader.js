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

(function () {
	
	function ImagePreloader() {
		
		this.isImagePreloader = function (obj) {
			return obj instanceof ImagePreloader;
		};
		
		this.load = function (url) {
			var that = this;
			
			if (url.match('data:image/') || url.match('http://')) {
				this.url = url;
			} else {
				this.url = 'apps/' + F5.query.pkg.split('.')[0] + '/' + url;
			}			

			var completed, error, completionCb;
			
			this.image = new Image();
			
			this.image.onload = function () {
				completed = true;
				if (completionCb) {
					completionCb();
				}
			};
			this.image.onerror = function () {
				console.log('Image error: ' + that.url);
				completed = true;
				error = true;
				if (completionCb) {
					completionCb();
				}				
			};
			this.image.src = this.url;			
			
			F5.Global.flowController.addWaitTask(function (cb) {
				if (completed) {
					cb();
				} else {
					completionCb = cb;
				}
			});
		};
		
		this.src = function () {
			return this.url;
		};
	}	

	F5.ImagePreloader = new ImagePreloader();
	
}());