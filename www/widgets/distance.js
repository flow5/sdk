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
	
	function distance(loc1, loc2) {
		
		//degrees to radians
		function toRad(degree) {
		    return degree* Math.PI/ 180;
		}
				
		var lat1 = loc1.lat,
			lat2 = loc2.lat,
			lon1 = loc1.lng,
			lon2 = loc2.lng;
		
		var R = 6371; // km
		R /= 1.609; // m
		var dLat = toRad(lat2-lat1);
		var dLon = toRad(lon2-lon1);
		lat1 = toRad(lat1);
		lat2 = toRad(lat2);

		var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
		        Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
		var d = R * c;	
		
		return d.toFixed(1);	
	}
	
	
	function Distance() {
		
		function updateLocation(el, location) {
			var currentLocation = F5.locationService.getCurrentLocation();
			if (currentLocation) {
				// from http://www.movable-type.co.uk/scripts/latlong.html
				el.innerText = distance(currentLocation, location) + ' m';				
			}			
		}
		
		this.construct = function (data) {
			updateLocation(this.el, data.location);			
			// TODO: setup a callback to update location when it changes
			var that = this;
			document.addEventListener('locationchanged', function () {
				updateLocation(that.el, data.location);
			});
		};
	}
		
	F5.Prototypes.Widgets.Distance = new Distance();
		
}());
