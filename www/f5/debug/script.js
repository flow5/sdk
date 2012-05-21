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
/*global commands, F5:true, XMLHttpRequest:true*/

F5 = {query: {devserv:'http://localhost:8008'}};

var http = require('http'),
	cli = require('cli'),
	vm = require('vm');
	
XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
	
require('../lib/utils.js');
require('../lib/network.js');
require('./pipe.js');
		
cli.setUsage("node script.js [OPTIONS]");

cli.parse({
	pkg: ['p', 'pkg', 'string'],
	script: ['s', 'script', 'string'],
	steptime: ['t', 'steptime', 'number']
});

var count = 0;
function id() {
	count += 1;
	return count;
}

function domain(pkg) {
	return pkg.split('.')[0];
}

var executeScript;

function makeTask(command, pipe, channel, options) {
	function complete(message, cb) {
		var script;
		if (command.postprocess) {
			script = command.postprocess(message.value);	
		}
		if (script) {
			setTimeout(function () {
				executeScript(script, options, pipe, cb);	
			}, options.steptime);
		} else {
			setTimeout(cb, options.steptime);				
		}		
	}
		
	return function (cb) {
		function listen() {
			pipe.listen(function (message) {
				message = JSON.parse(message);		
				if (command.message.id === message.id) {
					complete(message, cb);
				} else if (message.type === 'uncaughtException'){
					console.log(message);
					process.exit(1);
				} else {
					// otherwise ignore the exit
					listen();
				}
			});			
		}
				
		if (command.preprocess) {
			command.preprocess();
		}
		
		command.message.id = id();
		pipe.talk(channel, command.message, function () {
			if (command.message.type === 'exit') {
				process.exit(0);
			} else {
				listen();
			}
		});
	};
}

executeScript = function (script, options, pipe, cb) {
	
	var channel = options.pkg + '.app';
	
	var tasks = [];
	script.forEach(function (command) {
		tasks.push(makeTask(command, pipe, channel, options));		
	});	
	
	F5.chainTasks(tasks, cb);
};


cli.main(function (args, options) {
	
	options.steptime = options.steptime || 0;
	
	F5.openPipe('script.js', options.pkg + '.listener', function (pipe) {					
		var scriptName = options.script + '.js';
		var path = '/scripts/' + domain(options.pkg) + '/' + scriptName;

		http.get({host: 'localhost', port: 8008, path: path}, function(res) {
			res.setEncoding('utf8');

			var script = '';
			res.on('data', function(chunk){
				script += chunk;
			});

			res.on('end', function(chunk){
				vm.runInThisContext(script, scriptName);				
				executeScript(commands, options, pipe, function () {
					pipe.close();
				});
			});	
		});	
	});
});




