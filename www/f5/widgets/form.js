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

F5.registerModule(function (F5) {
	
		
function Form() {
		
	this.construct = function () {
		var that = this;	
		
		Form.prototype.construct.call(this);				
		F5.addClass(this.el, 'f5form');
		
		this.el.onsubmit = function () {
			that.blur();
			if (that.onSubmit) {
				that.onSubmit();
			}
			return false;
		};
														
		// NOTE: on iOS and Android the text input controls are not tied into the -webkit-transform
		// system very well. so if the form is animated using -webkit-transform while the caret is visible, it
		// gets out of sync with the form. annoying. the sync is pretty good when using top for positioning
		// although even with top, the caret will not follow closely enough
		// so the technique here is to enable smooth scrolling when there are no elements focused
		// when an element focues, then switch to discrete steps using top
		// on blur, switch back to smooth scrolling. this ends up feeling pretty good. not quite
		// as nice as a fully native form, but close. sigh.
		
		// TODO: factor the mobile code out into a derived class
		
		var blurTimeout;
		
		function scrollBlurBehavior() {
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
		
		function scrollFocusBehavior(el) {
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
						
			var offset = that.el.style.top.replace('px', '');
			if (!offset) {
				that.el.style.top = that.staticOffset + 'px';
			}				
			that.jumpTo(0);					
			that.disable();								
		}							
														
		F5.forEach(this.getInputs(), function (el) {	
			
			var blurFunction = F5.isMobile() ? scrollBlurBehavior : F5.noop;
			var focusFunction = F5.isMobile() ? scrollFocusBehavior : F5.noop;
						
			el.widget.setOnBlur(function () {
				blurTimeout = setTimeout(function () {
					blurTimeout = null;		
					blurFunction();
				}, 100);					
			});

			el.widget.setOnFocus(function () {
				if (blurTimeout) {
					clearTimeout(blurTimeout);
					blurTimeout = null;
				}	
													
				focusFunction(el);
				
				that.onFocus();
			});	
			
			el.widget.form = that;		
		});					
	};
	
	this.submit = function () {
		this.el.onsubmit();
	};
	
	this.widgetWillBecomeActive = function () {
		this.refresh();			
	};
	
	this.getInputs = function () {
		// TODO: how to get rid of the scope here
		return this.el.querySelectorAll('[f5widget="f5.Input"]');
	};
	
	this.setFormChangedAction = function (cb) {
		this.formChangedAction = cb;
	};
	
	this.clearFormChanged = function () {
		F5.forEach(this.getInputs(), function (el) {
			el.widget.value = el.widget.input.value;
		});				
		if (this.formChangedAction) {
			this.formChangedAction(false);
		}
	};
	
	this.inputChanged = function () {
		var changed = false;
		F5.forEach(this.getInputs(), function (el) {
			changed = changed || el.widget.value !== el.widget.input.value;
		});		
		if (this.formChangedAction) {
			this.formChangedAction(changed);
		}
	};
	
	this.widgetWillBecomeInactive = function () {
		this.blur();
	};
	
	this.getFormData = function () {
		var data = {};
		F5.forEach(this.getInputs(), function (el) {
			data[el.getAttribute('f5id')] = el.widget.getValue();
		});
		return data;
	};
	
	this.deactivate = function () {
		F5.forEach(this.getInputs(), function (el) {
			el.widget.deactivate();
		});	
		this.el.style.top = '';							
	};
	
	this.blur = function () {
		F5.forEach(this.getInputs(), function (el) {
			el.widget.blur();
		});	
		
	};
	
	this.onFocus = function () {
		this.activate();
		if (this.onFocusCb) {
			this.onFocusCb();
		}
	};
	
	this.setOnFocus = function (cb) {
		this.onFocusCb = cb;
	};
	
	this.setOnSubmit = function (cb) {
		this.onSubmit = cb;
	};
	
	this.reset = function () {
		F5.forEach(this.getInputs(), function (el) {
			el.widget.reset();
		});		
		if (this.formChangedAction) {
			this.formChangedAction(false);
		}		
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
		F5.forEach(this.getInputs(), function (el) {
			el.widget.activate(index);
			index += 1;
		});		
		
		// TODO: on desktop?
//		this.el.style.top = '';		
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
	
});