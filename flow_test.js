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

/*global flow:true flowController:true*/

// make the define method available in the nodejs environment
// TODO: upgrade to v5 where define is built in
require('./require.js');

(function () {
	
	var Flow = require('./flow.js').Flow;
						
	flow = new Flow();
	
	var FlowController = require('./flowcontroller.js').FlowController;
	flowController = new FlowController(flow, function () {
		flow.toDOT('devserv');	
		//	flow.toJSON('stderr');		
	});		
	
	require('./flow_diags.js').instrument(flow);	
	
	
	var graphSpec = {
		type: 'flow',
		active: 'home',
		templates: {
			done: {
			}
		},
		children: {	
			done: 'done',
			home: {
				templates: {
					middle: {
						type: 'flow',
						active: 'middleStart',
						children: {
							middleStart: {
								type: 'flow',
								transitions: {
									beDone: {
										to: 'done'
									}
								}
							}
						}		
					},
					goSomewhere: {
						type: 'subflow',
						pickWhere: {
							middle: 'goToMiddle',
							done: 'beDone'											
						},
						cancel: null										
					}													
				},
				type: 'selector',
				active: 'a',
				children: {					
					a: {
						type: 'flow',
						active: 'start',
						children: {
							start: {
								type: 'flow',
								transitions: {
									goToMiddle: {
										to: 'middle'
									},
									beDone: {
										to: 'done'
									}
								},
								children: {
									goSomewhere: 'goSomewhere'
								}
							},
							middle: 'middle',
							done: 'done',							
						},
						
					},
					b: {
						type: 'flow',
						active: 'start',
						children: {
							start: {
								type: 'flow',
								transitions: {
									goToMiddle: {
										to: 'middle'
									}
								}													
							},
							middle: 'middle'
						}
					}
				}				
			}
		}	
	};
	
	flow.injectGraph(graphSpec);
	
	flowController.start();
}());