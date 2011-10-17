/*global define:true require:true exports:true*/

// TODO: bring up to final spec
// see: http://nodejs.org/docs/v0.5.0/api/modules.html

(function () {
	var modules = {};
	var defs = {};
	var oldRequire;
	
	function normalize(name) {
		return name.split('/').slice(-1)[0].replace('.js', '');
	}
	
	if (typeof require === 'undefined') {
		exports = {};
		
		define = function (name, exports, fn) {
			defs[name] = fn;
		};		

		require = function (name) {
			if (oldRequire) {
				oldRequire(name);
			}

			var normalizedName = normalize(name);

			if (modules && modules.hasOwnProperty(normalizedName)) {
				return modules[normalizedName];
			}

			if (defs && defs.hasOwnProperty(normalizedName)) {
				var fn = defs[normalizedName];
				modules[normalizedName] = {};
				fn(modules[normalizedName]);
				return modules[normalizedName];
			}

			if (normalizedName !== 'require') {
				throw new Error("Module not found: " + name);			
			}
		};
	} else {
		define = function (name, exports, fn) {
			fn(exports);
		};
	}
	

}());

