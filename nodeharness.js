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

// make the define method available in the nodejs environment
// TODO: upgrade to v5 where define is built in
require('./require.js');

var cli = require('cli');

cli.setUsage("node devserv.js [OPTIONS]");

cli.parse({
	app: ['a', 'app', 'string', 'basic'],
	format: ['f', 'toJSON|toDOT', 'string', 'toJSON'],
	output: ['o', 'stdout|stderr', 'string', 'stderr'],
});


cli.main(function (args, options) {			

	var FlowHarness = require('./flowharness').FlowHarness;
	
	require.paths.push('./apps/' + options.app);
	
	var flowHarness = new FlowHarness(function (flowController, flow) {
		process[options.output].write(flow.diags[options.format]());		
	});	
});



