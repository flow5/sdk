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
/*global define F5*/

define('defaultviewdelegates', exports, function (exports) {
	
	function FlowViewDelegate() {		
		this.initialize = function (el, node) {
			if (node.subflows) {
				var subflowsEl = document.createElement('div');
				subflowsEl.className = 'subflows';
				
				var showSubflows = false;
				node.subflows.forEach(function (id, subflow) {
					if (id !== 'didBecomeActive') {
						showSubflows = true;
						
						var subflowEl = document.createElement('div');
						subflowEl.innerHTML = id;
						subflowEl.className = 'do-subflow';
						subflowsEl.appendChild(subflowEl);	

						F5.UI.Utils.addTouchListener(subflowEl, function () {
							F5.Global.flowController.doSubflow(node, id);
						});						
					}
				});	
				
				if (showSubflows) {
					el.insertBefore(subflowsEl, el.firstChild);												
				}
			}
			
			if (node.transitions) {
				var transitionsEl = document.createElement('div');
				transitionsEl.className = 'transitions';
				el.insertBefore(transitionsEl, el.firstChild);

				node.transitions.forEach(function (id, transition) {
					var transitionEl = document.createElement('div');
					transitionEl.innerHTML = id;
					transitionEl.className = 'do-transition';
					transitionsEl.appendChild(transitionEl);	

					F5.UI.Utils.addTouchListener(transitionEl, function () {
						F5.Global.flowController.doTransition(node, id);
					});

				});				
			}			
			
			var div = document.createElement('div');
			div.innerHTML = node.id;
			div.className = 'nodelabel';			
			el.insertBefore(div, el.firstChild);				
		};
	}
		
	function SwitcherViewDelegate() {
		this.initialize = function (el, node) {
			var tabset = document.createElement('div');
			tabset.className = 'tabset';
			el.insertBefore(tabset);

			node.children.forEach(function (id, child) {
				var tab = document.createElement('div');
				tab.className = 'tab';
				tab.innerHTML = id;
				tabset.appendChild(tab);

				F5.UI.Utils.addTouchListener(tab, function () {
					F5.Global.flowController.doSelection(node, id);
				});
			});			
			
			var div = document.createElement('div');
			div.className = 'nodelabel';
			div.innerHTML = node.id;
			el.insertBefore(div, el.firstChild);				
		};
	}
		
	function SetViewDelegate() {
		this.initialize = function (el, node) {
			var div = document.createElement('div');
			div.className = 'nodelabel';
			div.innerHTML = node.id;
			el.insertBefore(div, el.firstChild);				
		};
	}
		
	function SubflowViewDelegate() {
		this.initialize = function (el, subflow) {			
			var div = document.createElement('div');
			div.innerHTML = subflow.method;
			el.appendChild(div);
			
			var choicesEl = document.createElement('div');
			choicesEl.className = 'choices';
			el.appendChild(choicesEl);
			
			subflow.choices.forEach(function (id, choice) {
				var choiceEl = document.createElement('div');
				choiceEl.innerHTML = id;
				choiceEl.className = 'do-choice';
				choicesEl.appendChild(choiceEl);	
								
				F5.UI.Utils.addTouchListener(choiceEl, function () {
					F5.Global.flowController.doSubflowChoice(subflow.node, id);
				});
							
			});					
		};
	}	
	
	exports.DefaultViewDelegates = {
		flow: new FlowViewDelegate(),
		switcher: new SwitcherViewDelegate(),
		set: new SetViewDelegate(),
		subflow: new SubflowViewDelegate()
	};
});