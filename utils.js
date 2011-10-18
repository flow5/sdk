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
/*global define*/


define('utils', exports, function (exports) {
	
	function post(url, body, success, error) {
		var xhr = new XMLHttpRequest();
		xhr.open('POST', url, true);
		
		xhr.onreadystatechange = function (e) {
			switch (xhr.readyState) {
			case xhr.UNSENT:
//				console.log('XMLHttpRequest.UNSENT');
				break;
			case xhr.OPENED:
//				console.log('XMLHttpRequest.OPENED');				
				break;
			case xhr.HEADERS_RECEIVED:
//				console.log('XMLHttpRequest.HEADERS_RECEIVED');					
				break;
			case xhr.LOADING:
//				console.log('XMLHttpRequest.LOADING');					
				break;
			case xhr.DONE:	
				if (xhr.status === 200) {
					if (success) {
						success(xhr.responseText);
					}
				} else {
					if (error) {
						error(xhr.responseText);
					}
				}
//				console.log('XMLHttpRequest.LOADING');
				break;				
			}								
		};
		
		// WORKAROUND: it seems that xhr.send can cause pending events to fire with reentrancy
		// TODO: build test case. need something that takes a long time right after send, and then
		// some queued events
		setTimeout(function () {
			xhr.send(body);
		}, 0);		
	}	
	
	exports.post = post;	
});



