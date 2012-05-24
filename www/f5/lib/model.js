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
/*global F5*/

(function () {
	
	function Model() {

		var notifications = {};
		var pendingTimeout;
		var syncing = false;
		this.objectChanged = function (fieldName) {
			if (syncing) {
				return;
			}
			
			notifications[this.internal.node.path] = this.internal.node;
			if (!pendingTimeout) {
				pendingTimeout = setTimeout(function () {
					F5.forEach(notifications, function (path, node) {
						if (node.flowDelegate && node.flowDelegate.modelChanged) {
							node.flowDelegate.modelChanged();
						}
						// TODO: sloppy. node.view is undefined in headless mode
						if (node.view && node.view.delegate && node.view.delegate.modelChanged) {
							node.view.delegate.modelChanged();
						}
					});
					notifications = {};
					pendingTimeout = null;
				}, 0);
			}
		};
				
		// TODO: move to diags
		this.validateAll = function () {
			function validateNodeRecursive(node) {
				F5.assert(node.data.validate, 'wtf: ' + node.path);
				node.data.validate();
				if (node.children) {
					F5.forEach(node.children, function (id, node) {
						validateNodeRecursive(node);
					});				
				}
			}
			validateNodeRecursive(F5.Global.flow.root);
		};
		
		this.sync = function (field, value) {
			syncing = true;
			this[field] = value;
			syncing = false;
		};
		
		this.validate = function () {
			var that = this;
			F5.forEach(this, function (id, value) {
				// TODO: slightly ugly. at least need a reserved words mechanism
				switch (id) {
				case 'fields':
				case 'values':
				case 'node':
				case 'sync':
					break;
				default:
					if (typeof that.fields[id] === 'undefined') {
						throw new Error('Model validation for node: ' + that.internal.node.path + ' failed with field: ' + id);
					}
				}
			});			
		};
		
		this.initialize = function (node, fields) {
			Model.prototype.initialize.call(this, fields);
			this.internal.node = node;
			
			return this;
		};
		
	}
	Model.prototype = F5.Cache;
	
	F5.Model = new Model();
	
}());