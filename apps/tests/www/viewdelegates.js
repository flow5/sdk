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
/*global F5, PhoneGap*/

// TODO: break the Native dependent tests out!


(function () {	
								
	function RootViewDelegate() {
		
		var url = "http://www.flow5.com";		
		
		this.initialize = function (el, node) {
			el.appendChild(F5.Templates.loadTemplate(node));
			
			var buttonEl = F5.getElementById(el, 'wait');

			var firstTime = true;			
			var times = [];									
			buttonEl.addEventListener('touchend', function () {				
				times.push('button');
				
				if (firstTime) {
					firstTime = false;					
										
					setTimeout(function () {						
						times.push('before xhrs');
						
						var i = 5000;
						while (i) {
							i -= 1;
							var xhr = new XMLHttpRequest();
							xhr.open('GET', url, true);
							xhr.send();
						}
						
						times.push('after xhrs');						
						
						console.log(times);
					}, 0);								
				}								
			});
		};		
	}

	F5.ViewDelegates.root = new RootViewDelegate();	
}());