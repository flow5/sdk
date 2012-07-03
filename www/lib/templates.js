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
/*global F5*/

(function () {	
	
	F5.createWidget = function(f5widget, data, f5id, f5class) {
		var el = document.createElement('div');
		if (f5id) {
			el.setAttribute('f5id', f5id);			
		}
		if (f5class) {
			el.setAttribute('f5class', f5class);			
		}		
		F5.attachWidget(el, f5widget, data, this.pkg);
		return el;		
	};	
	
	function widgetData(data, f5id, f5class) {
		var mergedData;
		
		if (f5class) {
			mergedData = data && data['.' + f5class];
		}
		
		if (f5id) {
			var instanceData = data && F5.valueFromId(data, f5id);
			if (typeof instanceData !== 'undefined') {
				if (typeof instanceData === 'object' && mergedData) {
					F5.assert(!mergedData || typeof mergedData === 'object', 'Merging object into simple type');
					F5.merge(instanceData, mergedData);						
				} else {
					mergedData = instanceData;
				}				
			}
		}
		
		return mergedData;
	}
	
	F5.attachWidget = function(el, f5widget, data, pkg) {
		F5.assert(!el.widget, 'Widget already attached to element');
		
		// NOTE: this is just for readability in the DOM inspector
		if (!el.getAttribute('f5widget')) {
			el.setAttribute('f5widget', f5widget);
		}

		pkg = pkg || this.pkg;

		// fully qualifed widget name
		var prototypes, prototype;
		if (f5widget.split('.').length === 1) {
			prototypes = F5.valueFromId(F5.Prototypes, pkg);
			prototype = prototypes.Widgets[f5widget];
		} else {
			var components = f5widget.split('.');
			var widgetName = components.pop();
			prototypes = F5.valueFromId(F5.Prototypes, components.join('.'));
			F5.assert(prototypes, 'No prototypes for package: ' + components.join('.'));
			prototype = prototypes.Widgets[widgetName];
		}					
		F5.assert(prototype, 'No widget: ' + f5widget);
		
		var widget = F5.objectFromPrototype(prototype);
		widget.el = el;
		el.widget = widget;
		
		var className = el.getAttribute('f5class');
		if (className) {
			F5.addClass(el, className);
		}
		widget.initialize(widgetData(data, el.getAttribute('f5id'), el.getAttribute('f5class')));		
	};
	
	
	F5.refreshTemplate = function(el, node, data) {
		var widgetEls = [];
		
		if (el.hasAttribute('f5widget')) {
			widgetEls.push(el);
		}

		F5.forEach(el.querySelectorAll('[f5widget]'), function (el) {
			widgetEls.unshift(el);			
		});
		
		var mergedData = F5.getNodeData(node, data);				
		
		F5.forEach(widgetEls, function (el) {
			if (el.widget.refresh) {
				el.widget.refresh(widgetData(mergedData, el.getAttribute('f5id'), el.getAttribute('f5class')));	
			}
		});
	};
	
	F5.loadTemplate = function (id, node, data) {
		// namespacing
		var templateId = id;
		var pkg = (node && F5.getNodePackage(node)) || this.pkg;
		if (pkg) {
			templateId = pkg + '.' + id;
		}	
		
		var template = document.getElementById(templateId);		
		if (!template) {
//			console.log("No template with id: " + templateId);
			return null;
		}						
		
		var instance = template.cloneNode(true);
		instance.removeAttribute('id');
		if (!instance.hasAttribute('f5id')) {
			instance.setAttribute('f5id', id);			
		}
		F5.addClass(instance, id);	
		
		
		var widgetEls = [];

		if (instance.hasAttribute('f5widget')) {
			widgetEls.push(instance);
		}

		F5.forEach(instance.querySelectorAll('[f5widget]'), function (el) {
			widgetEls.unshift(el);			
		});

		var mergedData = (node && F5.getNodeData(node, data)) || data;	

		F5.forEach(widgetEls, function attachWidget(el) {
			F5.attachWidget(el, el.getAttribute('f5widget'), mergedData, pkg);
		});

		return instance;			

		// TODO: return {el: el, widgets: widgets}			
	};		

	// itemCb = function (item, itemEl, itemWidgetsMap)
	F5.populateList = function(scroller, itemTemplateName, node, items, itemCb) {
		F5.clear(scroller.el);
		var listItems = [];
		F5.forEach(items, function (item) {
			var el = F5.loadTemplate(itemTemplateName, node, item);
			scroller.el.appendChild(el);
			listItems.push({el: el, item: item});
		});
				
		F5.forEach(listItems, function (listItem) {
			var widgets = {};
			F5.forEach(listItem.el.querySelectorAll('[f5widget]'), function (el) {
				widgets[el.getAttribute('f5id')] = el.widget;
			});			
			itemCb(listItem.item, listItem.el, widgets);
		});
		
		F5.forEach(listItems, function (listItem) {
			F5.doWidgetLifecycleEventRecursive(listItem.el, 'WillBecomeActive');			
		});
		
		if (F5.lifecycleEvent !== 'WillBecomeActive') {
			F5.forEach(listItems, function (listItem) {
				F5.doWidgetLifecycleEventRecursive(listItem.el, 'DidBecomeActive');			
			});			
		}				
		
		scroller.refresh();
	};	
}());
