(function () {
	
	var Flow = require('./flow.js').Flow;				
	
	var flow = new Flow();		
	require('./flow_diags.js').instrument(Flow);	
		
	var graphSpec = [
		{
			id: 'start',
			type: 'mutex',
			selection: 'a',
			children: [
				{
					id: 'a',
					type: 'flow',
					start: {
						id: 'start',
						transitions: [
							{
								name: 'finish',
								to: 'finish'
							}
						]
					}
				},
				{
					id: 'b',
					type: 'flow',
					start: {
						id: 'start',
						decisions: [
							{
								id: 'confirm',
								to: {
									yes: 'finish',
									no: null
								}
							}
						]
					}
				}
			]				
		},
	
		{
			id: 'finish'		
		}
	];
	
	flow.validateGraphSpec(graphSpec);
	
	flow.injectGraph(graphSpec);
	console.log(flow.logToDOT());
	
}());