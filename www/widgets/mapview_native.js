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

(function () {

	function MapView() {
		
		this.setup = function (el) {
			
			var that = this;
			
			/*global google*/
			
			this.streetViewEl = document.createElement('div');
			this.streetViewEl.style.width = '100%';
			this.streetViewEl.style.height = '100%';
			that.streetViewEl.style.visibility = 'hidden';
			el.appendChild(this.streetViewEl);	
			
			// TODO: use template?
			var closeButton = document.createElement('div');
			closeButton.style.width = '10px';
			closeButton.style.height = '10px';
			closeButton.style.position = 'absolute';
			closeButton.style.right = '6px';
			closeButton.style.top = '6px';
			closeButton.style['background-color'] = 'red';
			closeButton.style.border = '1px solid black';
			closeButton.style['z-index'] = 1000;
			this.streetViewEl.appendChild(closeButton);

			F5.addTapListener(closeButton, function () {
				that.streetViewEl.style.visibility = 'hidden';
				PhoneGap.exec(
					function (result) { // success
					console.log(result);
				}, function (result) { // failure
					console.log(result);
				}, "com.flow5.mapview", "clearMaskRegion", []);									
			});								
						
			PhoneGap.exec(
				function (result) { // success
				console.log(result);
			}, function (result) { // failure
				console.log(result);
			}, "com.flow5.mapview", "create", [{top:10, left:10, width: 16, height: 16}]);							
		};
		
		this.showStreetView = function (location) {
			var that = this;
						
			that.streetViewEl.style.visibility = '';
						
			var position = new google.maps.LatLng(location.lat, location.lng);
			if (!this.streetView) {
				var options = {
					position: position
				};
				this.streetView = new google.maps.StreetViewPanorama(this.streetViewEl, options);				
			} else {
				this.streetView.setPosition(position);
				console.log('setting position')
			}	
			console.log(location);
									
			var maskRegion = {top: 0, left: 0, width: this.streetViewEl.offsetWidth, 
									height: this.streetViewEl.offsetHeight};
			PhoneGap.exec(
				function (result) { // success
				console.log(result);
			}, function (result) { // failure
				console.log(result);
			}, "com.flow5.mapview", "setMaskRegion", [maskRegion]);													
		};
		
		this.hide = function () {
			// TODO: move the idea of transitions of native views up to animation layer
			// FIX: this is not sync
			F5.get('http://flow5.local/sync?className=com.flow5.mapview&methodName=hideMap');							
/*			
			PhoneGap.exec(
				function (result) { // success
				console.log(result);
			}, function (result) { // failure
				console.log(result);
			}, "com.flow5.mapview", "hideMap", []);										
*/
		};
		
		this.show = function () {
			PhoneGap.exec(
				function (result) { // success
				console.log(result);
			}, function (result) { // failure
				console.log(result);
			}, "com.flow5.mapview", "showMap", []);										
		};
		
		this.dropPins = function (pins) {
			var that = this;
			PhoneGap.exec(
				function (result) { // success
					that.calloutActions[result.button](result.pin);
				console.log(result);
			}, function (result) { // failure
				console.log(result);
			}, "com.flow5.mapview", "dropPins", [JSON.stringify(pins)]);
		};	
		
		this.setCalloutActions = function (calloutActions) {
			this.calloutActions = calloutActions;
		};			
	}	
	
	F5.Prototypes.mapView = new MapView();	
}());