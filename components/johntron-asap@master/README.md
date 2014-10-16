# ASAP

[![Build Status](https://travis-ci.org/kriskowal/asap.png?branch=master)](https://travis-ci.org/kriskowal/asap)

This `asap` CommonJS package contains a single `asap` module that
exports a single `asap` function that executes a function **as soon as
possible**.

```javascript
asap(function () {
    // ...
});
```

ASAP strives to schedule events to occur before yielding for IO, reflow,
or redrawing.  Each event receives an independent stack, with only
platform code in parent frames and the events run in the order they are
scheduled.

ASAP provides a fast event queue that will execute tasks until it is
empty before yielding to the JavaScript engine's underlying event-loop.
When the event queue becomes non-empty, ASAP schedules a flush event,
preferring for that event to occur before the JavaScript engine has an
opportunity to perform IO tasks or rendering, thus making the first task
and subsequent tasks semantically indistinguishable.  ASAP uses a
variety of techniques to preserve this invariant on different versions
of browsers and Node.js.

By design, ASAP prevents input events from being handled until the task
queue is empty.  If the process is busy engouh, this may cause incoming
connection requests to be dropped, and may cause existing connections to
inform the sender to reduce the transmission rate or stall.  ASAP allows
this on the theory that, if there is enough work to do, there is no
sense in looking for trouble.  As a consequence, however, ASAP can
interrupt smooth animation, popularly dubbed “jank”.  If your task can
wait for reflow or rendering, consider using ASAP’s cousin
`setImmediate` instead.

`setImmediate` will yield for IO, reflow, and repaint events.  It also
returns a handler and can be canceled.  For a `setImmediate` shim,
consider [setImmediate][].

[setImmediate]: https://github.com/noblejs/setimmediate

Take care. ASAP can sustain infinite recursive calls indefinitely
without warning. This is behaviorally equivalent to an infinite loop.
It will not halt from a stack overflow, but it *will* chew through
memory (which is an oddity I cannot explain at this time). Just as with
infinite loops, you can monitor a Node process for this behavior with a
heart-beat signal. As with infinite loops, a very small amount of
caution goes a long way to avoiding problems.

```javascript
function loop() {
    asap(loop);
}
loop();
```

In browsers, if a task throws an exception, it will not interrupt the flushing
of high-priority tasks. The exception will be postponed to a later,
low-priority event to avoid slow-downs.
In NodeJS, on the other hand, if a task throws an exception, ASAP will
resume flushing only if—and only after—the error is handled by
`domain.on("error")` or `process.on("uncaughtException")`.

## Heritage

ASAP has been factored out of the [Q][] asynchronous promise library.
It originally had a naïve implementation in terms of `setTimeout`, but
[Malte Ubl][NonBlocking] provided an insight that `postMessage` might be
useful for creating a high-priority, no-delay event dispatch hack.
Since then, Internet Explorer proposed and implemented `setImmediate`.
Robert Katić began contributing to Q by measuring the performance of
the internal implementation of `asap`, paying particular attention to
error recovery. Domenic, Robert, and I collectively settled on the
current strategy of unrolling the high-priority event queue internally
regardless of what strategy we used to dispatch the potentially
lower-priority flush event. Domenic went on to make ASAP cooperate with
NodeJS domains.

[Q]: https://github.com/kriskowal/q
[NonBlocking]: http://www.nonblocking.io/2011/06/windownexttick.html

For further reading, Nicholas Zakas provided a thorough article on [The
Case for setImmediate][NCZ].

[NCZ]: http://www.nczonline.net/blog/2013/07/09/the-case-for-setimmediate/

## License

Copyright 2009-2013 by Contributors
MIT License (enclosed)
