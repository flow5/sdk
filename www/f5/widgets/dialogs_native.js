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
/*global F5, PhoneGap*/

F5.registerModule(function (F5) {	
	
	function Dialog() {
		this.constructDialog = function (data) {	
			
			var that = this;
			
			this.data = data;
		};
		
		this.setAction = function (cb) {
			this.action = cb;
		};
		
		this.present = function (message) {
			var that = this;
			PhoneGap.exec(
				function (result) { // messages from frame
					if (that.action) {
						that.action(result);
					}
				}, 
				function (result) { // failure
					console.log(result);
				}, 
				'com.flow5.alert', // the plugin name
				this.method, // the method
				[this.data]
			);			
		};	
		
		this.dismiss = function () {
			PhoneGap.exec(
				function (result) { // messages from frame
				}, 
				function (result) { // failure
				}, 
				'com.flow5.alert', // the plugin name
				'dismiss',
				[]
			);			
		};
	}	
	
	function Alert() {
		this.initialize = function (data) {				
			this.constructDialog(data);		
			this.method = 'alert';	
		};		
	}
	Alert.prototype = new Dialog();
	
	function Confirm() {
		this.initialize = function (data) {				
			this.constructDialog(data);
			this.method = 'confirm';
		};			
	}
	Confirm.prototype = new Dialog();	
		
	F5.Prototypes.Widgets.Alert = new Alert();
	F5.Prototypes.Widgets.Confirm = new Confirm();
	
});