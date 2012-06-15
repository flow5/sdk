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
	url = require('url'),
	util = require('util');
	
var WEBROOT = path.resolve(__dirname, '../..', 'site');
		
// flow5 libs
var generator = require('./generator.js');	

// TODO: move to utility package
function packageDomain(pkg) {
	return pkg && pkg.split('.')[0];
}

function domainBase(domain) {
	var key = 'flow5:link_' + packageDomain(domain);
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
	
	if (!query.pkg) {
		query.pkg = query.domain;
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
		} else if (query.frame) {
			html = generator.generateFrame(query);
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(html);
			res.end();								
		} else {
			generator.generateHtml(query, function (err, html) {
				if (err) {
					console.log(err.stack || err);
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
		console.log(e2.stack || e2);
		// TODO: would be nice to return 404 if the appname is bad
		res.writeHead(500);
		res.end();					
	}	
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
				console.log(err.stack || err);
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

function doPOST(resource, query, req, res) {
	var servicePath = domainBase(query.domain) + 'services/' + resource + '.js';
	try {
		var service = require(servicePath);	
		getMessageBody(req, function (body) {
			service.POST(query, body, function (err, result, contentType) {
				// TODO: allow service to specify mime type?
				if (err) {
					res.writeHead(500, {'Content-Type': 'text/plain'});
					res.write(err.stack || err);
				} else if (result) {
					res.writeHead(200, {'Content-Type': contentType || 'text/plain'});						
					res.write(result);						
				}
				res.end();								
			});			
		});
	} catch (e) {
		res.writeHead(404, {'Content-Type': 'text/plain'});
//		res.write(e.stack);
		res.end();			
	}
}

function doGET(resource, query, req, res) {
	
	var root = domainBase(query.domain) + 'www/';	
	req.url = req.url.replace(query.domain + '/', '');
	
	// try to serve the file normally
	paperboy
		.deliver(root, req, res)
		.addHeader('Access-Control-Allow-Origin', '*')
		.error(function () {
			util.puts('Error delivering: ' + req.url);
		})
		.otherwise(function () {
			// see if this is a service
			var servicePath = domainBase(query.domain) + 'services/' + resource + '.js';
			try {
				var service = require(servicePath);	
				service.GET(query, function (err, result, headers) {
					if (err) {
						res.writeHead(500, {'Content-Type': 'text/plain'});
						res.write(err.stack || err);
					} else if (result) {
						res.writeHead(200, headers || {'Content-Type': 'text/plain'});						
						res.write(result);						
					}
					res.end();								
				});
			} catch (e) {
				res.writeHead(404, {'Content-Type': 'text/plain'});
				res.end();			
			}
		});		
}

// http://en.wikipedia.org/wiki/List_of_HTTP_status_codes
exports.start = function (args, options, cb) {
	
	debugger;
		
	npm.load({}, function () {
		function handleRequest(req, res, protocol) {
			var parsed = url.parse(req.url, true);	

			var pathname = url.parse(req.url).pathname;
			
			if (options.verbose) {
				console.log(req.method);
				console.log(pathname);
				console.log(parsed);		
			}

			parsed.query.devserv = protocol + '://' + req.headers.host;	
			
			parsed.query.domain = pathname.split('/')[1];
			var resource = pathname.split('/').slice(2).join('/');
						
//			if (!domainBase(parsed.query.domain)) {
//				res.writeHead(500);
//				res.write('Unknown domain: ' + parsed.query.domain + '. Did you flow5 link?');
//				res.end();				
//				return;
//			}
			
			switch (req.method) {
				case 'POST':
					switch(resource) {
						case 'generate':
							getMessageBody(req, function (body) {
								// this is probably a facebook signed request
								parsed.query.body = body;
								doGenerate(parsed.query, req, res);					
							});
							break;
						case 'proxy':
							doProxy(parsed.query, req, res);
							break;
						case 'talk': 
							doTalk(parsed.query, req, res);
							break;
						default:
							doPOST(resource, parsed.query, req, res);					
					}
					break;		
				case 'GET':
					switch (resource) {
						case 'generate':
							doGenerate(parsed.query, req, res);
							break;
						case 'proxy':
							doProxy(parsed.query, req, res);				
							break;
						case 'cache.manifest':
							doManifest(parsed.query, req, res);
							break;	
						case 'listen': 
							doListen(parsed.query, req, res);
							break;						
						case 'clientid': 
							doClientId(parsed.query, req, res);
							break;						
						case 'connectListener': 
							doConnectListener(parsed.query, req, res);
							break;						
						case 'waitForConnection': 
							doWaitForConnection(parsed.query, req, res);
							break;						
						default:
							doGET(resource, parsed.query, req, res);					
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
		
		var result = {
			webroot: WEBROOT,
			port: options.port
		};
				
		var server;
		if (options.secure) {
			var httpsOptions = {
			  key: fs.readFileSync(__dirname + '/https/privatekey.pem'),
			  cert: fs.readFileSync(__dirname + '/https/certificate.pem')
			};	
			server = https.createServer(httpsOptions, function (req, res) {
				if (options.verbose) {
					showRequest(req, true);			
				}		
				handleRequest(req, res, 'https');										
			}).listen(options.port);
			result.protocol = 'https';	
		} else {
			server = http.createServer(function (req, res) {					
				if (options.verbose) {
					showRequest(req, true);			
				}		
				handleRequest(req, res, 'http');		
			}).listen(options.port);			
			result.protocol = 'http';	
		}	
		
		var io = require('socket.io').listen(server);
		
		if (options.verbose) {
			io.set('log level', 3);			
		} else {
			io.set('log level', 0);			
		}
		
		var ide = io.of('/ide').on('connection', function (socket) {
			socket.on('update', function (message) {
				ide.emit('update', message);
			});
		});

		var app = io.of('/app').on('connection', function (socket) {
			socket.on('command', function (message) {
				app.emit('command', message);
			});
		});
		
		cb(result);		
	});			
};

