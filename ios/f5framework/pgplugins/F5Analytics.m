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

#import "F5Analytics.h"
//#import "FlurryAnalytics.h"
#import "AppDelegate.h"

void uncaughtExceptionHandler(NSException *exception);
void uncaughtExceptionHandler(NSException *exception) 
{ 
//    [FlurryAnalytics logError:@"Uncaught" message:@"Crash!" exception:exception];
}

@implementation F5Analytics

// NOTE: Flurry location tracking is done in Location.m so that it follows the application use of location services
// TODO: bring Location stuff under the F5 framework to avoid pushing F5 stuff down into formerly pure PG code
- (id)initWithWebView:(UIWebView*)webview {
    self = [super initWithWebView:webview];
    if (self) {
        NSString *flurryId = [[[AppDelegate class] getBundlePlist:@"f5"] objectForKey:@"flurryid"];
        if (flurryId) {
//            [FlurryAnalytics setShowErrorInLogEnabled:YES];
//            [FlurryAnalytics startSession:flurryId];        
//            NSSetUncaughtExceptionHandler(&uncaughtExceptionHandler);
            // workaround for simulator crash on app background
#if TARGET_IPHONE_SIMULATOR
//            [FlurryAnalytics setSessionReportsOnPauseEnabled:NO];
#endif
        }
    }
    return self;
}


- (void)logEvent:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{
    PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK];  
    [self writeJavascript: [pluginResult toSuccessCallbackString:[arguments pop]]];

//    [FlurryAnalytics logEvent:[arguments pop] withParameters:options];
}

@end
