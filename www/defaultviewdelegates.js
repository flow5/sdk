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
	
	function isLifecycleSubflow(id) {
		return {didBecomeActive: true, 
				didBecomeInactive: true, 
				willBecomeActive: true, 
				willBecomeInactive: true}[id];
	}
	
	function FlowViewDelegate() {		
		this.initialize = function (el, node) {
			if (node.subflows) {
				var subflowsEl = document.createElement('div');
				F5.addClass(subflowsEl, 'subflows');
				
				var showSubflows = false;
				node.subflows.forEach(function (id, subflow) {
					if (!isLifecycleSubflow(id)) {
						showSubflows = true;
						
						var subflowEl = document.createElement('div');
						F5.addClass(subflowEl, 'do-subflow');
						subflowEl.setAttribute('f5_widget', 'Button');
						subflowEl.setAttribute('f5_id', 'id');
						subflowsEl.appendChild(subflowEl);	
						
						F5.UI.attachWidget(subflowEl, {id: id});

						subflowEl.widget.setAction(function () {
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
				F5.addClass(transitionsEl, 'transitions');
				el.insertBefore(transitionsEl, el.firstChild);

				node.transitions.forEach(function (id, transition) {
					var transitionEl = document.createElement('div');
					transitionEl.setAttribute('f5_id', 'id');
					transitionEl.setAttribute('f5_widget', 'Button');
					F5.addClass(transitionEl, 'do-transition');
					transitionsEl.appendChild(transitionEl);	

					F5.UI.attachWidget(transitionEl, {id: id});
					transitionEl.widget.setAction(function () {
						F5.Global.flowController.doTransition(node, id);
					});
				});				
			}			
			
			var div = document.createElement('div');
			div.innerHTML = node.id;
			F5.addClass(div, 'nodelabel');
			el.insertBefore(div, el.firstChild);				
		};
	}
		
	function SwitcherViewDelegate() {
		this.initialize = function (el, node) {
			node.children.forEach(function (id, child) {
				child.view.el.setAttribute('f5_tab', id);
			});			
			el.setAttribute('f5_widget', 'Tabset');
			
			F5.UI.attachWidget(el);
			el.widget.setAction(function (id) {
				if (id !== node.selection.id) {
					F5.Global.flowController.doSelection(node, id, function () {

					});					
				}
			});
			el.widget.select(node.selection.id);
			
			var div = document.createElement('div');
			F5.addClass(div, 'nodelabel');
			div.innerHTML = node.id;
			el.insertBefore(div, el.firstChild);				
		};
		
		this.doSelection = function (node, id) {
			node.view.el.widget.select(id);
		};
	}
		
	function SetViewDelegate() {
		this.initialize = function (el, node) {
			var div = document.createElement('div');
			F5.addClass(div, 'nodelabel');
			div.innerHTML = node.id;
			el.insertBefore(div, el.firstChild);				
		};
	}
		
	// TODO: get rid of this and have the view controller use F5.UI to post the appropriate picker widget
	function SubflowViewDelegate() {
		this.initialize = function (el, subflow) {			
			var div = document.createElement('div');
			div.innerHTML = subflow.method;
			el.appendChild(div);
			
			var choicesEl = document.createElement('div');
			F5.addClass(choicesEl, 'choices');
			el.appendChild(choicesEl);
			
			subflow.choices.forEach(function (id, choice) {
				var choiceEl = document.createElement('div');
				choiceEl.innerHTML = id;
				choiceEl.setAttribute('f5_widget', 'Button');
				choiceEl.setAttribute('f5_id', 'choice');
				F5.addClass(choiceEl, 'do-choice');
				choicesEl.appendChild(choiceEl);
				
				F5.UI.attachWidget(choiceEl, {choice: id});									
				choiceEl.widget.setAction(function () {
					F5.Global.flowController.doSubflowChoice(subflow.node, id);
				});							
			});					
		};
	}	
	
	F5.DefaultViewDelegates = {
		flow: new FlowViewDelegate(),
		switcher: new SwitcherViewDelegate(),
		set: new SetViewDelegate(),
		subflow: new SubflowViewDelegate()
	};

}());
