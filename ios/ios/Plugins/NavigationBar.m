//
//  NavigationBar.m
//  jitc
//
//  Created by Paul Greyson on 11/7/11.
//  Copyright (c) 2011 __MyCompanyName__. All rights reserved.
//

#import "NavigationBar.h"
#import "AppDelegate.h"

@implementation NavigationBar

@synthesize callbackID;
@synthesize navigationBar;
@synthesize itemCache;


-(BOOL)navigationBar:(UINavigationBar *)navigationBar shouldPopItem:(UINavigationItem *)item {
    [self writeJavascript: @"F5.Global.navigationControllerConfiguration.left.action()"]; 
    
    return NO;
}


-(void)create:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {

    if (self.navigationBar) {
        NSLog(@"NavigationBar already created. Was location.reload() called?");
    } else {
        AppDelegate *appDelegate = (AppDelegate*)[[UIApplication sharedApplication] delegate];        
        
        self.navigationBar = [[UINavigationBar alloc] initWithFrame:CGRectMake(0, 0, 320, 44)];
        [self.navigationBar setDelegate:self];
        
        UIView *mainView = [appDelegate.viewController view];
        
        [mainView addSubview:self.navigationBar];
        [mainView sendSubviewToBack: [appDelegate.viewController webView]];     
        
        self.itemCache = [[NSMutableDictionary alloc] init];
    }
    
    PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK];        
    [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];      
}

-(void)configure:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)configuration {
    self.callbackID = [arguments pop];
    
    if (self.navigationBar) {                        
        NSArray *items;
        NSString *title = [configuration valueForKey:@"title"];        
        UINavigationItem *currentItem = [self.itemCache valueForKey:[configuration valueForKey:@"id"]];
        if (!currentItem) {
            currentItem = [[UINavigationItem alloc] initWithTitle:title];
            [self.itemCache setValue:currentItem forKey:[configuration valueForKey:@"id"]];
        }
        
        NSDictionary *left = [configuration valueForKey:@"left"];
        if (left) {                        
            NSString *label = [left valueForKey:@"label"];
            UINavigationItem *backItem = [self.itemCache valueForKey:[left valueForKey:@"id"]];
            if (!backItem) {                
                backItem = [[UINavigationItem alloc] initWithTitle:[left valueForKey:@"label"]];
                [self.itemCache setValue:backItem forKey:[left valueForKey:@"id"]];                
            }
            
            items = [NSArray arrayWithObjects:backItem, currentItem, nil];            
        } else {
            items = [NSArray arrayWithObject:currentItem];
        }
        
        [self.navigationBar setItems:items animated:YES];
        
                        
        PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK];        
        [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];        
    } else {
        NSLog(@"Trying to use configure NavigationBar without calling create first");
        
        PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_INVALID_ACTION];        
        [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];        
    }  

}


@end
