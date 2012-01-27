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
/*global F5, FB*/

(function () {
	
	window.fbAsyncInit = function() {
	    FB.init({
	      appId      : '311991002178373', // App ID
//	      channelUrl : '//staging.juiceperks.com/channel.html', // Channel File TODO: NEEDED?
	      status     : true, // check login status
	      cookie     : true, // enable cookies to allow the server to access the session
	      xfbml      : true  // parse XFBML
	    });

		console.log('hi there facebook');
	    // Additional initialization code here
	  };

	  // Load the SDK Asynchronously
	var fbId = 'facebook-jssdk';
	if (!document.getElementById(fbId)) {
		var fb = document.createElement('div');
		fb.id = 'fb-root';
		document.body.appendChild(fb);
						
		var js = document.createElement('script'); 
		js.id = fbId; 
		js.async = true;
		js.src = "//connect.facebook.net/en_US/all.js";
		document.head.appendChild(js);		
	}
	
	function connect(appId, cb) {
		// TODO: make sure init is really complete
		FB.login(function(response) {
		   if (response.authResponse) {
				cb(response.authResponse.accessToken);
//		     console.log('Welcome!  Fetching your information.... ');
//		     FB.api('/me', function(response) {
//		       console.log('Good to see you, ' + response.name + '.');
//		       FB.logout(function(response) {
//		         console.log('Logged out.');
//		       });
//		     });
		   } else {
		     console.log('User cancelled login or did not fully authorize.');
		   }
		 }, {scope: 'email'});
	}
	
	F5.facebook = {
		connect: connect
	};
	
}());