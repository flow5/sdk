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

require('./require.js');

(function () {
	
	var Flow = require('./flow.js').Flow;					
	var flow = new Flow();		
	require('./flow_diags.js').instrument(Flow);	
		
	var graphSpec = {
		
		home: {
			type: 'selector',
			active: 'a',
			children: {
				a: {
					type: 'flow',
					active: 'start',
					children: {
						start: {
							transitions: {
								goToMiddle: {
									containerLevel: 1,
									to: 'middle'
								}								
							},
							subflows: {
								goSomewhere: {
									type: 'menu',
									choices: {
										pickPlace: {
											type: 'menu',
											choices: {
												middle: {
													type: 'transition',
													to: 'middle',
													containerLevel: 1
												},											
												done: {
													type: 'transition',												
													to: 'done'
												}													
											}
										},
										cancel: {
											type: 'transition',
											to: null
										}										
									}
								}
							}													
						}
					}
				},
				b: {
					type: 'flow',
					active: 'start',
					children: {
						start: {
							transitions: {
								goToMiddle: {
									containerLevel: 3,
									to: 'middle'
								}
							}													
						}
					}
				}
			}				
		},	
		middle: {
			type: 'flow',
			active: 'middleStart',
			children: {
				middleStart: {
					transitions: {
						beDone: {
							containerLevel: 0,
							to: 'done'
						}
					}
				}
			}		
		},
		done: {
		}		
	};
	
	flow.validateGraphSpec(graphSpec);
	
	flow.injectGraph(graphSpec);

	flow.toDOT('stderr');	
//	flow.toJSON('stderr');
}());