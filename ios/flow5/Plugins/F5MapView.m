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
#include <objc/runtime.h>
#import "SBJsonParser.h"
#import "SBJSON.h"
#import "F5CommandQueue.h"

@interface F5Annotation : NSObject <MKAnnotation> {
@private
    CLLocationCoordinate2D coordinate;
    NSString *title;
	NSString *subTitle;
    NSNumber *index;
}

@property (nonatomic, copy) NSString *title;
@property (nonatomic, copy) NSString *subTitle;
@property (nonatomic, copy) NSNumber *index;
@property (nonatomic, assign) CLLocationCoordinate2D coordinate;

@end

@implementation F5Annotation
@synthesize title;
@synthesize subTitle;
@synthesize index;
@synthesize	coordinate;
@end

@interface F5AnnotationView : MKAnnotationView

@end

@implementation F5AnnotationView
@end


@interface F5MKMapView : MKMapView {
    NSMutableArray *maskRegions;
}
@property (nonatomic, retain) NSMutableArray* maskRegions;

- (void)zoomToFitMapAnnotations;

@end

@implementation F5MKMapView
@synthesize maskRegions;

- (id)init {
    self = [super init];
    if (self != nil) {
        self.maskRegions = [[[NSMutableArray alloc] init] autorelease];
    }
    return self;
}

- (void)zoomToFitMapAnnotations { 
    
    if ([self.annotations count] == 0) {
        return;
    }
    
    int i = 0;
    MKMapPoint points[[self.annotations count]];
    
    //build array of annotation points
    for (id<MKAnnotation> annotation in [self annotations]) {
        points[i++] = MKMapPointForCoordinate(annotation.coordinate);        
    }
    
    MKPolygon *poly = [MKPolygon polygonWithPoints:points count:i];
    
    [self setRegion:MKCoordinateRegionForMapRect([poly boundingMapRect]) animated:YES]; 
}

@end

@implementation F5MapView

@synthesize mapView;
@synthesize callbackID;

- (void)create:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)mask {
    
    NSString *callbackID = [arguments pop];
    
    if (self.mapView) {
        NSLog(@"mapView already created. Was location.reload() called?");
    } else {                    
        self.mapView = [[F5MKMapView alloc] init];
        
        [mapView sizeToFit]; // ??
        
        mapView.delegate = self;
        mapView.multipleTouchEnabled = YES;
        mapView.autoresizesSubviews = YES;
        mapView.userInteractionEnabled = YES;
        mapView.showsUserLocation = YES;
        mapView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        mapView.hidden = YES;                   

        AppDelegate *appDelegate = (AppDelegate*)[[UIApplication sharedApplication] delegate];                
        UIView *mainView = [appDelegate.viewController view];
        
        [mainView addSubview:self.mapView];        
        [mainView sendSubviewToBack:self.mapView];
        
        // TODO: get bounds from js layer
        // 20 + 44 + 48
        CGRect mapBounds = CGRectMake(0, 44, 320, 368);
        [self.mapView setFrame:mapBounds];
        
        int top = [[mask valueForKey:@"top"] intValue];
        int left = [[mask valueForKey:@"left"] intValue];
        int height = [[mask valueForKey:@"height"] intValue];
        int width = [[mask valueForKey:@"width"] intValue];
        
        // TODO: get mask regions from js layer
        [self.mapView.maskRegions addObject:[NSValue valueWithCGRect:CGRectMake(top, left, height, width)]];                
    }
}

- (void)setMaskRegion:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)mask {

    NSString *callbackID = [arguments pop];
    
    int top = [[mask valueForKey:@"top"] intValue];
    int left = [[mask valueForKey:@"left"] intValue];
    int height = [[mask valueForKey:@"height"] intValue];
    int width = [[mask valueForKey:@"width"] intValue];
    
    // TODO: get mask regions from js layer
    [self.mapView.maskRegions removeAllObjects];
    [self.mapView.maskRegions addObject:[NSValue valueWithCGRect:CGRectMake(top, left, height, width)]];        
}

- (void)clearMaskRegion:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)mask {    
    [self.mapView.maskRegions removeAllObjects];
}


- (void)showMap:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {

    NSString *callbackID = [arguments pop];

    if (self.mapView) {
        self.mapView.hidden = NO;       
    } else {
        NSLog(@"Trying to use showMap without calling create first");
        
        PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_INVALID_ACTION];   
        [self writeJavascript: [pluginResult toSuccessCallbackString:callbackID]];                
    }
}

- (void)hideMap:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    
    NSString *callbackID = [arguments pop];
    
    if (self.mapView) {
        self.mapView.hidden = YES;       
    } else {
        NSLog(@"Trying to use showMap without calling create first");
        
        PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_INVALID_ACTION];                
        [self writeJavascript: [pluginResult toSuccessCallbackString:callbackID]];                
    }
}

- (void)queue_pushRight:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    NSLog(@"F5MapView.pushRight");
    
    animateWithDuration:delay:options:animations:completion:
    
    [[F5CommandQueue instance] queueCommand:^{                
        [UIView animateWithDuration:0.3 delay:0.0
                            options: UIViewAnimationOptionCurveEaseIn
                         animations:^{
                             CGPoint center = self.mapView.center;
                             center.x += 320;
                             self.mapView.center = center;
                         }
                         completion:nil];                                       
    }];                
}

- (void)queue_pushLeft:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    NSLog(@"F5MapView.pushLeft");
    
    [[F5CommandQueue instance] queueCommand:^{                    
        [UIView animateWithDuration:0.3 delay:0.0
                            options: UIViewAnimationOptionCurveEaseIn
                         animations:^{
                             CGPoint center = self.mapView.center;
                             center.x -= 320;
                             self.mapView.center = center;
                         }
                         completion:nil];
    }];
}


- (void)dropPins:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    self.callbackID = [arguments pop];

    PG_SBJSON *parser = [[[PG_SBJSON alloc] init] autorelease];
    NSArray *pins = [parser objectWithString:[arguments pop]];
    
    NSEnumerator * enumerator = [pins objectEnumerator];
    id pin;
    while (pin = [enumerator nextObject]) {                        
        F5Annotation *annotation = [[[F5Annotation alloc] init] autorelease];

		CLLocationCoordinate2D pinCoord = { [[pin objectForKey:@"lat"] floatValue] , [[pin objectForKey:@"lng"] floatValue] };
        annotation.coordinate = pinCoord;
        annotation.title = [pin objectForKey:@"name"];        
        annotation.subTitle = @"";
        annotation.index = [pin objectForKey:@"index"];
                
		[self.mapView addAnnotation:annotation];
    }      
    
    [self.mapView zoomToFitMapAnnotations];
}

- (void)mapView:(MKMapView *)mapView annotationView:(MKAnnotationView *)view calloutAccessoryControlTapped:(UIControl *)control {
    F5Annotation *annotation = [view annotation];
    if (control == [view leftCalloutAccessoryView]) {
        NSDictionary *message = [NSDictionary dictionaryWithObjectsAndKeys:@"streetView", @"button", annotation.index, @"index", nil];                
        PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK messageAsDictionary:message];   
        [pluginResult setKeepCallbackAsBool:YES];
        [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];
    } else if (control == [view rightCalloutAccessoryView]) {
        NSDictionary *message = [NSDictionary dictionaryWithObjectsAndKeys:@"detailView", @"button", annotation.index, @"index", nil];                        
        PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK messageAsDictionary:message];   
        [pluginResult setKeepCallbackAsBool:YES];
        [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];
    } else {
        NSLog(@"wtf?");
    }
}

- (MKAnnotationView *) mapView:(MKMapView *)mapView viewForAnnotation:(id <MKAnnotation>) annotation{
    
    NSString *identifier = [NSString stringWithFormat:@"%f%f", annotation.coordinate.latitude, annotation.coordinate.longitude];
    
    MKPinAnnotationView *view = (MKPinAnnotationView *)[self.mapView dequeueReusableAnnotationViewWithIdentifier:identifier];    
    if (!view) {
        view = [[[MKPinAnnotationView alloc] initWithAnnotation:annotation reuseIdentifier:identifier] autorelease];
    }
    
    if (![annotation isKindOfClass:[F5Annotation class]]) {
        return nil;
    }
    
    UIButton* rightButton = [UIButton buttonWithType:UIButtonTypeDetailDisclosure];
    view.rightCalloutAccessoryView = rightButton;
        
    UIImage *streetViewIcon = [UIImage imageWithContentsOfFile:[[NSBundle mainBundle] pathForResource:@"streetview" ofType:@"png"]];        
    UIButton *leftButton = [[[UIButton alloc] init] autorelease];       
    [leftButton setImage:streetViewIcon forState:UIControlStateNormal];
    leftButton.frame = CGRectMake(0, 0, 31, 31);
    view.leftCalloutAccessoryView = leftButton;
        
    view.canShowCallout = YES;
    return view;
}


@end
