[![Build Status](https://travis-ci.org/foxbunny/transplexer.svg?branch=master)](https://travis-ci.org/foxbunny/transplexer)

# Transplexer

A library for trivial reactive programming.

## Overview

The name transplex was derived from the prefix 'trans-' and suffix '-plex'.
Togther they mean 'consisting of something across'. This gist of this library
is that it provides means for connecting the source of change with the code
that wants to react to it.

The transplexer library provides a simple and uniform way of creating directed
pipelines for propagating changes, this allowing us to specify ahead of time,
how various changes affect our application. This is in contrast with imperative
programming style in which the handling of each change is determined on the
spot. Transplexer achieves this goal with very little code while providing
powerful tools that can be adapted to various scenarios.

## Transplexer vs functional reactive programming

Transplexer can do many of the things that can be done with the more common
functional reactive libraries like RxJS, Bacon.js, zen-observables or Xstream.
Although it does so in a completely different style, transplexer is able to
achieve designs that are quite similar in spirit. Some of the difference
between the transplexer and functional reactive libraries are:

- It isn't focused on functional programming, as it's a lower-level library.
- It does not wrap the function that produces events/values.
- It can only do push as data flow is one-way.
- It does not provide an opportunity to hook into the subscription process or
  change behavior per sbuscriber.
- It does not support dynamically altering the transformation chain (although
  pipes can be chained together to extend the transformation chains).

See comparisons with RxJS further below.

## Installation

TODO

## Quck tour

We use transplexer by imporing its one and only function:

```javascript
import pipe from 'transplexer';

const p = pipe();
```

The pipe can be subscribed to, in order to receive changes:

```javascript
function showText(text) {
  console.log(text);
}

p.connect(showText);
```

Now the `showText()` function will be called whenever something is sent down
the pipe. To send things down the pipe, we call the `send()` function:

```javascript
p.send('Hello, World!');
// `showText()` logs 'Hello, World!'
```

The `send()` function takes any number of arguments, and they are all relayed
to the connected callbacks.

```javascript
p.send('Hello', ',', 'World', '!');
// `showText()` logs 'Hello' ',' 'World' '!'
```

Pipes can accept any number of transformers. Transformers are written as
function decorators (not to be confused with decorators in OOP).

```javascript
function joinTransformer(next) {
  return function (...parts) {
    next(parts.join(' '));
  };
}

function lowerCaseTransformer(next) {
  return function (str) {
    next(str.toLowerCase());
  };
}

const q = pipe(joinTransformer, lowerCaseTransformer);
q.connect(showText);
```

The transformers are evaluated bottom to top (last one first). In the above
example, the `lowerCaseTransformer` is invoked first. They receive the next
transformer as their only argument. (The last transformer has no next one, so
it receives the default transformer which just relays the value ot connected
callbacks.) They then return a transformation function that takes the arguments
from the previous transformer (or `send()`) and is free to do whatever it
wants.

Transformers can do one or more of the following:

- Change the input values before relaying.
- Relay the input values as is.
- Skip invoking the next transformer.
- Invoke the next transformers multiple times.
- Schedule the invocation of the next transducer (e.g.,
  `requestAnimationFrame()`, `setTimeout()`, etc.).
- Perform asynchronous tasks before invoking the next transducer (e.g., perform
  an XHR request and then invoking the next transformer with the result).
- And more... you get the idea.

Pipes can be connected to each other. Since `connect()` function takes an
arbitrary function, it can also take another pipes's `send()` function.

```javascript
const p1 = pipe();
const p2 = pipe();
p1.connect(p2);
p2.connect(console.log);
p1.send('Hello, pipe!');
// logs 'Hello, pipe!'
```

Because creating pipes that connect to another one is common, there is a
special `extend()` function which takes any number of transformers and returns
a connected pipe. For example, the above code can be shortened like this:

```javascript
const p1 = pipe();
const p2 = p1.extend();
p2.connect(console.log);
p1.send('Hello, pipe!');
// logs 'Hello, pipe!'
```

## Transplexer and RxJS comparison

Examples of the RxJS code are taken from its documentation. You will see that
transplexer examples are generally longer, and more explicit. This is due to
the fact that transplexer does not (currently) provide any utility functions,
thus those have to be written. At the same time, you will see that utility
functions may not be needed in some cases.

Also the code style in the transplexer example is more verbose as that is how 
its author normally codes. The code style for RxJS is kept as close to its
documentation as possible in order to preserve the cultural differences between
these two libraries.

### Handling DOM events

```javascript
function onClick() {
  console.log('clicked');
}

// RxJS
import { fromEvent } from 'rxjs';

fromEvent(document, 'click').subscribe(onClick);

// Transplexer
import pipe from 'transplexer';

const p = pipe();
p.connect(onClick);
document.addEventListener('click', p.send, false);
```

### Stateful counter

```javascript
function showCount(count) {
  console.log(`Clicked ${count} times`);
}

// RxJS
import { fromEvent } from 'rxjs';
import { scan } from 'rxjs/operators';

fromEvent(document, 'click')
  .pipe(scan(count => count + 1, 0))
  .subscribe(showCount);

// Transplexer
import pipe from 'transplexer';

function counter(next) {
  let count = 0;

  return function () {
    count++;
    next(count);
  };
}

cosnt p = pipe(counter);
p.connect(showCount);

document.addEventListener('click', pipe.send, false);

// Transplexer with adaptor for making reduce-like counter
import pipe from 'transplexer';

function scan(reducer, initialState) {
  return function (next) {
    return function () {
      initialState = reducer(initialState);
      next(initialState);
    };
  };
}

const p = pipe(scan(count => count + 1, 0));
p.connect(showCount);

document.addEventListener('click', pipe.send, false);
```

### Flow control

```javascript
function showText() {
  console.log('Hello, World!');
};


// RxJS
import { fromEvent } from 'rxjs';
import { delay } from 'rxjs/operators';

fromEvent(document, 'click')
  .pipe(delay(1000))  // add 1 second delay
  .subscribe(showText);

// Transplexer
import pipe from 'transplexer';

function delay(next) {
  return function () {
    setTimeout(next, 1000);
  };
}

const p = pipe(delay);
p.connect(showText);

document.addEventListener('click', p.send, false);

// Transplexer with generic delay helper
import pipe from 'transplexer';

function delay(time) {
  return function (next) {
    return function (...args) {
      setTimeout(function () {
        next(...args);
      }, time);
    };
  };
}

const p = pipe(delay(1000));
p.connect(showText);

document.addEventListener('click', p.send, false);
```
