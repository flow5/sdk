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


#import "F5CommandQueue.h"
#import "AppDelegate.h"

typedef void (^CommandBlock)();

@interface F5Command : NSObject {
    CommandBlock block;
}
@property (nonatomic, assign) CommandBlock block;
@end

@implementation F5Command
@synthesize block;
@end

@implementation F5CommandQueue

@synthesize queue;

- (id)initWithWebView:(UIWebView*)webview {
    self = [super initWithWebView:webview];
    if (self) {
        self.queue = [[[NSMutableArray alloc] init] autorelease];
    }
    return self;
}


+ (F5CommandQueue*)instance {
    return [(AppDelegate*)[[UIApplication sharedApplication] delegate] getCommandInstance:@"com.flow5.commandqueue"];
}

- (void)queueCommand:(void (^)(void))block {
    F5Command *command = [[[F5Command alloc] init] autorelease];
    command.block = Block_copy(block);
    [self.queue addObject:command];
}

- (void)flush:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
    
    NSLog(@"F5CommandQueue.flush");
    PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK];        
    [self writeJavascript: [pluginResult toSuccessCallbackString:[arguments pop]]];      

    NSEnumerator *enumerator = [self.queue objectEnumerator];
    F5Command *command;
    while (command = [enumerator nextObject]) {
        command.block();
        Block_release(command.block);
    }  
    [self.queue removeAllObjects];        
}

@end
