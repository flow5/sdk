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

F5.registerModule(function(F5) {
	
	function Switch() {
		this.initialize = function () {
			F5.addClass(this.el, 'f5switch');
			
			this.slider = document.createElement('div');
			F5.addClass(this.slider, 'f5slider');												
			this.slider.setAttribute('f5constrain', 'horizontal');
			F5.attachWidget(this.slider, 'Tracker');
			
			this.left = document.createElement('div');
			F5.addClass(this.left, 'left');
			this.slider.appendChild(this.left);

			var on = document.createElement('div');
			on.textContent = 'ON';
			F5.addClass(on, 'f5label');
			this.left.appendChild(on);

			this.right = document.createElement('div');
			F5.addClass(this.right, 'right');
			this.slider.appendChild(this.right);
			
			var off = document.createElement('div');
			off.textContent = 'OFF';
			F5.addClass(off, 'f5label');
			this.right.appendChild(off);
			
			this.control = document.createElement('div');
			F5.addClass(this.control, 'f5control');			
			this.slider.appendChild(this.control);						
			this.slider.widget.delegate = this;
						
			this.el.appendChild(this.slider);				
		};
		
		this.refresh = function (data) {
			this.setState(data);
		};
		
		this.widgetWillBecomeActive = function () {
			this.control.style.width = this.control.offsetHeight + 'px';
			this.deadZone = this.el.offsetWidth / 5;
			var paddingLeft = parseInt(window.getComputedStyle(this.slider)['padding-left'].replace('px', ''), 10);
			var paddingRight = parseInt(window.getComputedStyle(this.slider)['padding-right'].replace('px', ''), 10);
			this.maxThrow = this.el.offsetWidth - this.control.offsetWidth - (paddingLeft + paddingRight);	
			
			this.slider.style.width = this.el.offsetWidth * 2 - this.el.offsetHeight;
			this.slider.style['margin-left'] = -(this.el.offsetWidth - this.el.offsetHeight);
		};
		
		this.moveHandler = function (delta, start) {			
			var movingRight = delta.x > start.x;
			var startingLeft = start.x === 0;
			var startingRight = !startingLeft;
			
			if (movingRight) {
				if (startingLeft) {
					if (delta.x < this.deadZone) {
						delta.x = 0;
					} else {
						delta.x -= this.deadZone;
					}
				}
				if (delta.x > this.maxThrow) {
					delta.x = this.maxThrow;
				}				
			} else {
				if (startingRight) {
					if (delta.x > this.maxThrow - this.deadZone) {
						delta.x = this.maxThrow;
					} else {
						delta.x += this.deadZone;
					}
				}
				if (delta.x < 0) {
					delta.x = 0;
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
			
			if (this.action) {
				var that = this;
				setTimeout(function () {
					that.action(delta.x !== 0);					
				}, 0);
			}				
		};
		
		this.setState = function (value) {
			if (value) {
				this.slider.widget.animateTo({x: this.maxThrow, y: 0});
			} else {
				this.slider.widget.animateTo({x: 0, y: 0});
			}
		};
		
		this.setAction = function (cb) {
			this.action = cb;
		};
	}

	F5.Prototypes.Widgets.Switch = new Switch();
	
});