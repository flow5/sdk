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
	
	// detect mobile browser
	if (navigator.userAgent.match(/iPhone/) || navigator.userAgent.match(/Android/)) {
		document.body.className += ' mobile';
	}
	
	var urlParameters = {};
	window.location.search.substring(1).split('&').forEach(function (parameter) {
		urlParameters[parameter.split('=')[0]] = parameter.split('=')[1];
	});	
	// PhoneGap does not make it easy to pass URL parameters to the start page
	// so check for the file protocl or the url parameter
	var isNative = window.location.protocol === 'file:' || urlParameters['native'] === 'true';	
	
	// TODO: specify a mock image server location
	if (window.location.protocol === 'file:') {
		F5.imageServerHost = 'http://www.flow5.com/';
	} else {
		F5.imageServerHost = '';
	}
	
	// prevent scrolling
	document.body.addEventListener('touchmove', function (e) {
		e.preventDefault();
	});

	function hideAddressBar() {
		setTimeout(function () {
			window.scrollTo(0, 1);
		}, 0);
	}

	window.addEventListener('load', hideAddressBar, false);
	window.addEventListener('touchstart', hideAddressBar, false);
	
	var screenEl = document.getElementById('screen');
	
	document.addEventListener('orientationchange', function () {
		if (window.orientation) {
			screenEl.className = 'landscape';
		} else {
			screenEl.className = 'portrait';				
		}
	});

	// TODO: use the device block of manifest to avoid the PhoneGap reference
	var startEvent, listener;
	if (isNative) {
		startEvent = 'deviceready';
		listener = document;
	} else {
		startEvent = 'load';
		listener = window;
	}
	
	listener.addEventListener(startEvent, function (e) {	
		function start() {
			try {
				F5.Global.flow = new F5.Flow(F5.flowspec);
				
				F5.Global.flowController = new F5.FlowController(F5.Global.flow);
				
				F5.Global.viewController = new F5.ViewController(F5.Global.flow, screenEl);

				F5.Global.flowController.start(function () {
					var e = document.createEvent('Events'); 
		            e.initEvent('f5ready');
		            document.dispatchEvent(e);		            
					//console.log('application started');																
				});
			} catch (exception) {
				document.body.className = 'errorframe';
				document.body.innerHTML = exception.message;
			}
		}
	
		function updateReady() {
			console.log('updateready');
			window.location.reload();
		}
		
		window.applicationCache.addEventListener('updateready', function (e) {
			updateReady();
		}, false);
		if (window.applicationCache.status === window.applicationCache.UPDATEREADY) {
			updateReady();
		}

		if (window.applicationCache.status === window.applicationCache.IDLE || 
			window.applicationCache.status === window.applicationCache.UNCACHED) {
			start();			
		} else {
			window.applicationCache.addEventListener('noupdate', function (e) {
				console.log('noupdate');
				start();
			}, false);

			window.applicationCache.addEventListener('cached', function (e) {
				console.log('cached');
				start();
			}, false);

			window.applicationCache.addEventListener('error', function (e) {
				console.log('error');
				start();
			}, false);			
		}				
	}, false);					
}());


/*
	// Fired after the first cache of the manifest.
	appCache.addEventListener('cached', handleCacheEvent, false);

	// Checking for an update. Always the first event fired in the sequence.
	appCache.addEventListener('checking', handleCacheEvent, false);

	// An update was found. The browser is fetching resources.
	appCache.addEventListener('downloading', handleCacheEvent, false);

	// The manifest returns 404 or 410, the download failed,
	// or the manifest changed while the download was in progress.
	appCache.addEventListener('error', handleCacheError, false);

	// Fired after the first download of the manifest.
	appCache.addEventListener('noupdate', handleCacheEvent, false);

	// Fired if the manifest file returns a 404 or 410.
	// This results in the application cache being deleted.
	appCache.addEventListener('obsolete', handleCacheEvent, false);

	// Fired for each resource listed in the manifest as it is being fetched.
	appCache.addEventListener('progress', handleCacheEvent, false);

	// Fired when the manifest resources have been newly redownloaded.
	appCache.addEventListener('updateready', handleCacheEvent, false);

*/