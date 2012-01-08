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
/*global F5*/


(function () {
	
	function doXHR(method, url, body, success, error, headers) {
		var xhr = new XMLHttpRequest();
		xhr.open(method, url, true);

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
				if (xhr.status === 200) {
					if (success) {
						var responseHeaders = {};
						if (headers) {
							F5.forEach(headers, function (id, value) {
								responseHeaders[id] =  xhr.getResponseHeader(id);
							});													
						}

						success(xhr.responseText, responseHeaders);
					}
				} else {
					if (error) {
						error(xhr.responseText);
					}
				}
//				console.log('XMLHttpRequest.LOADING');
				break;				
			}								
		};

		// WORKAROUND: it seems that xhr.send can cause pending events to fire with reentrancy
		// TODO: build test case. need something that takes a long time right after send, and then
		// some queued events
		setTimeout(function () {
			/*global Iuppiter*/
//			var compressed = Iuppiter.Base64.encode(Iuppiter.compress(body));
//			xhr.send(compressed);
			xhr.send(body);
		}, 0);		
	}
	
	F5.get = function(url, success, error, headers) {
		doXHR('GET', url, null, success, error, headers);		
	};
		
	F5.post = function(url, body, success, error, headers) {
		doXHR('POST', url, body, success, error, headers);
	};
	
	F5.execService = function (name, option, parameters, cb) {

		var service = F5.Services;
		var protocol, baseUrl, method;
		F5.forEach(name.split('.'), function (component) {
			if (service) {
				service = service[component];				
			}
			
			protocol = protocol || service.protocol;
			baseUrl = baseUrl || service.baseUrl;
			method = method || service.method;
			
			if (service.parameters) {
				F5.extend(parameters, service.parameters);
			}
		});
		F5.assert(service, 'No service called: ' + name);		

		// TODO
		// validate(parameters, service.parameterSchema);

		var url = protocol + '://' + baseUrl + option;
		if (method === 'GET') {
			if (service.query) {
				url += '?' + service.query(parameters);
			} else {
				var query = [];
				F5.forEach(parameters, function (id, value) {
					query.push(id + '=' + encodeURIComponent(value));
				});
				url += '?' + query.join('&');				
			}

//			console.log(url);	
			F5.get(url, 
				function success(response) {
					try {
//						console.log(response);
						var obj = JSON.parse(response);
						if (service.postprocess) {
							obj = service.postprocess(obj);
						}
						cb(obj);
						// TODO: validateSchema(response, service.responseSchema);						
					} catch (e) {
						console.log(e.message);
						cb(null);
					}
				}, function error(response) {
					console.log('Error from ' + url + ' : ' + response);
					cb(null);
				});
		} 
//		else {
			// insert parameters into post body
//		}		
	};	
	
	// TODO: need a unit test for this one
	F5.merge = function(src, dst) {
		function assign(id, value) {
			if (!dst[id]) {
				if (typeof value === 'object') {
					dst[id] = {};
				}
			} 

			if (typeof value === 'object') {
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
		
		// then add all of the strings resources associated with this node and ancestors
		while (node) {
			F5.merge(F5.Resources[node.id], data);
			node = node.parent;
		}
		
		return data;
	};	
	
	F5.assert = function(condition, message) {
		// TODO: disable in release builds?
		if (!condition) {
			throw new Error(message);
		}
	};
	
	F5.objectFromPrototype = function(prototype) {
		function Instance() {}
		Instance.prototype = prototype;
		return new Instance();
	};
	
	F5.callback = function (cb, arg) {
		try {
			cb(arg);
		} catch (e) {
			console.log(e.message);
		}
	};
	
	F5.sourceFromResourceUrl = function (url) {
		if (url.match('data:image/') || url.match('http://')) {
			return url;
		} else {
			return 'apps/' + F5.query.app + '/' + url;
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
	
	F5.valueFromId = function (obj, path) {
		var pathComponents = path.split('.');
		while (obj && typeof obj === 'object' && pathComponents.length) {
			obj = obj[pathComponents.shift()];
		}
		return obj;
	};
		
}());




