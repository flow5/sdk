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

#import "F5udp.h"
#import "AsyncUdpSocket.h"

#include <ifaddrs.h>
#include <arpa/inet.h>

@implementation F5udp

@synthesize socket;
@synthesize callbackID;

- (id)initWithWebView:(UIWebView*)webview {
    self = [super initWithWebView:webview];
    if (self) {
        self.socket = [[[AsyncUdpSocket alloc] initWithDelegate:self] autorelease];
    }
    return self;
}

- (void)sendDatagram:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    
    [arguments pop]; // callback not needed
    
    [self.socket sendData:[[arguments pop] dataUsingEncoding:NSUTF8StringEncoding]
                 withTimeout:-1
                 tag:0]; 
}

- (void)connectToHost:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    
    self.callbackID = [arguments pop];
    
    NSError *error = nil;
    [self.socket connectToHost:[options valueForKey:@"host"] onPort:[[options valueForKey:@"port"] integerValue] error:&error];
    [self.socket receiveWithTimeout:-1 tag:0];    
    
    DLog(@"%@", error);
}

- (void)onUdpSocket:(AsyncUdpSocket *)sock didSendDataWithTag:(long)tag {
    
}

- (void)onUdpSocket:(AsyncUdpSocket *)sock didNotSendDataWithTag:(long)tag dueToError:(NSError *)error {
    
}

- (BOOL)onUdpSocket:(AsyncUdpSocket *)sock didReceiveData:(NSData *)data withTag:(long)tag fromHost:(NSString *)host port:(UInt16)port {
    
    NSString* message = [[[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding] autorelease];    
    DLog(@"%@", message);
    
    PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK messageAsString:message];  
    [pluginResult setKeepCallbackAsBool:YES];
    [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];   
    
    // wait again
    [self.socket receiveWithTimeout:-1 tag:0];     

    return YES;
}

- (void)onUdpSocket:(AsyncUdpSocket *)sock didNotReceiveDataWithTag:(long)tag dueToError:(NSError *)error {
    
}

- (void)onUdpSocketDidClose:(AsyncUdpSocket *)sock {
    
}

@end
