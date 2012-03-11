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
		var that = this;
		
		F5.addClass(this.el, 'f5input');
		
		var id = this.el.getAttribute('f5id');

		if (!this.label) {
			this.label = document.createElement('div');
			this.el.appendChild(this.label);
			F5.addClass(this.label, 'f5label');			
		}

		var labelText = F5.valueFromId(data.labels, id);
		if (labelText) {
			this.label.innerText = labelText;			
		}
		
		if (!this.error) {
			this.error = document.createElement('div');
			F5.addClass(this.error, 'f5inputerror');
			this.el.appendChild(this.error);			
		}
		
		function clearErrorAndLabel() {
			that.label.style.display = 'none';
			that.error.innerText = '';									
		}			
					
		this.type = this.el.getAttribute('type');
		if (this.type === 'menu') {
			this.input = document.createElement('select');
			var options = F5.valueFromId(data.options, id);
			if (options) {
				options.forEach(function (option) {
					var optionEl = document.createElement('option');
					optionEl.innerText = option;
					that.input.appendChild(optionEl);						
				});
			}

			this.el.appendChild(this.input);
			this.input.style.position = 'absolute';

			this.input.addEventListener('focus', function () {
				clearErrorAndLabel();
			});
			this.input.addEventListener('blur', function () {
				if (!that.input.value) {
					that.label.style.display = '';					
				}
			});
		} else {
			this.input = document.createElement('input');
			this.input.setAttribute('tabindex', -1);

			this.input.pattern = this.el.getAttribute('pattern');
			this.input.type = this.el.getAttribute('type');
			this.input.setAttribute('maxlength', this.el.getAttribute('maxlength'));			

			this.input.setAttribute('autocorrect', this.el.getAttribute('autocorrect'));			
			this.input.setAttribute('autocapitalize', this.el.getAttribute('autocapitalize'));			

			this.input.onkeypress = function (e) {
				clearErrorAndLabel();
			};

			if (this.input.type === 'date') {
				this.input.addEventListener('focus', function () {
					clearErrorAndLabel();
				});
				this.input.addEventListener('blur', function () {
					if (!that.input.value) {
						that.label.style.display = '';					
					}
				});
			}

			this.input.onkeyup = function () {
				if (!that.input.value) {
					that.label.style.display = '';					
				}
			};

			this.el.appendChild(this.input);
		}			

		// take control of the touch events
		this.input.style['pointer-events'] = 'none';
		if (F5.platform() === 'android') {
			this.el.addEventListener('click', function (e) {
				// if the form is scrolling when the click comes in
				// the input will end up in the wrong place
				// so toss out click events while moving
				if (!that.form.el.style['-webkit-transform']) {
					that.focus();					
				}
				e.stopPropagation();
				e.preventDefault();
			});									
		} else {
			// NOTE: mask the element to prevent wonky scrolling behaviors
			if (navigator.userAgent.match(/OS 4/)) {
				var mask = document.createElement('div');
				mask.style.position = 'absolute';
				mask.style.top = '0px';
				mask.style.left = '0px';
				mask.style.width = '100%';
				mask.style.height = '100%';
				this.el.appendChild(mask);
				mask.addEventListener('click', function (e) {
					if (that.form) {
						// always focus the first element in the form. then use prev/next
						if (!that.form.focused) {
							that.form.el.querySelector('[f5widget=Input]').widget.focus();														
						}
					} else {
						that.focus();							
					}
					e.stopPropagation();
					e.preventDefault();
				});			
			} else {
				F5.addTapListener(this.el, function (e) {
					that.focus();
				});				
				F5.addTouchStartListener(this.el, function (e) {
					e.preventDefault();
				});	
			}
		}
						
		this.refresh(data);		
	};
	
	// TODO: might want to be able to make menu options dynamic also
	this.refresh = function (data) {
		var valueText = F5.valueFromId(data.values, this.el.getAttribute('f5id'));	
		if (valueText) {
			this.setValue(valueText);
			this.label.style.display = 'none';
		} else {
			this.setValue('');
			this.label.style.display = '';
		}					
	};
	
	this.activate = function (index) {
		this.el.style['pointer-events'] = '';	
		this.input.removeAttribute('readonly');			
		this.input.setAttribute('tabindex', index);					
	};
	
	this.blur = function () {
		this.input.blur();
	};

	this.deactivate = function () {
		this.el.style['pointer-events'] = 'none';
		this.clearError();
		this.input.blur();
		this.input.setAttribute('readonly', 'true');
		this.input.setAttribute('tabindex', -1);					
	};	
	
	this.setValue = function (value) {
		if (this.type === 'menu') {
			F5.forEach(this.input.querySelectorAll('option'), function (option) {
				if (option.innerText === value) {
					option.selected = true;
				}
			});
		} else {
			this.input.value = value;				
		}
	};
	
	this.getValue = function () {
		return this.input.value;			
	};
	
	// Android seems to sometimes produce extra blur events
	// only process on blur event after a focus
	this.setOnBlur = function (cb) {
		var that = this;
		this.onblur = function () {
			cb();
			that.input.onblur = null;
		};
	};
	
	this.setOnFocus = function (cb) {
		var that = this;
		this.input.onfocus = function () {
			that.input.onblur = that.onblur;
			cb();
		};
	};
	
	this.focus = function () {
		this.input.focus();											
	};
		
	this.reset = function () {
		this.error.innerText = '';
		this.label.style.display = '';
		this.input.value = '';
	};
		
	this.showError = function (message) {
		this.error.innerText = message;
	};
	
	this.clearError = function () {
		this.error.innerText = '';
	};
}

F5.Prototypes.Widgets.Input = new Input();


	
}());
