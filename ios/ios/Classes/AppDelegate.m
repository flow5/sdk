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

#import "AppDelegate.h"
#ifdef PHONEGAP_FRAMEWORK
	#import <PhoneGap/PhoneGapViewController.h>
    #import <PhoneGap/PGWhitelist.h>
#else
	#import "PhoneGapViewController.h"
#endif

#import "Debug.h"

@implementation AppDelegate

@synthesize invokeString;

// f5
+ (NSString*) devservhost
{
	return [[[self class] getBundlePlist:@"Flow5"] objectForKey:@"devservhost"];
}

// f5
+ (NSString*) appname
{
	return [[[self class] getBundlePlist:@"Flow5"] objectForKey:@"appname"];
}

// f5
+ (NSString*) startPage
{
    if ([[NSUserDefaults standardUserDefaults] boolForKey:@"use_devserv"]) {        
        // TODO: debug setting, use devserv setting        
        return [NSString stringWithFormat:@"http://%@:8008/generate?app=%@&native=true&inline=true&debug=true", [AppDelegate devservhost], [AppDelegate appname]];
    } else {
        return [super startPage];        
    }
}

- (id) init
{	
	/** If you need to do any extra app-specific initialization, you can do it here
	 *  -jm
	 **/
    return [super init];
}

/**
 * This is main kick off after the app inits, the views and Settings are setup here. (preferred - iOS4 and up)
 */
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
	
	NSArray *keyArray = [launchOptions allKeys];
	if ([launchOptions objectForKey:[keyArray objectAtIndex:0]]!=nil) 
	{
		NSURL *url = [launchOptions objectForKey:[keyArray objectAtIndex:0]];
		self.invokeString = [url absoluteString];
		NSLog(@"ios launchOptions = %@",url);
	}
	
	BOOL result = [super application:application didFinishLaunchingWithOptions:launchOptions];
    
	// f5: add the devserv to the whitelist
	if (result) {
		NSMutableArray *whitelist = [NSMutableArray arrayWithArray:self.whitelist.whitelist];
		[whitelist addObject:[AppDelegate devservhost]];
		[self.whitelist initWithArray:whitelist];
	}    
    
    // f5: setup defaults
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    NSDictionary *appDefaults = [NSDictionary dictionaryWithObject:@"NO" forKey:@"use_devserv"];
    [defaults registerDefaults:appDefaults];
    [defaults synchronize];  
    
    [Debug instrumentWebView:self.viewController.webView];
    
    return result;
}

// this happens while we are running ( in the background, or from within our own app )
// only valid if ios.plist specifies a protocol to handle
- (BOOL)application:(UIApplication *)application handleOpenURL:(NSURL *)url 
{
    // must call super so all plugins will get the notification, and their handlers will be called 
	// super also calls into javascript global function 'handleOpenURL'
    return [super application:application handleOpenURL:url];
}

-(id) getCommandInstance:(NSString*)className
{
	/** You can catch your own commands here, if you wanted to extend the gap: protocol, or add your
	 *  own app specific protocol to it. -jm
	 **/
	return [super getCommandInstance:className];
}

/**
 Called when the webview finishes loading.  This stops the activity view and closes the imageview
 */
- (void)webViewDidFinishLoad:(UIWebView *)theWebView 
{
	// only valid if ios.plist specifies a protocol to handle
	if(self.invokeString)
	{
		// this is passed before the deviceready event is fired, so you can access it in js when you receive deviceready
		NSString* jsString = [NSString stringWithFormat:@"var invokeString = \"%@\";", self.invokeString];
		[theWebView stringByEvaluatingJavaScriptFromString:jsString];
	}
	return [ super webViewDidFinishLoad:theWebView ];
}

- (void)webViewDidStartLoad:(UIWebView *)theWebView 
{
	return [ super webViewDidStartLoad:theWebView ];
}

/**
 * Fail Loading With Error
 * Error - If the webpage failed to load display an error with the reason.
 */
- (void)webView:(UIWebView *)theWebView didFailLoadWithError:(NSError *)error 
{
	return [ super webView:theWebView didFailLoadWithError:error ];
}

/**
 * Start Loading Request
 * This is where most of the magic happens... We take the request(s) and process the response.
 * From here we can re direct links and other protocalls to different internal methods.
 */
- (BOOL)webView:(UIWebView *)theWebView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType
{
    // f5
	if ([[request URL] isEqual:[NSURL URLWithString:[AppDelegate startPage]]]) {
		return YES;
	} else {
		return [ super webView:theWebView shouldStartLoadWithRequest:request navigationType:navigationType ];
	}
}


- (BOOL) execute:(InvokedUrlCommand*)command
{
	return [ super execute:command];
}

- (void)dealloc
{
	[ super dealloc ];
}

@end
