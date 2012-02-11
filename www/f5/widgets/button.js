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
		
		/* true=down, false=up */	
		this.setState = function (state) {
			var that = this;

			this.state = state;

			['up', 'down'].forEach(function (state) {
				F5.removeClass(that.el, 'f5button-' + state);
				if (that[state]) {
					that[state].style.visibility = 'hidden';
				}
			});
			
			var tag = state ? 'down' : 'up';
			F5.addClass(this.el, 'f5button-' + tag);
			if (this[tag]) {
				this[tag].style.visibility = '';
			}			
		};	
		
		this.setLabel = function (label) {
			if (!this.label) {
				this.label = document.createElement('div');
				F5.addClass(this.label, 'f5button-label');
				this.el.appendChild(this.label);							
			}

			this.label.innerText = label;					
		};
		
		this.getData = function () {
			return this.data;
		};
		
		this.unsetAction = function () {
			F5.removeTouchEventListenersRecursive(this.el);
		};
		
		this.setAction = function (cb) {
			var that = this;
			
			function press() {
				F5.addClass(that.el, 'f5button-press');
				if (that.press) {
					var tag = that.savedState ? 'down' : 'up';
					that[tag].style.visibility = 'hidden';
					that.press.style.visibility = '';
				}
			}
			
			function release() {
				F5.removeClass(that.el, 'f5button-press');				
				if (that.press) {
					var tag = that.savedState ? 'down' : 'up';
					that[tag].style.visibility = '';
					that.press.style.visibility = 'hidden';
				}
			}			
			
			var moveListener;
			
			function stopListener() {
				release();			
				that.setState(that.savedState);		
				
				F5.removeTouchMoveListener(that.el, moveListener);
				F5.removeTouchStopListener(that.el, stopListener);
				F5.removeTouchStopListener(document.body, stopListener);				
			}

			moveListener = function (e) {
				e.preventDefault();
				e.stopPropagation();
				
				var moveLoc = F5.eventLocation(e);
				if (F5.eventDistance(moveLoc, that.startLoc) > F5.maxClickDistance) {
					stopListener();
				}
			};		
			
			F5.addTouchStartListener(this.el, function touchStartListenerCB(e) {
				e.preventDefault();
				e.stopPropagation();
				
				that.savedState = that.state;
				that.startLoc = F5.eventLocation(e);
				press();
								
				F5.addTouchMoveListener(that.el, moveListener);								
				F5.addTouchStopListener(that.el, stopListener);
				F5.addTouchStopListener(document.body, stopListener);												
			});
			F5.addTapListener(this.el, function (e) {
				stopListener();
				cb(e);
			});			
		};		
		
		this.reset = function () {
			this.el.innerHTML = '';
			if (this.className) {
				F5.removeClass(this.el, this.className);
				delete this.className;
			}
			delete this.label;			
		};
					
		this.construct = function (data) {
			
			var that = this;
						
			var container;
			function makeContainer(tag) {
				if (!container) {
					container = document.createElement('div');
					F5.addClass(container, 'f5button-container');
					that.el.appendChild(container);
				}

				that[tag] = document.createElement('div');
				F5.addClass(that[tag], 'f5button-' + tag);
				container.appendChild(that[tag]);
			}			
			
			function makeStretchyButton(values) {
				function makeImages(which, value) {
					function makeImage(which, value, position) {
						var img = document.createElement('img');
						img.src = value[position].src();
						that[which].appendChild(img);

						if (position === 'middle') {
							img.style.display = '-webkit-box';
							img.style['-webkit-box-flex'] = 1.0;
						}
					}
					F5.assert(value.left && value.middle && value.right, 
								'Image must specify left, middle and right');
					makeImage(which, value, 'left');
					makeImage(which, value, 'middle');
					makeImage(which, value, 'right');

					that[which].style.display = '-webkit-box';						
				}

				F5.forEach(values, function (id, value) {
					makeContainer(id);
					makeImages(id, value);
				});
			}

			function makeFixedButton(values) {
				function makeImage(which, value) {
					var img = document.createElement('img');
					img.src = value.src();
					that[which].appendChild(img);						
				}

				F5.forEach(values, function (id, value) {
					makeContainer(id);	
					makeImage(id, value);					
				});
			}
			
			function maskMaskButton(value) {
				makeContainer('up');	
				makeContainer('down');	
				
				F5.addClass(that.el, 'f5maskbutton');
				
				// see f5/ios.css for explanation
				var ios43maskworkaround = '';
				if (F5.platform() === 'ios') {
					ios43maskworkaround = ', -webkit-gradient(linear, left bottom, right top, from(rgba(0,0,0,0)), to(rgba(0,0,0,0)))';					
				}
				
				var div = document.createElement('div');
				F5.addClass(div, 'f5mask');
				div.style['-webkit-mask-image'] = 'url("' + value.src() + '")' + ios43maskworkaround;
				that.up.appendChild(div);

				div = document.createElement('div');
				F5.addClass(div, 'f5mask-shadow');
				div.style['-webkit-mask-image'] = 'url("' + value.src() + '")' + ios43maskworkaround;						
				that.down.appendChild(div);

				div = document.createElement('div');
				F5.addClass(div, 'f5mask');
				div.style['-webkit-mask-image'] = 'url("' + value.src() + '")' + ios43maskworkaround;						
				that.down.appendChild(div);
			}									
			
			function applyResourceData(resourceData) {
				if (resourceData.className) {
					that.className = resourceData.className;
					F5.addClass(that.el, resourceData.className);
				}
				if (resourceData.image) {
					if (resourceData.image.up) {
						// simple button
						if (F5.ImagePreloader.isImagePreloader(resourceData.image.up)) {
							makeFixedButton(resourceData.image);
						} else {
							makeStretchyButton(resourceData.image);
						}
					}							
				}
				if (resourceData.mask) {
					maskMaskButton(resourceData.mask);
				}
				if (resourceData.label) {
					that.setLabel(resourceData.label);
				}				
			}
			
			// construct can be called more than once
			var label = this.el.innerText;
			this.el.innerHTML = '';

			this.data = data;
			this.state = false;				
			F5.addClass(that.el, 'f5button-up');									
			F5.addClass(this.el, 'f5button');			

			/* label can be defined by putting it in the HTML */
			var mergedData = {label: label};
						
			// first apply styles from the Button class
			var className = this.el.getAttribute('f5class');
			if (className) {
				var classData = data['.' + className];
				if (typeof classData === 'string') {
					mergedData.label = classData;
				} else {					
					F5.merge(classData, mergedData);
				}
			}
			
			var instanceData = data[this.el.getAttribute('f5id')];
			if (typeof instanceData === 'string') {
				mergedData.label = instanceData;
			} else {
				F5.merge(instanceData, mergedData);				
			}

			applyResourceData(mergedData);	
		};
	}	
		
	F5.Prototypes.Widgets.Button = new Button();	
																				
	
	function ToggleButton() {		
		this.state = false;
				
		this.setAction = function (cb) {
			var that = this;
			F5.addTouchStartListener(this.el, function touchStartListenerCB(e) {
				e.stopPropagation();
				e.preventDefault();
				
				that.setState(!that.state);
				cb(that.state);
			});			
		};
	}
	ToggleButton.prototype = F5.Prototypes.Widgets.Button;
	
	F5.Prototypes.Widgets.ToggleButton = new ToggleButton();				
}());
