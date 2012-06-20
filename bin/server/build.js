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
	url = require('url'),
	npm = require('npm'),
	async = require('async'),
	cssmin = require('css-compressor').cssmin,
	minify = require('minifyjs').minify;

require('./JSONparseClean.js');	

var resourcesURLRegExp = new RegExp(/url\((.*)\)/);
function isURL(str) {
	return resourcesURLRegExp.exec(str);
}
function getURL(str) {
	return resourcesURLRegExp.exec(str)[1];	
}

var getSizes = [];
function dumpSizes() {
	var sorted = getSizes.sort(function (a,b) {
		return b.size - a.size;
	});
	
	var total = 0;
	sorted.forEach(function (record) {
		total += record.size;
	});
	
	var tally = 0;
	var markers = {};
	sorted.forEach(function (record) {
		var percent = (tally * 100 / total).toFixed(2);
		var id = Math.round(tally * 20 / total);
		if (!markers[id]) {
			console.error( '* ' +  percent  + '% (' + tally + ')\n' );
			markers[id] = true;
		}
		
		console.error(record.size + ' ' + record.path);
		tally += record.size;
	});
	console.error( '* 100% (' + tally + ')' );
}


var cssURLRegExp = new RegExp(/url\([\'\""]?([^\']*)[\'\""]?\)/);

var imgSrcRegExp = new RegExp(/<img.*src=[\'\"]+(.*)[\'\"]+/);


function bool(string) {
	return string === 'true';	
}

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
	if (obj1.constructor !== obj2.constructor) {
		console.error('mismatched types in extend');
		process.exit(0);
	}
	
	if (obj1.constructor === Array) {
		obj2.forEach(function (item) {
			obj1.push(item);
		});
	} else {
		forEach(obj2, function (id, value) {
			if (!obj1[id]) {
				obj1[id] = value;
			} else if (typeof value === 'object') {
				extend(obj1[id], value);
			} else {
				console.error('Resource shadowed: ' + id);
				obj1[id] = value;								
			}
		});		
	}	
}

function urlParameters(query) {
	var result = [];
	forEach(query, function (id, value) {
		result.push(id + '=' + value);
	});
	return result.join('&');
}

// TODO: move to a utils package
function packageDomain(pkg) {
	return pkg && pkg.split('.')[0];
}

function packageManifestName(pkg) {
	if (pkg && pkg.split('.')[1]) {
		return pkg.split('.')[1] + '.manifest.json';
	} else {
		return 'manifest.json';
	}
}

function packageBase(pkg) {
	var key = 'flow5:link_' + packageDomain(pkg);
	var value = npm.config.get(key);
	if (!value) {
		return null;
	} else {
		return value + '/www/';		
	}
}


function parseJSON(path, failure, success) {	
	fs.readFile(path, 'utf8', function (readErr, json) {
		if (readErr) {
			console.error(path);
			failure(readErr);
		} else {
			var parsedJSON;
			try {
				parsedJSON = JSON.parseClean(json);				
			} catch (parseErr) {
				console.error(path);
				failure(parseErr);
			}
			try {
				success(parsedJSON);
			} catch (cbErr) {
				// SUCCESS FAILED!
				console.error(cbErr);
			}
		}
	});	
}

// the image references are at the leaf nodes
function handleURLsRecursive(obj, handler) {
	forEach(obj, function (id, value) {
		if (typeof value === 'object') {
			if (value.constructor !== Array) {
				handleURLsRecursive(value, handler);				
			}
		} else if (isURL(value)) {
			handler(obj, id, value);
		}
	});
}

function get(pkg, path, encoding, failure, success) {
	var url = require('url').parse(path);
	
	if (url.protocol) {		
		var options = {
			hostname: url.hostname,
			path: packageDomain(pkg) + '/' + url.path,
			port: url.port
		};
		var protocol = url.protocol.replace(':', '');
		var req = require(protocol).request(options, 
			function(res) {
				// base64 encoding of response doesn't work
				// https://github.com/joyent/node/issues/3026
//				res.setEncoding(encoding);
								
				// instead have to concatenate buffers and then encode on completion				
				var buffers = [];
				var size = 0;
				res.on('data', function(chunk){
					buffers.push(chunk);
					size += chunk.length;
				});

				res.on('end', function(){
					var offset = 0;
					var concat = new Buffer(size);
					buffers.forEach(function (buffer) {
						buffer.copy(concat, offset);
						offset += buffer.length;
					});
					success(concat.toString(encoding));
				});	
			});
		req.on('error', function(err) {
			failure(err);
		});		
		req.end();
	} else {
		fs.readFile(url.path, encoding, function (err, contents) {
			if (err) {
				failure(err);
			} else {
				getSizes.push({path: url.path, size: contents.length});
				success(contents);
			}
		});
	}
}

function resolveURL(base, path) {
	var url = require('url').parse(path);
	if (url.protocol) {		
		return path;
	} else {
		return base + path;
	}
}


function inlineData(pkg, path, failure, success) {		
	var ext = require('path').extname(path).substring(1);

	if (ext === 'ttf') {
		get(pkg, path, 'base64', failure, function (data) {
			// causes chrome warnings
//			success('data:font/truetype;base64,' + data);
			success('data:font/opentype;base64,' + data);
		});
	} else if (ext === 'eot') {
		get(pkg, path, 'base64', failure, function (data) {
			success('data:font/embedded-opentype;base64,' + data);
		});
	} else if (ext === 'woff') {
		get(pkg, path, 'base64', failure, function (data) {
			success('data:font/woff;base64,' + data);
		});
	} else if (ext === 'otf') {
		get(pkg, path, 'base64', failure, function (data) {
			success('data:font/opentype;base64,' + data);
		});
	}
	else if (ext === 'svg') {
		get(pkg, path, 'utf8', failure, function (data) {
			success('data:image/svg+xml;utf8,' + data.replace(/(\r\n|\n|\r)/gm, ''));
		});
	} else if (ext === 'html' || ext === 'css') {
		get(pkg, path, 'base64', failure, function (data) {
			success('base64,' + data);
		});
	} else {
		get(pkg, path, 'base64', failure, function (data) {
			success('data:image/' + ext + ';base64,' + data);
		});
	}
}

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



/*
	processManifest uses the query to determine which sections of the manifest should be procssed for a given type
	
	TODO: rather than using nesting, just have each manifest section declare a set of conditions that are matched
	against the url parameters

*/
function processManifest(manifest, query, type, process, cb) {
	
	function processPath(path, cb) {
		function manifestEntry(path) {
			var pathComponents = path.split('.');
			var obj = manifest;
			while (obj && typeof obj === 'object' && pathComponents.length) {
				obj = obj[pathComponents.shift()];
			}

			return obj;
		}		
		var entry = manifestEntry(path);
		if (entry) {
			process(entry, type, cb);
		} else {
			cb();
		}
	}
	
	function processSection(section, cb) {
		
		var tasks = [];
		function addTask(path) {
			tasks.push(function (cb) {
				processPath(path, cb);
			});
		}
		
		addTask(section + '.' + type);
		
		if (!bool(query.mobile)) {
			addTask(section + '.desktop.' + type);
		}						
		
		if (bool(query.native)) {
			addTask(section + '.app.' + type);
		} else {
			addTask(section + '.browser.' + type);
		}	
		
		if (bool(query.debug)) {
			addTask(section + '.debug.' + type);
			if (!bool(query.mobile)) {
				addTask(section + '.desktop.debug.' + type);
			}
			if (bool(query.native)) {
				addTask(section + '.app.debug.' + type);
			} else {
				addTask(section + '.browser.debug.' + type);
			}
		}
		
		async.series(tasks, cb);				
	}
	
	var tasks = [];
	function addTask(section) {
		tasks.push(function (cb) {
			processSection(section, cb);
		});
	}
	
	addTask('all');
	addTask(query.platform);	
	
	async.series(tasks, cb);
	// TODO: can get more specific here e.g. locale
}

exports.buildScript = function (query, cb) {
	
	debugger;
	
	var pkg;
	if (!query.pkg) {
		pkg = query.domain;
	} else {
		pkg = query.domain + '.' + query.pkg;
	}
	
	
	var script = '';
			
	function injectManifest(pkg, cb) {		
		var manifestName = packageManifestName(pkg);
		var pkgBase = packageBase(pkg);

		parseJSON(pkgBase + manifestName, cb, function (manifest) {
			var tasks = [];

			tasks.push(function (cb) {
				// recurse
				function injectPackages(packages, type, cb) {
					var tasks = [];
					packages.forEach(function (pkg) {
						tasks.push(function (cb) {
							injectManifest(pkg, cb);						
						});
					});
					async.series(tasks, cb);
				}
				processManifest(manifest, query, 'packages', injectPackages, cb);				
			});

			tasks.push(function (cb) {
				script += 'F5.pushPkg("' + pkg + '");\n';

				function injectScripts(scripts, type, cb) {
					var tasks = [];
					scripts.forEach(function (file) {
						tasks.push(function (cb) {
							script += '// ' + pkgBase + file + '\n';
							get(pkg, resolveURL(pkgBase, file), 'utf8', cb, function (content) {
								script += content + '\n';
								cb();								
							});
						});
					});	
					async.series(tasks, cb);
				}
				processManifest(manifest, query, 'scripts', injectScripts, cb);					
			});

			tasks.push(function (cb) {
				var flows = {};
				function injectFlows(flowFiles, type, cb) {
					var tasks = [];					
					flowFiles.forEach(function (file) {
						tasks.push(function (cb) {
							parseJSON(pkgBase + file, cb, function (json) {
								extend(flows, json);
								cb();										
							});
						});
					});			
					async.series(tasks, cb);
				}		
				processManifest(manifest, query, 'flows', injectFlows, function (err) {
					if (err) {
						cb(err);
					} else {
						script += 'F5.addFlows("' + pkg + '", ' + JSON.stringify(flows) + ');\n';										
						script += 'F5.popPkg();\n';
						cb();						
					}
				});					
			});

			async.series(tasks, cb);				
		});
	}
	
	
	var f5Base = packageBase('f5');

	var tasks = [];
	
	if (!query.lib) {
		tasks.push(function (cb) {
			var path = f5Base + 'lib/f5.js';
			script += '// ' + path + '\n';		
			get(pkg, path, 'utf8', cb, function (content) {
				script += content + '\n';	
				script += 'F5.query = ' + JSON.stringify(query) + '\n';				
				script += 'F5.appPkg = ' + JSON.stringify(pkg) + '\n';				
				cb();													
			});
		});
	}		
	
	tasks.push(function (cb) {
		injectManifest(pkg, cb);		
	});
			
	if (!query.lib) {
		tasks.push(function (cb) {
			var path = f5Base + 'lib/register.js';
			script += '// ' + path + '\n';		
			get(pkg, path, 'utf8', cb, function (content) {
				script += content + '\n';	
				cb();						
			});	
		});		
		tasks.push(function (cb) {
			var path = f5Base + 'lib/headlessstart.js';
			script += '// ' + path + '\n';		
			get(pkg, path, 'utf8', cb, function (content) {
				script += content + '\n';			
				cb();						
			});
		});		
	}

	async.series(tasks, function (err) {
		cb(err, script);
	});
};

exports.buildHtml = function (query, cb) {
	
//	debugger;	
	
	getSizes = [];
	
	var pkg;
	if (!query.pkg) {
		pkg = query.domain;
	} else {
		pkg = query.domain + '.' + query.pkg;
	}

//	console.error(pkg + ' building html');
	
	var document = new Element('html');
	document.head = new Element('head');
	document.appendChild(document.head);
	document.body = new Element('body');
	document.appendChild(document.body);	
				

	function appendMeta(properties) {
		var meta = new Element('meta');
		var name;
		for (name in properties) {
			if (properties.hasOwnProperty(name)) {
				meta.setAttribute(name, properties[name]);
			}
		}		
		document.head.appendChild(meta);
	}
	
	function appendLink(rel, href, type, pkg) {
		var link = new Element('link');
		link.setAttribute('rel', rel);
		if (pkg) {
			link.setAttribute('href', '/' + packageDomain(pkg) + '/' + href);			
		} else {
			link.setAttribute('href', href);			
		}
		if (type) {
			link.setAttribute('type', type);
		}
		if (pkg) {
			link.setAttribute('f5pkg', pkg);			
			link.setAttribute('f5applyscope', true);			
		}
		document.head.appendChild(link);
	}
		
	function makeScript(pkg, file, cb) {
		var script = new Element('script');		
		if (!bool(query.inline)) {
			// reference scripts
			script.setAttribute('src', '/' + packageDomain(pkg) + '/' + file);
			cb(null, script);
		} else {
			var src = packageBase(pkg) + file;
			// inline scripts
			// devserv layer will compress and minify	
			script.id = src;			
			get(pkg, src, 'utf8', cb, function (code) {
				if (bool(query.compress)) {
					minify(code, {engine: 'uglify'}, function (err, code) {
						script.innerHTML = code;
						cb(err, script);
					});
				} else {
					script.innerHTML = code + '\n//@ sourceURL=' + src + '\n';
					cb(null, script);											
				}
			});
		}
	}		
	
	function facebookId() {
		try {
			var path = packageBase(pkg) + 'facebook_appid.txt';
			return fs.readFileSync(path).toString();
		} catch (e) {
//			console.error('Could not find facebook_appid.txt');
		}		
	}	
	
	function injectPackage(pkg, manifest, base, cb) {
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

		var schemasEl = new Element('script');
		resourcesEl.setAttribute('f5id', pkg + '.schemas');
		pkgEl.appendChild(schemasEl);				
	
		// javascript
		function injectScripts(scripts, type, cb) {
			var tasks = [];			
			scripts.forEach(function (file) {
				tasks.push(function (cb) {
					makeScript(pkg, file, function (err, script) {
						if (err) {
							cb(err);
						} else {
							scriptsEl.appendChild(script);
							cb();
						}
					});
				});
			});			
			async.series(tasks, cb);	
		}

		// html and css
		function injectElements(elements, type, cb) {
			var tasks = [];
			elements.forEach(function (file) {
				tasks.push(function (cb) {
					if (file.match('.css')) {
						if (bool(query.inline)) {
							var resolvedPath = resolveURL(base, file);
							get(pkg, resolvedPath, 'utf8', cb, function (style) {
								if (bool(query.compress)) {
									style = cssmin(style);
								}

								var statements = style.split(/(;|\}|,)/);

								var tasks = [];
								var i;
								
								function makeTask(cssBase, url, index) {
									return function (cb) {
										inlineData(pkg, resolveURL(cssBase, url), cb, function (data) {
											statements[index] = statements[index].replace(url, data);
											cb();														
										});
									};
								}
								
								for (i = 0; i < statements.length; i += 1) {
									var matches = cssURLRegExp.exec(statements[i]);
									if (matches && matches.length > 1) {
										var url = matches[1];

										// resolve the url relative to the css base
										var cssBase = require('path').dirname(resolvedPath) + '/';

										tasks.push(makeTask(cssBase, url, i));
									}
								}		
								
								async.parallel(tasks, function (err) {
									if (err) {
										cb(err);
									} else {
										var styleDiv = new Element('style');
										styleDiv.setAttribute('f5id', resolvedPath);
										styleDiv.setAttribute('f5pkg', pkg);
										styleDiv.setAttribute('f5applyscope', true);
										styleDiv.innerHTML = statements.join('');
										document.head.appendChild(styleDiv);
										cb();																				
									}						
								});																								
							});												
						} else {
							appendLink('stylesheet', file, 'text/css', pkg);
							cb();
						}
					} else {
						var elementsDiv = new Element('div');
						get(pkg, resolveURL(base, file), 'utf8', cb, function (data) {
							
							var fragments = data.split(/(>)/);
							async.map(fragments, function (fragment, cb) {
								if (bool(query.inline)) {
									var matches = imgSrcRegExp.exec(fragment);// inline styles? || cssURLRegExp.exec(fragment);
									if (matches && matches.length > 1) {
										inlineData(pkg, resolveURL(base, matches[1]), cb, function (data) {
											cb(null, fragment.replace(matches[1], data));																					
										});										
									} else {
										cb(null, fragment);										
									}
								} else {
									cb(null, fragment.replace(/(<img.*[\'\"]+)(.*)([\'\"]+)/, '$1/' + 
																		packageDomain(pkg) + '$2$3'));									
								}
							}, function (err, results) {
								elementsDiv.innerHTML = results.join('');						
								elementsDiv.setAttribute('f5id', file);				
								templatesEl.appendChild(elementsDiv);				
								cb();				
							});
						});
					}					
				});
			});
			async.series(tasks, cb);
		}

		// resource files
		var resources = {};
		function injectResources(resourceFiles, type, cb) {
			var tasks = [];
			resourceFiles.forEach(function (file) {
				tasks.push(function (cb) {
					parseJSON(base + file, cb, function (r) {
						var tasks = [];
						if (bool(query.inline)) {
							handleURLsRecursive(r, function (obj, id, value) {	
								tasks.push(function (cb) {
									inlineData(pkg, resolveURL(base, getURL(value)), cb, function (data) {
										obj[id] = data;
										cb();
									});																				
								});
							});
						} else {
							handleURLsRecursive(r, function (obj, id, value) {
								obj[id] = getURL(value);										
							});								
						}
						async.parallel(tasks, function (err) {
							if (err) {
								cb(err);
							} else {
								extend(resources, r);		
								cb();																								
							}
						});
					});						
				});				
			});	
			async.series(tasks, cb);
		}

		var flows = {};
		function injectFlows(flowFiles, type, cb) {
			var tasks = [];			
			flowFiles.forEach(function (file) {
				tasks.push(function (cb) {
					parseJSON(base + file, cb, function (flow) {
						extend(flows, flow);											
						cb();							
					});
				});
			});	
			async.series(tasks, cb);
		}
		
		var schemas = [];
		function injectSchemas(schemaFiles, type, cb) {
			var tasks = [];			
			schemaFiles.forEach(function (file) {
				tasks.push(function (cb) {
					parseJSON(base + file, cb, function (schema) {
						extend(schemas, schema);											
						cb();							
					});
				});
			});	
			async.series(tasks, cb);
		}		



		var tasks = [];
		
		tasks.push(function (cb) {
			processManifest(manifest, query, 'flows', injectFlows, function (err) {
				if (err) {
					cb(err);
				} else {
					flowsEl.innerHTML = 'F5.addFlows("' + pkg + '", ' + JSON.stringify(flows) + ');';
					cb();
				}
			});	
		});
		
		tasks.push(function (cb) {
			processManifest(manifest, query, 'resources', injectResources, function (err) {
				if (err) {
					cb(err);
				} else {
					resourcesEl.innerHTML = 'F5.addResources("' + pkg + '", ' + JSON.stringify(resources) + ');';
					cb();
				}
			});	
		});
		
		tasks.push(function (cb) {
			processManifest(manifest, query, 'schemas', injectSchemas, function (err) {
				if (err) {
					cb(err);
				} else {
					schemasEl.innerHTML = 'F5.addSchemas("' + pkg + '", ' + JSON.stringify(schemas) + ');';
					cb();
				}
			});	
		});		

		tasks.push(function (cb) {
			processManifest(manifest, query, 'elements', injectElements, cb);				
		});


		tasks.push(function (cb) {
			var pushPkg = new Element('script');
			pushPkg.innerHTML = 'F5.pushPkg("' + pkg + '", ' + (manifest.meta ? JSON.stringify(manifest.meta) : '{}') + ');';
			scriptsEl.appendChild(pushPkg);
			cb();
		});
		
		tasks.push(function (cb) {
			processManifest(manifest, query, 'scripts', injectScripts, cb);
		});
		
		tasks.push(function (cb) {
			processManifest(manifest, query, 'domscripts', injectScripts, cb);
		});
		
		tasks.push(function (cb) {
			var popPkg = new Element('script');
			popPkg.innerHTML = 'F5.popPkg();';
			scriptsEl.appendChild(popPkg);
			cb();			
		});		

		async.series(tasks, cb);
	}
	
	function injectManifest(pkg, cb) {		
		
		// TODO: move to function packageInfo()		
		var manifestName = packageManifestName(pkg);
		var pkgBase = packageBase(pkg);
		
		if (!pkgBase) {
			cb(new Error('Unknown package: ' + pkg + '. Did you flow5 link?'));
			return;
		}
		
		parseJSON(pkgBase + manifestName, cb, function (manifest) {
			function injectPackages(packages, type, cb) {
				var tasks = [];			
				packages.forEach(function (pkg) {
					tasks.push(function (cb) {
						injectManifest(pkg, cb);					
					});
				});
				async.series(tasks, cb);			
			}
						
			// recurse
			processManifest(manifest, query, 'packages', injectPackages, function (err, result) {
				if (err) {
					cb(err);
				} else {
					injectPackage(pkg, manifest, pkgBase, cb);				
				}
			});				
		});									
	}	
	
	function injectHeader(pkg, cb) {
		// manifest	
//		var manifestString = 'cache.manifest?' + urlParameters(query);
//		document.setAttribute('manifest', manifestString);	

		// TODO: create a meta section in manifest for this stuff		
		// TODO: if manifest.type === 'app' add this stuff. otherwise not

		// ios webapp stuff
		appendMeta({name: 'apple-mobile-web-app-status-bar-style', content: 'black'});
		appendMeta({name: 'apple-mobile-web-app-capable', content: 'yes'});
		// ios
		appendMeta({'http-equiv': 'Content-Type', content: 'text/html; charset=UTF-8'});
		appendMeta({name: 'viewport', content: 'width=device-width initial-scale=1.0 maximum-scale=1.0 user-scalable=0'});

		// android
		appendMeta({name: 'viewport', content: 'target-densitydpi=device-dpi'});

		var tasks = [];
		tasks.push(function (cb) {
			// TODO: move to function packageInfo()		
			var manifestName = packageManifestName(pkg);
			var pkgBase = packageBase(pkg);

			parseJSON(pkgBase + manifestName, cb, function (manifest) {
				if (manifest.meta && manifest.meta.icon) {
					appendLink('apple-touch-icon', manifest.meta.icon, null);					
				}
				if (manifest.meta && manifest.meta.splash) {
					appendLink('apple-touch-startup-image', manifest.meta.splash, null);					
				}		
				
				function complete(src) {
					var splash = new Element('img');
					splash.id = 'f5splash';
					splash.setAttribute('src', src);
					document.body.appendChild(splash);															
					cb();																			
				}
				if (manifest.meta && manifest.meta.splash) {
					if (bool(query.inline)) {
						inlineData(pkg, pkgBase + manifest.meta.splash, cb, function (data) {
							complete(data);
						});													
					} else {
						complete(manifest.meta.splash);
					}
				} else {
					cb();
				}											
			});
		});

		tasks.push(function (cb) {
			// setup
			makeScript('f5', 'lib/f5.js', function (err, script) {
				if (err) {
					cb(err);
				} else {
					document.body.appendChild(script);						

					var queryScript = new Element('script');
					queryScript.setAttribute('f5id', 'F5.query');
					queryScript.innerHTML = "F5.query = " + JSON.stringify(query) + '\n' +
						'F5.appPkg = ' + JSON.stringify(pkg) + '\n';				

					document.body.appendChild(queryScript);

					// TODO: don't make facebook id a first class feature
					var facebook_appid = facebookId();
					if (facebook_appid) {
						var facebookScript = new Element('script');
						facebookScript.innerHTML = "F5.facebook_appid = " + facebook_appid;
						document.body.appendChild(facebookScript);		
					}	

					cb();				
				}			
			});			
		});

		async.series(tasks, cb);
	}	
	
	function injectFooter(cb) {
		var tasks = [];
		tasks.push(function (cb) {
			makeScript('f5', 'lib/register.js', function (err, script) {
				if (err) {
					cb(err);
				} else {
					document.body.appendChild(script);
					cb();
				}
			});
		});
		tasks.push(function (cb) {
			makeScript('f5', 'lib/domstart.js', function (err, script) {
				if (err) {
					cb(err);
				} else {
					document.body.appendChild(script);
					cb();
				}
			});
		});		
		async.series(tasks, cb);
	}	
	
	/***********************************/
	/************** BUILD **************/
	/***********************************/
	
	var tasks = [];
					
	if (!query.lib) {
		tasks.push(function (cb) {
			injectHeader(pkg, cb);
		});
	}
		
	// inject the app manifest (and recursively insert packages)
	tasks.push(function (cb) {
		injectManifest(pkg, cb);		
	});																				
					
	// finally		
	if (!query.lib) {
		tasks.push(injectFooter);
	}		
	
	async.series(tasks, function (err, result) {
		var html;
		if (!err) {			
			html = document.outerHTML();
			
			// TODO: this is quite inefficient since it's happening after image inlining
			// should do this transform when loading elements and scripts
			// Need a better general transformation approach. Or I start typing a lot of extra CSS
			// the mapping would allow the server to blow up if a non-compatible property is used
			if (query.agent === 'MSIE') {
				html = html.replace(/-webkit/g, '-ms').replace(/-ms-box-sizing/g, 'box-sizing');		
			} else if (query.agent === 'FF') {
				html = html.replace(/-webkit/g, '-moz');		
			}			
		}
		cb(err, html);
		
//		dumpSizes();
	});
};

exports.buildFrame = function (query) {
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
	delete query.frame;
	delete query.devserv;
	
//	console.error(query.domain)
	
	var frame = new Element('iframe');
	frame.id = 'frame';
	frame.setAttribute('width', width);
	frame.setAttribute('height', height);
	frame.setAttribute('src', '?' + urlParameters(query));
	frame.setAttribute('frameborder', '0');
	document.body.appendChild(frame);
	
	var script = new Element('script');
	script.innerHTML = 'var frame = document.getElementById("frame");' + 
					   'frame.onload = function () {F5 = frame.contentWindow.F5;};';
	document.body.appendChild(script);
	
	return document.outerHTML();
};

exports.buildCacheManifest = function(query, cb) { 
	
	var pkg;
	if (!query.pkg) {
		pkg = query.domain;
	} else {
		pkg = query.domain + '.' + query.pkg;
	}
	
	console.error(pkg + ' building manifest');
		
	function getModDate(cb) {
		var latestDate;
		function checkDate(path, cb) {
			try {
				var modDate = new Date(fs.statSync(path).mtime);
				if (!latestDate || modDate > latestDate) {
					latestDate = modDate;
				}	
				cb();			
			} catch (e) {
				console.error(e.stack || e);
				cb();
			}
		}
		
		function checkManifest(pkg, cb) {
			var manifestName = packageManifestName(pkg);
			var pkgBase = packageBase(pkg);				
			
			function checkDates(files, type, cb) {
				var tasks = [];
				files.forEach(function (file) {
					tasks.push(function (cb) {
						checkDate(resolveURL(pkgBase, file), cb);						
					});
					if (type === 'resources') {
						tasks.push(function (cb) {
							parseJSON(pkgBase + file, cb, function (resources) {
								var tasks = [];
								handleURLsRecursive(resources, function (obj, id, value) {
									tasks.push(function (cb) {
										checkDate(resolveURL(pkgBase, getURL(value)), cb);								
									});
								});			
								async.parallel(tasks, cb);									
							});							
						});
					}
				});			
				async.parallel(tasks, cb);	
			}			
			
			function checkPackages(packages, type, cb) {
				var tasks = [];
				packages.forEach(function (pkg) {
					tasks.push(function (cb) {
						checkManifest(pkg, cb);
					});
				});
				async.series(tasks, cb);
			}		
						
			parseJSON(pkgBase + manifestName, cb, function (manifest) {
				var tasks = [];
				tasks.push(function (cb) {
					checkDate(resolveURL(pkgBase, manifestName), cb);						
				});
				tasks.push(function (cb) {
					processManifest(manifest, query, 'packages', checkPackages, cb);																
				});
				tasks.push(function (cb) {
					processManifest(manifest, query, 'flows', checkDates, cb);																
				});
				tasks.push(function (cb) {
					processManifest(manifest, query, 'scripts', checkDates, cb);														
				});
				tasks.push(function (cb) {
					processManifest(manifest, query, 'domscripts', checkDates, cb);														
				});
				tasks.push(function (cb) {
					processManifest(manifest, query, 'elements', checkDates, cb);														
				});
				tasks.push(function (cb) {
					processManifest(manifest, query, 'resources', checkDates, cb);																				
				});
				async.parallel(tasks, cb);
			});
		}
		
		var f5base = packageBase('f5');
		
		var tasks = [];
		tasks.push(function (cb) {
			checkDate(f5base + 'lib/f5.js', cb);					
		});
		tasks.push(function (cb) {
			checkDate(f5base + 'lib/register.js', cb);					
		});
		tasks.push(function (cb) {
			checkDate(f5base + 'lib/domstart.js', cb);					
		});
		tasks.push(function (cb) {
			checkDate(__filename, cb);					
		});
		tasks.push(function (cb) {
			checkDate(__dirname + '/server.js', cb);					
		});

		tasks.push(function (cb) {
			checkManifest(pkg, function (err) {
				cb(err);
			});					
		});
		
		async.parallel(tasks, function (err) {
			if (!err) {
				console.error(pkg + ' last modified ' + latestDate);						
			}
			cb(err, latestDate);
		});
	}


	var cacheManifest = 'CACHE MANIFEST\n';
	cacheManifest += 'CACHE:\n';
			
	cacheManifest += 'NETWORK:\n';
	cacheManifest += '*\n';
						
	getModDate(function (err, latestDate) {
		cacheManifest += '#' + latestDate + '\n';
	//	console.error(cacheManifest)
		cb(err, cacheManifest);		
	});						
};

}());


/*
// experiment with integrated png crush
	FFI = require("node-ffi"),
	libc = new FFI.Library(null, {"system": ["int32", ["string"]]}),
	if (bool(query.crush)) {
		var tmpPath = '/tmp/' + process.pid + Date.now() + '.png';
		var cmd = 'optipng -o2 -out ' + tmpPath + ' ' + path;
//		var cmd = 'convert -quality 05 ' + path + ' ' + tmpPath;
//		console.error('cmd:' + cmd)
		libc.system(cmd);					
		path = tmpPath;
	}
*/
