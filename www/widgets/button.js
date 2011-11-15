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
	
	/*
		data schema:
			
		nodeId: {
			ButtonClass: {
				image: {
					up: <url>,
					down: <url>
				}
				
					OR
					
				image: {
					up: {
						left: <url>,
						middle: <url>,
						right: <url>
					},
					down: etc.
				}
			}
			
			f5_id: {
				ButtonF5Id: <string>
			}
			
				OR
			
			f5_id: {
				label: <string>,
				image: {
					up: <url>,
					down: <url>
				}
			}
		}
		
		this allows button styles to be defined at any scope using ButtonClass (Toggle, Temporary, Tab)
		or to be defined for a specific button using f5_id or a combination (probably label for f5_id and 
		images for ButtonClass)	
		
		while CSS can be used to set button dimensions, buttons should be allowed to take dimensions from
		image and label size. buttons will use device pixel density to convert image dimensions to div dimensions.
	
	*/
	
	function Button() {
		this.makeContainer = function() {
			if (this.imageContainer) {
				this.el.removeChild(this.imageContainer);
			}
			this.imageContainer = document.createElement('div');
			F5.addClass(this.imageContainer, 'f5button-imagecontainer');

			this.up = document.createElement('div');
			F5.addClass(this.up, 'up');
			this.imageContainer.appendChild(this.up);
			
			this.down = document.createElement('div');
			F5.addClass(this.down, 'down');
			this.down.style.visibility = 'hidden';
			this.imageContainer.appendChild(this.down);
			
			this.el.insertBefore(this.imageContainer, this.label);
		};
	}
		
	function ImageButton() {		
		this.construct = function (data) {
			
			var that = this;
			
			F5.addClass(this.el, 'f5button');

			this.label = document.createElement('div');
			F5.addClass(this.label, 'f5button-label');
			this.el.appendChild(this.label);			

			function makeStretchyButton(value) {
				that.makeContainer();

				function makeImages(which, value) {
					F5.assert(value[which].left && value[which].middle && value[which].right, 
								'Image must specify left, middle and right');
					function makeImage(which, value, position) {
						var img = document.createElement('img');
						img.src = value[which][position];
						// TODO: need to adjust based on pixel density						
						img.style.height = '30px';
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
					img.src = value[which];
					// TODO: need to adjust based on pixel density											
					img.style.height = '30px';
					that[which].appendChild(img);
				}
				
				makeImage('up', value);
				makeImage('down', value);
									
//				F5.assert(this.up.width === this.down.width && this.up.height === this.down.height, 
//					'Up and down images should have the same dimensions');				
			}
			
			function applyValue(value) {
				if (typeof value === 'object') {
					if (value.label) {
						that.label.innerText = value.label;
					}
					if (value.image.up) {
						F5.assert(value.image.down, 'Both up and down images should be defined together');
						
						if (typeof value.image.up === 'object') {
							makeStretchyButton(value.image);
						} else {
							makeFixedButton(value.image);
						}						
					}
				} else {
					that.label.innerText = value;
				}
			}
			
			this.makeContainer();

			// first apply styles from the Button class
			applyValue(data[this.el.getAttribute('f5_widget')]);
			
			// then override with styles for the instance
			applyValue(data[this.el.getAttribute('f5_id')]);			
		};
		
		this.setAction = function (cb) {
			var that = this;
			F5.addTouchStartListener(this.el, function (e) {
				e.stopPropagation();
				if (that.up) {
					that.up.style.visibility = 'hidden';
					that.down.style.visibility = '';					
				}
			});
			F5.addTouchStopListener(this.el, function (e) {
				e.stopPropagation();
				if (that.up) {
					that.up.style.visibility = '';
					that.down.style.visibility = 'hidden';					
				}
			});				
			F5.addTapListener(this.el, cb);			
		};
	}
	ImageButton.prototype = new Button();
	
	F5.WidgetPrototypes.ImageButton = new ImageButton();	
	
	
	function ToggleButton() {
		
		this.state = false;
		
		this.setState = function (state) {
			this.state = state;
			if (this.state) {
				this.up.style.visibility = 'hidden';
				this.down.style.visibility = '';									
			} else {
				this.up.style.visibility = '';
				this.down.style.visibility = 'hidden';													
			}
		};
		
		this.setAction = function (cb) {
			var that = this;
			F5.addTouchStartListener(this.el, function (e) {
				e.stopPropagation();
				that.setState(!that.state);
				cb(that.state);
			});			
		};
	}
	ToggleButton.prototype = new ImageButton();
	
	F5.WidgetPrototypes.ToggleButton = new ToggleButton();				
	
	
	function MaskButton() {		
		this.construct = function (data) {

			var that = this;

			F5.addClass(this.el, 'f5button');

			this.label = document.createElement('div');
			F5.addClass(this.label, 'f5button-label');
			this.el.appendChild(this.label);	
			
			function applyValue(value) {
				if (value) {
					F5.assert(typeof value === 'object', 'MaskButton requires label and mask image specification');
					if (value.label) {
						that.label.innerText = value.label;
					}
					if (value.image) {
						that.makeContainer();	
						
						var div;
						
						div = document.createElement('div');
						F5.addClass(div, 'f5mask');
						div.style['-webkit-mask-image'] = 'url("' + value.image + '")';						
						that.up.appendChild(div);

						div = document.createElement('div');
						F5.addClass(div, 'f5mask-shadow');
						div.style['-webkit-mask-image'] = 'url("' + value.image + '")';						
						that.down.appendChild(div);

						div = document.createElement('div');
						F5.addClass(div, 'f5mask');
						div.style['-webkit-mask-image'] = 'url("' + value.image + '")';						
						that.down.appendChild(div);
					}					
				}
			}

			this.makeContainer();

			// first apply styles from the Button class
			applyValue(data[this.el.getAttribute('f5_widget')]);

			// then override with styles for the instance
			applyValue(data[this.el.getAttribute('f5_id')]);			
		};		
	}
	MaskButton.prototype = new Button();						
	
	function TabButton() {
		this.state = false;
		
		this.setState = function (state) {
			this.state = state;
			if (this.state) {
				this.up.style.visibility = 'hidden';
				this.down.style.visibility = '';									
			} else {
				this.up.style.visibility = '';
				this.down.style.visibility = 'hidden';													
			}
		};		
		
		this.setAction = function (cb) {
			var that = this;
			F5.addTouchStartListener(this.el, function (e) {
				e.stopPropagation();
				if (!that.state) {
					// do the callback first
					// if it errors out the state doesn't change
					cb();
				}
			});						
		};
	}
	TabButton.prototype = new MaskButton();
	
	F5.WidgetPrototypes.TabButton = new TabButton();
	
	
	

}());
