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

#import "F5NavigationBar.h"
#import "AppDelegate.h"
#import "F5CommandQueue.h"

@implementation F5NavigationBar

@synthesize callbackID;
@synthesize navigationBar;
@synthesize itemCache;

- (void)rightButton:(id)target {
    PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK messageAsString:@"right"];  
    [pluginResult setKeepCallbackAsBool:YES];
    [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];          
}



- (BOOL)navigationBar:(UINavigationBar *)navigationBar shouldPopItem:(UINavigationItem *)item {
    PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK messageAsString:@"left"];  
    [pluginResult setKeepCallbackAsBool:YES];
    [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];      
    
    return NO;
}


-(void)create:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {

    self.callbackID = [arguments pop];
    
    if (self.navigationBar) {
        NSLog(@"NavigationBar already created. Was location.reload() called?");
    } else {
        AppDelegate *appDelegate = (AppDelegate*)[[UIApplication sharedApplication] delegate];   
        
        self.navigationBar = [[[UINavigationBar alloc] init] autorelease];
        [self.navigationBar sizeToFit];
        
        self.navigationBar.autoresizingMask = UIViewAutoresizingFlexibleWidth;
                                 
        [self.navigationBar setDelegate:self];
        
        UIView *mainView = [appDelegate.viewController view];
        
        [mainView addSubview:self.navigationBar];
        
        self.itemCache = [[[NSMutableDictionary alloc] init] autorelease];
    }    
}

-(void)queue_configure:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)configuration {
    NSLog(@"F5NavigationBar.configure");
    
    NSString *callbackId = [arguments pop];
    BOOL animated = [[arguments pop] boolValue];
    
    if (self.navigationBar) {          
        if ([configuration valueForKey:@"hide"]) {
            self.navigationBar.hidden = YES;
        } else {
            self.navigationBar.hidden = NO;

            NSArray *items;
            UINavigationItem *currentItem = [self.itemCache valueForKey:[configuration valueForKey:@"id"]];
            if (currentItem) {
                currentItem.title = [configuration valueForKey:@"title"];
            } else {
                currentItem = [[[UINavigationItem alloc] initWithTitle:[configuration valueForKey:@"title"]] autorelease];
                [self.itemCache setValue:currentItem forKey:[configuration valueForKey:@"id"]];
            }
            
            NSDictionary *left = [configuration valueForKey:@"left"];
            if (left) {                        
                UINavigationItem *backItem = [self.itemCache valueForKey:[left valueForKey:@"id"]];
                if (!backItem) {                
                    backItem = [[[UINavigationItem alloc] initWithTitle:[left valueForKey:@"label"]] autorelease];
                    [self.itemCache setValue:backItem forKey:[left valueForKey:@"id"]];                
                }
                
                items = [NSArray arrayWithObjects:backItem, currentItem, nil];            
            } else {
                items = [NSArray arrayWithObject:currentItem];
            }
            
            NSDictionary *right = [configuration valueForKey:@"right"];
            if (right) {                        
                UIBarButtonItem *rightButton = [[[UIBarButtonItem alloc] initWithTitle:[right valueForKey:@"label"] 
                                                    style:UIBarButtonItemStylePlain target:self action:@selector(rightButton:)] autorelease];   
                currentItem.rightBarButtonItem = rightButton;
            }
            
            [items retain];
            [[F5CommandQueue instance] queueCommand:^{                
                [self.navigationBar setItems:items animated:animated];  
                [items release];
            }];            
        }
                        
        PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK];        
        [self writeJavascript: [pluginResult toSuccessCallbackString:callbackId]];        
    } else {
        NSLog(@"Trying to use configure NavigationBar without calling create first");
        
        PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_INVALID_ACTION];        
        [self writeJavascript: [pluginResult toSuccessCallbackString:callbackId]];        
    }  

}


@end
