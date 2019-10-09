import pipe from './index.js';

describe('pipe', function () {
  function add1(next) {
    return function (x) {
      next(x + 1);
    };
  }

  function double(next) {
    return function (x) {
      next(x * 2);
    }
  }

  function toString(next) {
    return function (x) {
      next('number = ' + x);
    }
  }

  test('relay a value from producer to consumer', function () {
    const consumer = jest.fn();
    const p = pipe();
    p.connect(consumer);
    p.send('test');
    expect(consumer).toHaveBeenCalledWith('test');
  });

  test('consumer can detatch', function () {
    const consumer = jest.fn();
    const p = pipe();
    const r = p.connect(consumer);
    r();
    p.send('test');
    expect(consumer).not.toHaveBeenCalled();
  });

  test('multiple consumers', function () {
    const c1 = jest.fn();
    const c2 = jest.fn();
    const p = pipe();
    p.connect(c1);
    p.connect(c2);
    p.send('test');
    expect(c1).toHaveBeenCalledWith('test');
    expect(c2).toHaveBeenCalledWith('test');
  });

  test('connect pipes', function () {
    const consumer = jest.fn();
    const p1 = pipe();
    const p2 = pipe();
    p2.connect(consumer);
    p1.connect(p2.send);
    p1.send('test');
    expect(consumer).toHaveBeenCalledWith('test');
  });

  test('transformer', function () {
    function transformer(next) {
      return function (value) {
        next(value + ' transformed');
      };
    }
    const consumer = jest.fn();
    const p = pipe(transformer);
    p.connect(consumer);
    p.send('test');
    expect(consumer).toHaveBeenCalledWith('test transformed');
  });

  test('multiple transformers', function () {
    const c1 = jest.fn();
    const p1 = pipe(add1, double);
    p1.connect(c1);
    p1.send(1);

    const c2 = jest.fn();
    const p2 = pipe(double, add1);
    p2.connect(c2);
    p2.send(1);

    expect(c1).toHaveBeenCalledWith(4);
    expect(c2).toHaveBeenCalledWith(3);
  });

  test('multiple arguments', function () {
    const c = jest.fn();
    const p = pipe();
    p.connect(c);

    p.send(1, 2, 3, 4);

    expect(c).toHaveBeenCalledWith(1, 2, 3, 4);
  });

  test('extend pipe', function () {
    const c = jest.fn();
    const p = pipe(add1);
    const p1 = p.extend(double, toString);
    p1.connect(c);
    p.send(1);

    expect(c).toHaveBeenCalledWith('number = 4');
  });

  test('push transformers', function () {
    const c = jest.fn();
    const p = pipe(add1, double);
    p.connect(c);
    p.push(toString);
    p.send(1);

    expect(c).toHaveBeenCalledWith('number = 4');
  });

  test('push multiple transformers', function () {
    const c = jest.fn();
    const p = pipe(add1);
    p.connect(c);
    p.push(double, toString);
    p.send(1);

    expect(c).toHaveBeenCalledWith('number = 4');
  });

  test('pop a transformer', function () {
    const c = jest.fn();
    const p = pipe(add1, double, toString);

    p.connect(c);
    const popped = p.pop();
    p.send(1);

    expect(c).toHaveBeenCalledWith(4);
    expect(popped).toBe(toString);
  });

  test('remove at index', function () {
    const c = jest.fn();
    const p = pipe(add1, add1, double, toString);

    p.connect(c);
    p.pop(2);
    p.send(1);

    expect(c).toHaveBeenCalledWith('number = 3');
  });

  test('shift a transformer', function () {
    const c = jest.fn();
    const p = pipe(add1, double, toString);

    p.connect(c);
    const shifted = p.shift();
    p.send(1);

    expect(c).toHaveBeenCalledWith('number = 2');
    expect(shifted).toBe(add1);
  });

  test('unshift a transformer', function () {
    const c = jest.fn();
    const p = pipe(add1, double, toString);

    p.connect(c);
    p.unshift(add1);
    p.send(1);

    expect(c).toHaveBeenCalledWith('number = 6');
  });

  test('unshift multiple transformers', function () {
    const c = jest.fn();
    const p = pipe(toString);

    p.connect(c)
    p.unshift(add1, double);
    p.send(1);

    expect(c).toHaveBeenCalledWith('number = 4');
  });

  test('remove a specified transformer', function () {
    const c = jest.fn();
    const p = pipe(add1, double, toString);

    p.connect(c);
    p.remove(double);
    p.send(1);

    expect(c).toHaveBeenCalledWith('number = 2');
  });

  test('remove all copies of the transformer', function () {
    const c = jest.fn();
    const p = pipe(add1, add1, double, toString);

    p.connect(c);
    p.remove(add1);
    p.send(1);

    expect(c).toHaveBeenCalledWith('number = 2');
  });
});

