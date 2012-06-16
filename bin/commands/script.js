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
	fs = require('fs'),
	io = require('socket.io-client');
	
XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
	
require('../../www/lib/utils.js');
require('../../www/lib/network.js');
		
exports.usage = "script domain script_name [OPTIONS]";

exports.options = {
	steptime: ['t', 'steptime', 'number', 0]
};

var count = 0;
function id() {
	count += 1;
	return count;
}

var executeScript;

var socket = io.connect(F5.query.devserv);

var completeFunction;
socket.on('message', function (message) {
	if (message.model) {
		return;
	}

	if (completeFunction) {
		completeFunction(message);
		completeFunction = null;
	} else {
		console.log('unexpected message: ' + JSON.stringify(message));
		socket.emit('message', {type: 'exit'});
		process.exit(1);
	}
});

function makeTask(command, options) {
	function complete(message, cb) {
		var script;
		if (command.postprocess) {
			script = command.postprocess(message.value);	
		}
		if (script) {
			setTimeout(function () {
				executeScript(script, options, cb);	
			}, options.steptime);
		} else {
			setTimeout(cb, options.steptime);				
		}		
	}
		
	return function (cb) {
		if (command.preprocess) {
			command.preprocess();
		}
		
		command.message.id = id();
		
		completeFunction = function (message) {
			if (message.type === 'uncaughtException'){
				console.log(message);
				process.exit(1);
			} else if (command.message.id === message.id) {
				complete(message, cb);
			}				
		};
		
		socket.emit('message', command.message, function () {
			if (command.message.type === 'exit') {
				process.exit(0);
			}
		});		
	};
}

executeScript = function (script, options, cb) {	
	var tasks = [];
	script.forEach(function (command) {
		tasks.push(makeTask(command, options));		
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
		
		var domain = args[0];
		var scriptName = args[1];
		
		var uri = npm.config.get('flow5:link_' + domain);	
		var path = uri + '/scripts/' + scriptName + '.js';			
		fs.readFile(path, 'utf8', function (err, script) {
			if (err) {
				console.log(err);
				cli.exit();
			} else {
				vm.runInThisContext(script, scriptName);	
				// each script is commands = [. . .]			
				executeScript(commands, options, function () {
					console.log('done');
					socket.emit('message', {type: 'exit'});
					process.exit(0);
				});
			}
		});						
	});	
};


// if uri is a url do this
/*		http.get({host: 'localhost', port: 8008, path: path}, function(res) {
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





