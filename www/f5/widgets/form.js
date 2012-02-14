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
		// workaround for annoying iOS form/keyboard flakiness
		// which causes the keyboard to appear even though though an input doesn't
		// really have focus
		// TODO: move this to a Form widget
		function enableAllInputs() {
			F5.forEach(that.el.querySelectorAll('[f5widget=Input]'), function (el) {
				el.widget.input.removeAttribute('readonly');
			});
		}
		
		F5.forEach(this.el.querySelectorAll('[f5widget=Input]'), function (el) {
			F5.addTouchStartListener(el, function (e) {
				enableAllInputs();
				el.widget.input.focus();										
			});				
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