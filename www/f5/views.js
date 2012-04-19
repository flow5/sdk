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
		this.initialize = function (node) {	

			var nodeEl = document.createElement('div');
			F5.addClass(nodeEl, 'f5node');
			F5.addClass(nodeEl, node.id + '-node');			

			var frameEl;
			if (node.parent && node.parent.type === 'group') {
				frameEl = nodeEl;
			} else  {
				frameEl = document.createElement('div');
				F5.addClass(frameEl, 'f5frame');				
				frameEl.appendChild(nodeEl);
			}
						
			frameEl.id = node.path;
						
			this.el = frameEl;
			frameEl.view = this;

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
					nodeEl.appendChild(header);
				}
								
				var container = document.createElement('div');
				var containerTemplate = F5.loadTemplate(node.id + '-container', F5.getNodeData(node));
				if (containerTemplate) {
					var userContainer = document.createElement('div');
					F5.addClass(userContainer, 'f5usercontainer');
					container.appendChild(userContainer);		
					userContainer.appendChild(containerTemplate);		
					this.container = containerTemplate;
				} else {
					this.container = container;
				}
				F5.addClass(container, 'f5container');
				nodeEl.appendChild(container);	
				
				var footer = F5.loadTemplate(node.id + '-footer', F5.getNodeData(node));
				if (footer) {
					attachTabset(footer);
					nodeEl.appendChild(footer, this.container);
				}										
			} else {
				var template = F5.loadTemplate(node.id, F5.getNodeData(node));
				if (template) {
					nodeEl.appendChild(template);
				}								
			}
			
			if (node.parent) {
				node.parent.view.container.appendChild(frameEl);
			} else {
				document.getElementById('f5screen').appendChild(frameEl);
			}			
			
			if (F5.Prototypes.ViewDelegates[node.id]) {
				this.delegate = F5.objectFromPrototype(F5.Prototypes.ViewDelegates[node.id]);
				this.delegate.node = node;
				this.delegate.el = nodeEl;

				if (this.delegate.initialize) {
					this.delegate.initialize();					
				}								
			}

			// TODO: enable this with an additional URL parameter?
			// Would require an additional build target for device
			// TODO: Don't like to have to create a stub initialize method to make these go away
			if (!this.delegate || !this.delegate.initialize) {				
				this.addDevOverlay(node);
			}			
												
			if (!node.active) {
				frameEl.style.visibility = 'hidden';
			}		
			
			if (F5.isDebug() && !F5.isMobile()) {
				var label = document.createElement('div');
				label.innerHTML = this.node.id;
				F5.addClass(label, 'f5nodelabel');
				nodeEl.insertBefore(label, nodeEl.firstChild);								
			}
		};
				
		this.doSelection = function (node, id) {
			if (this.tabset) {
				this.tabset.widget.select(id);								
			}
		};

		this.syncSelection = function (node) {
			if (this.tabset) {
				this.tabset.widget.select(node.selection.id);								
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
				return this.getDevNavConfig();			
			}
		};
		
		// OPTION: can use display:none for lower memory construction or z-index: -1 for speed
		this.show = function () {
			this.el.visibility = '';
		};
		
		this.hide = function () {
			this.el.visibility = 'hidden';
		};
		
		
		
		
		// TODO: move to diags layer? neither of these would ever be used in production
		this.getDevNavConfig = function () {
			// TODO: this is really a dev thing only. would never use
			// the leaf.id as the label in practice
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
		};
		
		this.addDevOverlay = function (node) {
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
		};		
	}
	
	F5.Prototypes.View = new View();	
}());
