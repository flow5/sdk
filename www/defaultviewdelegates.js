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
		return {DidBecomeActive: true, 
				DidBecomeInactive: true, 
				WillBecomeActive: true, 
				WillBecomeInactive: true}[id];
	}
	
	function FlowViewDelegate() {		
		this.initialize = function (el, node) {
			if (node.subflows) {
				var subflowsEl = document.createElement('div');
				F5.addClass(subflowsEl, 'subflows');
				
				var showSubflows = false;
				F5.forEach(node.subflows, function (id, subflow) {
					if (!isLifecycleSubflow(id)) {
						showSubflows = true;
						
						var subflowEl = document.createElement('div');
						F5.addClass(subflowEl, 'do-subflow');
						subflowEl.setAttribute('f5_widget', 'ImageButton');
						subflowEl.setAttribute('f5_id', 'id');
						subflowsEl.appendChild(subflowEl);	
						
						F5.attachWidget(subflowEl, {id: id});

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
				F5.addClass(transitionsEl, 'f5transitions');
				el.insertBefore(transitionsEl, el.firstChild);

				F5.forEach(node.transitions, function (id, transition) {
					var transitionEl = document.createElement('div');
					transitionEl.setAttribute('f5_id', 'id');
					transitionEl.setAttribute('f5_widget', 'ImageButton');
					F5.addClass(transitionEl, 'do-transition');
					transitionsEl.appendChild(transitionEl);	

					F5.attachWidget(transitionEl, {id: id});
					transitionEl.widget.setAction(function () {
						F5.Global.flowController.doTransition(node, id);
					});
				});				
			}			
			
			var div = document.createElement('div');
			div.innerHTML = node.id;
			F5.addClass(div, 'f5nodelabel');
			el.insertBefore(div, el.firstChild);				
		};
	}
		
	function SwitcherViewDelegate() {
		this.initialize = function (el, node) {
			F5.forEach(node.children, function (id, child) {
				child.view.el.setAttribute('f5_tab', id);
			});			
			el.setAttribute('f5_widget', 'Tabset');
			
			F5.attachWidget(el, F5.getNodeData(node));
			el.widget.setAction(function (id) {
				F5.Global.flowController.doSelection(node, id);					
			});
			el.widget.select(node.selection.id);
			
			var div = document.createElement('div');
			F5.addClass(div, 'f5nodelabel');
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
			F5.addClass(div, 'f5nodelabel');
			div.innerHTML = node.id;
			el.insertBefore(div, el.firstChild);				
		};
	}		
	
	F5.DefaultViewDelegates = {
		flow: new FlowViewDelegate(),
		switcher: new SwitcherViewDelegate(),
		set: new SetViewDelegate()
	};

}());
