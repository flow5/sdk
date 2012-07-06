/***********************************************************************************************************************

	Copyright (c) 2012 Paul Greyson

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
/*global F5*/

(function () {
	
	var cssUrlRegEx = new RegExp(/(url\(['"]?)([^'"\)]*)(['"]?\))/);
	
	F5.packageClass = function (pkg) {
		pkg = pkg || F5.appPkg;
		return pkg.split('.').join('-');
	};	
	
	// finds all of the elements marked with f5applyscope and then
	// scopes the elements with ids using scope
	F5.scopePackages = function () {
		F5.forEach(document.body.querySelectorAll('[f5applyscope]'), function (scope) {
			var pkg = scope.getAttribute('f5pkg');
			F5.forEach(scope.querySelectorAll('[id]'), function (template) {
				template.id = pkg + '.' + template.id;
			});			
			scope.removeAttribute('f5applyscope');
		});	
		
		// scope the css rules as well
		// see corresponding logic in views.js to apply the package name as a class to div at the root
		// of the div where the package is imported
		var i;
		for (i=0; i < document.styleSheets.length; i += 1) {
			var styleSheet = document.styleSheets[i];	
			
			var owner = styleSheet.ownerNode || styleSheet.ownerElement;
			if (owner) {
				var pkg = owner.getAttribute('f5pkg');
				if (owner.getAttribute('f5applyscope') && pkg && !pkg.match('f5')) {
					owner.removeAttribute('f5applyscope');
					var length = styleSheet.cssRules.length;
					
					// WebKit allows CSSRules to be modified in places and maintains
					// the source line number which is nice for debugging
					var j, k, selectors;
					if (navigator.userAgent.match(/WebKit/)) {					
						for (j = 0; j < length; j += 1) {
							var rule = styleSheet.cssRules[j];
							if (rule.selectorText) {
								selectors = rule.selectorText.split(',');
								for (k = 0; k < selectors.length; k += 1) {
									selectors[k] = '.' + F5.packageClass(pkg) + ' ' + selectors[k];
								}	
								rule.selectorText = selectors.join(',');								
							}
						}
					} else {
						var scopedCSSText = '';
						for (j = 0; j < length; j += 1) {
							var selectorText = styleSheet.cssRules[j].selectorText;
							var cssText = styleSheet.cssRules[j].cssText;
							if (selectorText) {
								selectors = selectorText.split(',');
								for (k = 0; k < selectors.length; k += 1) {
									selectors[k] = '.' + F5.packageClass(pkg) + ' ' + selectors[k];
								}				
								scopedCSSText += cssText.replace(selectorText, selectors.join(','));
							} else {
								scopedCSSText += cssText;
							}
						}					
					}
				}				
			}
		}		
	};	
	
	F5.parseSchemas = function (pkg) {
		/*global JSV*/
		if (!F5.JSV) {
			F5.JSV = {env: JSV.createEnvironment()};
		}
		
		var schemas = F5.valueFromId(F5.Schemas, pkg);
		schemas.forEach(function (schema) {
			F5.JSV.env.createSchema(schema, null, pkg + '#' + schema.name);
		});
	};
	
	F5.parseResources = function (pkg) {		
		function isImageResource(resource) {
			return resource.indexOf('.png') !== -1 || 
					resource.indexOf('.jpg') !== -1 ||
					resource.indexOf('.svg') !== -1 ||
					resource.indexOf('data:image') !== -1;
		}
		
		function isHTMLResource(resource) {
			return resource.indexOf('.html') !== -1;
		}
		
		function preloadImagesRecursive(resources) {
			F5.forEach(resources, function (id, resource) {
				if (typeof resource === 'object' && resource.constructor !== Array) {
					preloadImagesRecursive(resource);
				} else if (isImageResource(resource)){
					resources[id] = F5.objectFromPrototype(F5.ImagePreloader);
					resources[id].load(resource);
				}
			});			
		}
		preloadImagesRecursive(F5.valueFromId(F5.Resources, pkg));				
	};	
	
	F5.parsePackage = function (pkg, contents) {
		var d = document.implementation.createHTMLDocument('');
		d.documentElement.innerHTML = contents;

		var scripts = d.querySelectorAll('script');
		F5.forEach(d.head.childNodes, function (el) {
			document.head.appendChild(el);
		});
		F5.forEach(d.body.childNodes, function (el) {
			document.body.appendChild(el);
		});

		F5.scopePackages();
		F5.forEach(scripts, function (script) {
			/*jslint evil:true*/
			eval(script.textContent);
		});
		F5.registerPendingModules();
		F5.parseResources(pkg);
		if (F5.isDebug()) {
			F5.parseSchemas(pkg);					
		}
	};
	
	F5.importPackage = function (pkg, cb, url, cache) {
		if (F5.valueFromId(F5.Flows, pkg)) {
			cb(true);
			return;
		}
						
		if (!url) {
			var appDomain = F5.appPkg.split('.')[0];
			var appPkg = F5.appPkg.split('.')[1];

			var importDomain = pkg.split('.')[0];
			var importPkg = pkg.split('.')[1];

			url = location.href.replace(appDomain, importDomain);

			if (appPkg && importPkg) {
				url = url.replace(appPkg, importPkg);
			} else if (appPkg) {
				url = url.replace('pkg=' + appPkg, '');
			} else {
				url += '&pkg=' + importPkg;		
			}

			if (url.match('/?')) {
				// imported packages have to be inlined to be evaluated properly
				url = url.replace(/inline=[^&]*/, '') + '&inline=true&lib=true';			
			}			
		}
		
		var requestHeaders = {};	
		var cachedResult;				
		if (cache && localStorage[pkg]) {
			cachedResult = JSON.parse(localStorage[pkg]);
			requestHeaders = {'If-None-Match': cachedResult.etag};
		}
		
		if (!F5.connection.online()) {
			if (cachedResult) {
				F5.parsePackage(pkg, cachedResult.result);
				cb(true);
			} else {
				cb(false);
			}
		} else {
			// TODO: client should provide error callback
			F5.doXHR('GET', url, null, 
				function success(result, status, responseHeaders) {
					if (status === 304) {
						F5.parsePackage(pkg, cachedResult.result);	
						cb(true);				
					} else if (status === 200) {
						if (cache) {
							var packageListKey = F5.appPkg + '_packages';
							var pkgList = localStorage.packageList ? JSON.parse(localStorage[packageListKey]) : [];
							if (pkgList.indexOf(pkg) === -1) {
								pkgList.push(pkg);
							}
							localStorage[packageListKey] = JSON.stringify(pkgList);
							localStorage[pkg] = JSON.stringify({result: result, etag: responseHeaders['ETag']});
						}										
						F5.parsePackage(pkg, result);
						cb(true);
					} else {
						cb(false);
						console.log('error importing package: ' + pkg + ' status: ' + status + ' result: ' + result);
					}									
				},
				function error(status) {
					console.log('error importing package: ' + pkg + ' status: ' + status);				
				},
				requestHeaders
			);			
		}										
	};								
}());