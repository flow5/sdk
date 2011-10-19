// make the define method available in the nodejs environment
// TODO: upgrade to v5 where define is built in
require('./require.js');

var cli = require('cli');

cli.setUsage("node devserv.js [OPTIONS]");

cli.parse({
	flowfile: ['f', 'flowFile', 'path', './flows/basic_flow.js'],
	output: ['o', 'stdout|stderr', 'string', 'stderr'],
});


cli.main(function (args, options) {			
	function observer(flowController, flow) {
		var dot = flow.toDOT();			
		process[options.output].write(flow.toDOT());		
	}
	
	var FlowHarness = require('./flowharness').FlowHarness;
	var flowHarness = new FlowHarness(options.flowfile, observer);	
});



