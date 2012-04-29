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
	
	function Activity() {
		
		this.construct = function () {			
			F5.addClass(this.el, 'f5activityspriteroot');
			
			var container = document.createElement('div');
			F5.addClass(container, 'f5activityspritecontainer');
			this.el.appendChild(container);

			var mask = document.createElement('div');
			F5.addClass(mask, 'f5activityspritemask');
			container.appendChild(mask);

			var sprite = document.createElement('div');
			F5.addClass(sprite, 'f5activitysprite');
			mask.appendChild(sprite);							
		};
		
		this.start = function (el) {		
			el.appendChild(this.el);			
		};
		
		this.stop = function (el) {
//			return
			
			// make sure that the activity is actually contained by this element
			var search = this.el;
			while (search) {
				if (search.parentElement === el) {
					break;
				}
				search = search.parentElement;
			}

			if (search) {
				this.el.parentElement.removeChild(this.el);			
			}			
		};
	}
	
	F5.Prototypes.Widgets.Activity = new Activity();
	
});