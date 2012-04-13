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

var http = require('http'),
	fs = require('fs'),
	spawn = require('child_process').spawn;

var host = 'htmlcompressor.googlecode.com';
var compressor = 'htmlcompressor-1.5.2';
var archive = compressor + '.zip';

var request = http.get({ host: host, path: '/files/' + archive, port: 80});
request.on('response', function(res) {
	res.pipe(fs.createWriteStream(archive));
	res.on('end', function () {
		var child = spawn('unzip', [archive]);
		child.on('exit', function (code) {
			fs.renameSync(compressor + '/bin/' + compressor + '.jar', compressor + '.jar');
			fs.renameSync(compressor + '/lib/compiler.jar', 'compiler.jar');
			fs.renameSync(compressor + '/lib/yuicompressor-2.4.6.jar', 'yuicompressor-2.4.6.jar');
		});	
	});
});