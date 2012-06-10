#!/usr/bin/env node
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

var http = require('http'),
	https = require('https'),
	npm = require('npm'),
	fs = require('fs'),
	cli = require('cli'),
	path = require('path'),
	paperboy = require('paperboy'),
	exec = require('child_process').exec,	 
	spawn = require('child_process').spawn,	
	url = require('url'),
	util = require('util');
	
var WEBROOT = path.resolve(__dirname, '../..', 'site');
		
// flow5 libs
var generator = require('./generator.js');	

// TODO: move to utility package
function packageDomain(pkg) {
	return pkg && pkg.split('.')[0];
}

function packageBase(pkg) {
	var key = 'flow5:link_' + packageDomain(pkg);
	var value = npm.config.get(key);
	if (!value) {
		return null;
	} else {
		return value + '/';
	}
}


function forEach(obj, fn) {
	if (obj.constructor === Array) {
		obj.forEach(fn);
	} else {
		var name;
		for (name in obj) {
			if (obj.hasOwnProperty(name)) {
				fn(name, obj[name]);
			}
		}							
	}
}

function getMessageBody(req, cb) {
	var body = '';
	
	req.on('data', function (chunk) {
		body += chunk;
	});
	
	req.on('end', function () {
		cb(body);
	});
}

function doDot2Svg(req, res) {	
	/*global Iuppiter*/
//	require('3p/Iuppiter.js');	
		
	var child = spawn('dot', ['-Tsvg']);		

//	req.buffer = '';
	
	req.on('data', function (chunk) {
//		req.buffer += chunk;
		child.stdin.write(chunk);
	});	
	req.on('end', function () {
//		child.stdin.write(Iuppiter.decompress(Iuppiter.Base64.decode(Iuppiter.toByteArray(req.buffer))));
		child.stdin.end();
	});
	
	child.stdout.on('data', function (data) {
		res.write(data);
	});		
	child.on('exit', function (code) {
		res.end();
	});		
	child.stderr.on('data', function (data) {
		util.puts(data);
	});	
	
	res.writeHead(200, {'Content-Type': 'image/svg+xml', 'sequence-number': req.headers['sequence-number']});		
}

function showRequest(req, printHeaders) {
	util.puts('------------------------------------');
	util.puts(req.url);
	if (printHeaders) {
		var name;
		for (name in req.headers) {
			if (req.headers.hasOwnProperty(name)) {
				util.puts(name + ' : ' + req.headers[name]);				
			}
		}			
	}
}

function assert(cond, message) {
	if (!cond) {
		throw new Error(message);
	}
}

function isBool(value) {
	return value && (value === 'true' || value === 'false');
}

function isPlatform(value) {
	return value && (value === 'ios' || value === 'android');
}

function verifyQueryParameters(query) {
	assert(isBool(query.debug), 'Bad parameter "debug" = ' + query.debug);
	assert(isBool(query.native), 'Bad parameter "native" = ' + query.native);
	assert(isBool(query.inline), 'Bad parameter "inline" = ' + query.inline);
	assert(isBool(query.compress), 'Bad parameter "compress" = ' + query.compress);
	assert(isBool(query.mobile), 'Bad parameter "mobile" = ' + query.mobile);
	assert(isPlatform(query.platform), 'Bad parameter "platform" = ' + query.platform);
	assert(query.pkg, 'Bad parameter "pkg" = ' + query.pkg);
}	

function doGenerate(query, req, res) {
	var agent = req.headers['user-agent'];
	if (!query.platform) {
		if (agent.match(/android/i)) {
			query.platform = 'android';
		} else {
			query.platform = 'ios';						
		}
	}
	if (!query.mobile) {
		if (agent.match(/(iphone)|(android)/i)) {
			query.mobile = 'true';
		} else {
			query.mobile = 'false';
		}
	}
		
	try {			
		verifyQueryParameters(query);

		var html;
		if (query.headless) {
			generator.generateScript(query, function (err, script) {
				if (err) {
					console.log(err);
					res.writeHead(500);
					res.write(err.stack);
					res.end();
				} else {
					res.writeHead(200, {'Content-Type': 'application/javascript'});
					res.write(script);
					res.end();												
				}
			});
		} else if (query.geometry) {
			html = generator.generateFrame(query);
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(html);
			res.end();								
		} else {
			generator.generateHtml(query, function (err, html) {
				if (err) {
					console.log(err);
					res.writeHead(500);
					res.write(err.stack);
					res.end();
				} else {
					res.writeHead(200, {'Content-Type': 'text/html'});
					res.write(html);
					res.end();					
				}
			});

		}
	} catch (e2) {
		console.log('error:' + e2.message);
		// TODO: would be nice to return 404 if the appname is bad
		res.writeHead(500);
		res.end();					
	}	
}

function doIDE(query, req, res) {
	doGenerate({
		pkg: 'ide',
		debug: 'true',
		platform: 'ios',
		inline: 'false',
		compress: 'false',
		mobile: 'false',
		native: 'false',
		app: query.app,
		devserv: query.devserv
	}, req, res);	
}

function doProxy(query, req, res) {

	var proxyRequest = url.parse(query.url);	
	var proxyProtocol = proxyRequest.protocol.replace(':', '');

	var options = {
		 hostname: proxyRequest.hostname,
		 port: proxyRequest.port,
		 path: proxyRequest.path,
		 method: req.method,
		 headers: req.headers
	};

	if (options.headers) {
		delete options.headers.host;
	}

	var proxyReq = {http: http, https: https}[proxyProtocol].request(options, function (proxyRes) {

		proxyRes.on('data', function(chunk) {
			res.write(chunk, 'binary');
		});

		proxyRes.on('end', function() {
			res.end();
		});
		res.writeHead(proxyRes.statusCode, proxyRes.headers);
	});

	req.addListener('data', function(chunk) {
		proxyReq.write(chunk, 'binary');
	});

	req.addListener('end', function() {
		proxyReq.end();
	});
}

function doManifest(query, req, res) {
//	res.writeHead(404);
	try {
		verifyQueryParameters(query);			
		generator.generateCacheManifest(query, function (err, manifest) {
			if (err) {
				console.log(err);
				res.writeHead(500);
				res.write(err.stack);
			} else {
				res.writeHead(200, {'Content-Type': 'text/cache-manifest'});
				res.write(manifest);									
			}
			res.end();	
		});
	} catch (e) {
		console.log('error:' + e.stack);
	}
}

function doService(query, req, res) {
	
	var service = require('../www/services/' + packageDomain(query.pkg) + '/' + query.name + '.js');
	
	function execService(body) {
		try {
			function complete(results) {
				// TODO: allow-origin shouldn't be required here since the page is loaded from same domain?
				res.writeHead(200, {'Content-Type': 'application/json',
									'Access-Control-Allow-Origin': '*'});
				res.write(JSON.stringify(results));						
				res.end();				
			}
			if (body) {
				service.exec(query, body, complete);			
			} else {
				service.exec(query, complete);							
			}
		} catch (e2) {
			console.log('error:' + e2.message);
			res.writeHead(500);
			res.end();											
		}		
	}
	
	try {
		switch (req.method) {
			case 'POST':
			case 'PUT':
				getMessageBody(execService);
				break;
			default:
				execService();
				break;
		}
	} catch (e1) {
		console.log('error:' + e1.message);
		res.end();				
	}	
}

var channels = {};

function doListen(query, req, res) {
//	console.log(req.url);
	
	var channel = channels[query.channel];
	
	if (channel && channel[query.clientid]) {
		res.writeHead(200, {'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*'});
		if (channel[query.clientid].queue.length) {
			res.write(channel[query.clientid].queue.shift());
			res.end();
		} else {
			// hanging get
			channel[query.clientid].res = res;
		}			
	} else {
		res.writeHead(404);
		res.end();
	}	
}
function doTalk(query, req, res) {	
//	console.log(req.url);
	
	var channel = channels[query.channel];
	
	if (channel) {
		getMessageBody(req, function (body) {	
//			console.log(body);			
			// write to all of the open channels
			forEach(channel, function (clientid, client) {
				if (clientid !== query.clientid) {
					if (client.res) {
						client.res.write(body);
						client.res.end();
						client.res = null;
					} else {
						client.queue.push(body);
					}
				}
			});
			res.writeHead(200);
			res.write(JSON.stringify({result: 'ok'}));
			res.end();
		});		
	} else {
		res.writeHead(404);
		res.end();		
	}
}

var clientid = 0;
function doClientId(query, req, res) {
	clientid +=1 ;	
	res.writeHead(200, {'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*'});		
	res.write(clientid.toString());
	res.end();
}

function doConnectListener(query, req, res) {
	if (!channels[query.channel]) {
		channels[query.channel] = {};
	}
	
	if (channels[query.channel][query.clientid]) {
		console.log('reconnecting listener: ' + query.clientid + ' channel: ' + query.channel);				
		if (channels[query.channel][query.clientid].timeout) {
			clearTimeout(channels[query.channel][query.clientid].timeout);
			delete channels[query.channel][query.clientid].timeout;		
		}
	} else {
		console.log('connecting listener: ' + query.clientid + ' channel: ' + query.channel);		
		channels[query.channel][query.clientid] = {res: null, queue: []};		
	}
	res.writeHead(200);
	res.on('close', function () {
		console.log('listener disconnected: ' + query.clientid + ' waiting for reconnect. . .');					
		// wait 1s after connection close to give the client time to reconnect
		if (channels[query.channel][query.clientid]) {
			channels[query.channel][query.clientid].timeout = setTimeout(function () {
				delete channels[query.channel][query.clientid];
				console.log('listener disconnected: ' + query.clientid + ' closing connection');					
			}, 1000);			
		}
	});
}

function doWaitForConnection(query, req, res) {
	res.writeHead(200);
	res.write(JSON.stringify({result: 'ok'}));
	res.end();
}

function doDefault(query, req, res) {
	// TODO: allow-origin shouldn't be required here since the page is loaded from same domain?	
	
	var root = WEBROOT;
	if (query.pkg) {
		root = packageBase(query.pkg) + 'www/';
	}
	
	paperboy
		.deliver(root, req, res)
		.addHeader('Access-Control-Allow-Origin', '*')
		.error(function () {
			util.puts('Error delivering: ' + req.url);
		})
		.otherwise(function () {
			res.writeHead(404, {'Content-Type': 'text/plain'});
			res.end();
		});		
}

// http://en.wikipedia.org/wiki/List_of_HTTP_status_codes
exports.start = function (args, options, cb) {
	
	debugger;
		
	npm.load({}, function () {
		function handleRequest(req, res, protocol) {
			// prevent directory climbing through passed parameters
			var parsed = url.parse(req.url.replace('..', ''), true);	

			var pathname = url.parse(req.url).pathname;

			if (options.verbose) {
				console.log(req.method);
				console.log(pathname);
				console.log(parsed);		
			}

			parsed.query.devserv = protocol + '://' + req.headers.host;	
			
			if (parsed.query.pkg && !packageBase(parsed.query.pkg)) {
				res.writeHead(500);
				res.write('Unknown package: ' + parsed.query.pkg + '. Did you flow5 link?');
				res.end();				
				return;
			}
			
			switch (req.method) {
				case 'POST':
					switch(pathname) {
						case '/generate':
							getMessageBody(req, function (body) {
								// assume that the body is a facebook signed request
								parsed.query.body = body;
								doGenerate(parsed.query, req, res);					
							});
							break;
						case '/dot2svg':
							doDot2Svg(req, res);	
							break;
						case '/proxy':
							doProxy(parsed.query, req, res);
							break;
						case '/service':
							doService(parsed.query, req, res);
							break;
						case '/talk': 
							doTalk(parsed.query, req, res);
							break;
						default:
							res.writeHead(404);
							res.end();				
					}
					break;		
				case 'GET':
					switch (pathname) {
						case '/generate':
							doGenerate(parsed.query, req, res);
							break;
						case '/ide':
							doIDE(parsed.query, req, res);
							break;
						case '/proxy':
							doProxy(parsed.query, req, res);				
							break;
						case '/cache.manifest':
							doManifest(parsed.query, req, res);
							break;	
						case '/service':
							doService(parsed.query, req, res);
							break;
						case '/listen': 
							doListen(parsed.query, req, res);
							break;						
						case '/clientid': 
							doClientId(parsed.query, req, res);
							break;						
						case '/connectListener': 
							doConnectListener(parsed.query, req, res);
							break;						
						case '/waitForConnection': 
							doWaitForConnection(parsed.query, req, res);
							break;						
						default:
							doDefault(parsed.query, req, res);					
					}
					break;
				case 'OPTIONS':
					// allow everything
					var responseHeaders = {
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': req.headers['access-control-request-method'],
						'Access-Control-Allow-Headers': req.headers['access-control-request-headers']
					};
					res.writeHead(200, responseHeaders);
					res.end();
					break;
				default:
					res.writeHead(405);
					res.end();
					break;
			}		
		}

		http.createServer(function (req, res) {					
			if (options.verbose) {
				showRequest(req, true);			
			}		
			handleRequest(req, res, 'http');		
		}).listen(options.port);

		var httpsOptions = {
		  key: fs.readFileSync(__dirname + '/https/privatekey.pem'),
		  cert: fs.readFileSync(__dirname + '/https/certificate.pem')
		};	
		https.createServer(httpsOptions, function (req, res) {
			if (options.verbose) {
				showRequest(req, true);			
			}		
			handleRequest(req, res, 'https');										
		}).listen(options.port + 1);
		
		cb({
			webroot: WEBROOT,
			http: options.port,
			https: parseInt(options.port, 10) + 1
		});
	});			
};

