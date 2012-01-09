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

(function () {
	
var fs = require('fs');


function forEach(obj, fn) {
	var name;
	for (name in obj) {
		if (obj.hasOwnProperty(name)) {
			fn(name, obj[name]);
		}
	}							
}

function deleteCaches() {
	// delete all of the cached entries so we reload the next time
	forEach(require.cache, function (id, obj) {
		if (id.match('manifest.js') || id.match('resources.js')) {
			delete require.cache[id];
		}
	});	
}

// the image references are at the leaf nodes
function handleImageResourcesRecursive(obj, handler) {
	forEach(obj, function (id, value) {
		if (typeof value === 'object') {
			handleImageResourcesRecursive(value, handler);
		} else if (value.indexOf('.png') !== -1 || value.indexOf('.jpg') !== -1){
			handler(obj, id, value);
		}
	});
}

function boolValue(string) {
	if (string !== 'true' && string !== 'false') {
		throw 'Bad bool value';
	}
	return string === 'true';
	
}

function processManifest(manifest, query, type, process) {

	function manifestEntry(manifest, path) {
		var pathComponents = path.split('.');
		var obj = manifest;
		while (obj && typeof obj === 'object' && pathComponents.length) {
			obj = obj[pathComponents.shift()];
		}
				
		return obj;
	}
	
	function processIfExists(list) {
		if (list) {
			process(list);
		}
	}
	
	function processSection(section) {
		processIfExists(manifestEntry(manifest, section + '.' + type), type);
		if (boolValue(query.debug)) {
			processIfExists(manifestEntry(manifest, section + '.debug.' + type), type);
		}	
		if (!boolValue(query.mobile)) {
			processIfExists(manifestEntry(manifest, section + '.desktop.' + type), type);
			if (boolValue(query.debug)) {
				processIfExists(manifestEntry(manifest, section + '.desktop.debug.' + type), type);
			}									
		}						

		if (boolValue(query.native)) {
			processIfExists(manifestEntry(manifest, section + '.app.' + type), type);
			if (boolValue(query.debug)) {
				processIfExists(manifestEntry(manifest, section + '.app.debug.' + type), type);
			}			
		} else {
			processIfExists(manifestEntry(manifest, section + '.browser.' + type), type);
			if (boolValue(query.debug)) {
				processIfExists(manifestEntry(manifest, section + '.browser.debug.' + type), type);
			}			
		}		
	}
	
	processSection('all');
	processSection(query.platform);
}
	
exports.generateCacheManifest = function(query) {
	
	function getModDate() {
		var latestDate;
		function checkDate(path) {
			var modDate = new Date(fs.statSync(path).mtime);
			if (!latestDate || modDate > latestDate) {
				latestDate = modDate;
			}
		}

		checkDate('www/start.js');		
		checkDate(__filename);

		function checkManifest(path) {	
			checkDate(path + 'manifest.js');

			function checkDates(files, type) {
				files.forEach(function (file) {
					checkDate(path + file);
					if (type === 'resources') {
						try {
							var resources = require(process.cwd() + '/' + path + file).resources;
							handleImageResourcesRecursive(resources, function (obj, id, src) {
								checkDate(src);
							});			
						} catch (e) {
							console.log(e.stack);
						}										
					}
				});				
			}

			var manifest = require(process.cwd() + '/' + path + 'manifest.js');

			processManifest(manifest, query, 'scripts', checkDates);									
			processManifest(manifest, query, 'elements', checkDates);									
			processManifest(manifest, query, 'resources', checkDates);											
		}

		checkManifest('www/');
		checkManifest('www/apps/' + query.app + '/');
		
		return latestDate;		
	}


	var cacheManifest = 'CACHE MANIFEST\n';
	cacheManifest += 'CACHE:\n';
			
	cacheManifest += 'NETWORK:\n';
	cacheManifest += '*\n';
						
	cacheManifest += '#' + getModDate() + '\n';
	
//	console.log(cacheManifest)
	
	deleteCaches();
	
	return cacheManifest;
};

exports.generateHtml = function(parsed) {
	
	var query = parsed.query;
		
	var jsdom = require('jsdom');
	jsdom.defaultDocumentFeatures = {
		FetchExternalResources: [],
		ProcessExternalResources: [],
		MutationEvents: false,
		QuerySelector: false
	};			
	var document = jsdom.jsdom();
	

	/* setup container */
	var templates = document.createElement('div');
	templates.id = 'f5_templates';
	templates.setAttribute('style', 'display:none;');
	
	var imagePreload = document.createElement('div');
	imagePreload.id = 'image-preload';
	templates.appendChild(imagePreload);
		
	document.body.appendChild(templates);	

	var styleWorkaround = '';
	var resources = {};
			
			
	/* helper functions */
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
	
	function injectLink(rel, href, type) {
		var link = document.createElement('link');
		link.rel = rel;
		link.href = href;
		if (type) {
			link.type = type;
		}
		document.head.appendChild(link);
	}
		
	function makeScript(src) {
		var script = document.createElement('script');		
		if (!boolValue(query.inline)) {
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
		
		function inlineImage(src) {
			try {
				var prefix = 'data:image/' + require('path').extname(src).substring(1) + ';base64,';
				return prefix + fs.readFileSync('www/apps/' + query.app + '/' + src, 'base64');			
			} catch (e) {
				console.log(e.stack);
			}
		}		
		
		// javascript
		function injectScripts(scripts) {
			scripts.forEach(function (file) {
				document.head.appendChild(makeScript(path + file));				
			});				
		}
				
		// html and css
		function injectElements(elements) {
			elements.forEach(function (file) {
				if (file.match('.css')) {
					if (boolValue(query.inline)) {
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
		
		// resource files
		function injectResources(resourceFiles) {
			resourceFiles.forEach(function (file) {
				try {
					resources = require(process.cwd() + '/www/' + path + file).resources;	
					if (boolValue(query.inline)) {
						handleImageResourcesRecursive(resources, function (obj, id, src) {						
							obj[id] = inlineImage(src);										
						});
					} else {
						handleImageResourcesRecursive(resources, function (obj, id, src) {
							var img = document.createElement('img');
							img.src = 'apps/' + query.app + '/' + src;
							imagePreload.appendChild(img);
						});
					}		
				} catch (e) {
					console.log(e.stack);
				}				
			});				
		}

		var manifest = require(process.cwd() + '/www/' + path + 'manifest.js');

		processManifest(manifest, query, 'scripts', injectScripts);									
		processManifest(manifest, query, 'elements', injectElements);											
		processManifest(manifest, query, 'resources', injectResources);											
	}	
	
	
	
	/***********************************/
	/************** BUILD **************/
	/***********************************/
	
	// manifest
	var manifestString = 'cache.manifest' + parsed.search;
	document.documentElement.setAttribute('manifest', manifestString);	
	
	// TODO: create a meta section in manifest for this stuff
	
	// standard meta
	injectMeta({'http-equiv': 'Content-Type', content: 'text/html; charset=UTF-8'});
	injectMeta({name: 'viewport', content: 'width=device-width initial-scale=1.0 maximum-scale=1.0 user-scalable=0'});

	// ios webapp stuff
	injectMeta({name: 'apple-mobile-web-app-status-bar-style', content: 'black'});
	injectMeta({name: 'apple-mobile-web-app-capable', content: 'yes'});
	injectLink('apple-touch-icon', 'apps/' + query.app + '/images/icon@114x114.png');
	injectLink('apple-touch-startup-image', 'apps/' + query.app + '/images/splash@320x460.png');

	// Android
	injectMeta({name: 'viewport', content: 'target-densitydpi=device-dpi'});
		
	// f5.js comes first
	document.head.appendChild(makeScript('f5.js'));
	
	// provide the query parameters
	var queryScript = document.createElement('script');
	queryScript.innerHTML = "F5.query = " + JSON.stringify(query);
	document.head.appendChild(queryScript);
				
	// process the manifests
	injectManifest('');
	injectManifest('apps/' + query.app + '/');	
	
	// inject the merged (and possibly inlined) resources
	var resourcesScript = document.createElement('script');
	resourcesScript.innerHTML = "F5.Resources = " + JSON.stringify(resources);
	document.head.appendChild(resourcesScript);
		
	var appframeEl = document.createElement('div');
	appframeEl.id = 'f5appframe';
	var screenframeEl = document.createElement('div');
	screenframeEl.id = 'f5screen';
		
	appframeEl.appendChild(screenframeEl);
	document.body.appendChild(appframeEl);
				
	document.body.appendChild(makeScript('start.js'));		
	
	// TODO: enable/disable on device? need to expose mdns lookup on Android
	if (false && boolValue(query.mobile) && boolValue(query.debug)) {
		var weinre = document.createElement('script');
//		weinre.src = 'http://' + require('os').hostname() + ':8081/target/target-script-min.js#anonymous';
		weinre.src = 'http://10.0.1.5:8081/target/target-script-min.js#anonymous';
		document.head.appendChild(weinre);			
	}
			
	deleteCaches();	
	
	return document.outerHTML.replace('<head>', '<head><style>' + styleWorkaround + '</style>');			
};

}());
