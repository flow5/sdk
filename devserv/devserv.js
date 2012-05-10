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

if (process.env.npm_package_config_root) {
	process.chdir(process.env.npm_package_config_root);
}

var WEBROOT = process.cwd() + '/www';

// nodelibs
var http = require('http'),
	https = require('https'),
	fs = require('fs'),
	cli = require('cli'),
	path = require('path'),
	paperboy = require('paperboy'),
	exec = require('child_process').exec,	 
	spawn = require('child_process').spawn,	
	url = require('url'),
	sys = require('sys');
		
// flow5 libs
var generator = require('./generator.js');	

cli.setUsage("node devserv.js [OPTIONS]");

cli.parse({
	port: ['p', 'port', 'number'],
	verbose: ['v', 'verbose logging'],
});

function pkgDomain(pkg) {
	return pkg && pkg.split('.')[0];
}

function pkgName(pkg) {
	if (pkg && pkg.split('.')[1]) {
		return pkg.split('.')[1] + '.manifest';
	} else {
		return 'manifest';
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

function compress(html, res) {
		
	// CSS compression is done in generate() pre-image inlining. this is both for efficiency and
	// because the inline images break the yuicompressor
	var options = ['-jar', __dirname + '/htmlcompressor-1.5.2.jar', '--compress-js'];
//	var options = ['-jar', __dirname + '/htmlcompressor-1.5.2.jar', '--compress-css', '--compress-js'];
	var child = spawn('java', options);
	
	child.stdout.on('data', function (data) {
//		console.log(data.toString());
		res.write(data);
	});
	child.on('exit', function (code) {
		res.end();
	});		
	child.stderr.on('data', function (data) {
		sys.puts(data);
	});	

	res.writeHead(200, {'Content-Type': 'text/html'});
	
	child.stdin.write(html);
	child.stdin.end();		
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
		sys.puts(data);
	});	
	
	res.writeHead(200, {'Content-Type': 'image/svg+xml', 'sequence-number': req.headers['sequence-number']});		
}

function showRequest(req, printHeaders) {
	sys.puts('------------------------------------');
	sys.puts(req.url);
	if (printHeaders) {
		var name;
		for (name in req.headers) {
			if (req.headers.hasOwnProperty(name)) {
				sys.puts(name + ' : ' + req.headers[name]);				
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
	try {
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
		
		verifyQueryParameters(query);
		
		var html = generator.generateHtml(query);
		
		if (query.compress === 'false') {
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(html);
			res.end();					
		} else {
			compress(html, res);					
		}					
	} catch (e2) {
		console.log('error:' + e2.message);
		// TODO: would be nice to return 404 if the appname is bad
		res.writeHead(500);
		res.end();					
	}		
}

function doIDE(parsed, req, res) {
	doGenerate({
		pkg: 'ide',
		debug: 'true',
		platform: 'ios',
		inline: 'true',
		compress: 'false',
		mobile: 'false',
		native: 'false'
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
	res.writeHead(200, {'Content-Type': 'text/cache-manifest'});
	try {
		verifyQueryParameters(query);					
		res.write(generator.generateCacheManifest(query));					
	} catch (e) {
		console.log('error:' + e.stack);
	}
	res.end();	
}

function doService(query, req, res) {
	
	var service = require('../www/services/' + pkgDomain(query.pkg) + '/' + query.name + '.js');
	
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

var listeners = {};
function doMessage(query, req, res) {
	function getChannel() {
		if (!listeners[query.channel]) {
			listeners[query.channel] = {};
		}
		return listeners[query.channel];
	}
	var channel;
	
	switch (req.method) {
	case 'POST':
		getMessageBody(req, function (body) {	
			channel = getChannel();
			// write to all of the open channels
			forEach(channel, function (clientid) {
				if (clientid !== query.clientid) {
					channel[clientid].write(body);
					channel[clientid].end();
					delete channel[clientid];					
				}
			});
			res.writeHead(200);
			res.write(JSON.stringify({result: 'ok'}));
			res.end();
		});
		break;
	case 'GET':
		// create a hanging get
		channel = getChannel();
		console.log(query)
		channel[query.clientid] = res;
		res.writeHead(200, {'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*'});		
		break;
	default:
		console.log('Bad method: ' + req.method + ' for /message');
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

function doDefault(query, req, res) {
	// TODO: allow-origin shouldn't be required here since the page is loaded from same domain?	
	paperboy
		.deliver(WEBROOT, req, res)
		.addHeader('Access-Control-Allow-Origin', '*')
		.error(function () {
			sys.puts('Error delivering: ' + req.url);
		})
		.otherwise(function () {
			res.writeHead(404, {'Content-Type': 'text/plain'});
			res.end();
		});		
}

// http://en.wikipedia.org/wiki/List_of_HTTP_status_codes
cli.main(function (args, options) {
	
	options.port = process.env.npm_package_config_port || options.port || 8008;
	
	function handleRequest(req, res) {
		// prevent directory climbing through passed parameters
		var parsed = url.parse(req.url.replace('..', ''), true);		
		
		var pathname = url.parse(req.url).pathname;
		
		if (options.verbose) {
			console.log(req.method);
			console.log(pathname);
			console.log(parsed);		
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
					case '/message': 
						doMessage(parsed.query, req, res);
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
					case '/message': 
						doMessage(parsed.query, req, res);
						break;						
					case '/clientid': 
						doClientId(parsed.query, req, res);
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
		handleRequest(req, res);		
	}).listen(options.port);
	
	var httpsOptions = {
	  key: fs.readFileSync('./devserv/https/privatekey.pem'),
	  cert: fs.readFileSync('./devserv/https/certificate.pem')
	};	
	https.createServer(httpsOptions, function (req, res) {
		if (options.verbose) {
			showRequest(req, true);			
		}
		handleRequest(req, res);										
	}).listen(options.port + 1);
		
	console.log('WEBROOT:' + WEBROOT);
	console.log('HTTPS server listening on port ' + (options.port + 1));
	console.log('HTTP server listening on port ' + options.port);	
});

