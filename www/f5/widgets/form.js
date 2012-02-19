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
		if (!F5.hasClass(this.el, 'f5form')) {
			F5.addClass(this.el, 'f5form');
						
			var blurTimeout;
			F5.forEach(this.el.querySelectorAll('[f5widget=Input]'), function (el) {
				
				// NOTE: on iOS 4.3, there's a gap between the blur() and focus() calls
				// which causes a jump. So only reset to top if we're not focusing another element
				el.widget.setOnBlur(function () {
					blurTimeout = setTimeout(function () {
						that.el.style['top'] = '';	
						blurTimeout = null;					
					}, 100);
				});

				el.widget.setOnFocus(
					function () {	
						if (blurTimeout) {
							clearTimeout(blurTimeout);
							blurTimeout = null;
						}					
						// disable scrolling
						window.scrollTo(0, 0);
						document.body.scrollTop = 0;	
												
						// do the scrolling ourselves		
						that.el.style['top'] = (-el.offsetTop + 
								parseInt(window.getComputedStyle(that.el)['padding-top'].replace('px', ''), 10)) + 'px';							
					});
			});						
		}
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
	
	this.reset = function () {
		F5.forEach(this.el.querySelectorAll('[f5widget=Input]'), function (el) {
			el.widget.reset();
		});				
	};
	
	this.activate = function () {
		var index = 1;
		F5.forEach(this.el.querySelectorAll('[f5widget=Input]'), function (el) {
			el.widget.activate(index);
			index += 1;
		});		
		this.el.style['top'] = '';		
	};
	
	this.showErrors = function (errors) {
		var that = this;
		F5.forEach(errors, function (id, value) {
			var input = F5.getElementById(that.el, id);
			input.widget.showError(value);
		});
	};
		
	this.widgetWillBecomeInactive = function () {
		this.deactivate();
	};
}

F5.Prototypes.Widgets.Form = new Form();
	
}());