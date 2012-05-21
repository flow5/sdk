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
/*global F5, PhoneGap*/

// TODO: use namespacing for Services like Widgets
(function () {	
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

		var service = F5.valueFromId(F5.Services, F5.getNodePackage(node));		
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
	
	
	// TODO: move to facebook module
	F5.Services = {
		facebook: {
			protocol: 'https',
			method: 'GET',
			baseUrl: 'graph.facebook.com/',
			me: {
				extendedUrl: 'me'
			}
		}
	};		
	
}());