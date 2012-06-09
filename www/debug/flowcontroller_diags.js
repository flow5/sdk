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
/*global F5*/

F5.registerModule(function (F5) {

	F5.Global.flowController.addWaitTask(function(cb) {
		
		var flow = F5.Global.flow;
				
		var start = F5.Global.flowController.start;
		F5.Global.flowController.start = function (cb) {
			start.call(F5.Global.flowController, cb);
		};
		
		var doSelection = F5.Global.flowController.doSelection;
		F5.Global.flowController.doSelection = function (node, id, cb) {	
			F5.assert(!flow.isSubflowActive(node), 'Cannot select with a subflow active');				
							
			doSelection.call(F5.Global.flowController, node, id, cb);
		};
		
		var doTransition = F5.Global.flowController.doTransition;
		F5.Global.flowController.doTransition = function (node, id, parameters, cb) {
			F5.assert(!flow.isSubflowActive(node), 'Cannot transition with a subflow active');	
		
			doTransition.call(F5.Global.flowController, node, id, parameters, cb);
		};
		
		var doSubflow = F5.Global.flowController.doSubflow;
		F5.Global.flowController.doSubflow = function (node, id, cb) {
			F5.assert(id === 'WillBecomeActive' || id === 'DidBecomeInactive' || flow.isNodePathActive(node), 
				'Attempt to execute subflow from an inactive node');	
			F5.assert(!flow.isSubflowActive(node), 'Subflow already in progress');	
			
			doSubflow.call(F5.Global.flowController, node, id, cb);
		};
		
		var doBack = F5.Global.flowController.doBack;
		F5.Global.flowController.doBack = function (cb) {			
			var backNode = F5.Global.flowController.getBackNode();
			F5.assert(backNode, 'Cannot go back');			
			F5.assert(!flow.isSubflowActive(backNode), 'Cannot go back with a subflow active');
			
			doBack.call(F5.Global.flowController, cb);
		};	
		
		cb();							
	});
	
});