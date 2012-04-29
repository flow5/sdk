/**
 * Based on jsonview by Benjamin Hollis
 * 
 * https://github.com/bhollis/jsonview
 *
 * MIT License
 *
 */

/*global F5*/

F5.registerModule(function (F5) {

/*jslint white: false, forin: true, eqeq: true*/

	function JSONFormatterPrototype() {
		var that = this;

		this.htmlEncode = function (t) {
			return t !== null ? t.toString().replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
		};

		// Completely escape strings, taking care to return common escape codes to their short forms
		this.jsString = function (s) {
		    // the JSON serializer escapes everything to the long-form \uXXXX
		    // escape code. This is a map of characters to return to the short-escaped
		    // form after escaping.
		    var has = {
		        '\b': 'b',
		        '\f': 'f',
		        '\r': 'r',
		        '\n': 'n',
		        '\t': 't'
		    },
		    ws;
			F5.forEach(has, function (ws, obj) {
		        if ( - 1 === s.indexOf(ws)) {
		            delete has[ws];
		        }
		    });

		    // The old nsIJSON can't encode just a string...
		    s = JSON.stringify({
		        a: s
		    });
		    s = s.slice(6, -2);

			F5.forEach(has, function (ws, obj) {
		        s = s.replace(new RegExp('\\\\u000' + (ws.charCodeAt().toString(16)), 'ig'),
		        '\\' + has[ws]);
		    });

		    return that.htmlEncode(s);
		};

		this.decorateWithSpan = function(value, className) {
		    return '<span class="' + className + '">' + that.htmlEncode(value) + '</span>';
		};

		// Convert a basic JSON datatype (number, string, boolean, null, object, array) into an HTML fragment.
		this.valueToHTML = function(value) {
		    var valueType = typeof value;

		    var output = "";
		    if (value === null) {
		        output += that.decorateWithSpan('null', 'null');
		    }
		    else if (value && value.constructor === Array) {
		        output += that.arrayToHTML(value);
		    }
		    else if (valueType === 'object') {
		        output += that.objectToHTML(value);
		    }
		    else if (valueType === 'number') {
		        output += that.decorateWithSpan(value, 'num');
		    }
		    else if (valueType === 'string') {
				if (value.match('-> ')) {
					output += '<span class="reference">' + that.jsString(value) + '</span>';	            				
				} else {
					output += '<span class="string">"' + that.jsString(value) + '"</span>';	            								
				}
		    }
		    else if (valueType === 'boolean') {
		        output += that.decorateWithSpan(value, 'bool');
		    }

		    return output;
		};

		// Convert an array into an HTML fragment
		this.arrayToHTML = function(json) {
		    var hasContents = false;
		    var output = '';
		    var numProps = 0;
			var prop;

			F5.forEach(json, function (item) {
		        numProps += 1;				
			});
		
			F5.forEach(json, function (item) {
		        hasContents = true;
		        output += '<li>' + that.valueToHTML(item);
		        if (numProps > 1) {
		            output += ',';
		        }
		        output += '</li>';
		        numProps -= 1;
		    });

		    if (hasContents) {
		        output = '[<ul class="array collapsible">' + output + '</ul>]';
		    } else {
		        output = '[ ]';
		    }

		    return output;
		};

		// Convert a JSON object to an HTML fragment
		this.objectToHTML = function(json) {
		    var hasContents = false;
		    var output = '';
		    var numProps = 0;
			var prop;
		
			F5.forEach(json, function (id,obj) {
		        numProps += 1;				
			});

			F5.forEach(json, function (prop,obj) {
		        hasContents = true;

				// NOTE: the q class hides the quotes which makes search difficult since they're really there
	//	        output += '<li><span class="prop"><span class="q">"</span>' + that.jsString(prop) +
	//	        '<span class="q">"</span></span>: ' + that.valueToHTML(json[prop]);
				output += '<li><span class="prop"><span class="string">"</span>' + that.jsString(prop) +
				'<span class="string">"</span></span>: ' + that.valueToHTML(json[prop]);

		        if (numProps > 1) {
		            output += ',';
		        }
		        output += '</li>';
		        numProps -= 1;
		    });

		    if (hasContents) {
				if (json.path) {
					output = '{<ul class="obj collapsible" id="json-' + json.path + '">' + output + '</ul>}';		       
				} else {
			        output = '{<ul class="obj collapsible">' + output + '</ul>}';				
				}
		    } else {
		        output = '{ }';
		    }

		    return output;
		};
	
		this.collapse = function(collapser) {	
		    var target = collapser.parentNode.getElementsByClassName('collapsible');

		    if (!target.length) {
		        return;
		    }
		
			target = target[0];
			
			var ellipsis;
		    if (target.style.display === 'none') {
		        ellipsis = target.parentNode.getElementsByClassName('ellipsis')[0];
		        target.parentNode.removeChild(ellipsis);
		        target.style.display = '';
		        collapser.innerHTML = '-';
		    } else {
		        target.style.display = 'none';

		        ellipsis = document.createElement('span');
				F5.addClass(ellipsis, 'ellipsis');
		        ellipsis.innerHTML = ' &hellip; ';
		        target.parentNode.insertBefore(ellipsis, target);
		        collapser.innerHTML = '+';
		    }
		}
	
		this.attachListeners = function () {
			var that = this;
		
			function collapse(evt) {
				that.collapse(evt.target);
			}

			function addCollapser(item) {
			    // This mainly filters out the root object (which shouldn't be collapsible)
			    if (item.nodeName !== 'LI') {
			        return;
			    }

			    var collapser = document.createElement('div');
				F5.addClass(collapser, 'collapser');
			    collapser.innerHTML = '-';
				F5.addTapListener(collapser, collapse);
			    item.insertBefore(collapser, item.firstChild);
			}

			var items = document.getElementsByClassName('collapsible');
			for (var i = 0; i < items.length; i += 1) {
			    addCollapser(items[i].parentNode);
			}
		};
	}	

	IDE.JSONFormatter = function () {
	
	}	
	IDE.JSONFormatter.prototype = new JSONFormatterPrototype();

});