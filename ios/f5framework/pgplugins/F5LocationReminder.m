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

#import "F5LocationReminder.h"

#import "SBJsonParser.h"
#import "SBJSON.h"

@implementation F5LocationReminder

@synthesize locationManager;

- (id)initWithWebView:(UIWebView*)webview {
    self = [super initWithWebView:webview];
    if (self) {
        self.locationManager = [[[CLLocationManager alloc] init] autorelease];        
        self.locationManager.delegate = self;
    }
    return self;
}

- (void)locationManager:(CLLocationManager *)manager didStartMonitoringForRegion:(CLRegion *)region {
    
}

- (void)locationManager:(CLLocationManager *)manager didEnterRegion:(CLRegion *)region {
    UILocalNotification* notification = [[[UILocalNotification alloc] init] autorelease];
    notification.alertBody = region.identifier;        
    [[UIApplication sharedApplication] presentLocalNotificationNow:notification];
}

- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error {
    
}

- (void)locationManager:(CLLocationManager *)manager monitoringDidFailForRegion:(CLRegion *)region withError:(NSError *)error {
    
}

- (void)setReminder:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    
    id callbackID = [arguments pop];
    
    PG_SBJSON *parser = [[[PG_SBJSON alloc] init] autorelease];    
    NSDictionary *location = [parser objectWithString:[arguments pop]];

    // Do not create regions if support is unavailable or disabled.
    if (![CLLocationManager regionMonitoringAvailable] || ![CLLocationManager regionMonitoringEnabled]) {
        DLog(@"no can do");
    } else {
        CLLocationCoordinate2D coord;        
        coord.latitude = [[location objectForKey:@"lat"] doubleValue];
        coord.longitude = [[location objectForKey:@"lng"] doubleValue];
        
        CLRegion* region = [[CLRegion alloc] initCircularRegionWithCenter:coord
                                    radius: 100 identifier:@"a place"];
        [self.locationManager startMonitoringForRegion:region desiredAccuracy:kCLLocationAccuracyHundredMeters];
        
        [region release];        
    } 
    
    PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK];   
    [self writeJavascript: [pluginResult toSuccessCallbackString:callbackID]];            
}

@end