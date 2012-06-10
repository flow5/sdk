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
	vm = require('vm'),
	npm = require('npm'),
	fs = require('fs');
	
XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
	
require('../../www/lib/utils.js');
require('../../www/lib/network.js');
require('../../www/debug/pipe.js');
		
exports.usage = "script package script_name [OPTIONS]";

exports.options = {
	steptime: ['t', 'steptime', 'number', 0]
};

var count = 0;
function id() {
	count += 1;
	return count;
}

var executeScript;

function makeTask(pkg, command, pipe, channel, options) {
	function complete(message, cb) {
		var script;
		if (command.postprocess) {
			script = command.postprocess(message.value);	
		}
		if (script) {
			setTimeout(function () {
				executeScript(pkg, script, options, pipe, cb);	
			}, options.steptime);
		} else {
			setTimeout(cb, options.steptime);				
		}		
	}
		
	return function (cb) {
		function listen() {
			pipe.listen(function (message) {
				message = JSON.parse(message);		
				if (message.type === 'uncaughtException'){
					console.log(message);
					process.exit(1);
				} else if (command.message.id === message.id) {
					complete(message, cb);
				} else{
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

executeScript = function (pkg, script, options, pipe, cb) {
	
	var channel = pkg + '.app';
	
	var tasks = [];
	script.forEach(function (command) {
		tasks.push(makeTask(pkg, command, pipe, channel, options));		
	});	
	
	F5.chainTasks(tasks, cb);
};


exports.exec = function (args, options, cli) {
	
	if (!args[0] || !args[1]) {
		cli.getUsage();
	}			
	
	npm.load({}, function () {
		if (!args[0] || (!options.unlink && !args[1])) {
			cli.getUsage();
		}		
		
		var pkg = args[0];
		var scriptName = args[1];
		
		var uri = npm.config.get('flow5:link_' + pkg.split('.')[0]);
		
		F5.openPipe('script.js', pkg + '.listener', function (pipe) {	
			var scriptName = args[1];

			function runScript(script) {
				vm.runInThisContext(script, scriptName);				
				executeScript(pkg, commands, options, pipe, function () {
					pipe.close();
				});
			}
						
			var path = uri + '/scripts/' + scriptName + '.js';			
			fs.readFile(path, 'utf8', function (err, script) {
				if (err) {
					console.log(err);
					cli.exit();
				} else {
					runScript(script);
				}
			});
			
			// if uri is a url do this

/*			http.get({host: 'localhost', port: 8008, path: path}, function(res) {
				res.setEncoding('utf8');

				var script = '';
				res.on('data', function(chunk){
					script += chunk;
				});

				res.on('end', function(chunk){
					runScript(script);
				});	
			});	
*/		
		});

	});	
};




