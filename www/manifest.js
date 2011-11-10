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

exports.scripts = [
	'require.js',
	'jsext.js',
	'f5.js',
	'utils.js',
	'animation.js',
	'defaultviewdelegates.js', // TODO: move this to debugScripts?
	'domext.js',
	'flow.js',
	'flowcontroller.js',
	'3p/Iuppiter.js',
	'templates.js',
	'ui.js',
	'viewcontroller.js',
];

exports.elements = [
	'default.css',
];

exports.webScripts = [
	'widgets/navigationcontroller.js'
];

exports.nativeScripts = [
	'widgets/navigationcontroller_native.js'
];

exports.debugDesktopScripts = [
	'debug/flow_diags.js',
	'debug/flowcontroller_diags.js',
	'debug/webharness.js',
	'debug/json.js'
];

exports.debugElements = [
	'debug/json.css',
	'debug/webharness.css',
	'debug/webharness.html'
];
