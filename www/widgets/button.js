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
	
	function Button() {
		this.makeContainer = function() {
			if (this.imageContainer) {
				this.el.removeChild(this.imageContainer);
			}
			this.imageContainer = document.createElement('div');
			F5.addClass(this.imageContainer, 'f5button-imagecontainer');

			this.up = document.createElement('div');
			F5.addClass(this.up, 'f5button-up');
			this.imageContainer.appendChild(this.up);
			
			this.down = document.createElement('div');
			F5.addClass(this.down, 'f5button-down');
			this.imageContainer.appendChild(this.down);
			
			this.el.insertBefore(this.imageContainer, this.label);
			
			F5.addClass(this.el, 'f5button-up');
		};
		
		this.setState = function (state) {
			this.state = state;
			if (state) {
				F5.addClass(this.el, 'f5button-down');
				F5.removeClass(this.el, 'f5button-up');
			} else {
				F5.addClass(this.el, 'f5button-up');
				F5.removeClass(this.el, 'f5button-down');
			}
		};		
		
		this.setAction = function (cb) {
			var that = this;
			F5.addTouchStartListener(this.el, function touchStartListenerCB(e) {
				F5.addClass(that.el, 'f5button-press');
				that.setState(true);
			});
			F5.addTouchMoveListener(this.el, function touchMoveListenerCB(e) {
				e.preventDefault();
				e.stopPropagation();
			});
			F5.addTouchStopListener(this.el, function touchStopListenerCB(e) {
				F5.removeClass(that.el, 'f5button-press');
				that.setState(false);
			});				
			F5.addTapListener(this.el, cb);			
		};		
					
		this.construct = function (data) {
			
			var that = this;
			
			function makeStretchyButton(value) {
				that.makeContainer();

				function makeImages(which, value) {
					F5.assert(value[which].left && value[which].middle && value[which].right, 
								'Image must specify left, middle and right');
					function makeImage(which, value, position) {
						var img = document.createElement('img');
						img.src = F5.sourceFromResourceUrl(value[which][position]);
						that[which].appendChild(img);

						if (position === 'middle') {
							img.style.display = '-webkit-box';
							img.style['-webkit-box-flex'] = 1.0;
						}
					}
					makeImage(which, value, 'left');
					makeImage(which, value, 'middle');
					makeImage(which, value, 'right');

					that[which].style.display = '-webkit-box';
				}

				makeImages('up', value);
				makeImages('down', value);								
			}

			function makeFixedButton(value) {
				that.makeContainer();	

				function makeImage(which, value) {
					var img = document.createElement('img');
					img.src = F5.sourceFromResourceUrl(value[which]);
					that[which].appendChild(img);
				}

				makeImage('up', value);
				makeImage('down', value);
			}
			
			function maskMaskButton(value) {
				that.makeContainer();	
				var div = document.createElement('div');
				F5.addClass(div, 'f5mask');
				div.style['-webkit-mask-image'] = 'url("' + F5.sourceFromResourceUrl(value) + '")';
				that.up.appendChild(div);

				div = document.createElement('div');
				F5.addClass(div, 'f5mask-shadow');
				div.style['-webkit-mask-image'] = 'url("' + F5.sourceFromResourceUrl(value) + '")';						
				that.down.appendChild(div);

				div = document.createElement('div');
				F5.addClass(div, 'f5mask');
				div.style['-webkit-mask-image'] = 'url("' + F5.sourceFromResourceUrl(value) + '")';						
				that.down.appendChild(div);
			}
			
						
			F5.addClass(this.el, 'f5button');

			/* label can be defined by putting it in the HTML */
			var labelText = this.el.innerText;
			this.el.innerHTML = '';

			function applyData(data) {
				if (data) {
					// id: text
					if (typeof data === 'string') {
						labelText = data;
					} else if (typeof data === 'object') {
						if (data.label) {
							labelText = data.label;
						}
						// up/down images are defined
						if (data.image) {
							F5.assert(typeof data.image === 'object', "Image based buttons must define up/down states");
							if (data.image.up) {
								F5.assert(data.image.down, "Both up and down images must be defined");
								// simple button
								if (typeof data.image.up === 'string') {
									makeFixedButton(data.image);
								} else {
									makeStretchyButton(data.image);
								}
							}							
						}
						if (data.mask) {
							maskMaskButton(data.mask);
						}
					}
				}
			}

			// first apply styles from the Button class
			var className = this.el.getAttribute('f5class');
			if (className) {
				applyData(data['.' + className]);
			}

			// then override with styles for the instance
			applyData(data[this.el.getAttribute('f5id')]);	
			
			
			if (labelText) {
				/* all buttons have a label div */
				this.label = document.createElement('div');
				F5.addClass(this.label, 'f5button-label');
				this.label.innerText = labelText;					
				this.el.appendChild(this.label);						
			}
		};
	}	
		
	F5.WidgetPrototypes.Button = new Button();	
																				
	
	function ToggleButton() {		
		this.state = false;
				
		this.setAction = function (cb) {
			var that = this;
			F5.addTouchStartListener(this.el, function touchStartListenerCB(e) {
				e.stopPropagation();
				that.setState(!that.state);
				cb(that.state);
			});			
		};
	}
	ToggleButton.prototype = F5.WidgetPrototypes.Button;
	
	F5.WidgetPrototypes.ToggleButton = new ToggleButton();				
}());
