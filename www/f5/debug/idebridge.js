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
	
	// TODO: the IDE bridge package shouldn't be included in the IDE app!
	if (F5.query.app === 'ide') {
		return;
	}
	
	F5.Global.flowController.addWaitTask(function (cb) {
		
		function ObserverBridge() {
			
			function postMessage(message) {
				window.parent.postMessage({id: 'root', message: message}, '*');
			}

			this.start = function () {	
				postMessage('start');		
			};

			this.doSelection = function (node, id) {
				postMessage('doSelection');	
				
				return function (cb) {
					cb();
				};
			};

			this.doTransition = function (container, from, id, to, animation) {
				postMessage('doTransition');		
				
				return function (cb) {
					cb();
				};
			};

			this.startSubflow = function () {
				postMessage('startSubflow');		
			};

			this.syncSelection = function (node) {
				postMessage('syncSelection');		
			};

			this.completeSubflow = function () {
				postMessage('completeSubflow');		
			};			
		}

		F5.Global.flowController.addFlowObserver(new ObserverBridge());	
		
		
		window.addEventListener('message', function (e) {
			var data = e.data;
			if (data.type === 'eval') {
				window.parent.postMessage({id: data.id, message: eval(data.message)}, '*');
			}
		});
		
		cb();
	});
	
}());