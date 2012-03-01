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
#import "QSStrings.h"
#import <QuartzCore/QuartzCore.h>


@interface F5Annotation : NSObject <MKAnnotation> {
@private
    CLLocationCoordinate2D coordinate;
    NSString *title;
	NSString *subtitle;
    NSNumber *index;
    UIImage *markerImage;
}

@property (nonatomic, copy) NSString *title;
@property (nonatomic, copy) NSString *subtitle;
@property (nonatomic, copy) UIImage *markerImage;
@property (nonatomic, copy) NSNumber *index;
@property (nonatomic, assign) CLLocationCoordinate2D coordinate;

@end

@implementation F5Annotation
@synthesize title;
@synthesize markerImage;
@synthesize subtitle;
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
@synthesize regionChangeCallbackID;
@synthesize animateToRegionCallbackID;

- (void)create:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)bounds {
    
    self.callbackID = [arguments pop];
    
    if (self.mapView) {
        NSLog(@"mapView already created. Was location.reload() called?");
    } else {                    
        self.mapView = [[[F5MKMapView alloc] init] autorelease];
        
        
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
        
        CGRect mapBounds = CGRectMake([[bounds objectForKey:@"left"] floatValue],
                                      [[bounds objectForKey:@"top"] floatValue],
                                      [[bounds objectForKey:@"width"] floatValue],
                                      [[bounds objectForKey:@"height"] floatValue]);
                                      
        [self.mapView setFrame:mapBounds];        
    }
    
    PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK];   
    [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];     
}

- (void)setMaskRegion:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)mask {
    
    NSString *callbackID __attribute__((unused)) = [arguments pop];
    
    int top = [[mask valueForKey:@"top"] intValue];
    int left = [[mask valueForKey:@"left"] intValue];
    int height = [[mask valueForKey:@"height"] intValue];
    int width = [[mask valueForKey:@"width"] intValue];
    
    // TODO: get mask regions from js layer
    [self.mapView.maskRegions removeAllObjects];
    [self.mapView.maskRegions addObject:[NSValue valueWithCGRect:CGRectMake(left, top, width, height)]];        
}

- (void)clearMaskRegion:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)mask {    
    [self.mapView.maskRegions removeAllObjects];
}

- (PluginResult*)showMap:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    NSLog(@"showMap");
    
    if (self.mapView) {
        self.mapView.hidden = NO;  
        return [PluginResult resultWithStatus:PGCommandStatus_OK]; 
    } else {
        NSLog(@"Trying to use showMap without calling create first");        
        return [PluginResult resultWithStatus:PGCommandStatus_INVALID_ACTION];   
    }
}

- (PluginResult*)hideMap:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    NSLog(@"hideMap");
    
    if (self.mapView) {
        self.mapView.hidden = YES;       
        return [PluginResult resultWithStatus:PGCommandStatus_OK];                
    } else {
        NSLog(@"Trying to use showMap without calling create first");        
        return [PluginResult resultWithStatus:PGCommandStatus_INVALID_ACTION];                
    }
}

- (PluginResult*)getSnapshot:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    
    return nil;
    /*
    if (self.mapView) {
        CGSize size = [self.mapView bounds].size;
        UIGraphicsBeginImageContext(size);
        [[self.mapView layer] renderInContext:UIGraphicsGetCurrentContext()];
        UIImage *newImage = UIGraphicsGetImageFromCurrentImageContext();
        UIGraphicsEndImageContext();
        NSData *data = UIImageJPEGRepresentation(newImage, .5);
        // have to b64 encode here as well
        NSString *jpegData = [[data newStringInBase64FromData] autorelease];
        return [PluginResult resultWithStatus:PGCommandStatus_OK messageAsString:jpegData];                
    } else {
        NSLog(@"Trying to use showMap without calling create first");        
        return [PluginResult resultWithStatus:PGCommandStatus_INVALID_ACTION];                
    }
    */
}

- (void)animateToRegion:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)location {
    
    self.animateToRegionCallbackID = [arguments pop];
    
    NSDictionary *center = [location valueForKey:@"center"];
    
    CLLocationCoordinate2D coordinate = {[[center valueForKey:@"lat"] floatValue], [[center valueForKey:@"lng"] floatValue]};
    NSNumber *radius = [location valueForKey:@"radius"];
    
    [self.mapView setRegion:MKCoordinateRegionMakeWithDistance(coordinate, [radius floatValue] * 2, [radius floatValue] * 2) animated:YES];      
}

- (PluginResult*)getMapGeometry:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    if (self.mapView) {
        MKMapRect rect = self.mapView.visibleMapRect;
        MKMapPoint neMapPoint = MKMapPointMake(rect.origin.x + rect.size.width, rect.origin.y);
        MKMapPoint swMapPoint = MKMapPointMake(rect.origin.x, rect.origin.y + rect.size.height);
        MKMapPoint seMapPoint = MKMapPointMake(rect.origin.x + rect.size.width, rect.origin.y + rect.size.height);
        
 //       CLLocationDistance diagonalMeters = MKMetersBetweenMapPoints(neMapPoint, swMapPoint);
        CLLocationDistance widthMeters = MKMetersBetweenMapPoints(seMapPoint, swMapPoint);

        
        CLLocationCoordinate2D neCoord = MKCoordinateForMapPoint(neMapPoint);
        CLLocationCoordinate2D swCoord = MKCoordinateForMapPoint(swMapPoint);
        
        NSDictionary *ne = [NSDictionary dictionaryWithObjectsAndKeys:
                                 [NSNumber numberWithFloat:neCoord.latitude], @"lat", 
                            [NSNumber numberWithFloat:neCoord.longitude], @"lng", nil];

        NSDictionary *sw = [NSDictionary dictionaryWithObjectsAndKeys:
                            [NSNumber numberWithFloat:swCoord.latitude], @"lat", 
                            [NSNumber numberWithFloat:swCoord.longitude], @"lng", nil];

        
        NSDictionary *boundsDict = [NSDictionary dictionaryWithObjectsAndKeys:ne, @"ne", sw, @"sw", nil];
        
        CLLocationCoordinate2D center = self.mapView.centerCoordinate;
        
        NSDictionary *centerDict = [NSDictionary dictionaryWithObjectsAndKeys:
                                [NSNumber numberWithFloat:center.latitude], @"lat", 
                                [NSNumber numberWithFloat:center.longitude], @"lng", nil];

        
        NSDictionary *geometry = [NSDictionary dictionaryWithObjectsAndKeys:
                                    boundsDict, @"bounds", 
                                    centerDict, @"center", 
                                    [NSNumber  numberWithFloat:widthMeters/2], @"radius", nil];
                
        
        return [PluginResult resultWithStatus:PGCommandStatus_OK messageAsDictionary:geometry];                
    } else {
        NSLog(@"Trying to use showMap without calling create first");        
        return [PluginResult resultWithStatus:PGCommandStatus_INVALID_ACTION];                
    }    
}

- (void)queue_pushRight:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    NSLog(@"F5MapView.pushRight");
    
    AppDelegate *appDelegate = (AppDelegate*)[[UIApplication sharedApplication] delegate];                
    
    animateWithDuration:delay:options:animations:completion:
    
    [[F5CommandQueue instance] queueCommand:^{                
        [UIView animateWithDuration:0.3 delay:0.0
                            options: UIViewAnimationOptionCurveEaseIn
                         animations:^{
                             CGPoint center = self.mapView.center;
                             center.x += [appDelegate.viewController view].bounds.size.width;
                             self.mapView.center = center;
                         }
                         completion:nil];                                       
    }];                
}

- (void)queue_pushLeft:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    NSLog(@"F5MapView.pushLeft");
    
    AppDelegate *appDelegate = (AppDelegate*)[[UIApplication sharedApplication] delegate];                    
    
    [[F5CommandQueue instance] queueCommand:^{                    
        [UIView animateWithDuration:0.3 delay:0.0
                            options: UIViewAnimationOptionCurveEaseIn
                         animations:^{
                             CGPoint center = self.mapView.center;
                             center.x -= [appDelegate.viewController view].bounds.size.width;
                             self.mapView.center = center;
                         }
                         completion:nil];
    }];
}

- (void)queue_fadeIn:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    NSLog(@"F5MapView.fadeIn");
    
    self.mapView.alpha = 0;
    
    [[F5CommandQueue instance] queueCommand:^{                    
        [UIView animateWithDuration:0.15 delay:0.0
                            options: UIViewAnimationOptionCurveEaseIn
                         animations:^{
                             self.mapView.alpha = 1;
                         }
                         completion:nil];
    }];
}

- (void)queue_fadeOut:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    NSLog(@"F5MapView.fadeOut");
    
    self.mapView.alpha = 1;
    
    [[F5CommandQueue instance] queueCommand:^{                    
        [UIView animateWithDuration:0.15 delay:0.0
                            options: UIViewAnimationOptionCurveEaseIn
                         animations:^{
                             self.mapView.alpha = 0;
                         }
                         completion:nil];
    }];
}

- (void)removePins:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    
    [self.mapView removeAnnotations:self.mapView.annotations];
}


- (void)mapView:(MKMapView *)mapView didAddAnnotationViews:(NSArray *)views { 
    MKAnnotationView *annotationView; 
    for (annotationView in views) {
        CGRect endFrame = annotationView.frame;
        
        annotationView.frame = CGRectMake(annotationView.frame.origin.x, 
                                          annotationView.frame.origin.y - self.mapView.bounds.size.height, 
                                          annotationView.frame.size.width, 
                                          annotationView.frame.size.height);
        
        [UIView beginAnimations:nil context:NULL];
        [UIView setAnimationDuration:0.45];
        [UIView setAnimationCurve:UIViewAnimationCurveEaseIn];
        [annotationView setFrame:endFrame];
        [UIView commitAnimations];
        
    }
}

- (void)dropPins:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    
    self.callbackID = [arguments pop];

    [self.mapView removeAnnotations:self.mapView.annotations];
        
    PG_SBJSON *parser = [[[PG_SBJSON alloc] init] autorelease];
    NSArray *pins = [parser objectWithString:[arguments pop]];
    
    NSEnumerator * enumerator = [pins objectEnumerator];
    id pin;
    while (pin = [enumerator nextObject]) {                        
        F5Annotation *annotation = [[[F5Annotation alloc] init] autorelease];

		CLLocationCoordinate2D pinCoord = { [[pin objectForKey:@"lat"] floatValue] , [[pin objectForKey:@"lng"] floatValue] };
        annotation.coordinate = pinCoord;
        annotation.title = [pin objectForKey:@"title"];        
        annotation.subtitle = [pin objectForKey:@"subtitle"];
        annotation.index = [pin objectForKey:@"index"];
        
        NSString *prefix = @"data:image/png;base64,";
        NSString *markerImageB64 = [pin objectForKey:@"markerImage"];
        if (markerImageB64 && [markerImageB64 hasPrefix:prefix]) {
            NSData *data = [QSStrings decodeBase64WithString:[markerImageB64 substringFromIndex:[prefix length]]];
            annotation.markerImage = [UIImage imageWithData:data];
        }
                        
		[self.mapView addAnnotation:annotation];
    }      
  
    // not required if map bounds are used to do search
//    [self.mapView zoomToFitMapAnnotations];
}

- (void)setRegionChangedCallback:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    self.regionChangeCallbackID = [arguments pop];    
}


- (void)mapView:(MKMapView *)mapView regionDidChangeAnimated:(BOOL)animated {
    if (self.animateToRegionCallbackID) {
        PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK];    
        [self writeJavascript: [pluginResult toSuccessCallbackString:self.animateToRegionCallbackID]];   
        self.animateToRegionCallbackID = nil;
    }

    if (self.regionChangeCallbackID) {
        PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK];   
        [pluginResult setKeepCallbackAsBool:YES];
        [self writeJavascript: [pluginResult toSuccessCallbackString:self.regionChangeCallbackID]];        
    }
//    NSLog(@"region changed");
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
    
    MKAnnotationView *view = (MKAnnotationView *)[self.mapView dequeueReusableAnnotationViewWithIdentifier:identifier];    
    if (!view) {
        if ([annotation isKindOfClass:[F5Annotation class]] && [(F5Annotation*)annotation markerImage]) {
            view = [[[MKAnnotationView alloc] initWithAnnotation:annotation reuseIdentifier:identifier] autorelease]; 
            view.image = [(F5Annotation*)annotation markerImage];
            view.frame = CGRectMake(0, 0, view.image.size.width/2, view.image.size.height/2);
        } else {
            view = [[[MKPinAnnotationView alloc] initWithAnnotation:annotation reuseIdentifier:identifier] autorelease];   
        }
    }
    
    if (![annotation isKindOfClass:[F5Annotation class]]) {
        return nil;
    }
    
    UIButton* rightButton = [UIButton buttonWithType:UIButtonTypeDetailDisclosure];
    view.rightCalloutAccessoryView = rightButton;
        
    UIImage *streetViewIcon = [UIImage imageWithContentsOfFile:[[NSBundle mainBundle] pathForResource:@"streetview" ofType:@"png"]];        
    UIButton *leftButton = [[[UIButton alloc] init] autorelease];       
    [leftButton setImage:streetViewIcon forState:UIControlStateNormal];
    leftButton.frame = CGRectMake(0, 0, streetViewIcon.size.width/2, streetViewIcon.size.height/2);
    view.leftCalloutAccessoryView = leftButton;
            
    view.canShowCallout = YES;
        
    return view;
}


@end
