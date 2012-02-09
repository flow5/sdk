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

@interface F5OverlayWebview : UIWebView 

@end

@implementation F5OverlayWebview
@end


@implementation F5WebView

@synthesize webView;
@synthesize callbackID;

- (id)initWithWebView:(UIWebView*)webview {
    self = [super initWithWebView:webview];
    if (self) {
        CGRect webViewBounds = [ [ UIScreen mainScreen ] bounds ];
        self.webView = [[ [ F5OverlayWebview alloc ] initWithFrame:webViewBounds] autorelease]; 
        self.webView.hidden = YES;
        self.webView.delegate = self;
        
        
        AppDelegate *appDelegate = (AppDelegate*)[[UIApplication sharedApplication] delegate];                
        UIView *mainView = [appDelegate.viewController view];
        
        [mainView addSubview:self.webView];        
    }
    return self;
}


- (void)open:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options 
{
    self.callbackID = [arguments pop];
    
    NSDictionary *bounds = [options objectForKey:@"bounds"];
    
    CGRect viewBounds = CGRectMake([[bounds objectForKey:@"left"] floatValue],
                                  [[bounds objectForKey:@"top"] floatValue],
                                  [[bounds objectForKey:@"width"] floatValue],
                                  [[bounds objectForKey:@"height"] floatValue]);
    
    [self.webView setFrame:viewBounds];        
    
    NSString *url = [options objectForKey:@"url"];
    
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:url] cachePolicy:NSURLRequestUseProtocolCachePolicy timeoutInterval:20.0];
    
    NSString *referrer = [options objectForKey:@"referrer"];
    if (referrer) {
        [request setValue:referrer forHTTPHeaderField: @"Referer"];        
    }
    
    [self.webView loadRequest:request];
    
    self.webView.hidden = NO;    
    
}

- (void)close:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options 
{
    self.webView.hidden = YES;        
}

- (void)webViewDidFinishLoad:(UIWebView *)webView
{
    NSLog(@"loaded");    
    
    NSString *html = [webView stringByEvaluatingJavaScriptFromString:@"document.body.innerHTML"];
}


@end
