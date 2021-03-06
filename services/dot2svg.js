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
var spawn = require('child_process').spawn,	
	util = require('util');

exports.handleRequest = function (req, res) {	
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
        util.puts(data);
    });    

    res.writeHead(200, {'Content-Type': 'image/svg+xml', 'sequence-number': req.headers['sequence-number']});
};