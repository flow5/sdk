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
/*global define, F5: true*/

if (typeof F5 === 'undefined') {
	F5 = {};

	(function () {

		F5.Global = {};
		F5.Prototypes = {};
		F5.Resources = {};
		F5.FlowDelegates = {};		

		if (typeof document !== 'undefined') {
			F5.WidgetPrototypes = {};
			F5.ViewDelegates = {};
		}

		F5.forEach = function (obj, fn) {
			/*global NodeList*/
			if (typeof NodeList !== 'undefined' && obj.constructor === NodeList) {
				var i;
				for (i = 0; i < obj.length; i += 1) {
					fn(obj[i]);
				}

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
		};

		F5.extend = function (obj1, obj2) {
			F5.forEach(obj2, function (id, value) {
				obj1[id] = value;
			});
		};	

	}());	
}

if (typeof exports !== 'undefined') {
	F5.extend(exports, F5);
}

	
