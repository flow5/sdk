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

function urlParameters(query) {
	var result = [];
	forEach(query, function (id, value) {
		result.push(id + '=' + value);
	});
	return result.join('&');
}


// TODO: this is duplicated in devserv. why?
function pkgDomain(pkg) {
	return pkg && pkg.split('.')[0];
}

function pkgName(pkg) {
	if (pkg && pkg.split('.')[1]) {
		return pkg.split('.')[1] + '.manifest';
	} else {
		return 'manifest';
	}
}

function parseJSON(path) {	
	try {
		// strip out commments		
		var json = minify(fs.readFileSync('www/' + path).toString());
		return JSON.parse(json);
	} catch (e) {
		console.log('error parsing: ' + path + ' : ' + e.stack);
		throw e;
	}										
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

exports.generateScript = function (query) {
	
	var script = '';
			
	function injectManifest(pkg) {		
		
		var pkgDomain = pkg.split('.')[0];
		var pkgName = pkg.split('.')[1];

		var base;
		if (pkgDomain === 'f5') {
			base = 'f5/';
		} else {
			base = 'apps/' + pkgDomain + '/';
		}

		var manifestName;
		if (pkgName) {
			manifestName = pkgName + '.manifest.json';
		} else {
			manifestName = 'manifest.json';
		}
		var manifest = parseJSON(base + manifestName);
				
		// recurse
		function injectPackages(packages) {
			packages.forEach(function (pkg) {
				injectManifest(pkg);
			});
		}
		processManifest(manifest, query, 'packages', injectPackages);
		
							
		script += 'F5.pushPkg("' + pkg + '");\n';

		function injectScripts(scripts) {
			scripts.forEach(function (file) {
				script += '// ' + 'www/' + base + file + '\n';
				script += fs.readFileSync('www/' + base + file).toString() + '\n';
			});				
		}
		processManifest(manifest, query, 'scripts', injectScripts);	
		
		
		var flows = {};
		function injectFlows(flowFiles) {
			flowFiles.forEach(function (file) {
				extend(flows, parseJSON(base + file));
			});			
		}		
		processManifest(manifest, query, 'flows', injectFlows);	
		script += 'F5.addFlows("' + pkg + '", ' + JSON.stringify(flows) + ');\n';										

		script += 'F5.popPkg();\n';
	}
			
	if (!query.lib) {
		script += '// www/f5/lib/f5.js\n';				
		script += fs.readFileSync('www/f5/lib/f5.js').toString() + '\n';	
		script += 'F5.query = ' + JSON.stringify(query) + '\n';				
	}		
				
	injectManifest(query.pkg);

	if (!query.lib) {
		script += '// www/f5/lib/register.js\n';				
		script += fs.readFileSync('www/f5/lib/register.js').toString() + '\n';	
		script += '// www/f5/lib/headlessstart.js\n';				
		script += fs.readFileSync('www/f5/lib/headlessstart.js').toString() + '\n';			
	}
	
	return script;
};

	
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

		checkDate('www/f5/lib/f5.js');		
		checkDate('www/f5/lib/register.js');		
		checkDate('www/f5/lib/domstart.js');		
		checkDate(__filename);		
		checkDate(__dirname + '/devserv.js');		

		function checkManifest(path, manifestName) {	
			manifestName += '.json';			
			checkDate('www/' + path + manifestName);
			
//			console.log('www/' + path + manifestName)

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
						var resources = parseJSON(resolvedPath);
						handleDataResourcesRecursive(resources, function (obj, id, src) {
							checkDate('www/' + path + src);
						});			
					}
				});				
			}
			
			function checkPackages(packages) {
				packages.forEach(function (pkg) {
					// TODO: domain?
					var domain = pkg.split('.')[0];
					var manifest = pkg.split('.')[1];
					if (manifest) {
						manifest += '.manifest';
					} else {
						manifest = 'manifest';
					}
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
			processManifest(manifest, query, 'domscripts', checkDates);									
			processManifest(manifest, query, 'elements', checkDates);									
			processManifest(manifest, query, 'resources', checkDates);											
		}

		checkManifest('apps/' + pkgDomain(query.pkg) + '/', pkgName(query.pkg));
		
		console.log(query.pkg + ' last modified ' + latestDate);
		
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

exports.generateFrame = function (query) {
	var document = new Element('html');
	
	document.head = new Element('head');
	document.appendChild(document.head);

	document.body = new Element('body');
	document.body.setAttribute('style', 
								'width:100%;' +
								'height:100%;' +
								'display:-webkit-box;' +
								'-webkit-box-align:center;' + 
								'-webkit-box-pack:center;' + 
								'background-color:darkslategrey;');	
	document.appendChild(document.body);	
			
	var width, height;
	switch (query.geometry) {
	case 'iphone-portrait':
		width = 320;
		height = 460;
		break;
	case 'iphone-landscape':
		width = 480;
		height = 300;
		break;
	case 'ipad-portrait':
		height = 1004;
		width = 768;
		break;
	case 'ipad-landscape':
		height = 748;
		width = 1024;
		break;
	default:			
		var size = query.geometry.split('x');
		width = size[0];
		height = size[1];
		break;
	}			
	delete query.geometry;
	
	var frame = new Element('iframe');
	frame.id = 'frame';
	frame.setAttribute('width', width);
	frame.setAttribute('height', height);
	frame.setAttribute('src', '/generate?' + urlParameters(query));
	frame.setAttribute('frameborder', '0');
	document.body.appendChild(frame);
	
	var script = new Element('script');
	script.innerHTML = 'var frame = document.getElementById("frame");' + 
					   'frame.onload = function () {F5 = frame.contentWindow.F5;};';
	document.body.appendChild(script);
	
	return document.outerHTML();
};

exports.generateHtml = function (query) {
	
	console.log(query.pkg + ' generating');
	
	var document = new Element('html');
	document.head = new Element('head');
	document.appendChild(document.head);
	document.body = new Element('body');
	document.appendChild(document.body);	
				

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
	
	function injectLink(rel, href, type, pkg) {
		var link = new Element('link');
		link.setAttribute('rel', rel);
		link.setAttribute('href', href);
		if (type) {
			link.setAttribute('type', type);
		}
		if (pkg) {
			link.setAttribute('f5pkg', pkg);			
			link.setAttribute('f5applyscope', true);			
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
			script.innerHTML = '//<!--\n//@ sourceURL=www/' + src + '\n'
					 + fs.readFileSync('www/' + src).toString() + '\n//-->';
		}
		return script;
	}		
	
	function facebookId() {
		try {
			var path = 'www/apps/' + pkgDomain(query.pkg) + '/facebook_appid.txt';
			return fs.readFileSync(path).toString();
		} catch (e) {
//			console.log('Could not find facebook_appid.txt');
		}		
	}	
		
	function injectManifest(pkg) {		
		
		var pkgDomain = pkg.split('.')[0];
		var pkgName = pkg.split('.')[1];

		var base;
		if (pkgDomain === 'f5') {
			base = 'f5/';
		} else {
			base = 'apps/' + pkgDomain + '/';
		}

		var manifestName;
		if (pkgName) {
			manifestName = pkgName + '.manifest.json';
		} else {
			manifestName = 'manifest.json';
		}
		var manifest = parseJSON(base + manifestName);
				
		// recurse
		function injectPackages(packages) {
			packages.forEach(function (pkg) {
				injectManifest(pkg);
			});
		}
		processManifest(manifest, query, 'packages', injectPackages);
		
		var pkgEl = new Element('div');
		pkgEl.setAttribute('f5pkg', pkg);
		document.body.appendChild(pkgEl);
		
		
		var scriptsEl = new Element('div');
		scriptsEl.setAttribute('f5id', pkg + '.scripts');
		pkgEl.appendChild(scriptsEl);
		
		var templatesEl = new Element('div');
		templatesEl.setAttribute('f5applyscope', true);
		templatesEl.setAttribute('f5pkg', pkg);
		templatesEl.setAttribute('style', 'display:none;');			
		pkgEl.appendChild(templatesEl);	

		var flowsEl = new Element('script');
		flowsEl.setAttribute('f5id', pkg + '.flows');
		pkgEl.appendChild(flowsEl);
		
		var resourcesEl = new Element('script');
		resourcesEl.setAttribute('f5id', pkg + '.resources');
		pkgEl.appendChild(resourcesEl);				
				
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
						styleDiv.setAttribute('f5id', resolvedPath);
						styleDiv.setAttribute('f5pkg', pkg);
						styleDiv.setAttribute('f5applyscope', true);
						styleDiv.innerHTML = statements.join('');
						document.head.appendChild(styleDiv);												
					} else {
						injectLink('stylesheet', base + file, 'text/css', pkg);
					}
				} else {
					var elementsDiv = new Element('div');
					try {
						elementsDiv.innerHTML = fs.readFileSync('www/' + base + file).toString();						
					} catch (e) {
						console.log(e.stack);
					}
					elementsDiv.setAttribute('f5id', file);				

					templatesEl.appendChild(elementsDiv);
				}
			});
		}	
						
		// resource files
		var resources = {};
		function injectResources(resourceFiles) {
			resourceFiles.forEach(function (file) {
				var r = parseJSON(base + file);	
				if (boolValue(query.inline)) {
					handleDataResourcesRecursive(r, function (obj, id, src) {						
						obj[id] = inlineData(base + src);										
					});
				}
				extend(resources, r);		
			});	
			
		}
		
		var flows = {};
		function injectFlows(flowFiles) {
			flowFiles.forEach(function (file) {
				extend(flows, parseJSON(base + file));
			});			
		}
		
		processManifest(manifest, query, 'flows', injectFlows);	
		flowsEl.innerHTML = 'F5.addFlows("' + pkg + '", ' + JSON.stringify(flows) + ');';									
											
		processManifest(manifest, query, 'resources', injectResources);	
		resourcesEl.innerHTML = 'F5.addResources("' + pkg + '", ' + JSON.stringify(resources) + ');';										

		processManifest(manifest, query, 'elements', injectElements);	
												
		var pushPkg = new Element('script');
		pushPkg.innerHTML = 'F5.pushPkg("' + pkg + '", ' + (manifest.meta ? JSON.stringify(manifest.meta) : '{}') + ');';
		scriptsEl.appendChild(pushPkg);
		
		processManifest(manifest, query, 'scripts', injectScripts);									
		processManifest(manifest, query, 'domscripts', injectScripts);									
		
		var popPkg = new Element('script');
		popPkg.innerHTML = 'F5.popPkg();';
		scriptsEl.appendChild(popPkg);
	}			
	
	/***********************************/
	/************** BUILD **************/
	/***********************************/
					
	if (!query.lib) {
		// manifest	
		var manifestString = 'cache.manifest?' + urlParameters(query);
		document.setAttribute('manifest', manifestString);	

		// TODO: create a meta section in manifest for this stuff		
		// TODO: if manifest.type === 'app' add this stuff. otherwise not

		// ios webapp stuff
	//	injectMeta({name: 'apple-mobile-web-app-status-bar-style', content: 'black'});
	//	injectMeta({name: 'apple-mobile-web-app-capable', content: 'yes'});
	//	injectLink('apple-touch-icon', 'apps/' + pkgDomain(query.pkg) + '/images/icon.png', null);
	//	injectLink('apple-touch-startup-image', 'apps/' + pkgDomain(query.pkg) + '/images/splash.png', null);

		// ios
		injectMeta({'http-equiv': 'Content-Type', content: 'text/html; charset=UTF-8'});
		injectMeta({name: 'viewport', content: 'width=device-width initial-scale=1.0 maximum-scale=1.0 user-scalable=0'});

		// android
		injectMeta({name: 'viewport', content: 'target-densitydpi=device-dpi'});


		// setup
		document.body.appendChild(makeScript('f5/lib/f5.js'));						


		var queryScript = new Element('script');
		queryScript.setAttribute('f5id', 'F5.query');
		queryScript.innerHTML = "F5.query = " + JSON.stringify(query);
		document.body.appendChild(queryScript);

		// TODO: don't make facebook id a first class feature
		var facebook_appid = facebookId();
		if (facebook_appid) {
			var facebookScript = new Element('script');
			facebookScript.innerHTML = "F5.facebook_appid = " + facebook_appid;
			document.body.appendChild(facebookScript);		
		}									
	}
		
	// inject the app manifest (and recursively insert packages)
	injectManifest(query.pkg);																							
																				
					
	// finally		
	if (!query.lib) {
		document.body.appendChild(makeScript('f5/lib/register.js'));				
		document.body.appendChild(makeScript('f5/lib/domstart.js'));						
	}	
																												
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
