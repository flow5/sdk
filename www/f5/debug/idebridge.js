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

F5.registerModule(function (F5) {
		
	F5.extend(F5.Services, {
		devserv: {
			protocol: 'http',
			baseUrl: window.location.host,  // TODO: make this work headless
			clientid: {
				extendedUrl: '/clientid'
			},
			postMessage: {
				method: 'POST',
				extendedUrl: '/message',
				urlParameterKeys: ['clientid', 'channel']
			},
			getMessage: {
				extendedUrl: '/message'					
			},
			connect: {
				extendedUrl: '/connect'					
			}
		}}
	);	
	
	// TODO: the IDE bridge package shouldn't be included in the IDE app!
	if (F5.query.pkg === 'ide') {
		return;
	}
	
	if (!F5.query.bridge) {
		return;
	}
									
	F5.Global.flowController.addWaitTask(function (cb) {		
		
		F5.execService(null, 'f5.devserv.clientid', {}, function (clientid, status) {	
			F5.execService(null, 'f5.devserv.connect', {clientid: clientid, channel: F5.query.pkg + '.app'}, F5.noop);						
			

			// hijack the view delegates so that the scripting engine can decide what to do
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
							F5.execService(null, 'f5.devserv.postMessage', {
														clientid: clientid, 
														channel: F5.query.pkg + '.listener',
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
			
			function Bridge() {

				function postMessage(message) {
					F5.execService(null, 'f5.devserv.postMessage', {
												clientid: clientid, 
												channel: F5.query.pkg + '.listener',
												message: message}, F5.noop);
				}

				this.update = function () {
					postMessage({
						model: F5.Global.flow.diags.toJSON(F5.Global.flow.root),
						dot: F5.Global.flow.diags.toDOT(F5.Global.flow.root)
					});						
				};
				
				function listen() {
					F5.execService(null, 'f5.devserv.getMessage', {
										clientid: clientid,
										channel: F5.query.pkg + '.app' },
						function (result, status) {
							// now any js can execute remotely through the devserv channel
							if (result && result.message && result.message.exec) {
								var response = '';
								try {
									response = eval(result.message.exec);
								} catch (e) {
									response = e.message;
								}
								postMessage(response);
							}	
							listen();					
						});
				}
				listen();				
			}

			F5.Global.flowController.addFlowObserver(new Bridge());					

			cb();			
		});
	});
	
});