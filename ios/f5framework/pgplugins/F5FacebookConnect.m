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

- (void)connect:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{    
    self.callbackID = [arguments pop];
    
    NSString *appId = [options valueForKey:@"appId"];
    
    AppDelegate *appDelegate = (AppDelegate*)[[UIApplication sharedApplication] delegate];
    
    appDelegate.facebook = [[[Facebook alloc] initWithAppId:appId andDelegate:self] autorelease];    

    [appDelegate.facebook authorize:nil];    
}

/**
 * Called when the user successfully logged in.
 */
- (void)fbDidLogin
{
    AppDelegate *appDelegate = (AppDelegate*)[[UIApplication sharedApplication] delegate];
    
    PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK messageAsString:appDelegate.facebook.accessToken];  
    [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];   
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

@end
