/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 * 
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 */


#import "PGSplashScreen.h"
#import "PhoneGapDelegate.h"

@implementation PGSplashScreen


- (void) __show:(BOOL)show
{
	PhoneGapDelegate* delegate = [super appDelegate];
	if (!delegate.imageView) {
		return;
	}
	
    delegate.activityView.hidden = !show;
    [UIView animateWithDuration:.5 delay:0 options:0 animations:^{
        delegate.imageView.alpha = show ? 1.0 : 0.0;
    } completion:^(BOOL finished) {
        delegate.imageView.hidden = !show;
    }];
}

- (void) show:(NSArray*)arguments withDict:(NSMutableDictionary*)options
{
	[self __show:YES];
}

- (void) hide:(NSArray*)arguments withDict:(NSMutableDictionary*)options
{
	[self __show:NO];
}

@end
