//
//  F5NetworkActivity.h
//  jitc
//
//  Created by Paul Greyson on 2/29/12.
//  Copyright (c) 2012 __MyCompanyName__. All rights reserved.
//

#import "PGPlugin.h"


@interface F5NetworkActivity : PGPlugin

@property (nonatomic, retain)   NSNumber* activityCount;

- (void)activityStarted:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;
- (void)activityCompleted:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;


@end
