import pipe from './index.js';

describe('pipe', function () {

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
    function t1(next) {
      return function (x) {
        next(x + 1);
      };
    }

    function t2(next) {
      return function (x) {
        next(x * 2);
      }
    }

    const c1 = jest.fn();
    const p1 = pipe(t1, t2);
    p1.connect(c1);
    p1.send(1);

    const c2 = jest.fn();
    const p2 = pipe(t2, t1);
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
    function t1(next) {
      return function (x) {
        next(x + 1);
      };
    }

    function t2(next) {
      return function (x) {
        next(x * 2);
      }
    }

    function t3(next) {
      return function (x) {
        next('number = ' + x);
      }
    }

    const c = jest.fn();
    const p = pipe(t1);
    const p1 = p.extend(t2, t3);
    p1.connect(c);
    p.send(1);

    expect(c).toHaveBeenCalledWith('number = 4');
  });

});

