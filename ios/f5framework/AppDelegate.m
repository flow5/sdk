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
#import "PhoneGapViewController.h"
#import "PGWhitelist.h"
#import "InvokedUrlCommand.h"
#import "PluginResult.h"
#import "PGPlugin.h"

#import <QuartzCore/QuartzCore.h>

#import "Debug.h"

@interface MyURLCache : NSURLCache
@end

// TODO: switch to URLencoded JSON
@implementation MyURLCache

- (NSCachedURLResponse*)makeResponse:(NSString*)responseText forRequest:(NSURLRequest*)request {
    NSData *data = [responseText dataUsingEncoding:NSUTF8StringEncoding];
    
    NSURLResponse *response = [[[NSURLResponse alloc] initWithURL:[request URL] MIMEType:@"application/json" 
                                            expectedContentLength:[data length] textEncodingName:@"utf-8"] autorelease];  
    
    return [[[NSCachedURLResponse alloc] initWithResponse:response data:data] autorelease];            
}

- (NSCachedURLResponse *)cachedResponseForRequest:(NSURLRequest *)request {

    AppDelegate *appDelegate = (AppDelegate*)[[UIApplication sharedApplication] delegate];  

    NSURL *url = [request URL];
//    NSLog(@"%@", request);
    if ([[url lastPathComponent] isEqualToString:@"gap"]) {
        
        PG_SBJSON *parser = [[[PG_SBJSON alloc] init] autorelease];

        NSArray *components = [[url query] componentsSeparatedByString:@"&"];
        NSMutableDictionary *parameters;
        for (NSString *component in components) {            
            NSArray *parts = [component componentsSeparatedByString:@"="];
            NSString *decoded = [[parts objectAtIndex:1] stringByReplacingPercentEscapesUsingEncoding:NSUTF8StringEncoding];
            parameters = [parser objectWithString:decoded];
        }        

        if (parameters) {
            NSString *jsonResult = [[appDelegate executeSynchronous: [InvokedUrlCommand commandFromObject:parameters]] toJSONString];            
            return [self makeResponse:jsonResult forRequest:request];            
        } else {
            NSLog(@"No parameters found in gap request");
            return [super cachedResponseForRequest:request]; 
        }
    } else if ([[url lastPathComponent] isEqualToString:@"gapready"]) {        
        [appDelegate performSelectorOnMainThread:@selector(flushCommandQueue) withObject:nil waitUntilDone:NO]; 
        return [self makeResponse:[[PluginResult resultWithStatus:PGCommandStatus_OK] toJSONString] forRequest:request];        
    } else {
       return [super cachedResponseForRequest:request]; 
    }                        
}
@end


@implementation AppDelegate

@synthesize invokeString;

// f5
+ (NSString*) devservhost
{
	return [[[self class] getBundlePlist:@"f5"] objectForKey:@"devservhost"];
}

// f5
+ (NSString*) appname
{
	return [[[self class] getBundlePlist:@"f5"] objectForKey:@"appname"];
}

// f5
+ (NSString*) startPage
{
#if TARGET_IPHONE_SIMULATOR
    return [NSString stringWithFormat:@"http://%@:8008/generate?app=%@&native=true&inline=true&compress=false&mobile=true&platform=ios&debug=true", [AppDelegate devservhost], [AppDelegate appname]];
#else
    return [super startPage];        
#endif
}

- (id) init
{	    
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
#if DEBUG
		[whitelist addObject:[AppDelegate devservhost]];
#endif
		[self.whitelist initWithArray:whitelist];
	}    
        
#if DEBUG
    NSLog(@"instrumenting webview");
    [Debug instrumentWebView:self.viewController.webView];
#endif
    
    self.viewController.webView.dataDetectorTypes = UIDataDetectorTypeNone;
    
    // make webview transparent
    self.viewController.webView.opaque = NO;
    self.viewController.webView.backgroundColor = UIColor.clearColor;
    for (UIView* view in self.viewController.webView.subviews) {
        view.backgroundColor = UIColor.clearColor;
    }
            
    [NSURLCache setSharedURLCache:[[[MyURLCache alloc] initWithMemoryCapacity:1024 * 1024 diskCapacity:1024 * 1024 * 10 diskPath:@"Cache"] autorelease]];
                
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
    NSString* jsString;
	if(self.invokeString)
	{
		// this is passed before the deviceready event is fired, so you can access it in js when you receive deviceready
		jsString = [NSString stringWithFormat:@"var invokeString = \"%@\";", self.invokeString];
		[theWebView stringByEvaluatingJavaScriptFromString:jsString];
	}
    
#if DEBUG
    jsString = [NSString stringWithFormat:@"F5.devservHost = '%@';", [AppDelegate devservhost]];
    [theWebView stringByEvaluatingJavaScriptFromString:jsString];
    
#endif
    
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

- (PluginResult*) executeSynchronous:(InvokedUrlCommand*)command {
    if (command.className == nil || command.methodName == nil) {
        return NO;
    }
    
    // Fetch an instance of this class
    PGPlugin* obj = [self getCommandInstance:command.className];
    
    if (!([obj isKindOfClass:[PGPlugin class]])) { // still allow deprecated class, until 1.0 release
        NSLog(@"ERROR: Plugin '%@' not found, or is not a PGPlugin. Check your plugin mapping in PhoneGap.plist.", command.className);
        return [PluginResult resultWithStatus:PGCommandStatus_CLASS_NOT_FOUND_EXCEPTION];
    } else {
        // construct the fill method name to ammend the second argument.
        NSString* fullMethodName = [[[NSString alloc] initWithFormat:@"%@:withDict:", command.methodName] autorelease];
        if ([obj respondsToSelector:NSSelectorFromString(fullMethodName)]) {
            return [obj performSelector:NSSelectorFromString(fullMethodName) withObject:command.arguments withObject:command.options];
        } else {
            // There's no method to call, so throw an error.
            NSLog(@"ERROR: Method '%@' not defined in Plugin '%@'", fullMethodName, command.className);
            return [PluginResult resultWithStatus:PGCommandStatus_INVALID_ACTION];
        }
    }        
}

- (void)dealloc
{
	[ super dealloc ];
}

@end
