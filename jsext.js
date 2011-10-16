(function () {
	
	Object.prototype.forEach = function (fn) {
		for (var name in this) {
			if (this.hasOwnProperty(name)) {
				fn(name, this[name]);
			}
		}
	};	
	
}());