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

F5.registerModule(function (F5) {

	function MapView() {

		this.initialize = function () {

			var that = this;

			// allows native push animations in sync with web transitions
			this.flowObserver = {
				doTransition: function (container, from, id, to, animation) {
					if (id === 'back') {
						var qualifiedAnimation = container.selection.animation;
						if (qualifiedAnimation.split('.').length == 1) {
							qualifiedAnimation = F5.getNodePackage(container) + '.' + animation;
						}
						animation = F5.getInverseAnimation(qualifiedAnimation);
					}
					if (!animation)  {
						animation = 'pushLeft'; // default
					}
					if (that.shown && animation.match('push')) {
						// queue the transition. will be processed before js level transitions are executed
						PhoneGap.exec(
						function (result) { // success
							console.log(result);
						},
						function (result) { // failure
							console.log(result);
						}, "com.flow5.mapview", 'queue_' + animation, []);
					}

					return function (cb) {
						cb();
					};
				}
			};

			F5.Global.flowController.addFlowObserver(this.flowObserver);
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

		this.removePins = function (pins) {
			var that = this;
			PhoneGap.exec(
				function (result) { // success
				console.log(result);
			}, function (result) { // failure
				console.log(result);
			}, "com.flow5.mapview", "removePins", []);
		};

		this.dropPins = function (pins) {
			var that = this;

			PhoneGap.exec(
				function (result) { // success
				console.log(result);
			}, function (result) { // failure
				console.log(result);
			}, "com.flow5.mapview", "dropPins", [JSON.stringify(pins)]);
		};

		this.setCalloutActions = function (calloutActions) {
			this.calloutActions = calloutActions;
		};

		this.widgetWillBecomeActive = function () {
			var that = this;

			var waitCb;

			function showMap() {
				that.shown = true;
				F5.callBridgeSynchronous('com.flow5.mapview', 'showMap');
			}

			if (!this.created) {
				var pos = F5.elementAbsolutePosition(this.el);
				var bounds = {top: pos.y, left: pos.x, width: this.el.offsetWidth, height: this.el.offsetHeight};

				PhoneGap.exec(
					function (result) { // success
						console.log(result);
						that.created = true;
						showMap();
						if (waitCb) {
							waitCb();
						}
				}, function (result) { // failure
						console.log(result);
				}, "com.flow5.mapview", "create", [bounds]);

				PhoneGap.exec(
					function (result) { // success
	//					console.log('regionChanged');
						if (that.boundsChangeAction) {
							that.boundsChangeAction();
						}
				}, function (result) { // failure
					console.log(result);
				}, "com.flow5.mapview", "setRegionChangedCallback", []);

				PhoneGap.exec(
					function (result) { // success
						if (that.calloutActions) {
							that.calloutActions[result.button](result.index);
						}
				}, function (result) { // failure
					console.log(result);
				}, "com.flow5.mapview", "setCalloutCallback", []);

				F5.Global.flowController.addWaitTask(function (cb) {
					if (!that.created) {
						waitCb = cb;
					} else {
						cb();
					}
				});
			} else {
				showMap();
			}
		};

		function setMaskRegion(region) {
			PhoneGap.exec(
				function (result) { // success
			}, function (result) { // failure
				console.log(result);
			}, "com.flow5.mapview", "setMaskRegion", [region]);
		}

		function clearMaskRegion() {
			PhoneGap.exec(
				function (result) { // success
			}, function (result) { // failure
				console.log(result);
			}, "com.flow5.mapview", "clearMaskRegion", []);
		}

		this.widgetWillBecomeInactive = function () {
//			F5.callBridgeSynchronous('com.flow5.mapview', 'getSnapshot');
//			console.log('snapshot: ' + snapshot.substring(0, 255));
			clearMaskRegion();
		};

		this.widgetDidBecomeInactive = function () {
			this.shown = false;
			F5.callBridgeSynchronous('com.flow5.mapview', 'hideMap');
		};

		this.widgetDidBecomeActive = function () {
			if (this.maskRegion) {
				setMaskRegion(this.maskRegion);
			}
		};

		this.getMapGeometry = function () {
			return F5.callBridgeSynchronous('com.flow5.mapview', 'getMapGeometry');
		};

		this.release = function () {
			delete this.calloutActions;
			delete this.boundsChangeAction;
			PhoneGap.exec(
				function (result) { // success
			}, function (result) { // failure
				console.log(result);
			}, "com.flow5.mapview", "releaseCallbacks", []);

			F5.Global.flowController.removeFlowObserver(this);
		};

		this.animateToRegion = function (region, cb) {
			PhoneGap.exec(
				function (result) { // success
					console.log('animateToRegion');
				console.log(result);
				cb();
			}, function (result) { // failure
				console.log(result);
				cb();
			}, "com.flow5.mapview", "animateToRegion", [region]);
		};

		this.setBoundsChangedAction = function (cb) {
			this.boundsChangeAction = cb;
		};

		this.setMaskRegion = function (region) {
			this.maskRegion = region;
			setMaskRegion(region);
		};

		this.clearMaskRegion = function () {
			delete this.maskRegion;
			clearMaskRegion();
		};
	}

	F5.Prototypes.Widgets.MapView = new MapView();
});
