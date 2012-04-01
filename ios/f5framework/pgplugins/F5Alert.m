/***********************************************************************************************************************
 
 Copyright (c) 2012 Paul Greyson
 
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

#import "F5Alert.h"

@implementation F5Alert

@synthesize callbackID;
@synthesize successIndex;
@synthesize alertView;

- (void)alertView:(UIAlertView*)alertView clickedButtonAtIndex:(NSInteger)buttonIndex {
    if (self.alertView) {
        PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK messageAsInt:buttonIndex == [self.successIndex integerValue]];  
        [self writeJavascript:[pluginResult toSuccessCallbackString:self.callbackID]];                
    }
    self.alertView = nil;
}

- (void)alert:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{
    self.callbackID = [arguments pop];
    self.successIndex = [NSNumber numberWithInt:0];
    
    NSString *title = [options objectForKey:@"title"];
    NSString *message = [options objectForKey:@"message"];
    NSString *cancelText = @"OK";
    self.alertView = [[[UIAlertView alloc] initWithTitle:title message:message delegate:self cancelButtonTitle:cancelText otherButtonTitles:nil] autorelease];
    self.alertView.delegate = self;
    [self.alertView show];
}

- (void)confirm:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{
    self.callbackID = [arguments pop];
    self.successIndex = [NSNumber numberWithInt:1];
        
    NSString *title = [options objectForKey:@"title"];
    NSString *message = [options objectForKey:@"message"];
    NSString *cancelText = @"Cancel";
    NSString *okText = @"OK";
    self.alertView = [[[UIAlertView alloc] initWithTitle:title message:message delegate:self cancelButtonTitle:cancelText otherButtonTitles:okText, nil] autorelease];
    self.alertView.delegate = self;
    [self.alertView show];
}

- (void)dismiss:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{
    UIAlertView *theAlertView = [[self.alertView retain] autorelease];
    self.alertView = nil;
    [theAlertView dismissWithClickedButtonIndex:0 animated:YES];
    
    PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK];  
    [self writeJavascript: [pluginResult toSuccessCallbackString:[arguments pop]]];    
}


@end
