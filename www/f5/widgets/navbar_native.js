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
/*global F5, PhoneGap*/

// TODO: OBSOLETE??

F5.registerModule(function (F5) {
	function NavBar() {
				
		this.initialize = function () {
			var navbarEl = document.createElement('div');
			F5.addClass(navbarEl, 'navbar');
			// FIX: should just be visibility: hidden to let underlying layer come throug
			// part of the fullscreen content view change
			navbarEl.style['background-color'] = 'white';			
			navbarEl.style.height = '44px';
			navbarEl.style.position = 'absolute';
			navbarEl.style.top = '0px';
			this.el.insertBefore(navbarEl, this.el.firstChild);	
			
			// TODO: setup a persistent callback instead of relying on the sucess callback
			var that = this;
			PhoneGap.exec(
				function (which) { // success
					that.configuration[which].action();
			}, function (result) { // failure
				console.log(result);
			}, "com.flow5.navigationbar", "create", []);
			
			F5.Global.flowController.addFlowObserver(this);													
		};
	
		function gapify(configuration) {
			var gapConfig = {
				id: configuration.node.path,
				hide: configuration.hide
			};
			
			if (configuration.title) {
				gapConfig.title = configuration.title;
			}			
			if (configuration.left) {
				gapConfig.left = {
					label: configuration.left.label,
				};
				if (configuration.left.transition === 'back') {
					var backNode = F5.Global.flowController.getBackNode(configuration.left.node).back;
					while (backNode.selection) {
						backNode = backNode.selection;
					}
					gapConfig.left.id = backNode.path;
				} else {
					gapConfig.left.id = configuration.left.node.transitions[configuration.left.transition].to.path;
				}
			}
			if (configuration.right) {
				gapConfig.right = {
					label: configuration.right.label,
				};
			}
		
			console.log(gapConfig);
								
			return gapConfig;
		}
			
		function configure(animate) {
			PhoneGap.exec(
				function (result) { // success
					console.log(result);
				}, 
				function (result) { // failure
					console.log(result);
				}, 
				'com.flow5.navigationbar', // the plugin name
				'queue_configure', // the method
				[animate, gapify(this.configuration)]
			);								
		}
	
		this.start = function () {
			this.updateConfiguration(F5.Global.flow.root);
			configure.call(this, false);			
		};
	
		this.doSelection = function (node, id) {
			this.updateConfiguration(node.children[id]);						
			configure.call(this, false);
			
			return function (cb) {
				cb();
			};			
		};
	
		this.doTransition = function (container, from, id, to, animation) {
			this.updateConfiguration(to);				
			configure.call(this, animation === 'pushLeft' || animation === 'pushRight');
			return function (cb) {
				cb();
			};									
		};
	
		this.startSubflow = function () {
			this.updateConfiguration(F5.Global.flow.root);			
			configure.call(this, false);					
		};
	
		this.syncSelection = function (node) {
			this.updateConfiguration(node);
			configure.call(this, false);				
		};
	
		this.completeSubflow = function () {
			this.updateConfiguration(F5.Global.flow.root);
			configure.call(this, false);
		};		
	}
	NavBar.prototype = F5.Prototypes.Widgets.NavController;
	
	F5.Prototypes.Widgets.NavBar = new NavBar();
	
});
	