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
/*global F5, PhoneGap*/

(function () {

	function generateToken() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random() * 16 | 0;
			var v = c === 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		}).toUpperCase();
	}

	function doSync(url) {
		var origin;
		if (window.location.protocol === 'file:') {
			// NOTE: XHR requires a full resolvable URL
			origin = 'http://www.flow5.com';
		} else {
			origin = window.location.origin;
		}
		url = origin + '/' +  generateToken() + '/' + url;
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, false);

	// NOTE: xhr.send() can cause UI events to be processed on iOS
	// for async sends, the xhr.send() is put in a setTimeout to ensure that the caller is not reentrant
	// for synchronous sends, the only solution is to wrap the start event callback to prevent queued user
	// actions from occuring. this will cause some events to be dropped. see events.js
	// TODO: reference RADAR bug report
	F5.xhrSendBlocking = true;
		xhr.send(null);
	F5.xhrSendBlocking = false;

		var result;
		try {
			result = JSON.parse(xhr.responseText).message;
		} catch (e) {
			console.log(xhr.responseText);
//			console.log('exception parsing: ' + JSON.stringify(xhr) + ' url: ' + url);
		}
		return result;
	}

	F5.flushBridgeAsyncCommands = function () {
		doSync('gapready');
	};

	F5.callBridgeSynchronous = function (className, methodName, arguments, options) {
		var command = {
			className: className,
			methodName: methodName,
			arguments: arguments,
			options: options
		};

		var url = 'gap?command=' +  encodeURIComponent(JSON.stringify(command));

		return doSync(url);
	};

	F5.flushTasks = function (tasks, cb) {
		PhoneGap.exec(
			function (result) { // success
				F5.parallelizeTasks(tasks, cb);
				// force reflow before returning control to native side
				// this allows synchronization of webkit and native animations
				F5.reflow();
			},
			function (result) { // failure
				console.log(result);
			}, "com.flow5.commandqueue", "flush", []
		);
	};

	F5.openLink = function (url) {
		PhoneGap.exec(
			function success(result) {
			},
			function failure(result) {
				console.log(result);
			}, "com.flow5.utils", "openLink", [url]
		);
	};

}());