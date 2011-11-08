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

(function () {

	document.addEventListener('f5ready', function () {
		
		var flow = F5.Global.flow;
		
		var doSelection = F5.Global.flowController.doSelection;
		F5.Global.flowController.doSelection = function (node, id, cb) {	
			F5.assert(flow.diags.isNodePathActive(node), 'Attempt to select on an inactive node');	
			F5.assert(!flow.diags.isSubflowActive(node), 'Cannot select with a subflow active');				
							
			doSelection.apply(F5.Global.flowController, [node, id, cb]);
		};
		
		var doTransition = F5.Global.flowController.doTransition;
		F5.Global.flowController.doTransition = function (node, id, cb) {
			F5.assert(flow.diags.isNodePathActive(node), 'Attempt to transition from an inactive node');
			F5.assert(!flow.diags.isSubflowActive(node), 'Cannot transition with a subflow active');	
		
			doTransition.apply(F5.Global.flowController, [node, id, cb]);
		};
		
		var doSubflow = F5.Global.flowController.doSubflow;
		F5.Global.flowController.doSubflow = function (node, id, cb) {
			F5.assert(id === 'willBecomeActive' || id === 'didBecomeInactive' || flow.diags.isNodePathActive(node), 
				'Attempt to execute subflow from an inactive node');	
			F5.assert(!flow.diags.isSubflowActive(node), 'Subflow already in progress');	
			
			doSubflow.apply(F5.Global.flowController, [node, id, cb]);
		};
		
		var doBack = F5.Global.flowController.doBack;
		F5.Global.flowController.doBack = function () {			
			var backNode = F5.Global.flowController.getBackNode();
			F5.assert(!flow.diags.isSubflowActive(backNode), 'Cannot go back with a subflow active');
			
			doBack.apply(F5.Global.flowController);
		};								
	});
	
}());