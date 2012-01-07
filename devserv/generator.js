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
/*global F5: true*/

var fs = require('fs');

F5 = require(process.cwd() + '/www/f5.js');

function deleteCaches() {
	// delete all of the cached entries so we reload the next time
	F5.forEach(require.cache, function (id, obj) {
		if (id.match('manifest.js') || id.match('resources.js')) {
			delete require.cache[id];
		}
	});	
}

// the image references are at the leaf nodes
function handleImageResourcesRecursive(obj, handler) {
	F5.forEach(obj, function (id, value) {
		if (typeof value === 'object') {
			handleImageResourcesRecursive(value, handler);
		} else if (value.indexOf('.png') !== -1 || value.indexOf('.jpg') !== -1){
			handler(obj, id, value);
		}
	});
}
	
function generateCacheManifest(app, isDebug, isMobile, isNative, platform) {
	
	var latestDate;
	function checkDate(path) {
		var modDate = new Date(fs.statSync(path).mtime);
		if (!latestDate || modDate > latestDate) {
			latestDate = modDate;
		}
	}

	var cacheManifest = 'CACHE MANIFEST\n';
	cacheManifest += 'CACHE:\n';
		
	checkDate('www/start.js');		
	checkDate(__filename);
			
	function checkManifest(path) {	
		checkDate(path + 'manifest.js');
		
		function checkDates(files) {
			if (files) {
				files.forEach(function (file) {
					checkDate(path + file);
				});				
			}
		}
			
		var manifest = require(process.cwd() + '/' + path + 'manifest.js');
		
		checkDates(manifest.scripts);
		
		if (isDebug) {
			checkDates(manifest.debugScripts);
			if (isMobile) {
				checkDates(manifest.debugMobileScripts);								
			} else {
				checkDates(manifest.debugDesktopScripts);				
			}
		}
		
		checkDates(manifest.elements);
		checkDates(manifest[platform+'Elements']);
		if (isNative) {
			checkDates(manifest[platform+'NativeElements']);			
		}
		
		if (isDebug) {
			checkDates(manifest.debugElements);
		}
		
		checkDates(manifest[platform+'Scripts']);
		if (isNative) {
			checkDates(manifest[platform+'NativeScripts']);			
		}
		
		try {
			require(process.cwd() + '/' + path + 'resources.js');

			handleImageResourcesRecursive(F5.Resources, function (obj, id, src) {
				checkDate(src);
			});			
		} catch (e) {
//			console.log(e.message);
		}				
	}
	
	checkManifest('www/');
	checkManifest('www/apps/' + app + '/');
	
	cacheManifest += 'NETWORK:\n';
	cacheManifest += '*\n';
						
	cacheManifest += '#' + latestDate + '\n';
	
//	console.log(cacheManifest)
	
	deleteCaches();
	
	return cacheManifest;
}

function generateHtml(app, isDebug, doInline, isMobile, isNative, platform) {
		
	var jsdom = require('jsdom');
	jsdom.defaultDocumentFeatures = {
		FetchExternalResources: [],
		ProcessExternalResources: [],
		MutationEvents: false,
		QuerySelector: false
	};
	
	var styleWorkaround = '';
	
	var document = jsdom.jsdom();
	
	// manifest
	var manifestString = 'cache.manifest?app=' + app + '&debug=' + isDebug + '&native=' + isNative;
	document.documentElement.setAttribute('manifest', manifestString);
	
	function injectMeta(properties) {
		var meta = document.createElement('meta');
		var name;
		for (name in properties) {
			if (properties.hasOwnProperty(name)) {
				meta.setAttribute(name, properties[name]);
			}
		}		
		document.head.appendChild(meta);
	}
	
	// TODO: create a meta section in manifest for this stuff
	
	// standard meta
	injectMeta({'http-equiv': 'Content-Type', content: 'text/html; charset=UTF-8'});
	injectMeta({name: 'viewport', content: 'width=device-width initial-scale=1.0 maximum-scale=1.0 user-scalable=0'});

	// ios webapp stuff
	injectMeta({name: 'apple-mobile-web-app-status-bar-style', content: 'black'});
	injectMeta({name: 'apple-mobile-web-app-capable', content: 'yes'});

	// Android
	injectMeta({name: 'viewport', content: 'target-densitydpi=device-dpi'});
	
	function injectLink(rel, href, type) {
		var link = document.createElement('link');
		link.rel = rel;
		link.href = href;
		if (type) {
			link.type = type;
		}
		document.head.appendChild(link);
	}
	
	function inlineImage(src) {
		var prefix = 'data:image/' + require('path').extname(src).substring(1) + ';base64,';
		return prefix + fs.readFileSync('www/apps/' + app + '/' + src, 'base64');
	}
	
	injectLink('apple-touch-icon', 'apps/' + app + '/images/icon@114x114.png');
	injectLink('apple-touch-startup-image', 'apps/' + app + '/images/splash@320x460.png');
	
	var templates = document.createElement('div');
	templates.id = 'f5_templates';
	templates.setAttribute('style', 'display:none;');
	
	document.body.appendChild(templates);
	
	function makeScript(src) {
		var script = document.createElement('script');		
		if (!doInline) {
			// reference scripts
			script.src = src;				
		} else {
			// inline scripts
			// devserv layer will compress and minify	
			script.id = src;			
			script.innerHTML = '//<!--\n' + fs.readFileSync('www/' + src).toString() + '\n//-->';
		}
		return script;
	}
	
	function injectManifest(path) {		
		var manifest = require(process.cwd() + '/www/' + path + 'manifest.js');
		
		// javascript
		function injectScripts(scripts) {
			if (scripts) {
				scripts.forEach(function (file) {
					document.head.appendChild(makeScript(path + file));				
				});				
			}
		}
		
		injectScripts(manifest.scripts);
		if (isDebug) {
			injectScripts(manifest.debugScripts);
			if (isMobile) {
				injectScripts(manifest.debugMobileScripts);				
			} else {
				injectScripts(manifest.debugDesktopScripts);				
			}
		}				
		injectScripts(manifest[platform+'Scripts']);
		if (isNative) {
			injectScripts(manifest[platform+'NativeScripts']);			
		}
		
		// html and css
		function injectElements(elements) {
			if (elements) {
				elements.forEach(function (file) {
					if (file.match('.css')) {
						if (doInline) {
							// NOTE: JSDOM doesn't fully support style nodes yet. so do it manually below
							// elementsDiv = document.createElement('style');
							styleWorkaround += fs.readFileSync('www/' + path + file).toString();							
						} else {
							injectLink('stylesheet', path + file, 'text/css');
						}
					} else {
						var elementsDiv = document.createElement('div');
						elementsDiv.innerHTML = fs.readFileSync('www/' + path + file).toString();
						elementsDiv.id = file;				

						templates.appendChild(elementsDiv);
					}
				});
			}					
		}		
		injectElements(manifest.elements);
		injectElements(manifest[platform+'Elements']);
		if (isNative) {
			injectElements(manifest[platform+'NativeElements']);			
		}
		if (isDebug) {
			injectElements(manifest.debugElements);
		}			
	}
			
	injectManifest('');
	injectManifest('apps/' + app + '/');
	
	// resources
	// TODO: allow F5 to also define strings/images	
	try {
		var resourceFile = 'apps/' + app + '/resources.js';
		require(process.cwd() + '/www/' + resourceFile);
		if (!doInline) {
			document.head.appendChild(makeScript(resourceFile));
			var imagePreload = document.createElement('div');
			imagePreload.id = 'image-preload';
			templates.appendChild(imagePreload);
			handleImageResourcesRecursive(F5.Resources, function (obj, id, src) {
				var img = document.createElement('img');
				img.src = 'apps/' + app + '/' + src;
				imagePreload.appendChild(img);
			});
		} else {
			/*global F5: true*/
			try {
				handleImageResourcesRecursive(F5.Resources, function (obj, id, src) {						
					obj[id] = inlineImage(src);										
				});
				var script = document.createElement('script');	
				script.id = 'resources.js';	
				script.innerHTML = '//<!--\nF5.Resources = ' + JSON.stringify(F5.Resources) + ';\n//-->';
				document.head.appendChild(script);
			} catch (e) {
				console.log(e.message);
			}			
		}		
	} catch (exception) {
		console.log(exception.message);
	}
		
	var appframeEl = document.createElement('div');
	appframeEl.id = 'f5appframe';
	var screenframeEl = document.createElement('div');
	screenframeEl.id = 'f5screen';
		
	appframeEl.appendChild(screenframeEl);
	document.body.appendChild(appframeEl);
				
	document.body.appendChild(makeScript('start.js'));		
	
	if (false && isMobile && isDebug) {
		var weinre = document.createElement('script');
//		weinre.src = 'http://' + require('os').hostname() + ':8081/target/target-script-min.js#anonymous';
		weinre.src = 'http://10.0.1.5:8081/target/target-script-min.js#anonymous';
		document.head.appendChild(weinre);			
	}
			
	deleteCaches();	
	
//	console.log('Size: ' + document.outerHTML.length);
	
//	return document.outerHTML;
	return document.outerHTML.replace('<head>', '<head><style>' + styleWorkaround + '</style>');			
}

exports.generateHtml = generateHtml;
exports.generateCacheManifest = generateCacheManifest;
