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



