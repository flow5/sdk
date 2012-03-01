//
//  F5NetworkActivity.m
//  jitc
//
//  Created by Paul Greyson on 2/29/12.
//  Copyright (c) 2012 __MyCompanyName__. All rights reserved.
//

#import "F5NetworkActivity.h"

@implementation F5NetworkActivity

@synthesize activityCount;

- (id)initWithWebView:(UIWebView*)webview {
    self = [super initWithWebView:webview];
    if (self) {
        self.activityCount = [NSNumber numberWithInt:0];
    }
    return self;
}


- (void)activityStarted:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{
    self.activityCount = [NSNumber numberWithInt:[self.activityCount integerValue] + 1];
    [UIApplication sharedApplication].networkActivityIndicatorVisible = YES;
}

- (void)activityCompleted:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{
    self.activityCount = [NSNumber numberWithInt:[self.activityCount integerValue] - 1];
    if (![self.activityCount integerValue]) {
        [UIApplication sharedApplication].networkActivityIndicatorVisible = NO;
    }
}

@end
