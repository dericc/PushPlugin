/*
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at
 
     http://www.apache.org/licenses/LICENSE-2.0
 
 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
 */

 var _self = {},
 exec = cordova.require("cordova/exec"),
 _ID = "com.blackberry.push",
 PushService,
 PushPayload,
 PushNotification,
 createInvokeTargetId = null,
 createAppId = null,
 noop = function () {},
 SUCCESS = 0,
 INTERNAL_ERROR = 500,
 INVALID_DEVICE_PIN = 10001,
 INVALID_PROVIDER_APPLICATION_ID = 10002,
 CHANNEL_ALREADY_DESTROYED = 10004,
 CHANNEL_ALREADY_DESTROYED_BY_PROVIDER = 10005,
 INVALID_PPG_SUBSCRIBER_STATE = 10006,
 PPG_SUBSCRIBER_NOT_FOUND = 10007,
 EXPIRED_AUTHENTICATION_TOKEN_PROVIDED_TO_PPG = 10008,
 INVALID_AUTHENTICATION_TOKEN_PROVIDED_TO_PPG = 10009,
 PPG_SUBSCRIBER_LIMIT_REACHED = 10010,
 INVALID_OS_VERSION_OR_DEVICE_MODEL_NUMBER = 10011,
 CHANNEL_SUSPENDED_BY_PROVIDER = 10012,
 CREATE_SESSION_NOT_DONE = 10100,
 MISSING_PPG_URL = 10102,
 PUSH_TRANSPORT_UNAVAILABLE = 10103,
 OPERATION_NOT_SUPPORTED = 10105,
 CREATE_CHANNEL_NOT_DONE = 10106,
 MISSING_PORT_FROM_PPG = 10107,
 MISSING_SUBSCRIPTION_RETURN_CODE_FROM_PPG = 10108,
 PPG_SERVER_ERROR = 10110,
 MISSING_INVOKE_TARGET_ID = 10111,
 SESSION_ALREADY_EXISTS = 10112,
 INVALID_PPG_URL = 10114,
 CREATE_CHANNEL_OPERATION = 1,
 DESTROY_CHANNEL_OPERATION = 2;

 function defineReadOnlyField(obj, field, value) {
    Object.defineProperty(obj, field, {
        "value": value,
        "writable": false
    });
}

var pushClient = {
    /**
     *  lastActivity: Keeps track of the time of the last push activity.
     *  pushService: Our PushService object for this session.
     */
     'lastActivity': 0,
     'pushService': 0,

     'queue': [],
     'waiting': false,

    /**
     *  ops: You will need to populate these with your own Push credentials.
     *  The invokeTarketId needs to match the custom invoke-target in your
     *  config.xml.
     *
     *  For more information on registering for Push credentials, please see:
     *  https://developer.blackberry.com/services/push/
     */
     'ops': {
        'invokeTargetId': 'com.dericc.pushclient.invoke.push',
        'appId': '4683-h55287e2rrr80M0r5fM4316242h877122e9',
        'ppgUrl': 'http://cpdericc.pushapi.eval.blackberry.com'
    },

    /**
     *  If the PushService object is created / exists, proceed to registering the Push Channel.
     */
     'createSuccess': function (result) {
        /* On success, the PushService object is passed into this function. */
        console.log('PushService created successfully.');
        pushClient.pushService = result;

        /* Accept pushes if the application is not running. */
        pushClient.pushService.launchApplicationOnPush(
            true,
            function launchApplicationOnPushCallback(result) {
                /* Log whether we will be launching on Push invocations. */
                if (result === blackberry.push.PushService.SUCCESS) {
                    console.log('Application will be launched on push.');
                } else {
                    console.log('Application will not be launched on push: ' + result);
                }
            }
            );

        if (new Date().getTime() - pushClient.lastActivity > 2 * 24 * 60 * 60 * 1000) {
            /* If we've gone more than two days without any activity, recreate the Push Channel. This is subjective. */
            console.log('Expired Push Channel registration.');
            pushClient.registerChannel();
        } else {
            /* We have seen activity within two days, so likely everything is okay, take no action. */
            console.log('No need to recreate the Push Channel.');
        }
    },

    /**
     *  When required, we will register a new Push Channel with the Push Service. It is NOT
     *  required to create a new Push Channel every time. Once created, a Push Channel will
     *  tend to last the lifetime of an application unless the Push Channel is intentionally
     *  destroyed. There are some rare cases that can lead to a Push Channel becoming invalid.
     *  To counteract this, we have implemented a two-day expectation on Push activity in the
     *  createSuccess function above. If we do not see any activity within two days, we will
     *  force the Push Channel to be recreated. The two days are purely arbitrary/subjective,
     *  you will need to decide on an appropriate timeline for your own applications.
     */
     'registerChannel': function () {
        try {
            /* Call the createChannel API to open communication with the Push services. */
            console.log('Creating Push Channel.');
            pushClient.pushService.createChannel(
                function createChannelCallback(result, token) {
                    if (result === blackberry.push.PushService.SUCCESS) {
                        /* Channel was successfully created, update Push activity. */
                        console.log('Successfully created Push Channel.');
                        window.localStorage.lastActivity = new Date().getTime().toString();
                    } else {
                        /* Channel failed to be created. */
                        console.log('Failed to create Push Channel: ' + result);
                    }
                }
                );
        } catch (err) {
            console.log(err);
        }
    },

    'createFailure': function (result) {
        console.log('PushService creation error: ' + result);
    },

    'simChangeCallback': function () {
        console.log('SIM Card has changed.');
    },

    'pushTransportReadyCallback': function (lastFailedOperation) {
        console.log('Last failed operation: ' + lastFailedOperation);
    },

    /**
     *  If we need to intentionally destroy an existing Push Channel, we can do so
     *  with this API.
     */
     'unregister': function () {
        try {
            /* Call the destroyChannel API to cease communication with Push services. */
            console.log('Destroying Push Channel.');
            pushClient.pushService.destroyChannel(
                function destroyChannelCallback(result) {
                    if (result === blackberry.push.PushService.SUCCESS) {
                        /* Channel was successfully destroyed, reset Push activity. */
                        console.log('Successfully destroyed Push Channel.');
                        window.localStorage.lastActivity = 0;
                    } else {
                        /* Channel could not be destroyed. */
                        console.log('Failed to destroy Push Channel: ' + result);
                    }
                }
                );
        } catch (err) {
            console.log(err);
        }
    },

    /**
     *  Iterate recursively through the pushClient.queue array until we've processed all pushes.
     */
     'processQueue': function (invokeRequest) {
        var pushPayload, reader;

        /* Check if there is anything left to process. */
        if (!invokeRequest) {
            /* We've processed everything. */
            console.log('Processing complete.');
            pushClient.waiting = false;

            /* If we were processing pushes in the background, exit the app. */
            if (autoExit === true) {
                console.log('Exit application.');
                /* blackberry.app.exit(); */
            }
            return;
        }

        try {
            /* Extract the payload from the Push Invocation. */
            pushPayload = pushClient.pushService.extractPushPayload(invokeRequest);

            /* Process a text data payload. */
            reader = new FileReader();
            reader.onload = function (result) {
                var text = result.target.result;
                console.log(text);

                console.log('Processing next item.');
                pushClient.processQueue(pushClient.queue.shift());
            };
            reader.onerror = function (result) {
                console.log('Error converting blob to text: ' + result.target.error);

                console.log('Processing next item.');
                pushClient.processQueue(pushClient.queue.shift());
            };
            reader.readAsText(pushPayload.data, 'UTF-8');
        } catch (err) {
            console.log(err);
        }
    },

    /**
     *  Our application was invoked before the PushService object had a chance to be created.
     *  We'll keep checking periodically until the object is ready and then process any
     *  outstanding pushes that we've received in the meantime.
     */
     'waitForPushService': function () {
        if (pushClient.pushService === 0) {
            /* We still don't have a PushService object, wait a little longer. */
            console.log('Waiting.');
            window.setTimeout(pushClient.waitForPushService, 100);
        } else {
            /* We have a PushService object, begin processing from the beginning of the queue. */
            console.log('Processing push queue.');
            pushClient.processQueue(pushClient.queue.shift());
        }
    },

    /**
     *  This function will be called when a Push Invocation is received. In this example,
     *  we are assuming a text-based data payload (see pushInitiator.js) to be received.
     *  This is the most common case for many applications.
     */
     'onInvoke': function (invokeRequest) {

        /* Ensure the invocation has an action associated with it. */
        if (invokeRequest.action) {
            /* Only process Push Invocations. */
            if (invokeRequest.action === 'bb.action.PUSH') {
                /* Update our Push Activity to track this received push. */
                console.log('Push invocation received.');
                window.localStorage.lastActivity = new Date().getTime();

                /* Add this invokeRequest to our processing queue. */
                console.log('Added new push to queue.');
                pushClient.queue.push(invokeRequest);

                /* Wait for the PushService object if we need to. */
                if (pushClient.pushService === 0) {
                    if (pushClient.waiting === false) {
                        pushClient.waiting = true;

                        /* Begin waiting for PushService object. */
                        console.log('Waiting for PushService object.');
                        window.setTimeout(pushClient.waitForPushService, 100);
                    }
                } else if (pushClient.waiting === false) {
                    pushClient.waiting = true;

                    /* We have a PushService object, begin processing from the beginning of the queue. */
                    console.log('Processing push queue.');
                    pushClient.processQueue(pushClient.queue.shift());
                }
            } else {
                console.log('Invocation received: ' + invokeRequest.action);
            }
        } else {
            console.log('Invocation received but no associated action.');
        }
    }
};

PushNotification = function() {
};
    /**
     *  Responsible for creating the PushService object.
     */
     PushNotification.register = function (successCallback, errorCallback, options) {
        /* Retrieve the last time (in milliseconds) of Push activity. */
        pushClient.lastActivity = window.parseInt(window.localStorage.lastActivity || 0, 10);

        if (pushClient.pushService === 0) {
            /* We only need a new object if we don't already have one; i.e. once per launch. */
            console.log('Creating PushService object.');
            try {
                /* This is the core Push functionality to create the PushService object. */
                blackberry.push.PushService.create(
                    pushClient.ops,
                    successCallback,
                    errorCallback,
                    pushClient.simChangeCallback,
                    pushClient.pushTransportReadyCallback
                    );
            } catch (err) {
                console.log(err);
            }
        } else {
            /* Forcing Push Service registration. */
            console.log('PushService object already exists.');
            pushClient.registerChannel();
        }
    };


    /**
     *  If we need to intentionally destroy an existing Push Channel, we can do so
     *  with this API.
     */
     PushNotification.unregister = function (successCallback, errorCallback) {
        try {

            /* Call the destroyChannel API to cease communication with Push services. */
            console.log('Destroying Push Channel.');
            pushClient.pushService.destroyChannel(
                function destroyChannelCallback(result) {
                    if (result === blackberry.push.PushService.SUCCESS) {
                        /* Channel was successfully destroyed, reset Push activity. */
                        successCallback(); 
                        console.log('Successfully destroyed Push Channel.');
                        window.localStorage.lastActivity = 0;
                    } else {
                        /* Channel could not be destroyed. */
                        errorCallback(); 
                        console.log('Failed to destroy Push Channel: ' + result);
                    }
                }
                );
        } catch (err) {
            errorCallback(); 
            console.log(err);
        }
    }; 

/*
 * Define methods of push.PushService
 */

 PushService = function () {
 };

 PushService.create = function (options, successCallback, failCallback, simChangeCallback, pushTransportReadyCallback) {
    var args = { "invokeTargetId" : options.invokeTargetId || "",
    "appId" : options.appId || "",
    "ppgUrl" : options.ppgUrl || "" },
    createCallback = function (result) {
        if (result === SUCCESS) {
            if (simChangeCallback) {
                exec(simChangeCallback, noop, _ID, "registerCallback", {id: "push.create.simChangeCallback"});
            }

            if (pushTransportReadyCallback) {
                exec(pushTransportReadyCallback, noop, _ID, "registerCallback", {id: "push.create.pushTransportReadyCallback"});
            }

            if (successCallback) {
                successCallback(new PushService());
            }
        } else {
            if (failCallback) {
                failCallback(result);
            }

            createInvokeTargetId = null;
            createAppId = null;
        }
    };

    // Check if create() called more than once
    if (createInvokeTargetId !== null) {
        if (args.invokeTargetId !== createInvokeTargetId) {
            throw "push.PushService.create: cannot call create() multiple times with different invokeTargetId's";
        }
    }

    if (createAppId !== null) {
        if (args.appId !== createAppId) {
            throw "push.PushService.create: cannot call create() multiple times with different appId's";
        }
    }


    createInvokeTargetId = args.invokeTargetId;
    createAppId = args.appId;

    // Send command to framework to start Push service
    exec(createCallback, noop, _ID, "startService", args);
};

PushService.prototype.createChannel = function (createChannelCallback) {
    // Send command to framework to create Push channel
    exec(function (info) {
        if (createChannelCallback) {
            createChannelCallback(info.result, info.token);
        }
    }, noop, _ID, "createChannel", null);
};

PushService.prototype.destroyChannel = function (destroyChannelCallback) {
    // Send command to framework to destroy Push channel
    exec(destroyChannelCallback, noop, _ID, "destroyChannel", null);
};

PushService.prototype.extractPushPayload = function (invokeObject) {
    var args,
    payload,
    data_array,
    blob_builder,
    error_string,
    success = function (data, response) {
        payload = data;
    },
    fail = function (data, response) {
        throw data;
    };

    error_string = "push.PushService.extractPushPayload: the invoke object was invalid and no PushPayload could be extracted from it";

    if (!invokeObject.data || invokeObject.action !== "bb.action.PUSH") {
        throw error_string;
    }

    // Send command to framework to get the Push payload object
    args = { "data" : invokeObject.data };
    exec(success, fail, _ID, "extractPushPayload", args);

    if (!payload.valid) {
        throw error_string;
    }

    // Data is returned as byte array.  Convert to blob.
    if (payload.data) {
        data_array = new Uint8Array(payload.data);
        window.BlobBuilder = window.WebKitBlobBuilder || window.BlobBuilder;

        if (window.BlobBuilder) {
            blob_builder = new window.BlobBuilder();
            blob_builder.append(data_array.buffer);
            payload.data = blob_builder.getBlob("arraybuffer");
        } else {
            payload.data = new window.Blob([data_array.buffer], { "type" : "arraybuffer" });
        }
    }

    // Create push.PushPayload object and return it
    return new PushPayload(payload);
};

PushService.prototype.launchApplicationOnPush = function (shouldLaunch, launchApplicationCallback) {
    var args = { "shouldLaunch" : shouldLaunch };

    // Send command to framework to set the launch flag
    exec(launchApplicationCallback, noop, _ID, "launchApplicationOnPush", args);
};

/*
 * Define constants of push.PushService
 */
 defineReadOnlyField(PushService, "SUCCESS", SUCCESS);
 defineReadOnlyField(PushService, "INTERNAL_ERROR", INTERNAL_ERROR);
 defineReadOnlyField(PushService, "INVALID_DEVICE_PIN", INVALID_DEVICE_PIN);
 defineReadOnlyField(PushService, "INVALID_PROVIDER_APPLICATION_ID", INVALID_PROVIDER_APPLICATION_ID);
 defineReadOnlyField(PushService, "CHANNEL_ALREADY_DESTROYED", CHANNEL_ALREADY_DESTROYED);
 defineReadOnlyField(PushService, "CHANNEL_ALREADY_DESTROYED_BY_PROVIDER", CHANNEL_ALREADY_DESTROYED_BY_PROVIDER);
 defineReadOnlyField(PushService, "INVALID_PPG_SUBSCRIBER_STATE", INVALID_PPG_SUBSCRIBER_STATE);
 defineReadOnlyField(PushService, "PPG_SUBSCRIBER_NOT_FOUND", PPG_SUBSCRIBER_NOT_FOUND);
 defineReadOnlyField(PushService, "EXPIRED_AUTHENTICATION_TOKEN_PROVIDED_TO_PPG", EXPIRED_AUTHENTICATION_TOKEN_PROVIDED_TO_PPG);
 defineReadOnlyField(PushService, "INVALID_AUTHENTICATION_TOKEN_PROVIDED_TO_PPG", INVALID_AUTHENTICATION_TOKEN_PROVIDED_TO_PPG);
 defineReadOnlyField(PushService, "PPG_SUBSCRIBER_LIMIT_REACHED", PPG_SUBSCRIBER_LIMIT_REACHED);
 defineReadOnlyField(PushService, "INVALID_OS_VERSION_OR_DEVICE_MODEL_NUMBER", INVALID_OS_VERSION_OR_DEVICE_MODEL_NUMBER);
 defineReadOnlyField(PushService, "CHANNEL_SUSPENDED_BY_PROVIDER", CHANNEL_SUSPENDED_BY_PROVIDER);
 defineReadOnlyField(PushService, "CREATE_SESSION_NOT_DONE", CREATE_SESSION_NOT_DONE);
 defineReadOnlyField(PushService, "MISSING_PPG_URL", MISSING_PPG_URL);
 defineReadOnlyField(PushService, "PUSH_TRANSPORT_UNAVAILABLE", PUSH_TRANSPORT_UNAVAILABLE);
 defineReadOnlyField(PushService, "OPERATION_NOT_SUPPORTED", OPERATION_NOT_SUPPORTED);
 defineReadOnlyField(PushService, "CREATE_CHANNEL_NOT_DONE", CREATE_CHANNEL_NOT_DONE);
 defineReadOnlyField(PushService, "MISSING_PORT_FROM_PPG", MISSING_PORT_FROM_PPG);
 defineReadOnlyField(PushService, "MISSING_SUBSCRIPTION_RETURN_CODE_FROM_PPG", MISSING_SUBSCRIPTION_RETURN_CODE_FROM_PPG);
 defineReadOnlyField(PushService, "PPG_SERVER_ERROR", PPG_SERVER_ERROR);
 defineReadOnlyField(PushService, "MISSING_INVOKE_TARGET_ID", MISSING_INVOKE_TARGET_ID);
 defineReadOnlyField(PushService, "SESSION_ALREADY_EXISTS", SESSION_ALREADY_EXISTS);
 defineReadOnlyField(PushService, "INVALID_PPG_URL", INVALID_PPG_URL);
 defineReadOnlyField(PushService, "CREATE_CHANNEL_OPERATION", CREATE_CHANNEL_OPERATION);
 defineReadOnlyField(PushService, "DESTROY_CHANNEL_OPERATION", DESTROY_CHANNEL_OPERATION);

/*
 * Define push.PushPayload
 */
 PushPayload = function (payload) {
    defineReadOnlyField(this, "data", payload.data);
    defineReadOnlyField(this, "headers", payload.headers);
    defineReadOnlyField(this, "id", payload.id);
    defineReadOnlyField(this, "isAcknowledgeRequired", payload.isAcknowledgeRequired);
};

PushPayload.prototype.acknowledge = function (shouldAcceptPush) {
    var args = {"id" : this.id, "shouldAcceptPush" : shouldAcceptPush};

    // Send command to framework to acknowledge the Push payload
    exec(noop, noop, _ID, "acknowledge", args);
};

_self.PushNotification = PushNotification;
_self.PushService = PushService;
_self.PushPayload = PushPayload;

module.exports = _self;
