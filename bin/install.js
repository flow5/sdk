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

var npm = require('npm'),
	path = require('path'),
	exec = require('child_process').exec;

npm.load({}, function () {	
	
	npm.config.set('flow5:link_f5', path.resolve(__dirname, '..'));
	npm.config.set('flow5:port', '8008');

	var home = path.dirname(npm.config.get('userconfig'));
	
	var domain = home + '/Library/Preferences/com.apple.dt.Xcode';
	var commandBase = 'defaults write ' + domain + ' ';
	
	var buildSettings = commandBase + 'IDEApplicationwideBuildSettings -dict-add FLOW5 "' + process.env.PWD + '/ios"';
	var displayNames = commandBase + 'IDESourceTreeDisplayNames -dict-add FLOW5 ""';
	
	var defaultsCommand = buildSettings + ';' + displayNames;
		
	var prefsFile = domain + '.plist';
	var ownerCommand = 'stat -f "%Su" ' + prefsFile;
	
	
	exec(ownerCommand, function (error, owner, stderr) {
		if (error) {
			console.log('error configuring flow5 for Xcode: ' + error);
		} else {
			exec(defaultsCommand, function (error, stdout, stderr) {
					if (error) {
						console.log('error configuring flow5 for Xcode: ' + error);
					} else {
						var chownCommand = 'chown ' + owner.replace(/\s/, '') + ' ' + prefsFile;
						exec(chownCommand, function (error, owner, stderr) {
							if (error) {
								console.log('error configuring flow5 for Xcode: ' + error);								
							}
						});
					}
				}
			);
			
		}
	});
});