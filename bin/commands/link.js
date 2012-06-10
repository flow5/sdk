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

exports.options = {
	unlink: ['u', 'unlink']	
};

exports.usage = 'link pkg_domain path_or_url [OPTIONS]';

exports.exec = function (args, options) {
	var path = require('path'),
		npm = require('npm');
		
	npm.load({}, function () {
		if (!args[0] || (!options.unlink && !args[1])) {
			console.log(exports.usage);
			return;
		}		
		
		var pkgDomain = args[0];
		var uri = path.resolve(args[1]);

		var key = 'flow5:link_' + pkgDomain;
		var value = uri;

		if (options.unlink) {
			npm.commands.config(['delete', key, value]);			
		} else {
			npm.commands.config(['set', key, value]);			
		}
	});
};
