cordova.define("com.blackberry.community.led.client", function(require, exports, module) { /*
* Copyright (c) 2014 BlackBerry Limited
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/


var PushNotification = function() {
};


// Call this to register for push notifications. Content of [options] depends on whether we are working with APNS (iOS) or GCM (Android)
PushNotification.prototype.register = function(successCallback, errorCallback, options) {
	if (errorCallback == null) { errorCallback = function() {}}

		if (typeof errorCallback != "function")  {
			console.log("PushNotification.register failure: failure parameter not a function");
			return
		}


		if (typeof successCallback != "function") {
			console.log("PushNotification.register failure: success callback parameter must be a function");
			return
		}

		cordova.exec(successCallback, errorCallback, "PushPlugin", "register", [options]);
	};

// Call this to unregister for push notifications
PushNotification.prototype.unregister = function(successCallback, errorCallback) {
	if (errorCallback == null) { errorCallback = function() {}}

		if (typeof errorCallback != "function")  {
			console.log("PushNotification.unregister failure: failure parameter not a function");
			return
		}

		if (typeof successCallback != "function") {
			console.log("PushNotification.unregister failure: success callback parameter must be a function");
			return
		}

		cordova.exec(successCallback, errorCallback, "PushPlugin", "unregister", []);
	};


// Call this to set the application icon badge
PushNotification.prototype.setApplicationIconBadgeNumber = function(successCallback, errorCallback, badge) {
	if (errorCallback == null) { errorCallback = function() {}}

		if (typeof errorCallback != "function")  {
			console.log("PushNotification.setApplicationIconBadgeNumber failure: failure parameter not a function");
			return
		}

		if (typeof successCallback != "function") {
			console.log("PushNotification.setApplicationIconBadgeNumber failure: success callback parameter must be a function");
			return
		}

		cordova.exec(successCallback, errorCallback, "PushPlugin", "setApplicationIconBadgeNumber", [{badge: badge}]);
	};

//-------------------------------------------------------------------

if(!window.plugins) {
	window.plugins = {};
}
if (!window.plugins.pushNotification) {
	window.plugins.pushNotification = new PushNotification();
}

if (module.exports) {
	module.exports = PushNotification;
}


var _self = {},
_ID = "com.blackberry.community.led",
exec = cordova.require("cordova/exec");

	// These methods are called by your App's JavaScript
	// They make WebWorks function calls to the methods
	// in the index.js of the Extension
	
	_self.startLed = function (color, blinkCount) {
		var result, 
		success = function(data, response) {
			result = data; 
		}, 
		fail = function(data, response) {
			console.log("Error: " + data); 
		}; 
		var input = { "color": color, "blinkCount": blinkCount};
		exec(success, fail, _ID, "startLed", {input : input});
		return result; 
	};

	// Call this to register for push notifications. Content of [options] depends on whether we are working with APNS (iOS) or GCM (Android)
	_self.register = function(successCallback, errorCallback, options) {
		if (errorCallback == null) { errorCallback = function() {}}

			if (typeof errorCallback != "function")  {
				console.log("PushNotification.register failure: failure parameter not a function");
				return
			}


			if (typeof successCallback != "function") {
				console.log("PushNotification.register failure: success callback parameter must be a function");
				return
			}

			cordova.exec(successCallback, errorCallback, "PushPlugin", "register", [options]);
		};

		_self.stopLed = function (input) {
			var result, 
			success = function(data, repsonse) {
				result = data; 
			}, 
			fail = function(data, response) {
				console.log("Error: " + data); 
			}; 
			exec(success, fail, _ID, "stopLed", {input : input});
			return result; 
		};

		module.exports = _self;
});
