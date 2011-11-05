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

var fs = require('fs');
	
require('../require.js');
require('../jsext.js');

function deleteCaches() {
	// delete all of the cached entries so we reload the next time
	require.cache.forEach(function (id, obj) {
		if (id.match('manifest.js') || id.match('images.js')) {
			delete require.cache[id];
		}
	});	
}
	
function generateCacheManifest(app, debug) {
	
	var latestDate;
	function checkDate(path) {
		var modDate = new Date(fs.statSync(path).mtime);
		if (!latestDate || modDate > latestDate) {
			latestDate = modDate;
		}
	}

	var cacheManifest = 'CACHE MANIFEST\n';
	cacheManifest += 'CACHE:\n';
		
	checkDate('start.js');		
	checkDate('server/generator.js');
			
	function inject(path) {	
		checkDate(path + 'manifest.js');
			
		var manifest = require(path + 'manifest.js');
		
		manifest.scripts.forEach(function (file) {
			if (debug) {
				cacheManifest += path + file + '\n';				
			}
			checkDate(path + file);
		});

		manifest.elements.forEach(function (file) {
			checkDate(path + file);
		});	
		
		if (debug) {
			cacheManifest += path + 'images.js\n';
		}
		try {
			/*global F5: true*/
			// TODO: ugly?
			F5 = {Images: {}};				
			require(path + 'images.js');
			F5.Images.forEach(function (id, node) {
				node.forEach(function (id, src) {
					checkDate(src);
					if (debug) {
						cacheManifest += src + '\n';
					}
				});
			});				
		} catch (e) {
//			console.log(e.message);
		}				
	}
	
	inject('');
	inject('apps/' + app + '/');
	
	if (debug) {
		cacheManifest += 'start.js\n';		
	}
		
	cacheManifest += 'NETWORK:\n';
	cacheManifest += '*\n';
						
	cacheManifest += '#' + latestDate + '\n';
	
//	console.log(cacheManifest)
	
	deleteCaches();
	
	return cacheManifest;
}

function generateHtml(app, debug) {

	var jsdom = require('jsdom');
	jsdom.defaultDocumentFeatures = {
		FetchExternalResources: false,
		ProcessExternalResources: false,
		MutationEvents: false,
		QuerySelector: false
	};
	
	var document = jsdom.jsdom();
	
	// manifest
	document.documentElement.setAttribute('manifest', 'cache.manifest?app=' + app + '&debug=' + debug);
	
	function injectMeta(properties) {
		var meta = document.createElement('meta');
		for (var name in properties) {
			if (properties.hasOwnProperty(name)) {
				meta.setAttribute(name, properties[name]);
			}
		}		
		document.head.appendChild(meta);
	}
	
	// standard meta
	injectMeta({'http-equiv': 'Content-Type', content: 'text/html; charset=UTF-8'});
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
	
	function makeScript(src) {
		var script = document.createElement('script');		
		if (debug) {
			// reference scripts
			script.src = src;				
		} else {
			// inline scripts
			// devserv layer will compress and minify	
			script.id = src;			
			script.innerHTML = '//<!--\n' + fs.readFileSync(src).toString() + '\n//-->';
		}
		return script;
	}
	
	function inject(path) {		
		var manifest = require(path + 'manifest.js');
		
		manifest.scripts.forEach(function (file) {				
			document.head.appendChild(makeScript(path + file));
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
				
		if (debug) {
			document.head.appendChild(makeScript(path + 'images.js'));
		} else {
			/*global F5: true*/
			try {
				// TODO: ugly?
				F5 = {Images: {}};
				require(path + 'images.js');	
				F5.Images.forEach(function (id, node) {
					node.forEach(function (id, src) {
						var prefix = 'data:image/' + require('path').extname(src).substring(1) + ';base64,';
						node[id] = prefix + fs.readFileSync(src, 'base64');						
					});
				});	
				var script = document.createElement('script');	
				script.id = 'images.js';	
				script.innerHTML = '//<!--\nF5.Images.extend(' + JSON.stringify(F5.Images) + ');\n//-->';
				document.head.appendChild(script);
			} catch (e) {
				console.log(e.message);
			}			
		}		
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
	
	var splashEl = document.createElement('img');
	splashEl.src = 'apps/' + app + '/splash.png';
	splashEl.className = 'screen';
	splashEl.setAttribute('style', 'position: absolute; top: 0px; left: 0px;');
	screenframeEl.appendChild(splashEl);	
	
	appframeEl.appendChild(screenframeEl);
	document.body.appendChild(appframeEl);
		
	document.body.appendChild(makeScript('start.js'));	
	
	deleteCaches();	
	
	console.log('Size: ' + document.outerHTML.length);
			
	return document.outerHTML;
}

exports.generateHtml = generateHtml;
exports.generateCacheManifest = generateCacheManifest;
