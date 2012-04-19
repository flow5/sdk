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
	
	function Dialog() {
		this.constructDialog = function (data) {	
			
			var that = this;
			
			F5.addClass(this.el, 'f5alertroot');
			
			var alertEl = document.createElement('div');			
			F5.addClass(alertEl, 'f5alert');
			
			
			var containerEl = document.createElement('div');
			F5.addClass(containerEl, 'f5alertcontainer');
			alertEl.appendChild(containerEl);
			
			var highlightEl = document.createElement('div');
			F5.addClass(highlightEl, 'f5alerthighlight');
			containerEl.appendChild(highlightEl);									

			var titleEl = document.createElement('div');
			F5.addClass(titleEl, 'f5alerttitle');
			titleEl.innerHTML = data.title;
			containerEl.appendChild(titleEl);
					
			var messageEl = document.createElement('div');
			F5.addClass(messageEl, 'f5alertmessage');
			messageEl.innerHTML = data.message.replace(/,[^ ]/g, ', '); // make commas wrap
			containerEl.appendChild(messageEl);			

			this.buttonsEl = document.createElement('div');
			F5.addClass(this.buttonsEl, 'f5alertbuttoncontainer');
			containerEl.appendChild(this.buttonsEl);
			
			this.el.appendChild(alertEl);			
		};
		
		this.setAction = function (cb) {
			this.action = cb;
		};
		
		this.present = function (message) {
			if (typeof PhoneGap !== 'undefined') {
				F5.callBridgeSynchronous('com.flow5.maskregion', 'disable');
			}
			
			var that = this;			
			document.getElementById('f5screen').appendChild(that.el);			
			setTimeout(function () {
				that.el.style.opacity = 0.95;							
			}, 0);			
		};
		
		this.dismiss = function (cb) {
			if (typeof PhoneGap !== 'undefined') {
				F5.callBridgeSynchronous('com.flow5.maskregion', 'enable');
			}
			
			var that = this;
			
			function fadeComplete() {
				F5.removeTouchEventListenersRecursive(that.el);
				F5.removeTransitionEndListener(that.el);
				that.el.parentElement.removeChild(that.el);
				if (cb) {
					cb();					
				}
			}

			F5.addTransitionEndListener(this.el, fadeComplete);							
			that.el.style.opacity = 0;	
			
			// wtf? workaround for a safari rendering bug. without this, the opacity
			// transition stops (window.getComputedStyle(menu).opacity reports .99999something)
			if (!F5.isMobile()) {
				setTimeout(function () {
					that.el.style.opacity = 0.01;				
				}, 100);				
			}			
		};
	}	
	
	function Alert() {
		this.construct = function (data) {	
			
			this.constructDialog(data);
			
			var that = this;
			
			var dismissEl = F5.createWidget('Button', {label: 'OK'}, 'label');
			F5.addClass(dismissEl, 'f5alertbutton');
			this.buttonsEl.appendChild(dismissEl);

			dismissEl.widget.setAction(function () {
				that.dismiss(function () {
					if (that.action) {
						that.action();
					}									
				});
			});														
		};		
	}
	Alert.prototype = new Dialog();
	
	function Confirm() {
		this.construct = function (data) {	
			
			this.constructDialog(data);
			
			var that = this;
			
			var cancelEl = F5.createWidget('Button', {label: 'Cancel'}, 'label');
			F5.addClass(cancelEl, 'f5alertbutton');
			F5.addClass(cancelEl, 'f5not-default');
			this.buttonsEl.appendChild(cancelEl);

			cancelEl.widget.setAction(function () {
				that.dismiss(function () {
					if (that.action) {
						that.action(false);
					}					
				});
			});	
			
			var okEl = F5.createWidget('Button', {label: 'OK'}, 'label');
			F5.addClass(okEl, 'f5alertbutton');
			this.buttonsEl.appendChild(okEl);

			okEl.widget.setAction(function () {
				that.dismiss(function () {
					if (that.action) {
						that.action(true);
					}					
				});				
			});														
																
		};			
	}
	Confirm.prototype = new Dialog();	
		
	F5.Prototypes.Widgets.Alert = new Alert();
	F5.Prototypes.Widgets.Confirm = new Confirm();
	
}());