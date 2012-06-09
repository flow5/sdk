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







