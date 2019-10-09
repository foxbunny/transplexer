[![Build Status](https://travis-ci.org/foxbunny/transplexer.svg?branch=master)](https://travis-ci.org/foxbunny/transplexer)

# Transplexer

A library for trivial reactive programming.

## Contents

<!-- vim-markdown-toc GFM -->

* [Overview](#overview)
* [Transplexer and functional reactive programming](#transplexer-and-functional-reactive-programming)
* [Installation](#installation)
* [Quck tour](#quck-tour)
* [API documenation](#api-documenation)
  * [Pipe creation](#pipe-creation)
  * [Transformers](#transformers)
  * [Pipe instance methods](#pipe-instance-methods)
    * [`connect(observer)`](#connectobserver)
    * [`send(...values)`](#sendvalues)
    * [`extend(...transformers)`](#extendtransformers)
    * [`push(...transformers)`](#pushtransformers)
    * [`pop(index = null)`](#popindex--null)
    * [`unshift(...transformers)`](#unshifttransformers)
    * [`shift()`](#shift)
    * [`remove(transformer)`](#removetransformer)

<!-- vim-markdown-toc -->

## Overview

The name transplex was derived from the prefix 'trans-' and suffix '-plex'.
Togther they mean 'consisting of something across'. This gist of this library
is that it provides means for bringing together the source of change and the
code that wants to react to it. A fancy name for this pattern is the [observer
pattern](https://en.wikipedia.org/wiki/Observer_pattern).

The transplexer library provides a simple, uniform way of creating pipelines
for propagating changes, this allowing us to specify ahead of time, how various
changes affect our application. This is in contrast with imperative programming
style in which the handling of each change is determined on the spot.
Transplexer achieves this goal with very little code by providing powerful
tools that can be adapted to various scenarios.

## Transplexer and functional reactive programming

Transplexer can do many of the things that can be done with the more common
functional reactive libraries like RxJS, Bacon.js, zen-observables or Xstream.
Although it does so in a completely different style, transplexer is able to
achieve designs that are quite similar in spirit. Some of the difference
between the transplexer and functional reactive libraries are:

- It isn't focused on functional programming, as it's a lower-level library.
- It does not wrap the function that produces events/values, instead acting as
  an object that can accept values and transmit them.
- It can only do push as data flow is one-way.
- It does not provide an opportunity to hook into the subscription process or
  change behavior per subscriber.
- It keeps the door open for extension rather than trying to become a complete
  utility belt (although a [seprate
  package](https://github.com/foxbunny/transplexer-tools/) provides tools that
  you can use, if that's what you want).

## Installation

Install from the NPM repository with NPM:

```bash
npm install transplexer
```

or with Yarn:

```bash
yarn add transplexer
```

## Quck tour

We use transplexer by imporing its one and only function:

```javascript
import pipe from 'transplexer';

let p = pipe();
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

The main power of the pipes comes from the transformers. In order to keep
transformers as flexible as possible, we chose to implement them as function
decorators (not to be confused with ES6 decorators).

Here is an example with a few transformers.

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

let q = pipe(joinTransformer, lowerCaseTransformer);
q.connect(showText);
```

The order in which transformers are applied is the same as the order in which
they are specified. Transformers exercise complete control over what they can
do with the value and whether to relay it to the callback or not. To give you a
taste of what kind of interesting designs you can achieve with transformers,
here's a short, inconclusive, list of things transformers can do:

- Change the input values before relaying.
- Relay the input values as is.
- Skip invoking the next transformer.
- Invoke the next transformers multiple times.
- Schedule the invocation of the next transformer (e.g.,
  `requestAnimationFrame()`, `setTimeout()`, etc.).
- Perform asynchronous tasks before invoking the next transformer (e.g.,
  perform an XHR request and then invoking the next transformer with the
  result).
- And more... you get the idea.

Pipes can be connected to each other. Since `connect()` function takes an
arbitrary function, it can also take another pipes's `send()` function.

```javascript
let p1 = pipe();
let p2 = pipe();

p1.connect(p2.send);

p2.connect(console.log);

p1.send('Hello, pipe!');
// logs 'Hello, pipe!'
```

By connecting multiple pipes to a single pipe, we effectively branch the source
pipe. It is also possible to connect multiple pipes to a single pipe:

```javascript
let p1 = pipe();
let p2 = pipe();
let p3 = pipe();

p1.connect(p3.send);
p2.connect(p3.send);

p3.connect(console.log);

p1.send('Hello, pipe!');
// logs 'Hello, pipe!'

p2.send('Hello, other pipe!')
// logs 'Hello, other pipe!'
```

With this, we have everything we need to build the pipelines for our
applications. This quick tour covered the basics of using the pipes. The next
section will provide a more formal documentation for hte pipes API as well as
features not covered in the tour.

## API documenation

### Pipe creation

An empty pipe is created by calling the `pipe()` function without any
arguments.

```javascript
pipe();
```

One or more transformers can be specified that control the passing of the
values through the pipe.

```javascript
pipe(t1, t2);
```

### Transformers

Transformers are function decorators that control the passing of the values
through the pipe.

Transformers take a callback function as their argument and are expected to
return a function that takes one or more values, and potentially invokes the
callback with a poentially modified value.

Decorators take the following general form:

```javascript
function decorator(next) {
  return function wrapper(...args) {
    next(...args);
  };
}
```

The outer function is the decorator. It takes the `next` callback, and returns
a function that replaces the callback with a function that may or may not
behave differently and may or may not call the callback. The return value of
the wrapper function is ignored.

Here's an example of a transformer that increments numbers by 1:

```javascript
function inc(next) {
  return function (n) {
    next(n + 1);
  };
}

pipe(inc);
```

Transformers should not make any assumptions about the callback except for the
following:

- The callback can take any number of arguments.
- The callback does not have a meaningful return value.

As a convention, we name the callback `next` so that it's easier to tell that
it's a transformer.

### Pipe instance methods

#### `connect(observer)`

Connect an observer to the pipe.

Observers are arbitrary functions that are invoked any time a value is sent down
the pipe. Since any number of values can be passed down the pipe at once,
observers can take any number of arguments matching the values that were sent.

```javascript
function myObserver(x, y) {
  console.log(x, y);
}

let p = pipe();
p.connect(myObserver);
```

This method returns a function that removes the observer to the pipe
(disconnects it).

```javascript
let p = pipe();
let disconnect = p.connect(myObserver);
disconnect();
```

#### `send(...values)`

Send zero or more values through a pipe.

Values are send through the pipe over to the observers using the `send()`
method. This method takes an arbitrary number of arguments which are then passed
through any transformers, and finally to the observers.

```javascript
let p = pipe();
p.send(1, 'text');
p.send(1);
```

There is no limit to how many values at once and how many times we can send down
a pipe.

#### `extend(...transformers)`

Create a new pipe that is connected to this one.

Pipes can be 'extended' using the `extend()` method. This method takes any
number of transformer functions. It creates a new pipe with the specified
transformers, connects it to the pipe on which `extend()` is called, and returns
the new pipe.
 
```javascript
let p1 = p.extend(t1, t2)
```

This is a shortcut for doing:

```javascript
let p1 = pipe(t1, t2);
p.connect(p1.send);
```

#### `push(...transformers)`

Add one or more transformers to the end of the pipe. 

For example:

```javascript
let p = pipe(t1, t2);
p.push(t3, t4);  // t1, t2, t3, t4
```

#### `pop(index = null)`
 
Remove a transformer form the end of the pipe or at specified index.
 
To remove the elements from the end, we use `pop()` without any arguments.

```javascript
let p = pipe(t1, t2);
p.pop();  // t1
```

The `pop()` method can be used with a single numeric index to remove a
specific item in the pipe:

```javascript
let p = pipe(t1, t2);
p.pop(0);  // t2
```

#### `unshift(...transformers)`

Add one or more transformers to the beginning of the pipe.

For example:

```javascript
let p = pipe(t1, t2);
p.unshift(t3);  // t3, t1, t2
```

When multiple transformers are added at once, they retain the order in which
they are specified as `unshift()` arguments:

```javascript
let p = pipe(t1, t2);
p.unshift(t3, t4);  // t3, t4, t1, t2
```

#### `shift()`

Remove a transformer from the beginning of the pipe.

This is a shortcut for `pop(0)` is `shift()`.

```javascript
let p = pipe(t1, t2);
p.shift();  // t2
```

#### `remove(transformer)`

Remove all copies of the `transformer` from the pipe.

To remove a specific transformer to which we hold a reference, we can use the
`remove()` method. This method takes a single transformer function as its
argument and removes it from the pipe.

```javascript
let p = pipe(t1, t2);
p.remove(t1);  // t2
```

This method will remove all copies of the transformer. If we have multiple
copies of the same transformers, all of them are removed:

```javascript
let p = pipe(t1, t2, t1);
p.remove(t1);  // t2
```

