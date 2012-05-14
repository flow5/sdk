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
/*global F5*/

(function () {
	
	var baseUrl = 'http://' + F5.query.devserv + '/';
	
	function Pipe() {
		this.open = function (id, channel, cb) {
			this.id = id;
			
			var that = this;
			
			F5.doXHR('GET', baseUrl + 'clientid' , null, 
				function success(clientid, status) {
					that.clientid = clientid;				
					that.parameters = '?id=' + that.id + '&clientid=' + that.clientid + '&channel=' + channel;
					
					function keepAlive() {
						// hanging get to keep connection open
						that.keepAliveXHR = F5.doXHR('GET', baseUrl + 'connectListener' + that.parameters, null, 
							function success() {

							}, 
							function error() {
								if (that.keepAliveXHR) {
									console.log('Pipe: listen error (timeout?). Reconnecting. . .');
									keepAlive();						
								}
							});						
					}
					keepAlive();
				
				
					F5.doXHR('GET', baseUrl + 'waitForConnection' + that.parameters, null, 
						function success(result, status) {					
							cb(that);
						}, 
						function error(status) {
							console.log('Pipe: waitForConnection error');				
						});														
				}, 
				function error(status) {
				
				});													
		};
		
		this.listen = function (cb) {
			var that = this;
			this.listenXHR = F5.doXHR('GET', baseUrl + 'listen' + this.parameters, null, 
				function success(result, status) {					
					cb(result);
				}, 
				function error(status) {
					if (that.listenXHR) {
						console.log('Pipe: listen error (timeout?). Reconnecting. . .');
						that.listen(cb);						
					}
				});																	
		};
		
		this.talk = function (channel, message, cb) {
			if (typeof message === 'object') {
				message = JSON.stringify(message);
			}
			
			var parameters = '?id=' + this.id + '&clientid=' + this.clientid + '&channel=' + channel;
			
			F5.doXHR('POST', baseUrl + 'talk' + parameters, message, 
				function success(result, status) {	
					if (cb) {
						cb(result, status);						
					}				
				}, 
				function error(status) {
					console.log('Pipe: talk error.');				
				});																				
		};
		
		this.close = function () {
			var tmp;
			if (this.keepAliveXHR) {
				tmp = this.keepAliveXHR;
				delete this.keepAliveXHR;
				tmp.abort();
			}
			if (this.listenXHR) {
				tmp = this.listenXHR;
				delete this.listenXHR;
				tmp.abort();
			}
		};
	}
	var prototype = new Pipe();
	
	F5.openPipe = function (id, channel, cb) {
		var pipe = F5.objectFromPrototype(prototype);
		pipe.open(id, channel, cb);
	};
		
}());