/***********************************************************************************************************************

	Copyright (c) 2011 Juice in the City. All Rights Reserved.
	
	Author: Paul Greyson (someone.named.paul@gmail.com)
	Date: 10/20/2011

***********************************************************************************************************************/
/*global define*/

define('jitc_flow', exports, function (exports) {

	exports.root = {
		type: 'flow',
		activeChild: 'splashScreen',
		templates: {
		
		},
		children: {
			splashScreen: {
				type: 'flow',
				transitions: {
					home: {
						to: 'home'
					}
				},
				subflows: {
					onactivate: {
						'firstLaunch': {
							'askToEnablePush': {
								'useCurrentLocation': 'home',
								'dontUseCurrentLocation': {
									'useEverywhere': 'home'
								}
							},
						},
						'notFirstLaunch' : 'home'
					}
				}
			},
			home: {
				type: 'selector',
				activeChild: 'todaysDeal',
				children: {
					todaysDeal: {
						type: 'flow',
						subflows: {
							share: {
								email: null,
								tweet: null,
								like: null,
								cancel: null
							}
						},
						transitions: {
							buynow: {
								to: 'buynow'
							}
						}
					},
					myDeals: {
						type: 'flow',
						activeChild: 'listOfDeals',
						subflows: {
							onactivate: {
								signedin: null,
								notsignedin: 'signin'
							}
						},						
						children: {
							listOfDeals: {
								type: 'flow',
								transitions: {
									dealDetail: {
										to: 'dealDetails'
									}
								}
							},
							dealDetails: {
								
							}
						},
						transitions: {
							signin: {
								to: 'signin'
							}
						}
					},
					account: {
						
					},
					directory: {
						
					}
				}
			},
			buynow: {
				type: 'flow',
				subflows: {
					onactivate: {
						signedin: null,
						notsignedin: 'signin',
						cancelledSignin: 'back'						
					},
					submitInfo: {
						error: null,
						showConfirmation: 'back'
					}
				},
				transitions: {
					signin: {
						to: 'signin'
					}
				}
			},
			signin: {
				subflows: {
					submitCredentials: {
						ok: 'back',
						error: null
					}					
				}
			}						
		}					
	};
});
