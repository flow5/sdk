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

function appName(pkg) {
	return pkg && pkg.split('.')[0];
}

function manifestName(pkg) {
	if (pkg && pkg.split('.')[1]) {
		return pkg.split('.')[1] + '.manifest';
	} else {
		return 'manifest';
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
	assert(query.app, 'Bad parameter "app" = ' + query.app);
}	

function doGenerate(parsed, req, res) {
	try {
		var agent = req.headers['user-agent'];
		if (!parsed.query.platform) {
			if (agent.match(/android/i)) {
				parsed.query.platform = 'android';
			} else {
				parsed.query.platform = 'ios';						
			}
		}
		if (!parsed.query.mobile) {
			if (agent.match(/(iphone)|(android)/i)) {
				parsed.query.mobile = 'true';
			} else {
				parsed.query.mobile = 'false';
			}
		}
		
		verifyQueryParameters(parsed.query);
		var html = generator.generateHtml(parsed);
		if (parsed.query.compress === 'false') {
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
	parsed.query = {
		app: 'ide',
		manifest: 'manifest',
		debug: 'true',
		platform: 'ios',
		inline: 'true',
		compress: 'false',
		mobile: 'false',
		native: 'false'
	};
	doGenerate(parsed, req, res);	
}

function doProxy(parsed, req, res) {

	var proxyRequest = url.parse(parsed.query.url);	
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

function doManifest(parsed, req, res) {
//	res.writeHead(404);
	res.writeHead(200, {'Content-Type': 'text/cache-manifest'});
	try {
		verifyQueryParameters(parsed.query);					
		res.write(generator.generateCacheManifest(parsed.query));					
	} catch (e) {
		console.log('error:' + e.stack);
	}
	res.end();	
}

function doService(parsed, req, res) {
	try {
		var service = require('../www/services/' + parsed.query.app + '/' + parsed.query.name + '.js');

		req.body = '';
		req.on('data', function (chunk) {
			req.body += chunk;
		});	
		req.on('end', function () {
			try {
				service.exec(parsed.query, req.body, function (results) {
					res.writeHead(200, {'Content-Type': 'application/json',
										'Access-Control-Allow-Origin': '*'});
					res.write(results);						
					res.end();
				});							
			} catch (e2) {
				console.log('error:' + e2.message);
				res.writeHead(500);
				res.end();											
			}
		});										
	} catch (e1) {
		console.log('error:' + e1.message);
		res.end();				
	}	
}

function doDefault(parsed, req, res) {
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
		
		parsed.query.app = parsed.query.app || appName(parsed.query.pkg);
		parsed.query.manifest = parsed.query.manifest || manifestName(parsed.query.pkg);

		var pathname = url.parse(req.url).pathname;
		
//		if (options.verbose) {
			console.log(pathname);
//			console.log(parsed);		
//		}
				
		switch (req.method) {
			case 'POST':
				switch(pathname) {
					case '/generate':
						getMessageBody(req, function (body) {
							// assume that the body is a facebook signed request
							parsed.query.body = body;
							doGenerate(parsed, req, res);					
						});
						break;
					case '/dot2svg':
						doDot2Svg(req, res);	
						break;
					case '/proxy':
						doProxy(parsed, req, res);
						break;
					case '/service':
						doService(parsed, req, res);
						break;
					default:
						res.writeHead(404);
						res.end();				
				}
				break;		
			case 'GET':
				switch (pathname) {
					case '/generate':
						doGenerate(parsed, req, res);
						break;
					case '/ide':
						doIDE(parsed, req, res);
						break;
					case '/proxy':
						doProxy(parsed, req, res);				
						break;
					case '/cache.manifest':
						doManifest(parsed, req, res);
						break;	
					case '/service':
						try {
							var service = require(process.cwd() + '/www/services/' + 
														parsed.query.app + '/' + parsed.query.name + '.js');

							service.exec(parsed.query, function (results) {
								res.writeHead(200, {'Content-Type': 'application/json',
													'Access-Control-Allow-Origin': '*'});
								res.write(JSON.stringify(results));						
								res.end();
							});
						} catch (e3) {
							console.log('error:' + e3.message);
							res.writeHead(500);					
							res.end();
						}				
						break;
					default:
						doDefault(parsed, req, res);					
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
	console.log('HTTPS server listening on port ' + options.port + 1);
	console.log('HTTP server listening on port ' + options.port);	
});

