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

#import "F5FacebookConnect.h"
#import "AppDelegate.h"

@implementation F5FacebookConnect

@synthesize callbackID;
@synthesize facebook;


- (id)initWithWebView:(UIWebView*)webview {
    self = [super initWithWebView:webview];
    if (self) {
        [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(onResume) name:UIApplicationWillEnterForegroundNotification object:nil];
    }
    return self;
}


- (void)initialize:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{
    NSString *appId = [options valueForKey:@"appId"];
    
    self.facebook = [[[Facebook alloc] initWithAppId:appId andDelegate:self] autorelease];    
    
    PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK];  
    [self writeJavascript: [pluginResult toSuccessCallbackString:[arguments pop]]];      
}


- (void)login:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{    
    self.callbackID = [arguments pop];
    
    NSArray *permissions = [options valueForKey:@"permissions"];    
    [self.facebook authorize:permissions];    
}

- (void)logout:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    self.callbackID = [arguments pop];
    
    [self.facebook logout];
}

/**
 * Called when the user successfully logged in.
 */
- (void)fbDidLogin
{    
    if (self.callbackID) {
        PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK messageAsString:self.facebook.accessToken];  
        [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];   
        self.callbackID = nil;        
    } else {
        DLog(@"fbDidLogin called back but no callbackID to communicate to JS layer");
    }
}

/**
 * Called when the user dismissed the dialog without logging in.
 */
- (void)fbDidNotLogin:(BOOL)cancelled
{
    PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_ERROR];  
    [self writeJavascript: [pluginResult toErrorCallbackString:self.callbackID]];       
}

/**
 * Called after the access token was extended. If your application has any
 * references to the previous access token (for example, if your application
 * stores the previous access token in persistent storage), your application
 * should overwrite the old access token with the new one in this method.
 * See extendAccessToken for more details.
 */
- (void)fbDidExtendToken:(NSString*)accessToken
               expiresAt:(NSDate*)expiresAt
{
    
}

/**
 * Called when the user logged out.
 */
- (void)fbDidLogout
{
    if (self.callbackID) {
        PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK];  
        [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];   
        self.callbackID = nil;        
    } else {
        DLog(@"fbDidLogout called back but no callbackID to communicate to JS layer");
    }    
}

/**
 * Called when the current session has expired. This might happen when:
 *  - the access token expired
 *  - the app has been disabled
 *  - the user revoked the app's permissions
 *  - the user changed his or her password
 */
- (void)fbSessionInvalidated
{
    
}

- (void) handleOpenURL:(NSNotification*)notification
{
	// override to handle urls sent to your app
	// register your url schemes in your App-Info.plist
	
	NSURL* url = [notification object];
	if ([url isKindOfClass:[NSURL class]]) {
        if (self.facebook) {
            [self.facebook handleOpenURL:url];        
        }
	}
}

- (void) handleResume
{
    if (self.callbackID) {
        PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_NO_RESULT];  
        [self writeJavascript: [pluginResult toErrorCallbackString:self.callbackID]];   
        self.callbackID = nil;          
    }
}

- (void) onResume
{
    [self performSelectorOnMainThread:@selector(handleResume) withObject:nil waitUntilDone:NO]; 
}

@end
