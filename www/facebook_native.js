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
	
	F5.Global.flowController.addWaitTask(function (cb) {
		PhoneGap.exec(		
			function (result) { // success
				console.log(result);
				cb();
			}, 
			function (result) { // failure
				console.log(result);
				cb();
			}, "com.flow5.facebookconnect", "initialize", [{appId: '311991002178373'}]);		
	});
	
	function login(appId, cb) {
		PhoneGap.exec(
			function (result) { // success
				cb(result);
			}, 
			function (result) { // failure
				console.log(result);
				cb(null);
			}, "com.flow5.facebookconnect", "login", []);
	} 
	
	function logout(cb) {
		PhoneGap.exec(
			function (result) { // success
				cb(result);
			}, 
			function (result) { // failure
				console.log(result);
				cb(null);
			}, "com.flow5.facebookconnect", "logout", []);
	}
			
	F5.facebook = {
		login: login,
		logout: logout
	};
}());