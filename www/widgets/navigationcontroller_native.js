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

(function () {
	function NavigationController() {
		
		this.setup = function (container) {
			var navbarEl = document.createElement('div');
			navbarEl.className = 'navbar';
			container.insertBefore(navbarEl, container.firstChild);	
			
			PhoneGap.exec(
				function (result) { // success
				console.log(result);
			}, function (result) { // failure
				console.log(result);
			}, "NavigationBar", "create", []);							
		};
	
		function gapify(configuration) {
			var gapConfig = {
				title: configuration.title,
				id: configuration.node.path,
				hide: configuration.hide
			};
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
				'NavigationBar', // the plugin name
				'configure', // the method
				[animate, gapify(F5.Global.navigationControllerConfiguration)]
			);								
		}
	
		this.start = function () {
			this.updateConfiguration(F5.Global.flow.root);
			configure(false);
		};
	
		this.doSelection = function (node, id) {
			this.updateConfiguration(node.children[id]);
			configure(false);			
		};
	
		this.doTransition = function (container, animation, to) {
			this.updateConfiguration(to);		
			configure(animation === 'pushLeft' || animation === 'pushRight');							
		};
	
		this.startSubflow = function () {
			configure(false);					
		};
	
		this.syncSet = function (node) {
			this.updateConfiguration(node);
			configure(false);				
		};
	
		this.completeSubflow = function () {
			this.updateConfiguration(F5.Global.flow.root);
			configure(false);				
		};		
	}
	NavigationController.prototype = F5.Prototypes.navigationConfigurator;
	
	F5.Prototypes.navigationController = new NavigationController();
	
}());
	