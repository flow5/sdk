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
	F5.Global.flow = F5.objectFromPrototype(F5.Flow);
	F5.Global.flowController = new F5.FlowController(F5.Global.flow);
	if (F5.ViewController) {
		F5.Global.viewController = new F5.ViewController(F5.Global.flow);
	}

	// TODO: not so happy with this
	F5.Clients = {};

	function Client(pkg) {
		this.pkg = pkg;

		// TODO: make this more consistent. some of these get initialized during package processing
		// and some need to be set to empty object
		this.Prototypes = F5.Prototypes[pkg] = {};
		this.Prototypes.Widgets = {};
		this.Prototypes.FlowDelegates = {};
		this.Prototypes.ViewDelegates = {};

		this.Animation = F5.Animation[pkg] = {};


		this.Services = F5.Services[pkg] = {};

		this.Resources = F5.Resources[pkg];
		this.Schemas = F5.Schemas[pkg];
	}

	// bootstrap
	Client.prototype = F5;

	F5.Clients.f5 = new Client('f5');

	// all clients get the f5 root namespace
	// TODO: probably want to limit this to the needed set of interfaces
	Client.prototype = F5.Clients.f5;

	F5.registerPendingModules = function () {
		F5.pendingModules.forEach(function (module) {
			F5.Clients[module.pkg] = F5.Clients[module.pkg] || new Client(module.pkg);
			module.cb(F5.Clients[module.pkg]);
		});
		F5.pendingModules = [];
	};
}());