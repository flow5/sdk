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
	
	function Switch() {
		this.construct = function () {
			F5.addClass(this.el, 'f5switch');
			
			this.slider = document.createElement('div');
			F5.addClass(this.slider, 'f5slider');												
			this.slider.setAttribute('f5constrain', 'horizontal');
			F5.attachWidget(this.slider, 'Tracker');
			
			this.left = document.createElement('div');
			this.left.innerText = 'ON';
			F5.addClass(this.left, 'left');
			this.slider.appendChild(this.left);

			this.right = document.createElement('div');
			this.right.innerText = 'OFF';
			F5.addClass(this.right, 'right');
			this.slider.appendChild(this.right);
			
			this.control = document.createElement('div');
			F5.addClass(this.control, 'f5control');			
			this.slider.appendChild(this.control);						
			this.slider.widget.delegate = this;
						
			this.el.appendChild(this.slider);				
		};
		
		this.widgetWillBecomeActive = function () {
			this.control.style.width = this.control.offsetHeight;
			this.deadZone = this.el.offsetWidth / 5;
			var paddingLeft = parseInt(window.getComputedStyle(this.slider)['padding-left'].replace('px', ''), 10);
			var paddingRight = parseInt(window.getComputedStyle(this.slider)['padding-right'].replace('px', ''), 10);
			this.maxThrow = this.el.offsetWidth - this.control.offsetWidth - (paddingLeft + paddingRight);	
			
			this.slider.style.width = this.el.offsetWidth * 2 - this.el.offsetHeight;
			this.slider.style['margin-left'] = -(this.el.offsetWidth - this.el.offsetHeight);
		};
		
		this.moveHandler = function (delta, start) {
			
			if (delta.x > start.x || (delta.x === 0 && start.x === 0) || delta.x < 0) {
				if (delta.x < this.deadZone) {
					delta.x = 0;
				} else {
					delta.x -= this.deadZone;

					if (delta.x > this.maxThrow) {
						delta.x = this.maxThrow;
					}
				}				
			} else {
				if (delta.x > this.maxThrow - this.deadZone) {
					delta.x = this.maxThrow;
				} else {
					delta.x += this.deadZone;

					if (delta.x > this.maxThrow) {
						delta.x = this.maxThrow;
					}
				}				
			}
		};
		
		this.stopHandler = function (delta, start) {						
			if (delta.x > start.x || (delta.x === 0 && start.x === 0)) {
				if (delta.x < this.deadZone || delta.x > 3 * this.maxThrow / 4) {
					delta.x = this.maxThrow;
				} else {
					delta.x = 0;
				}
			} else {
				if (this.maxThrow + delta.x > this.maxThrow - this.deadZone || this.maxThrow + delta.x < this.maxThrow / 4) {
					delta.x = 0;
				} else {
					delta.x = this.maxThrow;
				}				
			}					
		};
	}

	F5.Prototypes.Widgets.Switch = new Switch();
	
}());