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
	cssmin = require('css-compressor').cssmin,
	FFI = require("node-ffi"),
	libc = new FFI.Library(null, {"system": ["int32", ["string"]]}),
	minify = require('./minify.js').minify;	

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

function parseJSON(path) {
	// strip out commments		
	var json = minify(fs.readFileSync('www/' + path).toString());
	return JSON.parse(json);
}

// the image references are at the leaf nodes
function handleDataResourcesRecursive(obj, handler) {
	forEach(obj, function (id, value) {
		if (typeof value === 'object') {
			if (value.constructor !== Array) {
				handleDataResourcesRecursive(value, handler);				
			}
		} else if (value.match(/(\.png)|(\.jpg)|(\.ttf)|(\.svg)|(\.html)|(\.css)/)) {
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

// TODO: slightly sloppy. processManifest is only interested in the query parameters related 
// to manifest blocks. it doesn't look at app, manfest or pkg
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
			process(list, type);
		}
	}
	
	function processSection(section) {
		processIfExists(manifestEntry(manifest, section + '.' + type));
		
		if (!boolValue(query.mobile)) {
			processIfExists(manifestEntry(manifest, section + '.desktop.' + type));
		}						
		
		if (boolValue(query.native)) {
			processIfExists(manifestEntry(manifest, section + '.app.' + type));
		} else {
			processIfExists(manifestEntry(manifest, section + '.browser.' + type));
		}	
		
		if (boolValue(query.debug)) {
			processIfExists(manifestEntry(manifest, section + '.debug.' + type));
			if (!boolValue(query.mobile)) {
				processIfExists(manifestEntry(manifest, section + '.desktop.debug.' + type));
			}
			if (boolValue(query.native)) {
				processIfExists(manifestEntry(manifest, section + '.app.debug.' + type));				
			} else {
				processIfExists(manifestEntry(manifest, section + '.browser.debug.' + type));				
			}
		}				
	}
	
	processSection('all');
	processSection(query.platform);	
	// TODO: can get more specific here e.g. locale
}
	
exports.generateCacheManifest = function(query) { 
		
	function getModDate() {
		var latestDate;
		function checkDate(path) {
			try {
				var modDate = new Date(fs.statSync(path).mtime);
				if (!latestDate || modDate > latestDate) {
					latestDate = modDate;
				}				
			} catch (e) {
				console.log('error: ' + e.stack);
			}
		}

		checkDate('www/f5/start.js');		
		checkDate(__filename);		

		function checkManifest(path, manifestName) {	
			manifestName = (manifestName || 'manifest') + '.json';			
			checkDate('www/' + path + manifestName);

			function checkDates(files, type) {
				files.forEach(function (file) {
					var resolvedPath;
					if (file[0] === '/') {
						resolvedPath = 'f5/' + file.substring(1);
					} else {
						resolvedPath = path + file;
					}
					checkDate('www/' + resolvedPath);
					if (type === 'resources') {
						try {
							var resources = parseJSON(resolvedPath);
							handleDataResourcesRecursive(resources, function (obj, id, src) {
								checkDate('www/' + path + src);
							});			
						} catch (e) {
							console.log('error:' + e.stack);
						}										
					}
				});				
			}
			
			function checkPackages(packages) {
				packages.forEach(function (pkg) {
					// TODO: domain?
					var domain = pkg.split('.')[0];
					var manifest = pkg.split('.')[1];
					if (domain === 'f5') {
						checkManifest('f5/', manifest);
					} else {
						checkManifest('apps/'+ domain + '/', manifest);
					}
				});
			}			

			var manifest = parseJSON(path + manifestName);

			processManifest(manifest, query, 'packages', checkPackages);											
			processManifest(manifest, query, 'flows', checkDates);											
			processManifest(manifest, query, 'scripts', checkDates);									
			processManifest(manifest, query, 'elements', checkDates);									
			processManifest(manifest, query, 'resources', checkDates);											
		}

		checkManifest('apps/' + query.app + '/', query.manifest);
		
		return latestDate;		
	}


	var cacheManifest = 'CACHE MANIFEST\n';
	cacheManifest += 'CACHE:\n';
			
	cacheManifest += 'NETWORK:\n';
	cacheManifest += '*\n';
						
	cacheManifest += '#' + getModDate() + '\n';
	
//	console.log(cacheManifest)
	
	return cacheManifest;
};


// Minimalist DOM construction
function Element(tag) {
	
	this.innerHTML = '';
	this.children = [];
	this.attributes = [];
	
	this.selfClosing = function () {
		var tags = {meta: true, link: true, img: true};
		return tags[tag];
	};
	
	this.openTag = function () {
		var result = '<' + tag;
		if (this.id) {
			result += ' id="' + this.id + '"';
		}
		this.attributes.forEach(function (attribute) {
			result += ' ' + attribute.name + '="' + attribute.value + '"';
		});
		
		result += this.selfClosing() ? '/>\n' : '>\n';
		
		return result;
	};
	
	this.closeTag = function () {
		return this.selfClosing() ? '' : '</' + tag + '>\n';
	};
	
	this.setAttribute = function (name, value) {
		this.attributes.push({name: name, value: value});
	};

	this.outerHTML = function () {
		var that = this;
		this.children.forEach(function (child) {
			that.innerHTML += child.outerHTML();
		});

		return this.openTag() + this.innerHTML + this.closeTag();
	};
	
	this.appendChild = function (element) {
		this.children.push(element);
	};

	this.prependChild = function (element) {
		this.children.unshift(element);
	};
}




exports.generateHtml = function(parsed) {
	
	var query = parsed.query;

	var document = new Element('html');
	document.head = new Element('head');
	document.appendChild(document.head);
	document.body = new Element('body');
	document.appendChild(document.body);	
	
	// templates container TODO: these will be added per package
	var templatesEl = new Element('div');
	templatesEl.id = 'f5templates';
	templatesEl.setAttribute('style', 'display:none;');			
	document.body.appendChild(templatesEl);	
	
	var scriptsEl = new Element('div');
	scriptsEl.id = 'f5scripts';
	document.body.appendChild(scriptsEl);


	// places to stow parsed data
	// TODO: these will be incorporated per package
	var resources = {};
	var flowspec = {};	
	
	
	// REVISIT
	var facebookId;		
			
			
	/* helper functions */
	function injectMeta(properties) {
		var meta = new Element('meta');
		var name;
		for (name in properties) {
			if (properties.hasOwnProperty(name)) {
				meta.setAttribute(name, properties[name]);
			}
		}		
		document.head.appendChild(meta);
	}
	
	function injectLink(rel, href, type) {
		var link = new Element('link');
		link.setAttribute('rel', rel);
		link.setAttribute('href', href);
		if (type) {
			link.setAttribute('type', type);
		}
		document.head.appendChild(link);
	}
		
	function makeScript(src) {
		var script = new Element('script');		
		if (!boolValue(query.inline)) {
			// reference scripts
			script.setAttribute('src', src);
		} else {
			// inline scripts
			// devserv layer will compress and minify	
			script.id = src;			
			script.innerHTML = '//<!--\n' + fs.readFileSync('www/' + src).toString() + '\n//-->';
		}
		return script;
	}		
	
	function getFacebookId() {
		try {
			var path = 'www/apps/' + query.app + '/facebook_appid.txt';
			facebookId = fs.readFileSync(path).toString();
		} catch (e) {
//			console.log('Could not find facebook_appid.txt');
		}		
	}	
		
	function injectManifest(base, manifestName) {		
		manifestName = (manifestName || 'manifest') + '.json';
		
		function inlineData(path) {			
			try {
				var ext = require('path').extname(path).substring(1);

				var data;
				if (ext === 'ttf') {
					data = 'data:font/truetype;base64,' + fs.readFileSync('www/' + path, 'base64');
				} else if (ext === 'svg') {
					data = 'data:image/svg+xml;utf8,' + fs.readFileSync('www/' + path).toString().replace(/(\r\n|\n|\r)/gm, '');	
				} else if (ext === 'html' || ext === 'css') {
					data = 'base64,' + fs.readFileSync('www/' + path, 'base64');
				} else {
					if (boolValue(query.crush)) {
						var tmpPath = '/tmp/' + process.pid + Date.now() + '.png';
						var cmd = 'optipng -o2 -out ' + tmpPath + ' ' + path;
//						var cmd = 'convert -quality 05 ' + path + ' ' + tmpPath;
//						console.log('cmd:' + cmd)
						libc.system(cmd);					
						path = tmpPath;
					}
					data = 'data:image/' + ext + ';base64,' + fs.readFileSync('www/' + path, 'base64');				
				}
			
				return data;
			} catch (e) {
				console.log('error:' + e.stack);
			}
		}		
		
		// javascript
		function injectScripts(scripts) {
			scripts.forEach(function (file) {
				scriptsEl.appendChild(makeScript(base + file));				
			});				
		}
				
		// html and css
		function injectElements(elements) {
			elements.forEach(function (file) {
				if (file.match('.css')) {
					if (boolValue(query.inline)) {
						var resolvedPath = base + file;
						var style = fs.readFileSync('www/' + resolvedPath).toString();
						
						if (boolValue(query.compress)) {
							style = cssmin(style);
						}
						
						var statements = style.split(/(;)|(\})/);
						var regExp = new RegExp(/url\(\'([^\']*)\'\)/);

						var i;
						for (i = 0; i < statements.length; i += 1) {
							var matches = regExp.exec(statements[i]);
							if (matches && matches.length > 1) {
								var url = matches[1];
								
								// resolve the url relative to the css base
								var cssBase = require('path').dirname(resolvedPath);
								
								var imageData = inlineData(cssBase + '/' + url);
								statements[i] = statements[i].replace(url, imageData);
							}
						}								
						var styleDiv = new Element('style');
						styleDiv.innerHTML = statements.join('');
						document.head.appendChild(styleDiv);												
					} else {
						injectLink('stylesheet', base + file, 'text/css');
					}
				} else {
					var elementsDiv = new Element('div');
					try {
						elementsDiv.innerHTML = fs.readFileSync('www/' + base + file).toString();						
					} catch (e) {
						console.log(e.stack);
					}
					elementsDiv.id = file;				

					templatesEl.appendChild(elementsDiv);
				}
			});
		}	
		
		
		
		// resource files
		function injectResources(resourceFiles) {
			resourceFiles.forEach(function (file) {
				try {
					var r = parseJSON(base + file);	
					if (boolValue(query.inline)) {
						handleDataResourcesRecursive(r, function (obj, id, src) {						
							obj[id] = inlineData(base + src);										
						});
					}

					function extend(obj1, obj2) {
						forEach(obj2, function (id, value) {
							if (!obj1[id]) {
								obj1[id] = value;
							} else if (typeof value === 'object') {
								extend(obj1[id], value);
							} else {
								console.log('Resource shadowed: ' + id);
								obj1[id] = value;								
							}
						});
					}
					extend(resources, r);		
					
				} catch (e) {
					console.log('error:' + e.stack);
				}				
			});				
		}
		
		function injectFlows(flowFiles) {
			flowFiles.forEach(function (file) {
				try {
					flowspec = parseJSON(base + file);						
				} catch (e) {
					console.log('error:' + e.stack);
				}
			});
		}
		
		function injectPackages(packages) {
			packages.forEach(function (pkg) {
				// TODO: domain?
				var domain = pkg.split('.')[0];
				var manifest = pkg.split('.')[1];
				if (domain === 'f5') {
					injectManifest('f5/', manifest);
				} else {
					injectManifest('apps/'+ domain + '/', manifest);
				}
			});
		}

		var manifest = parseJSON(base + manifestName);

		processManifest(manifest, query, 'packages', injectPackages);
		processManifest(manifest, query, 'flows', injectFlows);											
		processManifest(manifest, query, 'scripts', injectScripts);									
		processManifest(manifest, query, 'elements', injectElements);	
		processManifest(manifest, query, 'resources', injectResources);											
	}			
	
	/***********************************/
	/************** BUILD **************/
	/***********************************/
	
	// manifest
	var manifestString = 'cache.manifest' + parsed.search;
	document.setAttribute('manifest', manifestString);	
	
		
	// TODO: create a meta section in manifest for this stuff		
	// TODO: if manifest.type === 'app' add this stuff. otherwise not
	
	// ios webapp stuff
//	injectMeta({name: 'apple-mobile-web-app-status-bar-style', content: 'black'});
//	injectMeta({name: 'apple-mobile-web-app-capable', content: 'yes'});
//	injectLink('apple-touch-icon', 'apps/' + query.app + '/images/icon.png', null);
//	injectLink('apple-touch-startup-image', 'apps/' + query.app + '/images/splash.png', null);
	
	// ios
	injectMeta({'http-equiv': 'Content-Type', content: 'text/html; charset=UTF-8'});
	injectMeta({name: 'viewport', content: 'width=device-width initial-scale=1.0 maximum-scale=1.0 user-scalable=0'});

	// android
	injectMeta({name: 'viewport', content: 'target-densitydpi=device-dpi'});
		
		
		
		
	// f5.js comes first
	// TODO: this is only for the root application
	scriptsEl.appendChild(makeScript('f5/f5.js'));
					
	
		
	// inject the app manifest (and recursively insert packages)
	injectManifest('apps/' + query.app + '/', query.manifest);	
									
	// fetch a facebook id if there is one
	// TODO: might not want this to be a firstclass feature. . .
	getFacebookId();
	
	
	
	// TODO: move resources, flowspec etc. into the manifest parsing and accumulate as the doc is parsed
	// inject the merged (and possibly inlined) resources, flowspec and query
	var resourcesScript = new Element('script');
	var F5 = {Resources: resources, flowspec: flowspec, query: query};
	if (facebookId) {
		F5.facebook_appid = facebookId;
	}
	resourcesScript.innerHTML = "F5 = " + JSON.stringify(F5);
	document.head.prependChild(resourcesScript);
	
					
					
					
	// finally			
	scriptsEl.appendChild(makeScript('f5/start.js'));				
																
												
	var html = document.outerHTML();
	
	// TODO: this is quite inefficient since it's happening after image inlining
	// should do this transform when loading elements and scripts
	// Need a better general transformation approach. Or I start typing a lot of extra CSS
	// the mapping would allow the server to blow up if a non-compatible property is used
	if (query.agent === 'MSIE') {
		html = html.replace(/-webkit/g, '-ms').replace(/-ms-box-sizing/g, 'box-sizing');		
	} else if (query.agent === 'FF') {
		html = html.replace(/-webkit/g, '-moz');		
	}
	
	return html;
};

}());
