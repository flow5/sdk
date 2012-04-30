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

F5.registerModule(function (F5) {
	
	// http://blogs.msdn.com/b/ie/archive/2010/09/07/transitioning-existing-code-to-the-es5-getter-setter-apis.aspx	
	try {
	   if (!Object.prototype.__defineGetter__ &&
	        Object.defineProperty({},"x",{get: function(){return true}}).x) {
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
	} catch(defPropException) {/*Do nothing if an exception occurs*/};
	
		
	
	/* fields is array of {name, persist:true/false(default), value:value/null(default)} */
	function Cache() {
		
		this.initialize = function (fields) {
			this.fields = fields;
			this.values = {};


			var that = this;
			this.fields.forEach(function (field) {
				if (field.persist) {
					
					if (typeof field.value !== 'undefined' && !localStorage.getItem(field.name)) {
						if (typeof field.value === 'object') {
							localStorage.setItem(field.name, JSON.stringify(field.value));
						} else if (typeof field.value === 'string') {
							localStorage.setItem(field.name, '"' + field.value + '"');	
						} else {
							localStorage.setItem(field.name, field.value);	
						}
					}

					that.__defineGetter__(field.name, function(){
						if (localStorage.getItem(field.name)) {
							return JSON.parse(localStorage.getItem(field.name));							
						} else {
							return undefined;
						}
				    });

				    that.__defineSetter__(field.name, function(value){
						localStorage.setItem(field.name, JSON.stringify(value));
				    });					    
				} else {
					if (typeof field.value !== 'undefined') {
						that.values[field.name] = F5.clone(field.value);					
					}

					that.__defineGetter__(field.name, function(){
				        return that.values[field.name];
				    });

				    that.__defineSetter__(field.name, function(value){
				        that.values[field.name] = value;
					});			
				}
			});	
			
			return this;		
		};
				
		this.reset = function () {
			var that = this;			
			this.fields.forEach(function (field) {
				if (typeof field.value !== 'undefined') {
					that[field.name] = F5.clone(field.value);
				} else {
					if (field.persist) {
						localStorage.removeItem(field.name);
					} else {
						delete that.values[field.name];
					}					
				}
			});
		};
		
		this.dump = function () {
			var dump = {};
			var that = this;
			this.fields.forEach(function (field) {
				dump[field.name] = that[field.name];
			});			
			return dump;
		};
	}	
	
	F5.Prototypes.Cache = new Cache();	
});

