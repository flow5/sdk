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
	
	// TODO: maybe make a separate console section in manifest instead
	// currently console is include with debug scripts
	if (!F5.query.console) {
		return;
	}
									
	F5.Global.flowController.addWaitTask(function (cb) {	

		F5.openPipe(F5.query.pkg, F5.query.pkg + '.app', function (pipe) {
			
			function Console() {

				function postMessage(message) {
					pipe.talk(F5.query.pkg + '.listener', message);
				}
				
				function update() {
					postMessage({
						model: F5.Global.flow.diags.toJSON(F5.Global.flow.root),
						dot: F5.Global.flow.diags.toDOT(F5.Global.flow.root)
					});											
				}

				this.update = update;
		
				function listen() {
					pipe.listen(function (message) {						
						message = JSON.parse(message);
						var response = {type: 'response', id: message.id};
						var node;
						
						console.log(message)
						
						var action;
						
						try {
							switch (message.type) {
							case 'exec':
								response.value = eval(message.value);
								break;
							case 'update':
								update();
								break;
							case 'delegate':
								node = F5.Global.flow.diags.getNodeFromPath(message.path);
								action = function (cb) {
									node.flowDelegate[message.method](cb);									
								};
								break;
							case 'transition':
								node = F5.Global.flow.diags.getNodeFromPath(message.path);
								action = function (cb) {
									console.log('dotransition: ' + message.to);
									F5.Global.flowController.doTransition(node, message.to, message.parameters, cb);
								};
								break;
							case 'selection':
								response.message = 'did selection';
								break;
							case 'data': 
								node = F5.Global.flow.diags.getNodeFromPath(message.path);
								response.message = JSON.stringify(node.data.dump());
								break;
							default:
								response.value = 'unknown message type: ' + message.type;
							}
						} catch (e) {
							response.type = 'error';
							response.value = e.message;
						}
						
						if (action) {
							action(function (result) {
								response.value = result;
								postMessage(response);								
								listen();																		
							});
						} else {
							postMessage(response);
							listen();																		
						}						
					});
				}
				listen();				
			}
			F5.Global.flowController.addFlowObserver(new Console());					

			cb();			
		});			
	});
	
});


/*
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
				F5.execService(null, 'f5.devserv.talk', {
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
*/