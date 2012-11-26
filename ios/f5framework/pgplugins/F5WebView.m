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

#import "F5WebView.h"
#import "AppDelegate.h"
#import <QuartzCore/QuartzCore.h>
#import "Debug.h"


@interface F5OverlayWebview : UIWebView 

@end

@implementation F5OverlayWebview
@end


@implementation F5WebView

@synthesize overlayWebView;
@synthesize callbackID;

- (id)initWithWebView:(UIWebView*)webview {
    self = [super initWithWebView:webview];
    if (self) {
        CGRect webViewBounds = [ [ UIScreen mainScreen ] bounds ];
        self.overlayWebView = [[ [ F5OverlayWebview alloc ] initWithFrame:webViewBounds] autorelease]; 
        self.overlayWebView.hidden = YES;
        self.overlayWebView.delegate = self;
        
#if DEBUG
        [Debug instrumentWebView:self.overlayWebView];
#endif
                
        AppDelegate *appDelegate = (AppDelegate*)[[UIApplication sharedApplication] delegate];                
        UIView *mainView = [appDelegate.viewController view];
        
        [mainView addSubview:self.overlayWebView];   
        self.overlayWebView.alpha = 0;
        
        // TODO: make this configurable
        self.overlayWebView.opaque = NO;
        self.overlayWebView.backgroundColor = UIColor.clearColor;
        for (UIView* view in self.overlayWebView.subviews) {
            view.backgroundColor = UIColor.clearColor;
        }
        
        // Hide the webview shadows
        for (UIView *view in [[[self.overlayWebView subviews] objectAtIndex:0] subviews]) { 
            if ([view isKindOfClass:[UIImageView class]]) {view.hidden = YES;} 
        }                   
    }
    return self;
}

- (BOOL)webView:(UIWebView *)theWebView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType {
    return YES;
}

- (void)open:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{
    self.callbackID = [arguments pop];
    
    self.overlayWebView.alpha = 0;
    self.overlayWebView.hidden = NO;            
    
    NSDictionary *bounds = [options objectForKey:@"bounds"];
    
    CGRect viewBounds = CGRectMake([[bounds objectForKey:@"left"] floatValue],
                                  [[bounds objectForKey:@"top"] floatValue],
                                  [[bounds objectForKey:@"width"] floatValue],
                                  [[bounds objectForKey:@"height"] floatValue]);            
    [self.overlayWebView setFrame:viewBounds];     
                
    NSString *path = [options objectForKey:@"url"];
    
    NSURL *url;
    if ([path rangeOfString:@"http"].location == 0) {
        url = [NSURL URLWithString:path];
    } else {
        NSString *bundlePath = [[NSBundle mainBundle] bundlePath];
        path = [NSString stringWithFormat:@"%@/www/%@", bundlePath, path];
        url = [NSURL fileURLWithPath:path];
    }
    
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url cachePolicy:NSURLRequestUseProtocolCachePolicy timeoutInterval:20.0];
    
    [self.overlayWebView loadRequest:request];        
}

- (void)openHTML:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options 
{
    self.callbackID = [arguments pop];
    
    self.overlayWebView.alpha = 0;
    self.overlayWebView.hidden = NO;            
    
    NSDictionary *bounds = [options objectForKey:@"bounds"];
    
    CGRect viewBounds = CGRectMake([[bounds objectForKey:@"left"] floatValue],
                                   [[bounds objectForKey:@"top"] floatValue],
                                   [[bounds objectForKey:@"width"] floatValue],
                                   [[bounds objectForKey:@"height"] floatValue]);            
    [self.overlayWebView setFrame:viewBounds];     
    
    NSString *html = [options objectForKey:@"html"];
    
    NSString *path = [[NSBundle mainBundle] bundlePath];
    NSURL *baseURL = [NSURL fileURLWithPath:path];    
    [self.overlayWebView loadHTMLString:html baseURL:baseURL];       
}

- (void)close:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options 
{
    if (self.callbackID) {
        PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK];   
        [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];  
        
        self.callbackID = nil;
    }

    PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK];  
    [self writeJavascript: [pluginResult toSuccessCallbackString:[arguments pop]]];    

    if (!self.overlayWebView.hidden) {
        [self hide];    
    }    
}

- (PluginResult*)show:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{
    self.overlayWebView.hidden = NO;
    [UIView animateWithDuration:.25 delay:0.0
                        options: UIViewAnimationOptionCurveEaseIn
                     animations:^{
                         self.overlayWebView.alpha = 1;
                     }
                     completion:nil];     
    return [PluginResult resultWithStatus:PGCommandStatus_OK];    
}

- (void)hide
{
    [UIView animateWithDuration:0.25 delay:0.0
                        options: UIViewAnimationOptionCurveEaseOut
                     animations:^{
                         self.overlayWebView.alpha = 0;
                     }
                     completion:nil];
    
}

- (PluginResult*)hide:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{
    [self performSelectorOnMainThread:@selector(hide) withObject:nil waitUntilDone:NO];
//    [self hide];
    return [PluginResult resultWithStatus:PGCommandStatus_OK];
}

- (void)webViewDidStartLoad:(UIWebView *)webView {      
//    [UIView animateWithDuration:.15 delay:0.0
//                        options: UIViewAnimationOptionCurveEaseIn
//                     animations:^{
//                         self.overlayWebView.alpha = 0;
//                     }
//                     completion:nil];            
}

- (void)webView:(UIWebView *)webView didFailLoadWithError:(NSError *)error
{
    PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_ERROR];  
    [self writeJavascript:[pluginResult toErrorCallbackString:self.callbackID]];             
}

- (void)webViewDidFinishLoad:(UIWebView *)webView
{        
    if (!self.overlayWebView.hidden) {        
        NSDictionary *message = [NSDictionary dictionaryWithObject:@"onload" forKey:@"type"];    
        PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK messageAsDictionary:message];  
        [pluginResult setKeepCallbackAsBool:YES];    
        [self writeJavascript:[pluginResult toSuccessCallbackString:self.callbackID]];         
    }
}

- (PluginResult*)receiveMessageFromWebView:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{
    // since this is called synchronously, defer the callback to the user of the webview (which is the main webview!)
    
    
    NSDictionary *message = [NSDictionary dictionaryWithObject:options forKey:@"message"];
    
    PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK messageAsDictionary:message];  
    [pluginResult setKeepCallbackAsBool:YES];    
    [self performSelectorOnMainThread:@selector(writeJavascript:) withObject:[pluginResult toSuccessCallbackString:self.callbackID] waitUntilDone:NO]; 
        
    return [PluginResult resultWithStatus:PGCommandStatus_OK];  
}

- (void)writeJavascript:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{
    [arguments pop];

    [self.overlayWebView stringByEvaluatingJavaScriptFromString:[arguments pop]];
}




@end
