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

		if (!this.label) {
			this.label = document.createElement('div');
			this.el.appendChild(this.label);
			F5.addClass(this.label, 'f5label');			
		}

		var labelText = F5.valueFromId(data, id);
		if (labelText) {
			this.label.innerText = labelText;			
		}
		
		if (!this.error) {
			this.error = document.createElement('div');
			F5.addClass(this.error, 'f5inputerror');
			this.el.appendChild(this.error);			
		}
	
		if (!this.input) {
			this.input = document.createElement('input');			
			this.input.name = id;	
			this.input.tabindex = -1;
			this.input.setAttribute('tabindex', -1);

			this.input.type = this.el.getAttribute('type');
			if (this.input.type === 'number') {
				this.input.setAttribute('pattern', '[0-9]*');
				this.input.type = 'text';
			}

			this.input.setAttribute('autocorrect', this.el.getAttribute('autocorrect'));			
			var that = this;
			
			this.input.onkeypress = function (e) {
				that.label.style.display = 'none';
				that.error.innerText = '';					
			};

			this.input.onkeyup = function () {
				if (!that.input.value) {
					that.label.style.display = '';					
				}
			};

			this.el.appendChild(this.input);
		}		
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
