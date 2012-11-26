//
//  F5Utils.m
//  lic
//
//  Created by Paul Greyson on 11/26/12.
//
//

#import "F5Utils.h"

@implementation F5Utils

- (void)openLink:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    NSString *callbackId = [arguments pop];
    
    NSURL *url = [NSURL URLWithString:[arguments pop]];
    
    [[UIApplication sharedApplication] openURL:url];
    
    PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK];
    [self writeJavascript: [pluginResult toSuccessCallbackString:callbackId]];    
}

@end
