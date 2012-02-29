//
//  F5MaskRegion.m
//  jitc
//
//  Created by Paul Greyson on 2/29/12.
//  Copyright (c) 2012 __MyCompanyName__. All rights reserved.
//

#import "F5MaskRegion.h"
#import "AppDelegate.h"
#import "PhoneGapViewController.h"

@implementation F5MaskRegion

- (PluginResult*)enable:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{
    AppDelegate *appDelegate = (AppDelegate*)[[UIApplication sharedApplication] delegate];                
    appDelegate.viewController.enableMaskRegion = [NSNumber numberWithBool:YES];

    return [PluginResult resultWithStatus:PGCommandStatus_OK]; 
    
}

- (PluginResult*)disable:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{
    AppDelegate *appDelegate = (AppDelegate*)[[UIApplication sharedApplication] delegate];                
    appDelegate.viewController.enableMaskRegion = [NSNumber numberWithBool:NO];
    
    return [PluginResult resultWithStatus:PGCommandStatus_OK];     
}

@end
