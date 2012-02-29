/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 * 
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 */


#import "PhoneGapViewController.h"
#import "PhoneGapDelegate.h" 
#import <objc/message.h>


@interface F5ViewContainer : UIView
- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event;
@end


@implementation F5ViewContainer

- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event {
    // test the webview last
    // will enhance by allowing the js layer to provide a mask structure allowing for webview overlay of the native views

    UIView *hit = nil;
    UIView *webView = nil;
    for (UIView* view in self.subviews) {
        BOOL masked = NO;
        if ([view class] != [UIWebView class]) {
            CGPoint pointLocal = [view convertPoint:point fromView:self];
            if (!hit && !masked) {
                if ([view respondsToSelector:@selector(maskRegions)]) {
                    NSArray *maskRegions = objc_msgSend(view, sel_getUid("maskRegions"));                                        
                    NSEnumerator *enumerator = [maskRegions objectEnumerator];
                    id region;
                    while ((region = [enumerator nextObject])) {
                        if (CGRectContainsPoint([region CGRectValue], pointLocal)) {
                            masked = YES;
                        }
                    }
                }
                if (!masked) {
                    hit = [view hitTest:pointLocal withEvent:event];                                    
                }
            }
        } else {
            webView = view;
        }
    }
    
    PhoneGapViewController *viewController = ((PhoneGapDelegate*)[[UIApplication sharedApplication] delegate]).viewController;                    
    
    if ((![viewController.enableMaskRegion boolValue] || !hit) && webView) {
        hit = [webView hitTest:[webView convertPoint:point fromView:self] withEvent:event];
    }
    
    return hit;
//    return [super hitTest:point withEvent:event];
}

@end



@implementation PhoneGapViewController

@synthesize supportedOrientations, webView, enableMaskRegion;

- (id) init
{
    if (self = [super init]) {
        self.enableMaskRegion = [NSNumber numberWithBool:YES];
		// do other init here
	}
	
	return self;
}


- (BOOL)shouldAutorotateToInterfaceOrientation:(UIInterfaceOrientation) interfaceOrientation 
{
	// First ask the webview via JS if it wants to support the new orientation -jm
	int i = 0;
	
	switch (interfaceOrientation){

		case UIInterfaceOrientationPortraitUpsideDown:
			i = 180;
			break;
		case UIInterfaceOrientationLandscapeLeft:
			i = -90;
			break;
		case UIInterfaceOrientationLandscapeRight:
			i = 90;
			break;
		default:
		case UIInterfaceOrientationPortrait:
			// noop
			break;
	}
	
	NSString* jsCall = [ NSString stringWithFormat:@"shouldRotateToOrientation(%d);",i];
	NSString* res = [webView stringByEvaluatingJavaScriptFromString:jsCall];
	
	if([res length] > 0)
	{
		return [res boolValue];
	}
	
	// if js did not handle the new orientation ( no return value ) we will look it up in the plist -jm
	
	BOOL autoRotate = [self.supportedOrientations count] > 0; // autorotate if only more than 1 orientation supported
	if (autoRotate)
	{
		if ([self.supportedOrientations containsObject:
			 [NSNumber numberWithInt:interfaceOrientation]]) {
			return YES;
		}
    }
	
	// default return value is NO! -jm
	
	return NO;
}

// F5
- (void)loadView {
    CGRect windowRect = [[[UIApplication sharedApplication] delegate] window].bounds;
    // for status bar
    windowRect.origin.y = 20;
    windowRect.size.height -= 20;
    self.view = [[[F5ViewContainer alloc] initWithFrame:windowRect] autorelease];
}

/**
 Called by UIKit when the device starts to rotate to a new orientation.  This fires the \c setOrientation
 method on the Orientation object in JavaScript.  Look at the JavaScript documentation for more information.
 */
- (void)didRotateFromInterfaceOrientation: (UIInterfaceOrientation)fromInterfaceOrientation
{
	int i = 0;
	
	switch (self.interfaceOrientation){
		case UIInterfaceOrientationPortrait:
			i = 0;
			break;
		case UIInterfaceOrientationPortraitUpsideDown:
			i = 180;
			break;
		case UIInterfaceOrientationLandscapeLeft:
			i = -90;
			break;
		case UIInterfaceOrientationLandscapeRight:
			i = 90;
			break;
	}
	
	NSString* jsCallback = [NSString stringWithFormat:@"window.__defineGetter__('orientation',function(){ return %d; }); PhoneGap.fireEvent('orientationchange', window);",i];
	[webView stringByEvaluatingJavaScriptFromString:jsCallback];
	 
}

- (void) dealloc
{
    self.supportedOrientations = nil;
    self.webView = nil;
    self.enableMaskRegion = nil;
    
    [super dealloc];
}

@end