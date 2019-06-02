/**
 * Create a pipe
 *
 * Pipes are simple brokers between the source of change, and the code that
 * wants to be notified about the change.
 *
 * A pipe is an object to which consumers (functions) can connect and receive
 * values from it. The values are sent through the pipe using the `send()`
 * method. For instance:
 *
 *     const p = pipe();
 *     p.connect(console.log);
 *     p.send('Hello, world!');
 *     // logs "Hello, world!"
 *
 * Pipes can be connected together. Since the `send()` method is simply a
 * function, it can be used in the `connect()` method of another pipe. For
 * example:
 *
 *     const p1 = pipe();
 *     const p2 = pipe();
 *     p1.connect(p2.send);
 *
 * In the above example, the `p1` pipe now sends to `p2`.
 *
 * This function optionally takes a number of functions as arguments. These
 * functions serve as transformers. Transformers are decorator functions. They
 * take the next transformer as their argument and are expected to return a
 * function that takes a value and invokes the next transformer with a modified
 * value. Here's an example of a transformer that increments numbers by 1:
 *
 *     function inc(next) {
 *       return function (n) {
 *         next(n + 1);
 *       };
 *     }
 *
 *     const p = pipe(inc);
 *     p.connect(console.log);
 *     p.send(4);
 *     // logs "5"
 *
 * Values pass through transformers in the order in which they are specified.
 *
 * Pipes can be 'extended' using the `extend()` method. This method takes any
 * number of transformer functions. It creates a new pipe with the specified
 * tranformers, connects it to the pipe on which `extend()` is called, and
 * returns the new pipe. `p.extend(t1, t2)` is identical to the following code:
 *
 *     const p1 = pipe(t1, t2);
 *     p.connect(p1);
 */
export default function pipe(...transformers) {
  const outputs = [];

  let send = function (...args) {
    for (let i = 0, l = outputs.length; i < l; i++) {
      outputs[i](...args);
    }
  }

  for (let l = transformers.length; l; l--) {
    send = transformers[l - 1](send);
  }

  function connect(fn) {
    outputs.push(fn);

    return function () {
      outputs.splice(outputs.indexOf(fn), 1);
    };
  }

  function extend(...fn) {
    const p = pipe(...fn);
    self.connect(p.send);
    return p;
  }

  const self = {
    __pipe: true,
    connect,
    send,
    extend,
  };

  return self;
};
