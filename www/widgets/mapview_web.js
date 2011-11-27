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

	function MapView() {
		
		/*global google*/
		
		this.construct = function () {			
			var currentLocation = F5.locationService.getCurrentLocation();
			var options = {
				zoom: 8,
				center: new google.maps.LatLng(currentLocation.lat, currentLocation.lng),
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				streetViewControl: false,
				mapTypeControl: false
			};
			this.map = new google.maps.Map(this.el, options);										
		};		
		
		this.dropPins = function (pins) {
			var that = this;
			pins.forEach(function (pin) {
				var position = new google.maps.LatLng(pin.lat, pin.lng);
				var marker = new google.maps.Marker({
								      position: position,
								      map: that.map,
									  optimized: false,
								      animation: google.maps.Animation.DROP
								    });	
								
				// TODO: use a template
				var content = document.createElement('div');
				content.className = 'map-callout';

				var name = document.createElement('div');
				name.innerText = pin.name;
				content.appendChild(name);
				
				var streetView = document.createElement('div');
				streetView.innerText = 'Street View';
				content.appendChild(streetView);

				F5.addTapListener(name, function () {
					that.calloutActions['detailView'](pin.index);
				});						

				F5.addTapListener(streetView, function () {
					that.calloutActions['streetView'](pin.index);
				});						

				var infowindow = new google.maps.InfoWindow({
					content: content
				});						

				google.maps.event.addListener(infowindow, 'click', function() {

				});						

				google.maps.event.addListener(marker, 'click', function() {
					infowindow.open(that.map, marker);
				});												
			});			
		};
		
		this.setCalloutActions = function (calloutActions) {
			this.calloutActions = calloutActions;			
		};		
	}	
	
	F5.WidgetPrototypes.MapView = new MapView();			
}());