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
	
	function Picture() {
		this.construct = function (data) {
			
			this.el.innerHTML = '';

			var id = this.el.getAttribute('f5id');
			// NOTE: valueFromId handles period delimited ids. probably going to get rid of this in favor of scoping
			var value = F5.valueFromId(data, id);

			if (!value) {
				var className = this.el.getAttribute('f5class');
				if (className) {
					value = data['.' + className];
				}								
			}

			if (value) {
				var img = document.createElement('img');				
				if (F5.ImagePreloader.isImagePreloader(value)) {
					img.src = value.src();					
				} else {
					img.src = value;
				}
				this.el.appendChild(img);				
			}			
		};
	}
	
	F5.Prototypes.Widgets.Picture = new Picture();
		
}());