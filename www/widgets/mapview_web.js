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
				zoom: 13,
				center: new google.maps.LatLng(currentLocation.lat, currentLocation.lng),
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				streetViewControl: false,
				mapTypeControl: false
			};
									
			this.map = new google.maps.Map(this.el, options);		
			this.markers = [];		
			
			var that = this;
			google.maps.event.addListener(this.map, 'bounds_changed', function() {
				if (that.boundsChangedAction) {
					that.boundsChangedAction();
				}
			});									
		};	
		
		this.removePins = function () {
			this.markers.forEach(function (marker) {
				marker.setMap(null);
			});			
		};	
		
		this.dropPins = function (pins) {
			var that = this;
			
			this.markers.forEach(function (marker) {
				marker.setMap(null);
			});
			
			pins.forEach(function (pin) {
				var position = new google.maps.LatLng(pin.lat, pin.lng);
				var markerImage; 
				if (pin.markerImage) {
					markerImage = new google.maps.MarkerImage(pin.markerImage, null, null, null, 
													new google.maps.Size(24, 24));				
				}
				var marker = new google.maps.Marker({
								      position: position,
								      map: that.map,
									  optimized: false,
								      animation: google.maps.Animation.DROP,
									  icon: markerImage
								    });	
								
				that.markers.push(marker);													

				google.maps.event.addListener(marker, 'click', function() {
					
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
										
					infowindow.open(that.map, marker);
				});												
			});			
		};
		
		this.setMaskRegion = function (region) {
			
		};
						
		this.getMapGeometry = function () {
			var bounds = this.map.getBounds();
			var center = this.map.getCenter();
			
			var southEast = new google.maps.LatLng(bounds.getSouthWest().lat(), bounds.getNorthEast().lng());
			// TODO: pick larger? smaller? dimension?
			var diameter = google.maps.geometry.spherical.computeDistanceBetween(bounds.getSouthWest(), southEast);
			
			return {
//				bounds: {
//					sw: {lat: bounds.getSouthWest().lat(), lng: bounds.getSouthWest().lng()}, 
//					ne: {lat: bounds.getNorthEast().lat(), lng: bounds.getNorthEast().lng()}
//				},
				center: {lat: center.lat(), lng: center.lng()},
				radius: 0.5 * diameter
				
			};
		};
		
		this.animateToRegion = function (region, cb) {

			function toRad(value) {
			    return value * Math.PI / 180;
			}

			function toDeg(value) {
			    return value * 180 / Math.PI;
			}

			function destinationPoint(lat, lng, brng, dist) {		
			  dist = dist/6371;  // convert dist to angular distance in radians, km
			  brng = toRad(brng);  // 
			  var lat1 = toRad(lat), lon1 = toRad(lng);

			  var lat2 = Math.asin( Math.sin(lat1)*Math.cos(dist) + 
			                        Math.cos(lat1)*Math.sin(dist)*Math.cos(brng) );
			  var lon2 = lon1 + Math.atan2(Math.sin(brng)*Math.sin(dist)*Math.cos(lat1), 
			                               Math.cos(dist)-Math.sin(lat1)*Math.sin(lat2));
			  lon2 = (lon2+3*Math.PI) % (2*Math.PI) - Math.PI;  // normalise to -180..+180º

			  return {lat: toDeg(lat2), lng: toDeg(lon2)};
			}
			
			var n = destinationPoint(region.center.lat, region.center.lng, 0, region.radius/1000);
			var s = destinationPoint(region.center.lat, region.center.lng, 180, region.radius/1000);
			var e = destinationPoint(region.center.lat, region.center.lng, 90, region.radius/1000);
			var w = destinationPoint(region.center.lat, region.center.lng, 270, region.radius/1000);
			
			var sw = new google.maps.LatLng(s.lat, w.lng);
			var ne = new google.maps.LatLng(n.lat, e.lng);
			
			this.map.fitBounds(new google.maps.LatLngBounds(sw, ne));
			
			cb();
		};
		
		this.setCalloutActions = function (calloutActions) {
			this.calloutActions = calloutActions;			
		};	
		
		this.setBoundsChangedAction = function (cb) {
			this.boundsChangedAction = cb;
		};
		
		this.setMaskRegion = F5.noop;
		
		this.clearMaskRegion = F5.noop;
	}	
	
	F5.Prototypes.Widgets.MapView = new MapView();			
}());