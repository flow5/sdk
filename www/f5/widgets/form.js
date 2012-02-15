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
		F5.addClass(this.el, 'f5form');
						
		F5.forEach(this.el.querySelectorAll('[f5widget=Input]'), function (el) {

			if (navigator.userAgent.match(/OS 5/)) {
				F5.addTouchStopListener(el, function (e) {
					el.widget.input.focus();	
				});				
				el.widget.input.style['pointer-events'] = 'none';				
			} else {
				el.addEventListener('click', function (e) {
					el.widget.input.focus();	
				});				
			}
						
			el.widget.input.onfocus = function () {
				that.el.style.top = -el.offsetTop + 'px';
				window.scrollTo(0, 0);
				document.body.scrollTop = 0;			
			};
		});			
	};
	
	this.getFormData = function () {
		var data = {};
		F5.forEach(this.el.querySelectorAll('input'), function (input) {
			data[input.getAttribute('name')] = input.value;
		});
		return data;
	};
	
	this.reset = function () {
		F5.forEach(this.el.querySelectorAll('[f5widget=Input]'), function (el) {
			el.widget.reset();
		});		
	};
	
	this.showErrors = function (errors) {
		var that = this;
		F5.forEach(errors, function (id, value) {
			var input = F5.getElementById(that.el, id);
			input.widget.showError(value);
		});
	};
	
	this.widgetWillBecomeActive = function () {
		this.reset();
	};
	
	this.widgetWillBecomeInactive = function () {
		F5.forEach(this.el.querySelectorAll('input'), function (input) {
			input.blur();
		});
	};
}

F5.Prototypes.Widgets.Form = new Form();
	
}());