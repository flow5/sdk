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

function Input() {
	
	this.construct = function (data) {
		
		var id = this.el.getAttribute('f5id');
		
		this.label = document.createElement('div');
		this.label.innerText = F5.valueFromId(data, id);		
		F5.addClass(this.label, 'f5label');
		this.el.appendChild(this.label);
		
		this.error = document.createElement('div');
		F5.addClass(this.error, 'f5inputerror');
		this.el.appendChild(this.error);
	
		this.input = document.createElement('input');			
		this.input.name = id;	
		
		this.input.setAttribute('readonly', 'readonly');
		
		// TODO: can flesh this out a bit more
		this.input.type = id.match('password') ? 'password' : 'text';	
		
		var that = this;
			
		this.input.onkeypress = function () {
			that.label.style.display = 'none';
			that.error.innerText = '';
		};
				
		this.el.appendChild(this.input);
	};		
		
	this.reset = function () {
		this.input.value = '';
		this.error.innerText = '';
		this.label.style.display = '';
	};
	
	this.showError = function (message) {
		this.error.innerText = message;
	};
}

F5.Prototypes.Widgets.Input = new Input();


	
}());
