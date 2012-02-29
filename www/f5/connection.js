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
	
	function Connection() {
		
		this.callbacks = [];
		
		this.online = function () {
			if (typeof PhoneGap !== 'undefined') {
				return navigator.network.connection.type !== 'unknown';
			} else {
				return navigator.onLine;
			}
		};	
		
		this.addStatusChangeCallback = function (cb) {
			this.callbacks.push(cb);
		};				
		
		this.removeStatusChangeCallback = function (cb) {
			this.callbacks.splice(this.callbacks.indexOf(cb), 1);
		};
		
		var that = this;
		
		window.addEventListener("offline", function(e) {
			that.callbacks.forEach(function (cb) {
				cb(false);
			});
		}, false);

		window.addEventListener("online", function(e) {
			that.callbacks.forEach(function (cb) {
				cb(true);
			});
		}, false);
	}
			
	F5.connection = new Connection();
}());