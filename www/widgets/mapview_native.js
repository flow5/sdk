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
			
			/*global google*/								
						
			PhoneGap.exec(
				function (result) { // success
				console.log(result);
			}, function (result) { // failure
				console.log(result);
			}, "com.flow5.mapview", "create", []);	
			
			this.shown = true;						
		};
		
		this.setMaskRegion = function (region) {
			PhoneGap.exec(
				function (result) { // success
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
			var url = 'gap?className=com.flow5.mapview&methodName=' + method;
			xhr.open(method, url, false);
			xhr.send();			
		}
		
		this.widgetWillBecomeActive = function () {
			this.shown = true;			
			doSync('showMap');		
		};
		
		this.widgetDidBecomeInactive = function () {
			this.shown = false;			
			doSync('hideMap');			
		};		
	}	
	
	F5.WidgetPrototypes.MapView = new MapView();	
}());