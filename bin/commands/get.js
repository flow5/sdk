#!/usr/bin/env node
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
var npm = require('npm');

exports.options = {
	debug: ['d', 'debug', 'boolean', false],
	platform: ['p', 'platform', 'string', 'ios'],
	native: ['n', 'native', 'boolean', false],
	inline: ['i', 'inline', 'boolean', false],
	compress: ['c', 'compress', 'boolean', false],
	mobile: ['m', 'mobile', 'boolean', false],
	headless: ['h', 'headless', 'boolean', false],
	manifest: ['X', 'generate the cache manifest', 'boolean', false],
	cache: ['x', 'generate the cache.manifest header', 'boolean', false],
	lib: ['l', 'package is a library', 'boolean', false]
};

exports.usage = 'get pkg [OPTIONS]';

var builder = require('../server/build.js');

exports.exec = function (args, options, cli) {
	if (!args[0]) {
		cli.getUsage();
	}		
	
	var pkg = args[0];
	
	var appDomain = pkg.split('.')[0];
	var appPackage = pkg.split('.')[1];
	
	var query = {
		domain: appDomain,
		pkg: appPackage,
		debug: JSON.stringify(options.debug),
		platform: options.platform,
		inline: JSON.stringify(options.inline),
		compress: JSON.stringify(options.compress),
		mobile: JSON.stringify(options.mobile),
		cache: JSON.stringify(options.cache),
		lib: JSON.stringify(options.lib)
	};

	npm.load({}, function () {	
		var method = options.manifest ? 'buildCacheManifest' : 'buildHtml';
		builder[method](query, function (err, html) {
			if (err) {
				console.error(err.stack || err);
			} else {
				console.log(html);
			}
		});			
	});	
};
