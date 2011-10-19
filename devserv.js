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

/*global Buffer*/

var http = require('http'),
	fs = require('fs'),
	cli = require('cli'),
	path = require('path'),
	paperboy = require('paperboy'),
	exec = require('child_process').exec,	 
	spawn = require('child_process').spawn,	 
	sys = require('sys');
	
var WEBROOT = path.dirname(__filename);	


function doPOST(req, res) {
	
	res.writeHead(200, {'Content-Type': 'image/svg+xml'});
	
	var child = spawn('dot', ['-Tsvg']);		
	
	req.on('data', function (chunk) {
		child.stdin.write(chunk);
	});
	
	req.on('end', function () {
		child.stdin.end();
	});
	
	child.stdout.on('data', function (data) {
		res.write(data);
	});	
	
	child.on('exit', function (code) {
		res.end();
	});	
	
	child.stderr.on('data', function (data) {
//		sys.puts(data);
	});		
}



cli.setUsage("devserv.js [OPTIONS]");

cli.parse({
	port: ['p', 'port', 'number'],
});

//---------------------------------------------------------------------------------------

cli.main(function (args, options) {

	options.port = options.port ? options.port : 8008;

	http.createServer(function (req, res) {
		switch (req.method) {
		case 'POST':
			doPOST(req, res);
			break;
		case 'GET':
			paperboy
				.deliver(WEBROOT, req, res)
				.error(function () {
					sys.puts('Error delivering: ' + req.url);
				})
				.otherwise(function () {
					sys.puts('No such file: ' + req.url);
					res.writeHead(404, {'Content-Type': 'text/plain'});
					res.write('NOT FOUND');
					res.end();
				});		
			break;
		case 'OPTIONS':
			// allow everything
			var responseHeaders = {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': req.headers['access-control-request-method'],
				'Access-Control-Allow-Headers': req.headers['access-control-request-headers']
			};
			console.log(responseHeaders);
			
			res.writeHead(200, 'OK', responseHeaders);
			res.end();
			break;
		default:
			res.writeHead(500);
			res.end(req.method + ' method not supported');
			break;
		}
	}).listen(options.port);
	
	console.log('HTTP server listening on port ' + options.port);
});