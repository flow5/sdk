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
/*global define F5: true*/

F5 = {Global: {}, Prototypes: {}};

define('f5', exports, function (exports) {

	require('./jsext.js');

	// utils go to top level for convenince
	require('./utils.js').forEach(function (id, fn) {
		F5[id] = fn;
	});
	
	F5.Flow = require('./flow.js').Flow;
	F5.FlowController = require('./flowcontroller.js').FlowController;
	
	F5.Diags = {};
	F5.Diags.JSON = require('./json.js');
	
	if (typeof document !== 'undefined') {
		require('./domext.js');		
		F5.ViewController = require('./viewcontroller.js').ViewController;
		F5.Animation = require('./animation.js').Animation;
		F5.Widgets = require('./widgets.js').Widgets;
		F5.DefaultViews = require('./defaultviews.js').DefaultViews;
		F5.Webharness = require('./webharness.js').Webharness;
	}
});