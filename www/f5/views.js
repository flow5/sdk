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
	
	function View() {
		this.initializeView = function (node) {	

			var el = document.createElement('div');
			F5.addClass(el, 'f5' + node.type);
			
			el.id = node.path;
			el.view = this;
						
			this.el = el;			
			this.node = node;

			node.view = this;	
			
			var that = this;
			function attachTabset(el) {
				if (el.getAttribute('f5widget') === 'Tabset') {
					that.tabset = el;
					that.tabset.widget.attachToNode(node);
					that.tabset.widget.setAction(function selectionChangeCb(id) {
						F5.Global.flowController.doSelection(node, id);					
					});
					that.tabset.widget.select(node.selection.id);											
				}				
			}											
																		
			if (node.children) {
				var header = F5.loadTemplate(node.id + '-header', F5.getNodeData(node));
				if (header) {
					attachTabset(header);
					this.el.appendChild(header);
				}
				
				var container = document.createElement('div');
				F5.addClass(container, 'f5container');
				this.el.appendChild(container);	

				if (node.type === 'switcher' || node.type === 'set') {
					F5.forEach(node.children, function (id, child) {
						F5.objectFromPrototype(F5.Views[child.type]).initialize(child);
						container.appendChild(child.view.el);
					});				
				} else {
					
					F5.objectFromPrototype(F5.Views[node.selection.type]).initialize(node.selection);					
					container.appendChild(node.selection.view.el);
				}
				
				var footer = F5.loadTemplate(node.id + '-footer', F5.getNodeData(node));
				if (footer) {
					attachTabset(footer);
					this.el.appendChild(footer, container);
				}										
			} else {
				var template = F5.loadTemplate(node.id, F5.getNodeData(node));
				if (template) {
					this.el.appendChild(template);
				}								
			}
			
			if (F5.Prototypes.ViewDelegates[node.id]) {
				this.delegate = F5.objectFromPrototype(F5.Prototypes.ViewDelegates[node.id]);
				this.delegate.node = node;
				this.delegate.el = el;
			}
									
			if (!node.active) {
				el.style.visibility = 'hidden';
			}		
			
			if (F5.isDebug() && !F5.isMobile()) {
				var label = document.createElement('div');
				label.innerHTML = this.node.id;
				F5.addClass(label, 'f5nodelabel');
				this.el.insertBefore(label, this.el.firstChild);								
			}
		};
		
		this.doSelection = function (node, id) {
			if (this.tabset) {
				this.tabset.widget.select(id);								
			}
		};
						
		this.viewWillBecomeActive = function () {
			if (this.delegate && this.delegate.viewWillBecomeActive) {
				this.delegate.viewWillBecomeActive();
			}			
		};
		
		this.viewWillBecomeInactive = function () {
			if (this.delegate && this.delegate.viewWillBecomeInactive) {
				this.delegate.viewWillBecomeInactive();
			}			
		};
		
		this.viewDidBecomeActive = function () {
			if (this.delegate && this.delegate.viewDidBecomeActive) {
				this.delegate.viewDidBecomeActive();
			}						
		};
		
		this.viewDidBecomeInactive = function () {
			if (this.delegate && this.delegate.viewDidBecomeInactive) {
				this.delegate.viewDidBecomeInactive();
			}						
		};
		
		this.getNavConfig = function () {
			if (this.delegate && this.delegate.getNavConfig) {
				return this.delegate.getNavConfig();
			} else {
				if (this.node.back && this.node.parent.type === 'flow') {
					var leaf = this.node.back;
					while (leaf.selection) {
						leaf = leaf.selection;
					}
										
					return {
						left: {
							label: leaf.id, 
							transition: 'back'
						}											
					};
				} else {
					return null;
				}				
			}
		};
		
		// OPTION: can use display:none for lower memory construction or z-index: -1 for speed
		this.show = function () {
			this.el.visibility = '';
		};
		
		this.hide = function () {
			this.el.visibility = 'hidden';
		};
	}
	var ViewPrototype = new View();
	
	function FlowView() {	
		// default behavior is to create navigation controls
		// override by defining a view delegate for this node	
		this.initialize = function (node) {
			this.initializeView(node);	
			
			if (this.delegate && this.delegate.initialize) {
				this.delegate.initialize(this.el, this.node);					
			} else {				
										
				// default navigation controls
				var navControls;
				
				if (node.subflows || node.transitions) {
					var div = document.createElement('div');
					div.style.position = 'relative';
					div.style['z-index'] = 1;
					this.el.insertBefore(div, this.el.firstChild);
				
					navControls = document.createElement('div');
					F5.addClass(navControls, 'f5navcontrols');
					div.appendChild(navControls);					
				}
				
				if (node.subflows) {
					var subflowsEl = document.createElement('div');
					F5.addClass(subflowsEl, 'f5subflows');

					var showSubflows = false;
					F5.forEach(node.subflows, function (id, subflow) {
						if (!isLifecycleSubflow(id)) {
							showSubflows = true;

							var subflowEl = F5.createWidget('Button', {id: id}, 'id');
							F5.addClass(subflowEl, 'f5dosubflow');
							subflowsEl.appendChild(subflowEl);	

							subflowEl.widget.setAction(function () {
								F5.Global.flowController.doSubflow(node, id);
							});						
						}
					});	

					if (navControls && showSubflows) {
						navControls.appendChild(subflowsEl);
					}
				}

				if (node.transitions) {
					var transitionsEl = document.createElement('div');
					F5.addClass(transitionsEl, 'f5transitions');
					navControls.appendChild(transitionsEl);

					F5.forEach(node.transitions, function (id, transition) {

						var transitionEl = F5.createWidget('Button', {id: id}, 'id');					
						F5.addClass(transitionEl, 'f5dotransition');
						transitionsEl.appendChild(transitionEl);	

						transitionEl.widget.setAction(function () {
							F5.Global.flowController.doTransition(node, id);
						});
					});				
				}				
											
			}		
		};
	}
	FlowView.prototype = ViewPrototype;		
	
		
	function SetView() {
		this.initialize = function (node) {
			this.initializeView(node);	
			
			if (this.delegate && this.delegate.initialize) {
				this.delegate.initialize();					
			}
						
		};
	}		
	SetView.prototype = ViewPrototype;	
	
	F5.Views = {
		flow: new FlowView(),
		switcher: new SetView(),
		set: new SetView()
	};

}());
