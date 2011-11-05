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

var fs = require('fs'),
	parser = require("uglify-js").parser,
	uglify = require("uglify-js").uglify;
	
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
			cacheManifest += path + file + '\n';
			checkDate(path + file);
		});

		if (manifest.images) {
			manifest.images.forEach(function (file) {
				cacheManifest += path + file + '\n';
				checkDate(path + file);
			});			
		}

		manifest.elements.forEach(function (file) {
			checkDate(path + file);
		});	
		
		delete require.cache[require('path').resolve(path + 'manifest.js')];
	}
	
	if (debug) {
		inject('');
		inject('apps/' + app + '/');
		cacheManifest += 'start.js\n';		
	}
		
	cacheManifest += 'NETWORK:\n';
	cacheManifest += '*\n';
						
	cacheManifest += '#' + latestDate + '\n';
	
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
	document.documentElement.setAttribute('manifest', 'cache.manifest?app=' + app);
	
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
			// inline and minify scripts	
			script.id = src;			
			var ast = parser.parse(fs.readFileSync(src).toString());
			ast = uglify.ast_mangle(ast);
			ast = uglify.ast_squeeze(ast);
			script.innerHTML = '//<!--\n' + uglify.gen_code(ast) + '\n//-->';				
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
			
	return document.outerHTML;
}

exports.generateHtml = generateHtml;
exports.generateCacheManifest = generateCacheManifest;
