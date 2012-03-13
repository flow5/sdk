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
		
function Form() {
		
	this.construct = function () {
		var that = this;	
		
		Form.prototype.construct.call(this);				

		// NOTE: on iOS and Android the text input controls are not tied into the -webkit-transform
		// system very well. so if the form is animated using -webkit-transform while the caret is visible, it
		// gets out of sync with the form. annoying. the sync is pretty good when using top for positioning
		// although even with top, the caret will not follow closely enough
		// so the technique here is to enable smooth scrolling when there are no elements focused
		// when an element focues, then switch to discrete steps using top
		// on blur, switch back to smooth scrolling. this ends up feeling pretty good. not quite
		// as nice as a fully native form, but close. sigh.
		
		function onBlur() {
			that.focused = false;
			var offset = that.el.style.top.replace('px', '');
			if (offset) {
				that.jumpTo(offset);	
				that.el.style.top = '';			
				setTimeout(function () {
					that.finishScrolling();				
				}, 0);				
			}				
			that.enable();					
		}
		
		function onFocus() {
			that.focused = true;
			var offset = that.el.style.top.replace('px', '');
			if (!offset) {
				that.el.style.top = that.staticOffset + 'px';
			}				
			that.jumpTo(0);					
			that.disable();					
			
			if (that.onFocus) {
				that.onFocus();
			}							
		}
					
		F5.addClass(this.el, 'f5form');
								
		var blurTimeout;
		F5.forEach(this.el.querySelectorAll('[f5widget=Input]'), function (el) {	
			// NOTE: on iOS 4.3 and Android, executing the blur logic when switching fields
			// causes problems. so delay so that a subsequent focus call can abort
			el.widget.setOnBlur(function () {
				blurTimeout = setTimeout(function () {
					blurTimeout = null;		
					onBlur();
				}, 100);					
			});

			el.widget.setOnFocus(
				function () {	
					if (blurTimeout) {
						clearTimeout(blurTimeout);
						blurTimeout = null;
					}	
					if (navigator.userAgent.match(/OS 4/)) {
						// not possible to cleanly disable scrolling on iOS4
					} else {
						// disable scrolling
						window.scrollTo(0, 0);
						document.body.scrollTop = 0;	

						// do the scrolling ourselves		
						that.el.style.top = (-el.offsetTop +
								parseInt(window.getComputedStyle(that.el)['padding-top'].replace('px', ''), 10)) + 'px';
					}
							
					onFocus();
				});
			
			// let the input know about the form
			el.widget.form = that;
		});					
	};
	
	this.widgetWillBecomeActive = function () {
		this.refresh();			
	};
	
	this.widgetWillBecomeInactive = function () {
		this.blur();
	};
	
	this.getFormData = function () {
		var data = {};
		F5.forEach(this.el.querySelectorAll('[f5widget=Input]'), function (el) {
			data[el.getAttribute('f5id')] = el.widget.getValue();
		});
		return data;
	};
	
	this.deactivate = function () {
		F5.forEach(this.el.querySelectorAll('[f5widget=Input]'), function (el) {
			el.widget.deactivate();
		});	
		this.el.style.top = '';							
	};
	
	this.blur = function () {
		F5.forEach(this.el.querySelectorAll('[f5widget=Input]'), function (el) {
			el.widget.blur();
		});	
		
	};
	
	this.setOnFocus = function (cb) {
		this.onFocus = cb;
	};
	
	this.reset = function () {
		F5.forEach(this.el.querySelectorAll('[f5widget=Input]'), function (el) {
			el.widget.reset();
		});				
	};
	
	this.activate = function () {
		if (!F5.isMobile()) {
			var that = this;
			document.onkeydown = function(evt) {
			    evt = evt || window.event;
			    if (evt.keyCode === 27) {
					that.blur();
			    }
			};			
		}		
		
		var index = 1;
		F5.forEach(this.el.querySelectorAll('[f5widget=Input]'), function (el) {
			el.widget.activate(index);
			index += 1;
		});		
		this.el.style.top = '';		
	};
	
	this.showErrors = function (errors) {
		var that = this;
		F5.forEach(errors, function (id, value) {
			var input = F5.getElementById(that.el, id);
			input.widget.showError(value);
		});
	};		
}
Form.prototype = F5.Prototypes.Widgets.Scroller;	

F5.Prototypes.Widgets.Form = new Form();
	
}());