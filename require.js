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

/*global define:true require:true exports:true*/

// OPTION: bring up to final spec when v0.5.x is stable
	// see: http://nodejs.org/docs/v0.5.0/api/modules.html

// browser/nodejs compatible define/require

// LIMITATION: modules are referenced by base name so duplicate module names at different locations will conflict


(function () {
	
	var modules = {};
	var defs = {};
	
	function normalize(name) {
		return name.split('/').slice(-1)[0].replace('.js', '');
	}
	
	if (typeof require === 'undefined') {
		exports = {};
		
		define = function (name, exports, fn) {
			defs[name] = fn;
		};		

		require = function (name) {
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

