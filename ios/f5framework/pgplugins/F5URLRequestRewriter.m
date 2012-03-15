/***********************************************************************************************************************
 
 Copyright (c) 2012 Paul Greyson
 
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

#import "F5URLRequestRewriter.h"
#import "QSStrings.h"

// TODO: provide a more general regex-based rewrite rule mechanism. below solves the immediate problem


static id<F5URLRequestRewriterProtocolDelegate> sProtocolDelegate = nil;

@interface F5URLRequestRewriterProtocol : NSURLProtocol

@end

@implementation F5URLRequestRewriterProtocol

+ (BOOL)canInitWithRequest:(NSURLRequest *)request
{
    return [sProtocolDelegate canInitWithRequest:request];
}

+ (NSURLRequest *)canonicalRequestForRequest:(NSURLRequest *)request
{
    return request;
}

- (id)choose:(id)a :(id)b
{
    if (a) {
        return a;
    } else {
        return b;
    }
}

- (void)startLoading
{
    NSMutableURLRequest *request = [[[self request] mutableCopy] autorelease];        
    NSURL *url = [request URL];
        
    NSDictionary *rule = [sProtocolDelegate rewriteUrl:url];
    
    NSString *content = [rule valueForKey:@"content"];
    NSString *mimeType = [self choose:[rule valueForKey:@"mimeType"] :@"application/octet-stream"];
    if (content) {
        NSRange prefixRange = [content rangeOfString:@"base64,"];
        NSUInteger contentStart = prefixRange.location + prefixRange.length;
        NSData *data = [QSStrings decodeBase64WithString:[content substringFromIndex:contentStart]];   
        
        NSURLResponse *response = [[NSURLResponse alloc] initWithURL:url MIMEType:mimeType expectedContentLength:[data length] textEncodingName:nil];        
        [[self client] URLProtocol:self didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageAllowed];
        
        [[self client] URLProtocol:self didLoadData:data];
        [[self client] URLProtocolDidFinishLoading:self];        
    } else {
        NSString *scheme = [self choose:[rule valueForKey:@"scheme"] :[url scheme]];
        NSString *host = [self choose:[rule valueForKey:@"host"] :[url host]];
        NSString *path = [self choose:[rule valueForKey:@"path"] :[url path]];
        NSString *query = [self choose:[url query] :@""];
        
        NSString *rewrittenUrl = [NSString stringWithFormat:@"%@://%@%@?%@", scheme, host, path, query];    
        [request setURL:[NSURL URLWithString:rewrittenUrl]];      
        
        NSDictionary *headers = [rule valueForKey:@"headers"];
        
        if (headers) {
            [headers enumerateKeysAndObjectsUsingBlock:^(id key, id obj, BOOL *stop){
                [request setValue:obj forHTTPHeaderField:key];
            }];         
        }    
        
        NSURLConnection *connection = [[[NSURLConnection alloc]
                                        initWithRequest:request
                                        delegate:self
                                        startImmediately:YES] autorelease];    
        if(!connection) {
            NSError *error = [NSError errorWithDomain:@"" code:0 userInfo:nil];        
            [[self client] URLProtocol:(NSURLProtocol *)self didFailWithError:error];    
        }               
    }             
}

- (void)stopLoading
{
    
}

#pragma mark NSURLConnection delegate methods
- (NSURLRequest *)connection:(NSURLConnection *)connection
 			 willSendRequest:(NSURLRequest *)request
 			redirectResponse:(NSURLResponse *)redirectResponse {
    return request;
}

- (void)connection:(NSURLConnection *)connection didReceiveResponse:(NSURLResponse *)response {
    [[self client] URLProtocol:self didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed];
}

- (void)connection:(NSURLConnection *)connection didReceiveData:(NSData *)data {
    [[self client] URLProtocol:self didLoadData:data];
}

- (void)connection:(NSURLConnection *)connection didFailWithError:(NSError *)error {
    [[self client] URLProtocol:self didFailWithError:error]; 
}

- (void)connectionDidFinishLoading:(NSURLConnection *)connection {    
    [[self client] URLProtocolDidFinishLoading:self];
}


@end


@implementation F5URLRequestRewriter

@synthesize rules;

- (id)initWithWebView:(UIWebView*)webview {
    self = [super initWithWebView:webview];
    if (self) {        
        self.rules = [[[NSMutableArray alloc] init] autorelease];
        sProtocolDelegate = self;
        [NSURLProtocol registerClass:[F5URLRequestRewriterProtocol class]];
    }
    return self;
}

- (void)addRewriteRule:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options
{    
    NSString *regexString = [options valueForKey:@"regex"];
        
    NSError *error = NULL;
    NSRegularExpression *regex = [NSRegularExpression regularExpressionWithPattern:regexString
                                                                           options:NSRegularExpressionCaseInsensitive
                                                                             error:&error];    
    if (error) {
        NSLog(@"bad regex");
        // TODO: callback to js
    }
    
    [options setValue:regex forKey:@"regex"];        
    [rules addObject:options];
}

- (BOOL)canInitWithRequest:(NSURLRequest *)request
{
    BOOL rewrite = NO;
    
    NSEnumerator *enumerator = [self.rules objectEnumerator];
    id rule;
    while (rule = [enumerator nextObject]) {
        NSString *url = [[request URL] absoluteString];        
        NSUInteger numberOfMatches = [[rule valueForKey:@"regex"] numberOfMatchesInString:url
                                                            options:0
                                                            range:NSMakeRange(0, [url length])];   
        if (numberOfMatches) {
            rewrite = YES;
            break;
        }
    }
    
    return rewrite;
}

- (NSDictionary*)rewriteUrl:(NSURL*)url
{
    NSEnumerator *enumerator = [self.rules objectEnumerator];
    id rule;
    while (rule = [enumerator nextObject]) {
        NSUInteger numberOfMatches = [[rule valueForKey:@"regex"] numberOfMatchesInString:[url absoluteString]
                                                                  options:0
                                                                  range:NSMakeRange(0, [[url absoluteString] length])];   
        if (numberOfMatches) {
            break;
        }
    }
    
    return rule;
}


@end
