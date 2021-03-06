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


#import "PGPlugin.h"

#import <MapKit/MapKit.h>

@class F5MKMapView;

@interface F5MapView : PGPlugin <MKMapViewDelegate> {
    NSString *pinCallbackID;   
    NSString *regionChangeCallbackID;
    NSString *animateToRegionCallbackID;
    F5MKMapView* mapView;    
}

@property (nonatomic, copy) NSString* pinCallbackID;
@property (nonatomic, copy) NSString* regionChangeCallbackID;
@property (nonatomic, copy) NSString* animateToRegionCallbackID;
@property (nonatomic, retain) F5MKMapView* mapView;

// synchronous methods
- (PluginResult*)showMap:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;
- (PluginResult*)hideMap:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;
- (PluginResult*)getMapGeometry:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;
- (PluginResult*)getSnapshot:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;

- (void)create:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;
- (void)releaseCallbacks:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;

- (void)animateToRegion:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;

- (void)setMaskRegion:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;
- (void)clearMaskRegion:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;

- (void)setRegionChangedCallback:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;
- (void)setCalloutCallback:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;

- (void)queue_pushLeft:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;
- (void)queue_pushRight:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;
- (void)queue_fadeIn:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;
- (void)queue_fadeOut:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;

- (void)dropPins:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;
- (void)removePins:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;

@end
