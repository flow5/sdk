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
						if (typeof value === 'object' || typeof dst[id][valueid] !== 'object') {
							console.log('WARNING: data field name shadowed: ' + id + '.' + valueid);										
							dst[id][valueid] = value;													
						} else {
							// otherwise shove the value into the object
							// TODO: this needs to be documented clearly. obscure behavior
							dst[id][valueid].value = value;
						}
					} else {
						dst[id][valueid] = value;						
					}
				});
			} else {
				if (dst[id]) {
					if (typeof value === 'object' || typeof dst[id] !== 'object') {
						console.log('WARNING: data field name shadowed: ' + id);
						dst[id] = value;						
					} else {
						dst[id].value = value;
					}
				} else {
					dst[id] = value;					
				}
				
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
		
		// then add all of the resources associated with this node and ancestors
		var traverse = node;
		while (traverse) {
			var resourceData = {};
			
			var pkgResources = F5.valueFromId(F5.Resources, F5.getNodePackage(node));	
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
		
		F5.merge(userData, data);		
		
		return data;
	};	
	
	// NOTE: overridden in domtuils.js to use alert() instead of console.log()
	F5.assert = function(condition, message) {
		if (!condition) {
			console.log(message);
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
			
	F5.forEach = function (obj, fn) {
		if (obj) {
			/*global NodeList*/
			if (obj instanceof F5.Cache.constructor) {
				F5.forEach(obj.dump(), fn);
			} else if (typeof NodeList !== 'undefined' && obj.constructor === NodeList) {
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
		if (obj1.constructor === Array) {
			obj2.forEach(function (item) {
				obj1.push(item);
			});
		} else {
			F5.forEach(obj2, function (id, value) {
				obj1[id] = value;
			});			
		}
	};	
	
	F5.clone = function (obj) {
		return JSON.parse(JSON.stringify(obj));
	};
		
	F5.getNodePackage = function (node) {
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
		
	// TODO: decompose path to allow references to nested components
	F5.nodeFromPathInPackage = function (pkg, path) {
		var id = pkg;
		if (path) {
			path.split('.').forEach(function (component) {
				id += '.children.' + component;			
			});			
		}
		return F5.clone(F5.valueFromId(F5.Flows, id));
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
	
	// NOTE: overridden by domutils.js
	// this method is used for headless testing
	F5.importPackage = function (pkg, cb) {
		/*jslint evil:true*/
		if (F5.valueFromId(F5.Flows, pkg)) {
			cb();
			return;
		}
		
		var query = F5.clone(F5.query);
		query.lib = true;
		var parameters = [];
		F5.forEach(query, function (key, value) {
			parameters.push(key + '=' + value);
		});

		var libDomain = pkg.split('.')[0];		
		var url = F5.query.devserv + '/' + libDomain + '/?lib=true&headless=true&debug=true';		
		if (pkg.split('.').length === 2) {
			url += '&pkg=' + pkg.split('.')[1];
		}				
		
		console.log(url);
		return F5.doXHR('GET', url, null, 
			function success(result, status) {
				try {
					eval(result);					
					F5.registerPendingModules();
				} catch (e) {
					console.log('exception in F5.importPackage: ' + url);
					console.log(e);
				}
				
				if (cb) {
					cb();
				}
			},
			function error(status) {
				
			});
	};		
}());




