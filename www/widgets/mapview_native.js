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
			el.appendChild(this.streetViewEl);			
			this.streetViewEl.visibility = 'hidden';
			
			var button = document.createElement('div');
			button.style.height = '16px';
			button.style.width = '16px';
			button.style.position = 'absolute';
			button.style.top = '10px';
			button.style.left = '10px';
			button.style['background-color'] = 'blue';
			
			F5.addTapListener(button, function () {
				
				if (!that.streetView) {
					var options = {
						position: new google.maps.LatLng(F5.fakeLocation.lat, F5.fakeLocation.lng)
					};
					that.streetView = new google.maps.StreetViewPanorama(that.streetViewEl, options);					
				}				
				
				console.log('tapped')
				
				if (that.streetViewEl.style.visibility === 'hidden') {
					that.streetViewEl.style.visibility = '';
				} else {
					that.streetViewEl.style.visibility = 'hidden';
				}
			});
			
			el.appendChild(button);
			
			
			PhoneGap.exec(
				function (result) { // success
				console.log(result);
			}, function (result) { // failure
				console.log(result);
			}, "com.flow5.mapview", "create", []);							
		};
		
		this.hide = function () {
			PhoneGap.exec(
				function (result) { // success
				console.log(result);
			}, function (result) { // failure
				console.log(result);
			}, "com.flow5.mapview", "hideMap", []);										
		};
		
		this.show = function () {
			PhoneGap.exec(
				function (result) { // success
				console.log(result);
			}, function (result) { // failure
				console.log(result);
			}, "com.flow5.mapview", "showMap", []);										
		};
		
	}	
	
	F5.Prototypes.mapView = new MapView();	
}());