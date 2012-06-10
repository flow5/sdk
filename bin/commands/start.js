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
	port: ['p', 'port', 'number'],
	verbose: ['v', 'verbose logging'],
	https: ['https', 'connect with https']
};

exports.usage = 'start [OPTIONS]';

exports.exec = function (args, options) {
	
	var spawn = require('child_process').spawn,
		path = require('path'),
		npm = require('npm');
		
	npm.load({}, function () {		
		var serverInfo = require(path.resolve(__dirname, '..', 'server', 'server.js')).start(args, options, function (info) {
			console.log(info);
			var url;
			if (options.https) {
				url = 'https://localhost:' + info.https;
			} else {
				url = 'http://localhost:' + info.http;
			}
			var args = [url];
			var browserArgs = npm.config.get('flow5:browserArgs');
			if (browserArgs) {
				args = browserArgs.split(':').concat(args);
			}
			console.log(args)
			spawn(npm.config.get('flow5:browser'), args);		
		});
	});
};

