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

// flow5
var builder = require('./build.js');


paperboy.contentTypes.otf = 'font/opentype';
paperboy.contentTypes.ttf = 'font/opentype';

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


function subpackage(domain) {
	if (domain && domain.split('.')[1]) {
		return domain.split('.')[1];
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

function doBuild(query, req, res) {
	var agent = req.headers['user-agent'];

	if (!query.platform) {
		if (agent.match(/android/i)) {
			query.platform = 'android';
		} else {
			query.platform = 'ios';
		}
	}
	if (!query.mobile) {
		if (agent.match(/(iphone)|(android)|(silk)/i)) {
			query.mobile = 'true';
		} else {
			query.mobile = 'false';
		}
	}

	try {
		var html;
		if (query.headless) {
			builder.buildScript(query, function (err, script) {
				if (err) {
					console.error(err);
					res.writeHead(500);
					res.write(err.stack);
					res.end();
				} else {
					res.writeHead(200, {'Content-Type': 'application/javascript'});
					res.write(script);
					res.end();
				}
			});
		} else if (query.frame === 'true') {
			html = builder.buildFrame(query);
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(html);
			res.end();
		} else {
			builder.buildHtml(query, function (err, html) {
				if (err) {
					console.error(err.stack || err);
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
		console.error(e2.stack || e2);
		// TODO: would be nice to return 404 if the appname is bad
		res.writeHead(500);
		res.end();
	}
}

function doManifest(query, req, res) {
//	res.writeHead(404);
	try {
		builder.buildCacheManifest(query, function (err, manifest) {
			if (err) {
				console.error(err.stack || err);
				res.writeHead(500);
				res.write(err.stack);
			} else {
				res.writeHead(200, {'Content-Type': 'text/cache-manifest'});
				res.write(manifest);
			}
			res.end();
		});
	} catch (e) {
		console.error('error:' + e.stack);
	}
}

function doService(resource, query, req, res) {
	var servicePath = domainBase(query.domain) + 'services/' + resource + '.js';
	try {
		var service = require(servicePath);
		try {
			service.handleRequest(req, res);
		} catch (serviceError) {
			res.writeHead(500, {'Content-Type': 'text/plain'});
			res.write(serviceError.stack || serviceError);
		}
	} catch (e) {
		if (resource === 'default') {
			res.writeHead(404, {'Content-Type': 'text/plain'});
			console.error(e.stack)
			res.end();
		} else {
			doService('default', query, req, res);
		}
	}
}

function doGET(resource, query, req, res) {
	var root = domainBase(query.domain) + 'www/';

	var package = subpackage(query.domain);
	if (package) {
		root += 'packages/' + package;
	}

	req.url = req.url.replace(query.domain + '/', '');

//	console.log(query);

	// try to serve the file normally
	paperboy
		.deliver(root, req, res)
		.addHeader('Access-Control-Allow-Origin', '*')
		.error(function () {
			util.puts('Error delivering: ' + req.url);
		})
		.otherwise(function () {
			// otherwise see if it's a service
			doService(resource, query, req, res);
		});
}

// http://en.wikipedia.org/wiki/List_of_HTTP_status_codes
exports.start = function (args, options, cb) {

//	debugger;

	npm.load({}, function () {
		function handleRequest(req, res, protocol) {
			var parsed = url.parse(req.url, true);

			var pathname = url.parse(req.url).pathname;

			if (options.verbose) {
				console.error(req.method);
				console.error(pathname);
				console.error(parsed);
			}

			parsed.query.devserv = protocol + '://' + req.headers.host;

			parsed.query.domain = pathname.split('/')[1];
			var resource = pathname.split('/').slice(2).join('/');

			if (!domainBase(parsed.query.domain)) {
				res.writeHead(500);
				var error = 'Unknown domain: ' + parsed.query.domain + '. Did you flow5 link?';
				console.error(error)
				res.write(error);
				res.end();
				return;
			}

			switch (req.method) {
				case 'POST':
					switch(resource) {
						case '':
							getMessageBody(req, function (body) {
								// this is probably a facebook signed request
								parsed.query.body = body;
								doBuild(parsed.query, req, res);
							});
							break;
						default:
							doService(resource, parsed.query, req, res);
					}
					break;
				case 'PUT':
					doService(resource, parsed.query, req, res);
					break;
				case 'GET':
					switch (resource) {
						case '':
							doBuild(parsed.query, req, res);
							break;
						case 'cache.manifest':
							doManifest(parsed.query, req, res);
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

		io.on('connection', function (socket) {
			socket.on('message', function (message) {
				socket.broadcast.emit('message', message);
			});
		});

		cb(result);
	});
};

