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

function generate(app) {

	var fs = require('fs');

	var jsdom = require('jsdom');
	jsdom.defaultDocumentFeatures = {
		FetchExternalResources: false,
		ProcessExternalResources: false,
		MutationEvents: false,
		QuerySelector: false
	};
	
	var document = jsdom.jsdom();
	
	// manifest
	document.documentElement.setAttribute('manifest', 'cache.manifest?app=' + app);
	
	function injectMeta(properties) {
		var meta = document.createElement('meta');
		for (var name in properties) {
			if (properties.hasOwnProperty(name)) {
				meta[name] = properties[name];
			}
		}		
		document.head.appendChild(meta);
	}
	
	// standard meta
	injectMeta({'http-equiv': 'Content-type', content: 'text/html; charset=utf-8'});
	injectMeta({name: 'viewport', content: 'width=device-width initial-scale=1.0 maximum-scale=1.0 user-scalable=0'});

	// ios webapp stuff
	injectMeta({name: 'apple-mobile-web-app-status-bar-style', content: 'black'});
	injectMeta({name: 'apple-mobile-web-app-capable', content: 'yes'});
	
	function injectLink(rel, href) {
		var link = document.createElement('link');
		link.rel = rel;
		link.href = href;
		document.head.appendChild(link);
	}
	
	injectLink('apple-touch-icon', 'apps/' + app + '/icon.png');
	injectLink('apple-touch-startup-image', 'apps/' + app + '/splash.png');
	
	var templates = document.createElement('div');
	templates.id = 'f5_templates';
	templates.setAttribute('style', 'display:none;');
	
	document.body.appendChild(templates);
	
	function inject(path) {		
		var manifest = require(path + 'manifest.js');
		
		manifest.scripts.forEach(function (file) {
			var script = document.createElement('script');
			script.src = path + file;
			
			document.head.appendChild(script);
		});

		manifest.elements.forEach(function (file) {
			var elements;
			if (file.match('.css')) {
				elements = document.createElement('style');
			} else {
				elements = document.createElement('div');
			}

			elements.innerHTML = fs.readFileSync(path + file).toString();
			elements.id = file;				
			
			templates.appendChild(elements);
		});		
	}
			

	inject('');
	
	var init = document.createElement('script');
	init.innerHTML = 'require("./f5.js")';
	document.head.appendChild(init);
	
	inject('apps/' + app + '/');
		
	var appframeEl = document.createElement('div');
	appframeEl.id = 'appframe';
	var screenframeEl = document.createElement('div');
	screenframeEl.id = 'screen';
	screenframeEl.className = 'portrait';
	appframeEl.appendChild(screenframeEl);
	document.body.appendChild(appframeEl);
	
	
	var start = document.createElement('script');
	start.src = 'start.js';
	document.body.appendChild(start);	
			
	return document.outerHTML;
}

exports.generate = generate;
