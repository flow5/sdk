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
	
var fs = require('fs'),
	cssmin = require('node-css-compressor').cssmin,
	FFI = require("node-ffi"),
	libc = new FFI.Library(null, {"system": ["int32", ["string"]]});	

function forEach(obj, fn) {
	if (obj.constructor === Array) {
		obj.forEach(fn);
	} else {
		var name;
		for (name in obj) {
			if (obj.hasOwnProperty(name)) {
				fn(name, obj[name]);
			}
		}							
	}
}

function extend(obj1, obj2) {
	forEach(obj2, function (id, value) {
		obj1[id] = value;
	});
}


var caches = [];
function deleteCaches() {
	forEach(require.cache, function (id, cache) {
		if (caches.indexOf(cache.exports) !== -1) {
			delete require.cache[id];			
		}
	});	
	caches = [];
}

function requireWrapper(path) {
	var exports = require(path);
	caches.push(exports);
	return exports;
}

// the image references are at the leaf nodes
function handleDataResourcesRecursive(obj, handler) {
	forEach(obj, function (id, value) {
		if (typeof value === 'object') {
			handleDataResourcesRecursive(value, handler);
		} else if (value.match(/(\.png)|(\.jpg)|(\.ttf)/)) {
			handler(obj, id, value);
		}
	});
}

function boolValue(string) {
	if (string && string !== 'true' && string !== 'false') {
		throw new Error('Bad bool value');
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
		
		if (!boolValue(query.mobile)) {
			processIfExists(manifestEntry(manifest, section + '.desktop.' + type), type);
		}						
		
		if (boolValue(query.native)) {
			processIfExists(manifestEntry(manifest, section + '.app.' + type), type);
		} else {
			processIfExists(manifestEntry(manifest, section + '.browser.' + type), type);
		}	
		
		if (boolValue(query.debug)) {
			processIfExists(manifestEntry(manifest, section + '.debug.' + type), type);
			if (!boolValue(query.mobile)) {
				processIfExists(manifestEntry(manifest, section + '.desktop.debug.' + type), type);
			}
			if (boolValue(query.native)) {
				processIfExists(manifestEntry(manifest, section + '.app.debug.' + type), type);				
			} else {
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

		function checkManifest(path, manifestName) {	
			manifestName = (manifestName || 'manifest') + '.json';			
			checkDate(path + manifestName);

			function checkDates(files, type) {
				files.forEach(function (file) {
					checkDate(path + file);
					if (type === 'resources') {
						try {
							var resources = requireWrapper(process.cwd() + '/' + path + file).resources;
							handleDataResourcesRecursive(resources, function (obj, id, src) {
								checkDate(src);
							});			
						} catch (e) {
							console.log('error:' + e.message);
						}										
					}
				});				
			}

			var manifest = requireWrapper(process.cwd() + '/' + path + manifestName);

			processManifest(manifest, query, 'flowspecs', checkDates);											
			processManifest(manifest, query, 'scripts', checkDates);									
			processManifest(manifest, query, 'elements', checkDates);									
			processManifest(manifest, query, 'resources', checkDates);											
		}

		checkManifest('www/');
		checkManifest('www/apps/' + query.app + '/', query.manifest);
		
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
	

	// templates container
	var templates = document.createElement('div');
	templates.id = 'f5_templates';
	templates.setAttribute('style', 'display:none;');			
	document.body.appendChild(templates);	

	// places to stow parsed data
	var styleBlock = '';
	var resources = {};
	var flowspec = {};			
			
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
	
	function injectManifest(path, manifestName) {		
		manifestName = (manifestName || 'manifest') + '.json';
		
		function inlineData(src) {			
			try {
				var ext = requireWrapper('path').extname(src).substring(1);
				var path = 'www/apps/' + query.app + '/' + src;

				var prefix;
				if (ext === 'ttf') {
					prefix = 'data:font/truetype;base64,';
				} else {
					if (boolValue(query.crush)) {
						var tmpPath = '/tmp/' + process.pid + Date.now() + '.png';
						var cmd = 'optipng -o2 -out ' + tmpPath + ' ' + path;
//						var cmd = 'convert -quality 05 ' + path + ' ' + tmpPath;
//						console.log('cmd:' + cmd)
						libc.system(cmd);					
						path = tmpPath;
					}
					prefix = 'data:image/' + ext + ';base64,';					
				}
			
				return prefix + fs.readFileSync(path, 'base64');
			} catch (e) {
				console.log('error:' + e.message);
			}
		}		
		
		// javascript
		function injectScripts(scripts) {
			scripts.forEach(function (file) {
				document.body.appendChild(makeScript(path + file));				
			});				
		}
				
		// html and css
		function injectElements(elements) {
			elements.forEach(function (file) {
				if (file.match('.css')) {
					if (boolValue(query.inline)) {
						var style = fs.readFileSync('www/' + path + file).toString();
						
						if (boolValue(query.compress)) {
							style = cssmin(style);
						}
						
						var statements = style.split(';');
						var regExp = new RegExp(/url\(\'([^\']*)\'\)/);

						var i;
						for (i = 0; i < statements.length; i += 1) {
							var matches = regExp.exec(statements[i]);
							if (matches && matches.length > 1) {
								var url = matches[1];
								var imageData = inlineData(url);
								statements[i] = statements[i].replace(url, imageData);
							}
						}														
						styleBlock += statements.join(';');							
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
					var r = requireWrapper(process.cwd() + '/www/' + path + file);	
					if (boolValue(query.inline)) {
						handleDataResourcesRecursive(r, function (obj, id, src) {						
							obj[id] = inlineData(src);										
						});
					}
					extend(resources, r);		
				} catch (e) {
					console.log('error:' + e.message);
				}				
			});				
		}
		
		function injectFlows(flowFiles) {
			flowFiles.forEach(function (file) {
				try {
					flowspec = requireWrapper(process.cwd() + '/www/' + path + file);						
				} catch (e) {
					console.log('error:' + e.message);
				}
			});
		}

		var manifest = requireWrapper(process.cwd() + '/www/' + path + manifestName);

		processManifest(manifest, query, 'flowspecs', injectFlows);											
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
	injectLink('apple-touch-icon', 'apps/' + query.app + '/images/icon.png');
	injectLink('apple-touch-startup-image', 'apps/' + query.app + '/images/splash.png');

	// Android
	injectMeta({name: 'viewport', content: 'target-densitydpi=device-dpi'});
		
	// f5.js comes first
	document.head.appendChild(makeScript('f5.js'));
					
	// process the manifests
	injectManifest('');
	injectManifest('apps/' + query.app + '/', query.manifest);	
	
	// inject the merged (and possibly inlined) resources, flowspec and query
	var resourcesScript = document.createElement('script');
	resourcesScript.innerHTML = "F5 = " + JSON.stringify({Resources: resources, flowspec: flowspec, query: query});
	document.head.insertBefore(resourcesScript, document.head.firstChild);
		
	// create the essential divs
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
		weinre.src = 'http://' + require('os').hostname() + ':8081/target/target-script-min.js#anonymous';
//		weinre.src = 'http://10.0.1.5:8081/target/target-script-min.js#anonymous';
		document.head.appendChild(weinre);			
	}
			
	deleteCaches();	
	
	return document.outerHTML.replace('<head>', '<head><style>' + styleBlock + '</style>');			
};

}());
