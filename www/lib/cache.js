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
/*global F5, localStorage:true*/

(function () {
	
	// http://blogs.msdn.com/b/ie/archive/2010/09/07/transitioning-existing-code-to-the-es5-getter-setter-apis.aspx	
	try {
	   if (!Object.prototype.__defineGetter__ &&
	        Object.defineProperty({},"x",{get: function(){return true;}}).x) {
	      Object.defineProperty(Object.prototype, "__defineGetter__",
	         {enumerable: false, configurable: true,
	          value: function(name,func)
	             {Object.defineProperty(this,name,
	                 {get:func,enumerable: true,configurable: true});
	      }});
	      Object.defineProperty(Object.prototype, "__defineSetter__",
	         {enumerable: false, configurable: true,
	          value: function(name,func)
	             {Object.defineProperty(this,name,
	                 {set:func,enumerable: true,configurable: true});
	      }});
	   }
	} catch(defPropException) {/*Do nothing if an exception occurs*/}
	
	
	if (typeof localStorage === 'undefined') {
		localStorage = {
			store: {},
			getItem: function (id) {return this.store[id];},
			setItem: function (id, value) {this.store[id] = value;},
			removeItem: function (id) {delete this.store[id];},
			clear: function () {this.store = {};}
		};
	}			
	
	/* fields is array of {name, persist:true/false(default), value:value/null(default)} */
	function Cache() {
		
		this.initialize = function (fields) {
			this.internal = {
				fields: fields || {},
				values: {}
			};

			var that = this;
			F5.forEach(this.internal.fields, function (id, field) {
				if (field.persist) {
					
					if (typeof field.value !== 'undefined' && !localStorage.getItem(id)) {
						if (typeof field.value === 'object') {
							localStorage.setItem(id, JSON.stringify(field.value));
						} else if (typeof field.value === 'string') {
							localStorage.setItem(id, '"' + field.value + '"');	
						} else {
							localStorage.setItem(id, field.value);	
						}
					}

					that.__defineGetter__(id, function(){
						if (localStorage.getItem(id)) {
							return JSON.parse(localStorage.getItem(id));							
						} else {
							return undefined;
						}
				    });

				    that.__defineSetter__(id, function(value){
						localStorage.setItem(id, JSON.stringify(value));
						if (that.objectChanged) {
							that.objectChanged(id);
						}
				    });					    
				} else {
					if (typeof field.value !== 'undefined') {
						that.internal.values[id] = F5.clone(field.value);					
					}

					that.__defineGetter__(id, function(){
				        return that.internal.values[id];
				    });

				    that.__defineSetter__(id, function(value){
				        that.internal.values[id] = value;
						if (that.objectChanged) {
							that.objectChanged(id);
						}				
					});			
				}
			});	
			
			return this;		
		};
				
		this.reset = function () {
			var that = this;			
			F5.forEach(this.internal.fields, function (id, field) {
				if (typeof field.value !== 'undefined') {
					that[id] = F5.clone(field.value);
				} else {
					if (field.persist) {
						localStorage.removeItem(id);
					} else {
						delete that.internal.values[id];
					}					
				}
			});
		};
		
		this.dump = function () {
			var dump = {};
			var id;
			for (id in this) {
				if (id !== 'internal' && this.hasOwnProperty(id)) {
					dump[id] = this[id];
				}
			}
			return dump;
		};
	}	
	
	F5.Cache = new Cache();	
}());

