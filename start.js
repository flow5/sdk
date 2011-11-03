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

require('./f5.js');

// prevent scrolling
document.body.addEventListener('touchmove', function (e) {
	e.preventDefault();
});

// detect mobile devices
var isDevice = false;
if (navigator.userAgent.match(/iPhone/) || navigator.userAgent.match(/Android/)) {
	isDevice = true;
	document.body.className += ' device';
}
	
var screenEl = document.getElementById('screen');
	
document.addEventListener('orientationchange', function () {
	if (window.orientation) {
		screenEl.className = 'landscape';
	} else {
		screenEl.className = 'portrait';				
	}
});

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

window.addEventListener('load', function (e) {	
	
	function start() {
		try {
			F5.Global.flow = new F5.Flow(require('flowspec.js').root);

			// TODO: make this optional. currently asserts rely on the diags
			require('./flow_diags.js').instrument(F5.Global.flow);

			F5.Global.flowController = new F5.FlowController(F5.Global.flow);

			F5.Global.viewController = new F5.ViewController(F5.Global.flow, screenEl);

			if (!isDevice) {
                   // TODO: factor out the state upload part so that the viewer can be
                   // used for an application running on device
				F5.Webharness.attach(screenEl);
			} else {
				// TODO: make the viewer HTML a template and load from webharness.js
				document.getElementById('viewerframe').style.display = 'none';
				document.getElementById('viewerbutton').style.display = 'none';
			}

			F5.Global.flowController.start(function () {
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
	
	window.applicationCache.addEventListener('noupdate', function (e) {
		console.log('noupdate');
		start();
	}, false);

	window.applicationCache.addEventListener('cached', function (e) {
		console.log('cached');
		start();
	}, false);
	
}, false);					
