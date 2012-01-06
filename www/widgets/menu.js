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
	
	function Menu() {
		this.construct = function (data) {	
			
			var that = this;
			
			F5.addClass(this.el, 'f5menu');
					
			var div = document.createElement('div');
			F5.addClass(div, 'f5menutitle');
			div.innerHTML = data.method;
			this.el.appendChild(div);

			var choicesEl = document.createElement('div');
			F5.addClass(choicesEl, 'f5menuitems');
			this.el.appendChild(choicesEl);

			F5.forEach(data.choices, function (id, choice) {
				
				var choiceEl = F5.createWidget('ImageButton', {choice: id}, 'choice');
				F5.addClass(choiceEl, 'f5menuitem');
				choicesEl.appendChild(choiceEl);

				choiceEl.widget.setAction(function () {
					if (that.action) {
						that.action(id);
					}
				});							
			});					
		};
		
		this.setAction = function (cb) {
			this.action = cb;
		};
	}	
		
	F5.WidgetPrototypes.Menu = new Menu();
	
}());