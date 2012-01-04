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

// OPTION: break the phonegap dependency out. doesn't seem worth it since the APIs are so close. . .

(function () {
	
	function Location() {
		
		var currentLocation;
		
		this.getCurrentLocation = function () {
			if (currentLocation) {
				return currentLocation;
			} else {
				// TODO: allow client to specify default location
				return {lat:37.774484, lng:-122.420091};
			}
		};				
		
		this.start = function () {	
			if (!navigator.geolocation) {
				return;
			}
			
			
			var that = this;
					
			var options = {
			    enableHighAccuracy: false,
//			    timeout: Infinity,
			    timeout: 10000,
			    maximumAge: 0
			  };
		   
			this.watchId = navigator.geolocation.watchPosition(
				function (position) {
//					console.log(position.coords);
					var newLocation = {lat: position.coords.latitude, lng: position.coords.longitude};
					if (newLocation !== currentLocation) {
						currentLocation = newLocation;
						// TODO: is there a standard event for this?
			            var e = document.createEvent('Events'); 
			            e.initEvent('locationchanged');
			            document.dispatchEvent(e);						
					}
				},
				function (error) {
					console.log(error);
				},
				options);
		};							
		
		this.stop = function () {
			if (this.watchId) {
				navigator.geolocation.clearWatch(this.watchId);				
			}
		};
	}
	
	F5.locationService = new Location();
	
}());