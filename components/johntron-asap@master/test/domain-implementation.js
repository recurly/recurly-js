"use strict";

var asap = require("./asap-implementation");
var _ = require("lodash");

// This is a reliable test for true Node.js, avoiding false positives for e.g. Browserify's emulation environment.
var isNodeJS = typeof process === "object" && Object.prototype.toString.call(process) === "[object process]";

if (isNodeJS) {
    // The `(1,require)(...)` syntax bypasses Browserify's auto-detection of `require`s.
    module.exports = (1,require)("domain");

    var nodeVersionPieces = process.versions.node.split(".");
    if (Number(nodeVersionPieces[0]) < 1 && Number(nodeVersionPieces[1]) < 10) {
        // Fix for https://github.com/joyent/node/issues/4375:
        // "domain.on('error') should suppress other uncaughtException handlers"

        var errorsToIgnore = [];
        process.on = _.wrap(process.on, function (originalOn, eventName, listener) {
            if (eventName === "uncaughtException") {
                listener = wrap(listener);
            }

            originalOn.call(process, eventName, listener);
        });

        process.removeListener = _.wrap(process.removeListener, function (originalRemove, eventName, listener) {
            originalRemove.call(process, eventName, listener._asap_wrapper_ || listener);
        });

        asap.setOnError(function (error) {
            errorsToIgnore.push(error);
            throw error;
        });

        afterEach(function () {
            errorsToIgnore = [];
        });
    }
} else {
    module.exports = require("./browser-domain");
    afterEach(module.exports.teardown);
}

function wrap(uncaughtExceptionListener) {
    uncaughtExceptionListener._asap_wrapper_ = function (error) {
        if (!_.contains(errorsToIgnore, error)) {
            uncaughtExceptionListener(error);
        }
    };

    return uncaughtExceptionListener._asap_wrapper_;
}
