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

#import "F5Activity.h"
#import "AppDelegate.h"

@implementation F5Activity

@synthesize activityView;

- (id)initWithWebView:(UIWebView*)webview {
    self = [super initWithWebView:webview];
    if (self) {        
        self.activityView = [[[UIActivityIndicatorView alloc] initWithActivityIndicatorStyle:UIActivityIndicatorViewStyleGray] autorelease];
                
        self.activityView.hidden = YES;
        
        AppDelegate *appDelegate = (AppDelegate*)[[UIApplication sharedApplication] delegate];      
        
        UIView *mainView = [appDelegate.viewController view];        
        [mainView addSubview:self.activityView];   
    }
    return self;
}

- (void)start:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{
    CGRect bounds = CGRectMake([[options objectForKey:@"left"] floatValue],
                                  [[options objectForKey:@"top"] floatValue],
                                  [[options objectForKey:@"width"] floatValue],
                                  [[options objectForKey:@"height"] floatValue]);
    
    CGRect frame = self.activityView.frame;
    frame.origin = CGPointMake(bounds.origin.x + bounds.size.width/2 - frame.size.width/2, bounds.origin.y + bounds.size.height/2 - frame.size.height/2);
    self.activityView.frame = frame;
    [self.activityView startAnimating];
    
    self.activityView.hidden = NO;
    
}

- (void)stop:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{
    [self.activityView stopAnimating];    
    self.activityView.hidden = YES;        
}

@end
