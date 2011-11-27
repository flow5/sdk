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

(function () {
	
	var service;	
			
	function StreetView() {
		
		this.construct = function () {
			if (!service) {
				service = new google.maps.StreetViewService();					
			}
			this.streetView = new google.maps.StreetViewPanorama(this.el, {
				enableCloseButton: true
			});							
		};	
		
		this.setCloseAction = function (action) {
			google.maps.event.addListener(this.streetView, 'closeclick', function() {
				action();
			});						
		};
		
		this.setLocation = function (location) {
			var that = this;
			var position = new google.maps.LatLng(location.lat, location.lng);
			service.getPanoramaByLocation(position, 200, function(data, status) {
				if (status === 'OK') {
					that.streetView.setPano(data.location.pano);		
					console.log(data);			
				} else {
					console.log('no street view for this location');
				}
				google.maps.event.trigger(that.streetView, 'resize');
			});
		};
	}
	
	F5.WidgetPrototypes.StreetView = new StreetView();		
}());