(function () {
	function eventLocation(event) {
		var x, y;
		if (navigator.userAgent.match(/(iPhone)|(Android)/i)) {
			if (event.touches[0]) {
				x = event.touches[0].screenX;
				y = event.touches[0].screenY;					
			} else {
				x = event.changedTouches[0].screenX;
				y = event.changedTouches[0].screenY;			
			}	
		}		
		else {
			x = event.clientX;
			y = event.clientY; 
		}	

		return {x: x, y: y};
	}

	function startEventName() {
		if (navigator.userAgent.match(/(iPhone)|(Android)/i)) {
			return 'touchstart';		
		}
		else {
			return 'mousedown';				
		}
	}

	function stopEventName() {
		if (navigator.userAgent.match(/(iPhone)|(Android)/i)) {
			return 'touchend';		
		}
		else {
			return 'mouseup';				
		}
	}

	function moveEventName() {
		if (navigator.userAgent.match(/(iPhone)|(Android)/i)) {
			return 'touchmove';		
		}
		else {
			return 'mousemove';		
		}
	}

	/*global Tracker: true WebKitCSSMatrix*/
	
	Tracker = function (el) {
		var tracking;
		var startLocation;
		var startTransform;

		el.addEventListener(startEventName(), function (e) {
			tracking = true;
			startLocation = eventLocation(e);
			var transformMatrix = new WebKitCSSMatrix(el.style.webkitTransform);
			startTransform = {x: transformMatrix.m41, y: transformMatrix.m42};
			el.style['-webkit-transition'] = 'opacity 1s';						
		});

/*
		document.body.addEventListener('mousewheel', function (e) {
			var transformMatrix = new WebKitCSSMatrix(el.style.webkitTransform);
			startTransform = {x: transformMatrix.m41, y: transformMatrix.m42};																				

			el.style['-webkit-transform'] = 'translate3d(' + (-e.wheelDeltaX/10 + startTransform.x) +
					'px,' + (-e.wheelDeltaY/10 + startTransform.y) + 'px, 0px)';
					
			console.log(JSON.stringify({x: e.wheelDeltaX, y: e.wheelDeltaY}));
		});
*/

		document.body.addEventListener(moveEventName(), function (e) {
			var currentLocation = eventLocation(e);
			if (tracking) {
				var deltaH = currentLocation.x - startLocation.x;
				var deltaY = currentLocation.y - startLocation.y;
				el.style['-webkit-transform'] = 'translate3d(' + (deltaH + startTransform.x) +
						'px,' + (deltaY + startTransform.y) + 'px, 0px)';								
			}			
		});

		document.body.addEventListener(stopEventName(), function (e) {
			tracking = false;
			el.style['-webkit-transition'] = '';
		});
	};
	
}());