"use strict";

var originalAsap = require("..");

var onError;

function asap(task) {
    if (onError) {
        return originalAsap(function () {
            try {
                task();
            } catch (e) {
                onError(e);
            }
        });
    } else {
        return originalAsap(task);
    }
}

asap.setOnError = function (newOnError) {
    if (onError) {
        throw new Error("Can only set onError once.");
    }

    if (typeof newOnError !== "function") {
        throw new TypeError("onError must be a function.");
    }

    onError = newOnError;
};

for (var key in originalAsap) {
    asap[key] = originalAsap[key];
}

module.exports = asap;
