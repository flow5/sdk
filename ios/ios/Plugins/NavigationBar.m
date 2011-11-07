//
//  NavigationBar.m
//  jitc
//
//  Created by Paul Greyson on 11/7/11.
//  Copyright (c) 2011 __MyCompanyName__. All rights reserved.
//

#import "NavigationBar.h"

@implementation NavigationBar

@synthesize callbackID;

-(void)print:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    
    self.callbackID = [arguments pop];
    
    NSString *stringObtainedFromJavascript = [arguments objectAtIndex:0];                 
    
    NSMutableString *stringToReturn = [NSMutableString stringWithString: @"StringReceived:"];

    [stringToReturn appendString: stringObtainedFromJavascript];

    PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK messageAsString: [stringToReturn stringByAddingPercentEscapesUsingEncoding:NSUTF8StringEncoding]];
    
    if([stringObtainedFromJavascript isEqualToString:@"HelloWorld"]==YES) {
        [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];
        
    } else {    
        [self writeJavascript: [pluginResult toErrorCallbackString:self.callbackID]];        
    }    
}


@end
