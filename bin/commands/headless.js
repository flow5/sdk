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
/*global F5:true, io:true, XMLHttpRequest:true*/

var http = require('http'),
	vm = require('vm');

io = require('socket.io-client');
	
F5 = {query: {devserv:'http://localhost:8008'}};
	
require('../../www/lib/utils.js');
require('../../www/lib/network.js');
		
XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

exports.usage = "headless package";

exports.options = {
};


exports.exec = function (args, options, cli) {
	if (!args[0]) {
		cli.getUsage();
	}
	var pkg = args[0];
	
	
	var socket = io.connect(F5.query.devserv);
	socket.on('message', function (message) {
		if (message.type === 'exit') {
			console.log('received exit command');
			process.exit(0);
		}		
	});
	
	process.on('uncaughtException', function (e) {
		socket.emit('message', {type:'uncaughtException', message: e.message}, function () {
			process.exit(1);			
		});
	});	
	
	var appDomain = pkg.split('.')[0];
	var appPackage = pkg.split('.')[1];
			
	var path = '/' + appDomain + '/?' +
				'&debug=true' +
				'&platform=ios' + 
				'&native=false' + 
				'&inline=false' + 
				'&compress=false' +
				'&mobile=false' +
				'&headless=true' +
				'&ide=true';
	
	if (appPackage) {
		path += '&pkg=' + appPackage;
	}

	http.get({host: 'localhost', port: 8008, path: path}, function(res) {
		res.setEncoding('utf8');

		var script = '';

		res.on('data', function(chunk){
			script += chunk;
		});

		res.on('end', function(chunk){
			vm.runInThisContext(script, 'app.js');
		});			
	}).on('error', function (e) {
		console.log(e);
	});			
};


