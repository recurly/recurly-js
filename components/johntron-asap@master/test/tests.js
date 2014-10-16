"use strict";

var asap = require("./asap-implementation");
var domain = require("./domain-implementation");
var assert = require("assert");
var _ = require("lodash");

var MAX_RECURSION = 4000;
var WAIT_FOR_NORMAL_CASE = 100;
var WAIT_FOR_ERRORS = 1000;

describe("When no tasks throw", function () {
    specify("A single task should run after `asap` returns", function (done) {
        var ran = false;

        asap(function () {
            ran = true;
        });

        assert.strictEqual(ran, false);
        setTimeout(function () {
            assert.strictEqual(ran, true);
            done();
        }, WAIT_FOR_NORMAL_CASE);
    });

    specify("Multiple tasks should run in order", function (done) {
        var calls = [];

        asap(function () {
            calls.push(0);
        });
        asap(function () {
            calls.push(1);
        });
        asap(function () {
            calls.push(2);
        });

        assert.deepEqual(calls, []);
        setTimeout(function () {
            assert.deepEqual(calls, [0, 1, 2]);
            done();
        }, WAIT_FOR_NORMAL_CASE);
    });

    specify("A tree of tasks should execute in breadth-first order", function (done) {
        var calls = [];

        asap(function () {
            calls.push(0);

            asap(function () {
                calls.push(2);

                asap(function () {
                    calls.push(5);
                });

                asap(function () {
                    calls.push(6);
                });
            });

            asap(function () {
                calls.push(3);
            });
        });

        asap(function () {
            calls.push(1);

            asap(function () {
                calls.push(4);
            });
        });

        assert.deepEqual(calls, []);
        setTimeout(function () {
            assert.deepEqual(calls, [0, 1, 2, 3, 4, 5, 6]);
            done();
        }, WAIT_FOR_NORMAL_CASE);
    });
});

describe("When tasks throw", function () {
    specify("Multiple all-throwing tasks should run and re-throw in order", function (done) {
        var calls = [];
        var errors = [];

        var d = domain.create();
        d.on("error", function (error) {
            errors.push(error);
        });

        d.run(function () {
            asap(function () {
                calls.push(0);
                throw 0;
            });
            asap(function () {
                calls.push(1);
                throw 1;
            });
            asap(function () {
                calls.push(2);
                throw 2;
            });
        });

        assert.deepEqual(calls, []);
        assert.deepEqual(errors, []);
        setTimeout(function () {
            assert.deepEqual(calls, [0, 1, 2]);
            assert.deepEqual(errors, [0, 1, 2]);
            done();
        }, WAIT_FOR_ERRORS);
    });

    specify("Multiple mixed throwing/non-throwing tasks should run and re-throw in order", function (done) {
        var calls = [];
        var errors = [];

        var d = domain.create();
        d.on("error", function (error) {
            errors.push(error);
        });

        d.run(function () {
            asap(function () {
                calls.push(0);
            });
            asap(function () {
                calls.push(1);
                throw 1;
            });
            asap(function () {
                calls.push(2);
            });
            asap(function () {
                calls.push(3);
                throw 3;
            });
            asap(function () {
                calls.push(4);
                throw 4;
            });
            asap(function () {
                calls.push(5);
            });
        });

        assert.deepEqual(calls, []);
        assert.deepEqual(errors, []);
        setTimeout(function () {
            assert.deepEqual(calls, [0, 1, 2, 3, 4, 5]);
            assert.deepEqual(errors, [1, 3, 4]);
            done();
        }, WAIT_FOR_ERRORS);
    });

    specify("Queueing tasks before throwing errors should re-throw errors in order", function (done) {
        var errors = [];

        var d = domain.create();
        d.on("error", function (error) {
            errors.push(error);
        });

        d.run(function () {
            asap(function () {
                asap(function () {
                    throw 1;
                });

                throw 0;
            });
        });

        assert.deepEqual(errors, []);
        setTimeout(function () {
            assert.deepEqual(errors, [0, 1]);
            done();
        }, WAIT_FOR_ERRORS);
    });

    specify("A tree of tasks should execute and re-throw in breadth-first order", function (done) {
        var calls = [];
        var errors = [];

        var d = domain.create();
        d.on("error", function (error) {
            errors.push(error);
        });

        d.run(function () {
            asap(function () {
                calls.push(0);

                asap(function () {
                    calls.push(2);

                    asap(function () {
                        calls.push(5);
                        throw 5;
                    });

                    asap(function () {
                        calls.push(6);
                    });
                });

                asap(function () {
                    calls.push(3);
                });

                throw 0;
            });

            asap(function () {
                calls.push(1);

                asap(function () {
                    calls.push(4);
                    throw 4;
                });
            });
        });

        assert.deepEqual(calls, []);
        assert.deepEqual(errors, []);
        setTimeout(function () {
            assert.deepEqual(calls, [0, 1, 2, 3, 4, 5, 6]);
            assert.deepEqual(errors, [0, 4, 5]);
            done();
        }, WAIT_FOR_ERRORS);
    });
});

describe("When recursing", function () {
    specify("Simple recursion ordering test", function (done) {
        var steps = [];

        asap(function () {
            steps.push(0);
            asap(function () {
                steps.push(2);
                asap(function () {
                    steps.push(4);
                });
                steps.push(3);
            });
            steps.push(1);
        });

        setTimeout(function () {
            assert.deepEqual(steps, [0, 1, 2, 3, 4]);
            done();
        }, WAIT_FOR_NORMAL_CASE);
    });

    specify("Can recurse " + MAX_RECURSION + " tasks deep", function (done) {
        var timesRecursed = 0;
        function go() {
            if (++timesRecursed < MAX_RECURSION) {
                asap(go);
            }
        }

        asap(go);

        setTimeout(function () {
            assert.strictEqual(timesRecursed, MAX_RECURSION);
            done();
        }, WAIT_FOR_NORMAL_CASE);
    });

    specify("Two deep recursions execute in breadth-first order", function (done) {
        var timesRecursed1 = 0;
        var timesRecursed2 = 0;
        var calls = [];

        function go1() {
            calls.push(timesRecursed1 * 2);
            if (++timesRecursed1 < MAX_RECURSION) {
                asap(go1);
            }
        }

        function go2() {
            calls.push(timesRecursed2 * 2 + 1);
            if (++timesRecursed2 < MAX_RECURSION) {
                asap(go2);
            }
        }

        asap(go1);
        asap(go2);

        setTimeout(function () {
            assert.deepEqual(calls, _.range(MAX_RECURSION * 2));
            done();
        }, WAIT_FOR_NORMAL_CASE);
    });

    describe("and tasks throw", function () {
        specify("Thrown errors are re-thrown in order and do not prevent recursion", function (done) {
            var timesRecursed = 0;
            var errors = [];

            function go() {
                if (++timesRecursed < MAX_RECURSION) {
                    asap(go);
                    throw timesRecursed - 1;
                }
            }

            var d = domain.create();
            d.on("error", function (error) {
                errors.push(error);
            });

            d.run(function () {
                asap(go);
            });

            setTimeout(function () {
                assert.strictEqual(timesRecursed, MAX_RECURSION);
                assert.deepEqual(errors, _.range(MAX_RECURSION - 1));
                done();
            }, WAIT_FOR_ERRORS);
        });

        specify("Three deep recursions, one of which throws, executes and re-throws in order", function (done) {
            var timesRecursed1 = 0;
            var timesRecursed2 = 0;
            var timesRecursed3 = 0;
            var calls = [];
            var errors = [];

            function go1() {
                calls.push(timesRecursed1 * 3);
                if (++timesRecursed1 < MAX_RECURSION) {
                    asap(go1);
                }
            }

            function go2() {
                calls.push(timesRecursed2 * 3 + 1);
                if (++timesRecursed2 < MAX_RECURSION) {
                    asap(go2);
                }
            }

            function go3() {
                calls.push(timesRecursed3 * 3 + 2);
                if (++timesRecursed3 < MAX_RECURSION) {
                    asap(go3);
                    throw timesRecursed3 - 1;
                }
            }

            var d = domain.create();
            d.on("error", function (error) {
                errors.push(error);
            });

            d.run(function () {
                asap(go1);
                asap(go2);
                asap(go3);
            });

            setTimeout(function () {
                assert.deepEqual(calls, _.range(MAX_RECURSION * 3));
                assert.deepEqual(errors, _.range(MAX_RECURSION - 1));
                done();
            }, WAIT_FOR_ERRORS);
        });
    });
});
