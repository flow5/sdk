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
/*global F5, google*/

F5.registerModule(function(F5) {
	
	function StreetView() {
		
		this.initialize = function (data) {
			try {
				this.streetView = new google.maps.StreetViewPanorama(this.el, {pano:data.pano});
			} catch (e) {
				console.log(e.message);
			}
			this.closeButton = F5.createWidget('Button', data, 'closeButton', 'closeButton');
			F5.addClass(this.closeButton, 'f5closebutton');
			this.el.appendChild(this.closeButton);																						
		};	
		
		this.setCloseAction = function (action) {
			this.closeButton.widget.setAction(function() {
				action();
			});						
		};
		
		this.widgetWillBecomeActive = function () {
			try {
				google.maps.event.trigger(this.streetView, 'resize');				
			} catch (e) {
				console.log(e.message);
			}
		};
	}
	
	F5.Prototypes.Widgets.StreetView = new StreetView();		
});