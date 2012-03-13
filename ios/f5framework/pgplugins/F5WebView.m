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
                
    NSString *url = [options objectForKey:@"url"];
    
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:url] cachePolicy:NSURLRequestUseProtocolCachePolicy timeoutInterval:20.0];
    
    NSString *referrer = [options objectForKey:@"referrer"];
    if (referrer) {
        [request setValue:referrer forHTTPHeaderField: @"Referer"];        
    }
    
    [self.overlayWebView loadRequest:request];        
}

- (void)close:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options 
{
    // already closed
    if (self.overlayWebView.hidden) {
        return;
    }
    
    [UIView animateWithDuration:0.25 delay:0.0
                        options: UIViewAnimationOptionCurveEaseIn
                     animations:^{
                         self.overlayWebView.alpha = 0;
                     }
                     completion:^(BOOL finished){
                         NSString *path = [[NSBundle mainBundle] bundlePath];
                         NSURL *baseURL = [NSURL fileURLWithPath:path];
                         self.overlayWebView.hidden = YES;
                        [self.overlayWebView loadHTMLString:@"<html></html>" baseURL:baseURL];
                     }];
    
            
}

- (PluginResult*)show:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{
    self.overlayWebView.hidden = NO;
    return [PluginResult resultWithStatus:PGCommandStatus_OK];    
}

- (PluginResult*)hide:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{
    self.overlayWebView.hidden = YES;
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
        [UIView animateWithDuration:.25 delay:0.0
                            options: UIViewAnimationOptionCurveEaseIn
                         animations:^{
                             self.overlayWebView.alpha = 1;
                         }
                         completion:nil]; 
        
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
