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
/*global F5, Base64*/


(function () {
	
	/*global PhoneGap*/
//	var networkActivityCount = 0;
	function networkActivityStarted() {
//		networkActivityCount += 1;
//		console.log('networkActivityCount: ' + networkActivityCount);
		if (typeof PhoneGap !== 'undefined') {
			PhoneGap.exec(
				function (result) { // success
			}, function (result) { // failure
			}, "com.flow5.networkactivity", "activityStarted", []);													
		}
	}

	function networkActivityCompleted() {
//		networkActivityCount -= 1;
//		console.log('networkActivityCount: ' + networkActivityCount);
		if (typeof PhoneGap !== 'undefined') {
			PhoneGap.exec(
				function (result) { // success
			}, function (result) { // failure
			}, "com.flow5.networkactivity", "activityCompleted", []);													
		}
	}		
	
	F5.doXHR = function(method, url, body, success, error, headers, username, password) {				
		var xhr = new XMLHttpRequest();
		xhr.open(method, url, true);			
		if (method === 'POST' || method === 'PUT') {
			xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
		}
		
		if (username && password) {
			xhr.setRequestHeader("Authorization", 'Basic ' + F5.Base64.encode(username + ':' + password));			
		}
		
//		console.log(url);
//		console.log(body);
		

		if (headers) {
			F5.forEach(headers, function (id, value) {
				xhr.setRequestHeader(id, value);
			});
		}

		xhr.onreadystatechange = function (e) {
			switch (xhr.readyState) {
			case xhr.UNSENT:
//				console.log('XMLHttpRequest.UNSENT');
				break;
			case xhr.OPENED:
//				console.log('XMLHttpRequest.OPENED');				
				break;
			case xhr.HEADERS_RECEIVED:
//				console.log('XMLHttpRequest.HEADERS_RECEIVED');					
				break;
			case xhr.LOADING:
//				console.log('XMLHttpRequest.LOADING');					
				break;
			case xhr.DONE:	
				networkActivityCompleted();
				if (xhr.status !== 0) {
					if (success) {
						var responseHeaders = {};
						if (headers) {
							F5.forEach(headers, function (id, value) {
								responseHeaders[id] =  xhr.getResponseHeader(id);
							});													
						}

						success(xhr.responseText, xhr.status, responseHeaders);
					}
				} else {
					if (error) {
						error(xhr.responseText, xhr.status);
					}
				}
//				console.log('XMLHttpRequest.LOADING');
				break;				
			}								
		};

		// WORKAROUND: it seems that xhr.send can cause pending events to fire with reentrancy
		// TODO: reference RADAR bug report
		// some queued events
		setTimeout(function () {
			/*global Iuppiter*/
//			var compressed = Iuppiter.Base64.encode(Iuppiter.compress(body));
//			xhr.send(compressed);
			networkActivityStarted();
			xhr.send(body);
		}, 0);	
		
		return xhr;	
	};
			
	// TODO: get rid of this
	F5.upload = function(method, url, body, success, error, headers, username, password) {
		return F5.doXHR(method, url, body, success, error, headers, username, password);
	};
		
	function pendingComplete(node, pending) {
		node.pending.splice(node.pending.indexOf(pending), 1);
		clearTimeout(pending.timeout);
		pending.timeout = null;
		if (pending.confirmWidget) {
			pending.confirmWidget.dismiss();
		}					
	}
	
	F5.networkErrorHandler = function (cb, url, message) {
		// TODO: sloppy
		F5.alert('Network Error', '', function () {
			cb();
		});
		// message might be a number
		message += '';
		F5.Analytics.logEvent('NetworkError', {url: url, message: message});
	};
		
	// TODO: refactor
	F5.execService = function (node, id, parameters, cb) {
		
		if (!node.pending) {
			node.pending = [];
		}
				
		// TODO: connection test for headless mode
		if (F5.connection && !F5.connection.online()) {
			// TODO: make this message configurable from client
			F5.alert('Oops! No Network Connection', "Please enable your network connection and try again.", function () {
				cb(null);				
			});
			return;
		}				
		
		var components = id.split(':');
		var name = components[0];
		var qualifier = components[1];
								
		var protocol = 'http', method = 'GET', baseUrl, username, password, 
			urlParameterKeys, extendedUrl, resourceName, headers, proxy, parameterSchema, responseSchema;
						
		function extendParameters(service) {
			function get(which) {
				if (service) {
					var value;
					if (qualifier) {
						if (service[which] && typeof service[which] === 'object') {
							value = service[which][qualifier];
						}
					}
					if (!value) {
						value = service[which];
					}
					return value;					
				}
			}			

			protocol = get('protocol') || protocol;
			baseUrl = get('baseUrl') || baseUrl;
			extendedUrl = get('extendedUrl') || extendedUrl;
			resourceName = get('resourceName') || resourceName;
			method = get('method') || method;
			// which parameters should go into the URL for POST/PUT
			urlParameterKeys = get('urlParameterKeys') || urlParameterKeys;

			username = get('username') || username;
			password = get('password') || password;

			headers = get('headers') || headers;
			proxy = get('proxy') || proxy;

			parameterSchema = get('parameterSchema') || parameterSchema;
			responseSchema = get('responseSchema') || responseSchema;

			F5.extend(parameters, get('parameters'));			
		}
		
		var service = F5.valueFromId(F5.Services, F5.nodePackage(node));		
		extendParameters(service);						
		F5.forEach(name.split('.'), function (component) {
			service = service && service[component];
			if (service) {
				extendParameters(service);										
			}
		});			
		// try at global scope (fully qualified service id)
		if (!service) {
			service = F5.Services;
			extendParameters(service);						
			F5.forEach(name.split('.'), function (component) {
				service = service && service[component];
				if (service) {
					extendParameters(service);										
				}
			});
		}
		
		F5.assert(service, 'No service called: ' + name);		

		var url = protocol + '://' + baseUrl;
		if (extendedUrl) {
			url += extendedUrl;
		}
		
		// TODO: obsolete
		if (resourceName) {
			url += '/' + resourceName;
		}
		
		function validate(obj, schema) {
			var report = F5.JSV.env.validate(obj, schema);
			F5.assert(report.errors.length === 0,
				'Error validating service parameter schema: ' + 
					JSON.stringify(obj) + ' : ' +
					JSON.stringify(report.errors));
			
		}
		
		// NOTE: url parameters for substitution are considered to be part of the schema
		if (F5.isDebug()) {
			/*global JSV*/
			if (!F5.JSV) {
				F5.JSV = {env: JSV.createEnvironment()};
			}
			if (parameterSchema) {
				validate(parameters, parameterSchema);
			}
		}		
		
		// DO URL path component replacement
		F5.forEach(parameters, function (id, value) {
			var key = '<' + id + '>';
			if (url.match(key)) {
				url = url.replace(key, value);
				delete parameters[id];
			}
		});		
								
						
		function formatUrlParameters(parameters, keys) {
			var urlParameters = [];
			F5.forEach(parameters, function (id, value) {
				if (!keys || keys.indexOf(id) !== -1) {
					urlParameters.push(id + '=' + encodeURIComponent(value));					
				}
			});
			if (urlParameters.length) {
				return '?' + urlParameters.join('&');				
			} else {
				return '';
			}			
		}
		
		
		var pending = {abort: function () {
//			console.log('aborting pending')
			if (this.xhr.readyState !== this.xhr.DONE) {
				this.aborted = true;
				this.xhr.abort();				
			}
		}};
		
		var timeoutMS = 10000;
		function timeout() {
			var title = "A network operation is taking a long time.";
			var message = "Press OK to keep waiting or Cancel to cancel the operation.";
			// TODO: should move this up to the DOM aware layer
			if (F5.confirm) {
				pending.confirmWidget = F5.confirm(title, message, function (result) {
								if (result) {
									if (pending.timeout) {
										pending.timeout = setTimeout(timeout, timeoutMS);									
									}
								} else {
									pending.abort();
								}
								delete pending.confirmWidget;
							});				
			} else {
				console.log(title + ' ' + message);
				pending.timeout = setTimeout(timeout, timeoutMS);				
			}
		}		
		
		// TODO: might also want to allow cancelling if there's no node (currently only done from tools)
		pending.timeout = setTimeout(timeout, timeoutMS);			
		
		if (method === 'GET' || method === 'DELETE') {			
			url += formatUrlParameters(parameters);
			
						
			if (proxy) {
				url = proxy + '/proxy?url=' + encodeURIComponent(url);
			}
						
//			console.log(url);	
			
			pending.xhr = F5.doXHR(method, url, null,
				function success(response, status) {
					pendingComplete(node, pending);
					
					if (F5.isDebug() && responseSchema) {
						validate(JSON.parse(response), responseSchema);
					}
					
					try {
//						console.log(response);
						var obj = JSON.parse(response);												
						if (service.postprocess) {
							obj = service.postprocess(obj);
						}
						try {
							cb(obj, status);							
						} catch (e1) {
							console.log(e1.message);
						}
						// TODO: validateSchema(response, service.responseSchema);						
					} catch (e2) {
						console.log(e2.message);
						F5.networkErrorHandler(cb, url, e2.message);						
					}
				}, function error(response, status) {
					pendingComplete(node, pending);						
					if (pending.aborted) {
						cb(); 
					} else {
						F5.networkErrorHandler(cb, url, status);
					}			
				}, headers, username, password);
		} else if (method === 'POST' || method === 'PUT'){	
						
			var bodyParameters = {};
			F5.forEach(parameters, function (id, value) {
				if (!urlParameterKeys || urlParameterKeys.indexOf(id) === -1) {
					bodyParameters[id] = value;
					delete parameters[id];
				}
			});
			
			url += formatUrlParameters(parameters, urlParameterKeys);			
			
			if (proxy) {
				url = proxy + '/proxy?url=' + encodeURIComponent(url);
			}
						
			pending.xhr = F5.doXHR(method, url, JSON.stringify(bodyParameters),
				function success(response, status) {
					pendingComplete(node, pending);		
					
					if (F5.isDebug() && responseSchema) {
						validate(JSON.parse(response), responseSchema);
					}
								
					try {
//						console.log(response);
						var obj = JSON.parse(response);
						
						if (F5.isDebug() && responseSchema) {
							validate(obj, responseSchema);
						}
												
						if (service.postprocess) {
							obj = service.postprocess(obj);
						}
						try {
							cb(obj, status);							
						} catch (e1) {
							console.log(e1.message);
						}
						// TODO: validateSchema(response, service.responseSchema);						
					} catch (e2) {
						console.log(e2.message);
						F5.networkErrorHandler(cb, url, e2.message);						
					}
				}, function error(response, status) {
					pendingComplete(node, pending);	
					if (pending.aborted) {
						cb();
					} else {
						F5.networkErrorHandler(cb, url, status);						
					}			
				}, headers, username, password);							
		}	
		
		node.pending.push(pending);			
	};	
	
	// TODO: need a unit test for this one
	F5.merge = function(src, dst) {
		
		// resources may also contain other object types which should be treated as literals
		function isSimpleObject(value) {
			return typeof value === 'object' && value.constructor === Object;
		}
				
		function assign(id, value) {
			if (!dst[id]) {
				if (value && isSimpleObject(value)) {
					dst[id] = {};
				}
			} 

			if (value && isSimpleObject(value)) {
				F5.assert(typeof dst[id] === 'object', 'mismatched data schema');
				F5.forEach(value, function (valueid, value) {
					if (dst[id][valueid]) {
						console.log('WARNING: data field name shadowed: ' + id + '.' + valueid);										
					}
					dst[id][valueid] = value;
				});
			} else {
				if (dst[id]) {
					console.log('WARNING: data field name shadowed: ' + id);										
				}
				dst[id] = value;
			}
		}
		if (src && typeof src === 'object') {
			F5.forEach(src, assign);			
		}
	};
	
	// TODO: need a better name
	// this function takes the user data and combines it with data from the images
	// and string files to create a structure which contains all the data that is going
	// to be used by a widget or view tempalte
	F5.getNodeData = function (node, userData) {
		// if arg2 is provided, copy out its fields
		var data = {};
		F5.merge(userData, data);
		
		// then add all of the resources associated with this node and ancestors
		var traverse = node;
		while (traverse) {
			var resourceData = {};
			
			var pkgResources = F5.valueFromId(F5.Resources, F5.nodePackage(node));	
			if (pkgResources) {
				F5.merge(pkgResources[traverse.id], resourceData);				
			}	
						
			if (traverse !== node) {
				F5.forEach(resourceData, function (id, value) {
					if (id[0] !== '.') {
						delete resourceData[id];
					}
				});
			}
			F5.merge(resourceData, data);
			traverse = traverse.parent;
		}
		
		if (node){
			F5.merge(node.data, data);			
		}
		
		return data;
	};	
	
	F5.assert = function(condition, message) {
		// TODO: disable in release builds?
		if (!condition) {
			// TODO: sloppy. define alert or move down a layer
			if (typeof window !== 'undefined') {
				alert(message);				
			} else {
				console.log(message);
			}
			throw new Error(message);
		}
	};
	
	F5.objectFromPrototype = function(prototype) {
		function Instance() {}
		Instance.prototype = prototype;
		return new Instance();
	};
	
	F5.createCache = function () {
		return F5.objectFromPrototype(F5.Cache);
	};
	
	F5.createModel = function (node) {
		var model = F5.objectFromPrototype(F5.Model);
		model.node = node;
		return model;
	};
	
	F5.callback = function (cb, arg) {
		try {
			cb(arg);
		} catch (e) {
			console.log(e.message);
		}
	};
			
	F5.chainTasks = function(tasks, cb) {
        if (tasks.length) {
            tasks.shift()(function() {
				F5.chainTasks(tasks, cb);
            });
        } else {
			cb();
        }
    };

	F5.parallelizeTasks = function (tasks, cb) {				
		var count = tasks.length;
		if (!count) {
			cb();
			return;
		}
		function complete() {
			count -= 1;
			if (!count) {
				cb();
			}
		}
		tasks.forEach(function (task) {
			task(complete);
		});
	};
	
	F5.noop = function () {};
	
	F5.sign = function (x) {
		return x/Math.abs(x);
	};
	
	// TODO: why not path === null returns obj?
	F5.valueFromId = function (obj, path) {
		if (obj && path) {
			var pathComponents = path.split('.');
			while (obj && typeof obj === 'object' && pathComponents.length) {
				obj = obj[pathComponents.shift()];
			}
			return obj;			
		} else {
			return null;
		}
	};
		
	F5.reset = function () {
		document.body.innerHTML = '';
		document.body.style['background-color'] = 'black';
		localStorage.clear();
		setTimeout(function () {
			location.reload();					
		}, 0);
	};
	
	F5.forEach = function (obj, fn) {
		if (obj) {
			/*global NodeList*/
			if (typeof NodeList !== 'undefined' && obj.constructor === NodeList) {
				var list = [];
				var i;
				for (i = 0; i < obj.length; i += 1) {
					list.push(obj.item(i));
				}
				list.forEach(fn);

			} else if (obj.constructor === Array) {
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
	};

	F5.extend = function (obj1, obj2) {
		F5.forEach(obj2, function (id, value) {
			obj1[id] = value;
		});
	};	
	
	F5.clone = function (obj) {
		return JSON.parse(JSON.stringify(obj));
	};
	
	F5.distanceInMeters = function (loc1, loc2) {
		/*global google*/
		var latLng1 = new google.maps.LatLng(loc1.lat, loc1.lng);
		var latLng2 = new google.maps.LatLng(loc2.lat, loc2.lng);
		return google.maps.geometry.spherical.computeDistanceBetween(latLng1, latLng2);		
	};
	
	F5.nodePackage = function (node) {
		var pkg = node.pkg;
		while (!pkg && node.parent) {
			node = node.parent;
			pkg = node.pkg;
		}	
		return pkg;	
	};	
	
	F5.getPrototype = function (type, id) {
		var components = id.split('.');
		var name = components.pop();
		var prototypeRoot = F5.valueFromId(F5.Prototypes, components.join('.'));
		return prototypeRoot && prototypeRoot[type] && prototypeRoot[type][name];
	};
	
	F5.packageClass = function (pkg) {
		pkg = pkg || F5.query.pkg;
		return pkg.split('.').join('-');
	};	
	
	// TODO: decompose path to allow references to nested components
	F5.subflow = function (pkg, path) {
		var id = pkg;
		if (path) {
			id += '.children.' + path;
		}
		return F5.clone(F5.valueFromId(F5.Flows, id));
	};
	
	F5.isReference = function (id) {
		return {parent: true,
				selection: true,
				node: true,
				to: true,
				back: true}[id];		
	};
	
	F5.isMobile = function () {
		return F5.query.mobile === 'true';
	};
	
	F5.platform = function () {
		return F5.query.platform;
	};
	
	F5.isDebug = function () {
		return F5.query.debug === 'true';
	};
	
	F5.isInline = function () {
		return F5.query.inline === 'true';		
	};
	
	F5.isNative = function () {
		// F5.query.native confuses the JavaScript compressor
		return F5.query['native'] === 'true';		
	};	
	
	// NOTE: used in headless mode testing
	// overridden in domutils for full package import to DOM
	F5.importPackage = function (pkg, cb) {
		if (F5.valueFromId(F5.Flows, pkg)) {
			cb();
			return;
		}
		
		var query = F5.clone(F5.query);
		query.pkg = pkg;
		query.import = true;
		var parameters = [];
		F5.forEach(query, function (key, value) {
			parameters.push(key + '=' + value);
		});
		
		var url = 'http://' + F5.query.devserv + '/generate?' + parameters.join('&');
		return F5.doXHR('GET', url, null, 
			function success(result, status) {
				eval(result);
				F5.registerPendingModules();
				
				if (cb) {
					cb();
				}
			},
			function error(status) {
				
			});
	};	
}());




