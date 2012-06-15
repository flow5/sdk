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
/*global F5:true, XMLHttpRequest:true*/

var http = require('http'),
	vm = require('vm');
	
F5 = {query: {devserv:'http://localhost:8008'}};
	
require('../../www/lib/utils.js');
require('../../www/lib/network.js');
require('../../www/debug/pipe.js');	
		
XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

exports.usage = "headless package";

exports.options = {
};


exports.exec = function (args, options, cli) {
	if (!args[0]) {
		cli.getUsage();
	}
	var pkg = args[0];
	
	F5.openPipe('run.js', pkg + '.app', function (pipe) {
		
		function listen() {
			pipe.listen(function (message) {
				message = JSON.parse(message);
				if (message.type === 'exit') {
					process.exit(0);
				} else {
					listen();
				}
			});			
		}
		listen();
	
		process.on('uncaughtException', function (e) {
			pipe.talk(pkg + '.listener', {type:'uncaughtException', message: e.message}, function () {
				process.exit(1);
			});			
		});	
				
		var path = '/generate?' +
					'pkg=' + pkg + 
					'&debug=true' +
					'&platform=ios' + 
					'&native=false' + 
					'&inline=false' + 
					'&compress=false' +
					'&mobile=false' +
					'&headless=true' +
					'&ide=true';

		http.get({host: 'localhost', port: 8008, path: path}, function(res) {
			res.setEncoding('utf8');

			var script = '';

			res.on('data', function(chunk){
				script += chunk;
			});

			res.on('end', function(chunk){
				vm.runInThisContext(script, 'app.js');
			});	
		});			
	});	
};


