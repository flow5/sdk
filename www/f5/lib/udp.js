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


(function(F5) {
	
	function UDP() {
				
		this.sendDatagram = function (data) {
			PhoneGap.exec(
				function (result) { // success
				console.log(result);
			}, function (result) { // failure
				console.log(result);
			}, "com.flow5.udp", "sendDatagram", [data]);	
		};	
		
		// TODO: need a disconnect call to avoid leaving the PG callback registered
		this.connectToHost = function (host, port, receive, error) {
			PhoneGap.exec(
				function (result) { // success
					receive(result);
			}, function (result) { // failure
					error(result);
			}, "com.flow5.udp", "connectToHost", [{host: host, port: port}]);				
		};
	}
	
	F5.UDP = UDP;
	
}());