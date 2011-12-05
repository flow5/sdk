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
				
		this.construct = function () {
			
			var that = this;
			
			F5.Global.flowController.addFlowObserver(this);
						
			this.shown = true;						
		};
		
		this.setMaskRegion = function (region) {
			PhoneGap.exec(
				function (result) { // success
					console.log('setMaskRegion');
					
				console.log(result);
			}, function (result) { // failure
				console.log(result);
			}, "com.flow5.mapview", "setMaskRegion", [region]);			
		};
		
		this.release = function () {
			F5.Global.flowController.removeFlowObserver(this);
		};
								
		this.dropPins = function (pins) {
			var that = this;
			PhoneGap.exec(
				function (result) { // success
					console.log('dropPins');
					
					that.calloutActions[result.button](result.index);
				console.log(result);
			}, function (result) { // failure
				console.log(result);
			}, "com.flow5.mapview", "dropPins", [JSON.stringify(pins)]);
		};	
		
		this.setCalloutActions = function (calloutActions) {
			this.calloutActions = calloutActions;
		};	
				
		// flow observer
		this.doTransition = function (container, id, to, animation) {
			if (this.shown) {
				// queue the transition. will be processed before js level transitions are executed
				PhoneGap.exec(
					function (result) { // success
						console.log('queue_');
						
					console.log(result);
				}, function (result) { // failure
					console.log(result);
				}, "com.flow5.mapview", 'queue_' + animation, []);					
			}
			
			return function (cb) {								
				cb();
			};
		};
		
		// TODO: move to phonegap layer
		function doSync(method) {
			var xhr = new XMLHttpRequest();
			// NOTE: XHR requires a full resolvable URL. This one gets caught by the NSURLCache though.
			var url = 'http://www.flow5.com/gap?className=com.flow5.mapview&methodName=' + method;
			xhr.open('GET', url, false);
			xhr.send(null);	
			console.log('doSync: ' + method);
			
			var result;
			try {
				result = JSON.parse(xhr.responseText).message;
			} catch (e) {
				console.log('exception parsing: ' + JSON.stringify(xhr) + ' url: ' + url);
			}
			
			return result;
		}
		
		this.widgetWillBecomeActive = function () {
			if (!this.created) {
				var pos = F5.elementAbsolutePosition(this.el);
				var bounds = {top: pos.y, left: pos.x, width: this.el.offsetWidth, height: this.el.offsetHeight};
				
				PhoneGap.exec(
					function (result) { // success
					console.log(result);
				}, function (result) { // failure
					console.log(result);
				}, "com.flow5.mapview", "create", [bounds]);	
				
				this.created = true;						
			}
			
			this.shown = true;			
			doSync('showMap');		
		};
		
		this.widgetWillBecomeInactive = function () {
//			var snapshot = doSync('getSnapshot');
//			console.log('snapshot: ' + snapshot.substring(0, 255));			
		};

		this.widgetDidBecomeInactive = function () {
			this.shown = false;	
			setTimeout(function () {
				doSync('hideMap');							
			}, 0);
		};	
				
		this.getMapCenter = function () {
			return doSync('getMapCenter');
		};

		this.getMapBounds = function () {
			return doSync('getMapBounds');
		};
		
		this.animateToRegion = function (cb) {
			PhoneGap.exec(
				function (result) { // success
					console.log('animateToRegion');
				console.log(result);
				cb();
			}, function (result) { // failure
				console.log(result);
				cb();
			}, "com.flow5.mapview", "animateToRegion", [F5.locationService.getCurrentLocation()]);										
		};
	}	
	
	F5.WidgetPrototypes.MapView = new MapView();	
}());