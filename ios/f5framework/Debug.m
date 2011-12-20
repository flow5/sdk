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

#import "Debug.h"

@interface Shim : NSObject {
	id _object;
}
@property(nonatomic,retain) id object;
- (id) initWithObject:(id)obj;
@end

@implementation Shim
- (id) initWithObject:(id)object {
	self = [super init];
	if (self != nil) {
		self.object = object;
	}
	return self;
}
- (void)dealloc {
	self.object = nil;
    [super dealloc];
}
- (id)forwardingTargetForSelector:(SEL)sel {
	return self.object; 
}
- (NSMethodSignature *)methodSignatureForSelector:(SEL)aSelector {
	if ([super respondsToSelector:aSelector]) {
		return [super methodSignatureForSelector:aSelector];        
    } else {
        return [self.object methodSignatureForSelector:aSelector];        
    }
}
- (BOOL)respondsToSelector:(SEL)aSelector {
	if ([super respondsToSelector:aSelector]) {
		return YES;        
    } else {
        return [self.object respondsToSelector:aSelector];        
    }    
}
@synthesize object = _object;
@end

// See: http://winxblog.com/2009/02/iphone-uiwebview-estimated-progress/

@interface WAKResponder : NSObject
@end

@interface WAKView : WAKResponder
@end

@interface WebView : WAKView
+ (void)_enableRemoteInspector;
- (void)_setAllowsMessaging:(BOOL)fp8;
- (void)setUIDelegate:(id)fp8;
- (id)UIDelegate;
@end

@interface UIWebDocumentView : NSObject
- (WebView *)webView;
@end

@interface UIWebView (DocumentView)
- (UIWebDocumentView *)_documentView;
@end

@interface WebViewShim : Shim
@end

@implementation WebViewShim
- (void)webView:(WebView *)webView addMessageToConsole:(NSDictionary *)dictionary {    
    NSLog(@"%@", [dictionary description]);
}
@end


@implementation Debug

+ (void)instrumentWebView:(UIWebView *)uiWebView {        
    WebView *webView = [[uiWebView _documentView] webView];
    [webView _setAllowsMessaging:YES];
    [webView setUIDelegate:[[WebViewShim alloc] initWithObject:[webView UIDelegate]]];  
    
    Class webViewClass = NSClassFromString(@"WebView");
    if ([webViewClass respondsToSelector:@selector(_enableRemoteInspector)]) {
        [webViewClass _enableRemoteInspector];            
    }
}

@end
