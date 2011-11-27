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
			var options = {
				zoom: 8,
				center: new google.maps.LatLng(F5.fakeLocation.lat, F5.fakeLocation.lng),
				mapTypeId: google.maps.MapTypeId.ROADMAP
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
			});			
		};
		
		this.setCalloutActions = function () {
			
		};
		
		this.showStreetView = function (location) {		
			
		};			
	}	
	
	F5.WidgetPrototypes.MapView = new MapView();			
}());

/*
var content = document.createElement('div');
content.innerText = venue.name;
content.className = 'map-callout';

F5.addTapListener(content, function () {
	node.flowDelegate.viewMerchantDetail(node, {venue: venue}, function () {

	});
});						

var infowindow = new google.maps.InfoWindow({
	content: content
});						

google.maps.event.addListener(infowindow, 'click', function() {
	console.log(venue);
});						

google.maps.event.addListener(marker, 'click', function() {
	infowindow.open(that.map, marker);
});
*/

/*			
function CanvasProjectionOverlay() {}
CanvasProjectionOverlay.prototype = new google.maps.OverlayView();
CanvasProjectionOverlay.prototype.constructor = CanvasProjectionOverlay;
CanvasProjectionOverlay.prototype.onAdd = function(){};
CanvasProjectionOverlay.prototype.draw = function(){};
CanvasProjectionOverlay.prototype.onRemove = function(){};



			
var that = this;
if (!this.map) {
	var myOptions = {
		zoom: 8,
		center: new google.maps.LatLng(F5.fakeLocation.lat, F5.fakeLocation.lng),
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	this.map = new google.maps.Map(this.mapEl, myOptions);	
	
	
	var fakeMarker = document.createElement('div');
	fakeMarker.style.width = '25px';
	fakeMarker.style.height = '25px';
	fakeMarker.style.border = '1px solid black';
	fakeMarker.style.position = 'absolute';
	fakeMarker.style.top = '0px';
	fakeMarker.style.left = '0px';
	fakeMarker.style['z-index'] = 10000;
	this.mapEl.appendChild(fakeMarker);
	

	this.canvasProjectionOverlay = new CanvasProjectionOverlay();
	this.canvasProjectionOverlay.setMap(this.map);				
	
					function findTransform(el) {
						if (!el) {
							return null;
						}
						if (el.style['-webkitTransform'] && el.style['-webkitTransform'].match('matrix')) {
							return el.style['-webkitTransform'];
						} else {
							return findTransform(el.parentElement);
						}
					}			google.maps.event.addListener(this.map, 'drag', function() {

		var webkitTransform = findTransform(that.canvasProjectionOverlay.getPanes().overlayLayer);
		
		console.log(webkitTransform);
		
		that.canvasProjectionOverlay.getPanes().overlayLayer.id = 'overlayLayer';
							
		var transformMatrix = new WebKitCSSMatrix(webkitTransform);
		var offset = {x: transformMatrix.m41, y: transformMatrix.m42};
		var transform = 'translate3d(' + offset.x + 'px, ' + offset.y + 'px, 0px)';
		fakeMarker.style['-webkit-transform'] = transform;
	});
	
	setInterval(function () {
		var webkitTransform = findTransform(that.canvasProjectionOverlay.getPanes().overlayLayer);
		
		console.log(webkitTransform);					
	}, 30);
*/