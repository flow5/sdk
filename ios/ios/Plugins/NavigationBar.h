//
//  NavigationBar.h
//  jitc
//
//  Created by Paul Greyson on 11/7/11.
//  Copyright (c) 2011 __MyCompanyName__. All rights reserved.
//

#ifdef PHONEGAP_FRAMEWORK
#import <PhoneGap/PGPlugin.h>
#else
#import "PGPlugin.h"
#endif

@interface NavigationBar : PGPlugin {

    NSString* callbackID; 
    UINavigationBar *navigationBar;
    NSMutableDictionary *itemCache;
}

@property (nonatomic, copy) NSString* callbackID;
@property (nonatomic, retain) UINavigationBar* navigationBar;
@property (nonatomic, retain) NSMutableDictionary *itemCache;


- (void) create:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;
- (void) configure:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;

@end
