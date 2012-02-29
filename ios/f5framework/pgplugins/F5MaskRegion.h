//
//  F5MaskRegion.h
//  jitc
//
//  Created by Paul Greyson on 2/29/12.
//  Copyright (c) 2012 __MyCompanyName__. All rights reserved.
//

#import "PGPlugin.h"

@interface F5MaskRegion : PGPlugin

- (PluginResult*)enable:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;
- (PluginResult*)disable:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;

@end
