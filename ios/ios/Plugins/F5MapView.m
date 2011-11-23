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

#import "F5MapView.h"
#import "AppDelegate.h"

@implementation F5MapView

@synthesize mapView;
@synthesize callbackID;

- (void)create:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    
    if (self.mapView) {
        NSLog(@"mapView already created. Was location.reload() called?");
    } else {        
        self.mapView = [[MKMapView alloc] init];
        
        [mapView sizeToFit]; // ??
        
        mapView.delegate = self;
        mapView.multipleTouchEnabled = YES;
        mapView.autoresizesSubviews = YES;
        mapView.userInteractionEnabled = YES;
        mapView.showsUserLocation = YES;
        mapView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;

        AppDelegate *appDelegate = (AppDelegate*)[[UIApplication sharedApplication] delegate];                
        UIView *mainView = [appDelegate.viewController view];
        
        [mainView addSubview:self.mapView];        
        [mainView sendSubviewToBack: [appDelegate.viewController webView]];     
        
        CGRect mapBounds = CGRectMake(0, 44, 320, 376);
        [self.mapView setFrame:mapBounds];

        //        mapView.hidden = YES;   
    }
}

- (void)showMap:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {

    self.callbackID = [arguments pop];

    if (self.mapView) {
        self.mapView.hidden = NO;       
    } else {
        NSLog(@"Trying to use showMap without calling create first");
        
        PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_INVALID_ACTION];   
        [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];                
    }
}

- (void)hideMap:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    
    self.callbackID = [arguments pop];
    
    if (self.mapView) {
        self.mapView.hidden = YES;       
    } else {
        NSLog(@"Trying to use showMap without calling create first");
        
        PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_INVALID_ACTION];                
        [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];                
    }
}


@end
