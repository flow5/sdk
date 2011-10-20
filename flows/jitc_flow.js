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
								'useEverywhere': 'home'
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
						type: 'flow',
						activeChild: 'accountInfo',
						subflows: {
							onactivate: {
								signedin: null,
								notsignedin: 'signin'
							}
						},	
						transitions: {
							signin: {
								to: 'signin'
							},
							signout: {
								to: 'signout'
							}
						},
						children: {
							accountInfo: {
								type: 'flow',
								transitions: {
									editAccount: {
										to: 'editAccount'
									}
								} 
							},
							editAccount: {
								subflows: {
									submit: {
										fieldsValid: 'back',
										error: null
									}
								}
							}
						}				
					},
					directory: {
						type: 'flow',
						activeChild: 'merchantListing',
						children: {
							merchantListing: {
								type: 'flow',
								activeChild: 'listView',
								children: {
									listView: {
										type: 'flow',
										transitions: {
											viewMap: {
												to: 'mapView'
											},
											showDetail: {
												to: 'merchantDetail'
											}											
										}										
									},
									mapView: {
										type: 'flow',
										transitions: {
											showDetail: {
												to: 'merchantDetail'
											}
										}
									}
								},
							},
							merchantDetail: {
								
							}
						}
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
					},
					createAccount: {
						fieldsValid: 'back',
						cancel: null
					},
					facebookConnect: {
						allow: 'back',
						cancelOrDontAllow: null
					},
					forgotPassword: {
						validEmail: {
							reset: null,
							cancel: null
						}
					}
				}
			},
			signout: {
				subflows: {
					onactivate: {
						confirm: 'back',
						cancel: 'back'
					}
				}
			}					
		}					
	};
});
