cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/com.blackberry.community.led/www/client.js",
        "id": "com.blackberry.community.led.client",
        "clobbers": [
            "community.led"
        ]
    },
    {
        "file": "plugins/com.phonegap.plugins.PushPlugin/www/PushNotification.js",
        "id": "com.phonegap.plugins.PushPlugin.PushNotification",
        "clobbers": [
            "PushNotification"
        ]
    },
    {
        "file": "plugins/com.phonegap.plugins.PushPlugin/www/PushNotificationBB.js",
        "id": "com.phonegap.plugins.PushPlugin.PushNotificationBB",
        "clobbers": [
            "blackberry.push"
        ]
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "com.blackberry.community.led": "1.0.0",
    "com.phonegap.plugins.PushPlugin": "2.2.0",
    "com.blackberry.utils": "1.0.0"
}
// BOTTOM OF METADATA
});