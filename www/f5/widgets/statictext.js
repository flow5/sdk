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
	
	function StaticText() {
		this.initialize = function (data) {
			this.refresh(data);
		};
		
		this.refresh = function (data) {
			if (typeof data !== 'undefined') {	
				var value;			
				if (this.formatValue) {
					value = this.formatValue(data);
				} else {
					value = data;
				}
				
				this.el.textContent = value;				
			}
		};
	}
	
	F5.Prototypes.Widgets.StaticText = new StaticText();	
	
	
	function Telephone() {
		this.formatValue = function (data) {
			var tmp = data.replace(/[^0-9]/g, '');
			
			if (tmp.length === 7) {
				tmp = tmp.substring(0,3) + '-' + tmp.substring(3, 7);
			} else if (tmp.length === 10) {
				tmp = tmp.substring(0,3) + '-' + tmp.substring(3, 6) + '-' + tmp.substring(6, 10);				
			} else if (tmp.length === 11) {
				tmp = tmp.substring(1,4) + '-' + tmp.substring(4, 7) + '-' + tmp.substring(7, 11);								
			}
			
			return tmp;
		};
	}
	Telephone.prototype = new StaticText();
	
	F5.Prototypes.Widgets.Telephone = new Telephone();	
	
	function Date() {
		this.formatValue = function (data) {
			return data.toDateString();
		};
	}
	Date.prototype = new StaticText();
	
	F5.Prototypes.Widgets.Date = new Date();	
	
	
	// TODO: quick and dirty. could use fleshing out
	function TextWithLabel() {
		this.formatValue = function (data) {
			return data.label + ': ' + data.value;
		};
		
	}	
	TextWithLabel.prototype = new StaticText();
	
	
	F5.Prototypes.Widgets.TextWithLabel = new TextWithLabel();	
	
		
});