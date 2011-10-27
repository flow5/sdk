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
/*global define*/

define('flowspec', exports, function (exports) {
	
	exports.root = {
		selection: 'home',
		templates: {
			done: {
			}
		},
		children: {	
			done: 'done',
			home: {
				subflows: {
					didBecomeActive: {
						method: 'aOrMore',
						choices: {
							a: 'a',
							more: {
								method: 'aORb',
								choices: {
									a: 'a',
									b: 'b'
								}
							}							
						}
					}
				},
				templates: {
					middle: {
						selection: 'middleStart',
						children: {
							middleStart: {
								transitions: ['done']
							}
						}
					}
				},
				type: 'switcher',
				selection: 'a',
				children: {			
					a: {
						selection: 'start',
						children: {
							start: {
								selection: 'begin',
								children: {
									begin: {
										subflows: {
											didBecomeActive: {
												method: 'goOrStay',
												choices: {
													go: 'end',
													stay: null													
												}
											}
										},
										transitions: ['end'],
									},
									end: {
										
									}
								},
								transitions: ['middle', 'done'],
								subflows: {
									didBecomeActive: {
										method: 'yesOrNo',
										choices: {
											yes: null,
											no: null,											
										}
									},
									pick: {
										method: 'getWhere',
										choices: {
											goToMiddle: 'middle',
											moreChoices: {
												method: 'getMoreWhere',
												choices: {
													'middle': 'middle',
													'done': 'done'													
												}
											}											
										}
									}
								}
							},
							middle: 'middle',
							done: 'done'													
						},
					
					},
					b: {
						selection: 'start',
						children: {
							start: {
								transitions: ['middle']													
							},
							middle: 'middle'
						
						}
					}
				}				
			}
		}	
	};
});