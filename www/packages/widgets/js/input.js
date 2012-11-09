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

function Input() {

	this.initialize = function (data) {
		var that = this;

		F5.addClass(this.el, 'f5input');

		var container = document.createElement('div');
		F5.addClass(container, 'f5inputcontainer');
		this.el.appendChild(container);

		this.placeholder = document.createElement('div');
		container.appendChild(this.placeholder);
		F5.addClass(this.placeholder, 'f5placeholder');

		this.error = document.createElement('div');
		F5.addClass(this.error, 'f5inputerror');
		container.appendChild(this.error);

		function clearErrorAndLabel() {
			that.placeholder.style.display = 'none';
			that.error.textContent = '';
		}

		this.label = document.createElement('div');
		container.appendChild(this.label);
		F5.addClass(this.label, 'f5label');

		var id = this.el.getAttribute('f5id');

		if (data && data.label) {
			this.label.textContent = data.label;
		}

		if (data && data.placeholder) {
			this.placeholder.textContent = data.placeholder;
		}


		this.type = this.el.getAttribute('type');
		switch (this.type) {
		case 'menu':
			this.input = document.createElement('select');

			this.input.onchange = function () {
				if (that.form) {
					that.form.inputChanged();
				}
			};

			if (data && data.options) {
				data.options.forEach(function (option) {
					var optionEl = document.createElement('option');
					optionEl.value = option.value;
					optionEl.textContent = option.text;
					that.input.appendChild(optionEl);
				});
			}

			this.input.addEventListener('focus', function () {
				clearErrorAndLabel();
			});
			this.input.addEventListener('blur', function () {
				if (!that.input.value) {
					that.placeholder.style.display = '';
				}
			});
			break;
		case 'checkbox':
			this.input = document.createElement('input');
			this.input.setAttribute('tabindex', -1);
			this.input.setAttribute('type', 'checkbox');

			this.input.onchange = function (e) {
				if (that.form) {
					that.form.inputChanged();
				}
			};

			this.input.addEventListener('click', function (e) {
				e.stopPropagation();
			});

			break;
		default:
			this.input = document.createElement('input');
			this.input.setAttribute('tabindex', -1);

			F5.addClass(this.el, 'f5text');

			if (this.el.getAttribute('pattern')) {
				this.input.pattern = this.el.getAttribute('pattern');
				this.regexp = new RegExp(this.input.pattern);
			}

			if (this.el.getAttribute('type')) {
				this.input.setAttribute('type', this.el.getAttribute('type'));
			}

			if (this.el.getAttribute('maxlength')) {
				this.input.setAttribute('maxlength', this.el.getAttribute('maxlength'));
			}

			if (this.el.getAttribute('autocorrect')) {
				this.input.setAttribute('autocorrect', this.el.getAttribute('autocorrect'));
			}

			if (this.el.getAttribute('autocapitalize')) {
				this.input.setAttribute('autocapitalize', this.el.getAttribute('autocapitalize'));
			}

			this.input.onkeypress = function (e) {
				// enter key
				if (e.keyCode === 13) {
					if (that.form) {
						that.form.submit();
					}
				} else {
					if (e.charCode) {
						var text = that.input.value + String.fromCharCode(e.charCode);
						if (that.regexp && !that.regexp.test(text)) {
							return false;
						}
					}

					clearErrorAndLabel();
				}
			};

			if (this.input.type === 'date') {
				this.input.addEventListener('focus', function () {
					clearErrorAndLabel();
				});
				this.input.addEventListener('blur', function () {
					if (!that.input.value) {
						that.placeholder.style.display = '';
					}
				});
			}

			this.input.onkeyup = function () {
				if (!that.input.value) {
					that.placeholder.style.display = '';
				}
				if (that.form) {
					that.form.inputChanged();
				}
			};
		}
		container.appendChild(this.input);

		this.input.onblur = function () {
			if (that.onblur) {
				that.onblur();
			}
			setTimeout(function () {
				that.hijack();
			}, 0);
		};

		this.input.onfocus = function () {
			if (that.onfocus) {
				that.onfocus();
			}
			setTimeout(function () {
				that.unhijack();
			}, 0);
		};

		this.hijack();
		this.refresh(data);
	};

	// in iOS5 it is possible to properly prevent uiwebview scrolling in forms
	this.hijack = function () {
		return;


		if (F5.isMobile() && F5.platform() === 'ios' && !navigator.userAgent.match(/OS 4/)) {
			this.input.style['pointer-events'] = 'none';
			var that = this;
			F5.addTapListener(this.el, function (e) {
				that.focus();
			});
			F5.addTouchStartListener(this.el, function (e) {
				e.preventDefault();
			});
		}
	};

	this.unhijack = function () {
		return;

		if (F5.isMobile() && F5.platform() === 'ios' && !navigator.userAgent.match(/OS 4/)) {
			this.input.style['pointer-events'] = '';
			F5.removeTapListener(this.el);
			F5.removeTouchStartListener(this.el);
		}
	};

	// TODO: might want to be able to make menu options dynamic also
	this.refresh = function (data) {
		if (data && (data.value || typeof data === 'string')) {
			if (data.value) {
				this.setValue(data.value);
			} else {
				this.setValue(data);
			}
			this.placeholder.style.display = 'none';
		} else {
			this.setValue('');
			this.placeholder.style.display = '';
		}
	};

	this.activate = function (index) {
		this.el.style['pointer-events'] = '';
		this.input.removeAttribute('readonly');
		this.input.setAttribute('tabindex', index);
	};

	this.deactivate = function () {
		this.el.style['pointer-events'] = 'none';
		this.clearError();
		this.input.blur();
		this.input.setAttribute('readonly', 'true');
		this.input.setAttribute('tabindex', -1);
	};

	this.setValue = function (value) {
		this.value = value;
		if (this.type === 'menu') {
			F5.forEach(this.input.querySelectorAll('option'), function (option) {
				if (option.textContent === value) {
					option.selected = true;
				}
			});
		} else if (this.type === 'checkbox'){
			this.input.checked = value;
		} else {
			this.input.value = value;
		}
	};

	this.getValue = function () {
		if (this.input.type === 'checkbox') {
			return this.input.checked;
		} else {
			return this.input.value;
		}
	};

	this.setOnBlur = function (cb) {
		this.onblur = cb;
	};

	this.setOnFocus = function (cb) {
		this.onfocus = cb;
	};

	this.blur = function () {
		this.input.blur();
	};

	this.focus = function () {
		this.input.focus();
	};

	this.reset = function () {
		this.error.textContent = '';
		this.placeholder.style.display = '';
		this.setValue(this.value);
	};

	this.showError = function (message) {
		this.error.textContent = message;
	};

	this.clearError = function () {
		this.error.textContent = '';
	};
}

F5.Prototypes.Widgets.Input = new Input();

});



/*

Attempts to make things work nicely on Android and iOS 4.3



// Android seems to sometimes produce extra blur events
// only process on blur event after a focus


		// take control of the touch events
		if (F5.platform() === 'android') {
			this.input.style['pointer-events'] = 'none';
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
			if (navigator.userAgent.match(/OS 4/)) {
				// failed attempt to prevent scrolling on iOS 4

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
							that.form.el.querySelector('[f5widget="f5.Input"]').widget.focus();
						}
					} else {
						that.focus();
					}
					e.stopPropagation();
					e.preventDefault();
				});

			} else {
				this.hijack();
			}
*/
