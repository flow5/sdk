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
/*global F5, io*/

F5.registerModule(function (F5) {
	
	// TODO: maybe make a separate console section in manifest instead
	// currently console is include with debug scripts
	if (!F5.query.ide) {
		return;
	}
	
	var Console;
	F5.Global.flowController.addWaitTask(function (cb) {
		function complete() {
			F5.Global.flowController.addFlowObserver(new Console(io.connect(F5.query.devserv)));
			cb();			
		}
				
		if (typeof document === 'undefined') {
			// headless.js requires socket.io-client
			complete();
		} else {
			var url = F5.query.devserv + '/socket.io/socket.io.js';
			F5.doXHR('GET', url, null, 
				function success(result, status) {
					/*jslint evil: true*/
					eval(result);
					complete();
				},
				function error(status) {
					console.log(status);
				});			
		}
	});

	Console = function(socket) {

		function postMessage(message) {
			socket.emit('message', message);
		}

		function update() {
			postMessage({
				model: F5.Global.flow.toJSON(F5.Global.flow.root)
			});											
		}

		this.update = update;

		socket.on('message', function (message) {						
	//		console.log(message)

			var response = {type: 'response', id: message.id};
			var action;

			try {
				switch (message.type) {
				case 'exec':
					/*jslint evil:true*/
					response.value = eval(message.value);
					break;
				case 'update':
					update();
					break;
				case 'flowDelegate':
					action = function (cb) {
						var node = F5.Global.flow.getNodeFromPath(message.path);								
						var args = message.args || [];
						args.push(cb);								
						node.flowDelegate[message.method].apply(node.flowDelegate, args);									
					};
					break;
				case 'viewDelegate':
					action = function (cb) {
						var node = F5.Global.flow.getNodeFromPath(message.path);
						var args = message.args || [];
						args.push(cb);								
						args.push(cb);
						node.view.delegate[message.method].apply(node.view.delegate, args);									
					};
					break;
				case 'transition':
					action = function (cb) {
						var node = F5.Global.flow.getNodeFromPath(message.path);
						F5.Global.flowController.doTransition(node, message.to, message.parameters, cb);
					};
					break;
				case 'selection':
					response.message = 'did selection';
					break;
				case 'reset':
					response.message = 'reloading. . .';
					if (typeof location !== 'undefined') {
						postMessage(response);
						setTimeout(function () {
							location.reload();										
						}, 0);
					}
					break;
				case 'frames':
					if (typeof document !== 'defined') {
						if (F5.hasClass(document.body, 'f5frames')) {
							F5.removeClass(document.body, 'f5frames');
						} else {
							F5.addClass(document.body, 'f5frames');										
						}
					}
					break;
				case 'back': 
					F5.Global.flowController.doBack();
					break;
				case 'data': 
					var node = F5.Global.flow.getNodeFromPath(message.path);
					response.message = JSON.stringify(node.data.dump());
					break;
				default:
					response.value = 'unknown message type: ' + message.type;
				}
			} catch (e1) {
				response.type = 'uncaughtException';
				response.value = e1.message;
				console.log(e1);
			}

			if (action) {
				try {
					action(function (result) {
						response.value = result;
						postMessage(response);								
					});								
				} catch (e2) {
					response.type = 'uncaughtException';
					response.value = e2.message;
					console.log(e2);	
					postMessage(response);								
				}
			} else {
				postMessage(response);
			}						
		});
	};
});



/*
// this highjacks the delegates allowing a listener to track all lifecycle events
// should use flowDelegates though I think
F5.View.getViewDelegatePrototype = function (id) {
	var prototype = F5.getPrototype('ViewDelegates', id);
	function Wrapper() {
		var that = this;
		[
			'initialize', 
			'viewDidBecomeActive',
			'viewWillBecomeActive',
			'viewWillBecomeInactive',
			'viewDidBecomeInactive',
			'release'			
		].forEach(function (event) {				
			that[event] = function () {
				var message = {
					path: this.node.path,
					event: event
				};
				F5.execService(null, 'f5.devserv.talk', {
											clientid: clientid, 
											channel: F5.appPkg + '.listener',
											message: message}, F5.noop);
				if (prototype && prototype[event]) {
					prototype[event].call(this);					
				}					
			};
		});
	}
	Wrapper.prototype = prototype;

	return new Wrapper();
};
*/