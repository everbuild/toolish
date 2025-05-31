import { Reactive, ReactiveArray, ReactiveDerivative, ReactiveObject, ReactiveValue } from '../src/reactivity';

test('basic', done => {
  const value = Reactive.of(1);

  const results: Array<number> = [];

  const cancel = value.consume(v => {
    results.push(v);
    if (results.length === 2) {
      expect(results).toEqual([1, 2]);
      cancel();
      done();
    }
  });

  value.set(2);
});

test('of', () => {
  const originalObject = { a: 1 };
  const reactiveObject = Reactive.of(originalObject);
  expect(reactiveObject).toBeInstanceOf(ReactiveObject);
  expect(reactiveObject.unwrap()).toBe(originalObject);
  expect(reactiveObject.unwrap().a).toBe(1);
  expect(reactiveObject.select('a')).toBeInstanceOf(ReactiveDerivative);
  expect(reactiveObject.select('a').unwrap()).toBe(1);
  expect(Reactive.of(reactiveObject)).toBe(reactiveObject);
  expect(Reactive.of(originalObject)).toBe(reactiveObject);
});

test('nest object', () => {
  const original = { a: 1, b: [2, 3], c: { d: 4 } };

  const nested = Reactive.nest(original);

  expect(nested.unwrap().a).toBeInstanceOf(ReactiveValue);
  expect(nested.unwrap().a.unwrap()).toBe(1);
  expect(nested.select('a')).toBeInstanceOf(ReactiveDerivative);
  expect(nested.getProperty('a').unwrap()).toBe(1);
  expect(nested.unwrap().b).toBeInstanceOf(ReactiveArray);
  expect(nested.unwrap().b.unwrap()[0]).toBe(2);
  expect(nested.select('b')).toBeInstanceOf(ReactiveDerivative);
  expect(nested.select('b').unwrap()).toEqual([2, 3]);
  expect(nested.select('b').select(1)).toBeInstanceOf(ReactiveDerivative);
  expect(nested.select('b').select(1).unwrap()).toBe(3);
  expect(nested.select('b').select(-1).unwrap()).toBe(3);
  expect(nested.select('b').select(2).unwrap()).toBeUndefined();
  expect(nested.unwrap().c).toBeInstanceOf(ReactiveObject);
  expect(nested.unwrap().c.unwrap()).toEqual({ d: 4 });

  const unnested = nested.unnest(Reactive.NO_TRACK);
  expect(unnested).toEqual(original);
  expect(unnested).not.toBe(original);

  expect(Reactive.nest(original)).toBe(nested);
});

test('derive', done => {
  const v1 = Reactive.of([1, 2, 3]);
  const v2 = Reactive.of(2);

  const c1 = Reactive.derive(t => v1.get(t).map(v => v * v2.get(t)));
  const c2 = c1.derive(v => v.join(' '));

  const results: Array<string> = [];

  const cancel = c2.consume(v => {
    results.push(v);
    if (results.length === 3) {
      expect(results).toEqual([
        '2 4 6',
        '3 6 9',
        '4 8 12',
      ]);
      cancel();
      done();
    }
  });

  v2.set(3);
  v2.set(3); // same value should be skipped
  v2.set(4);
});

test('combine', () => {
  const raw = Reactive.combine([1, 2], ([a, b]) => a + b);
  expect(raw).toBe(3);

  const reactive = Reactive.combine([1, Reactive.of(2)], ([a, b]) => a + b) as Reactive<number>;
  expect(reactive).toBeInstanceOf(Reactive);
  expect(reactive.unwrap()).toBe(3);
});

test('select + patch', done => {
  const results: Array<number> = [];
  const nested = Reactive.nest({ a: [{ b: 1 }] });
  const selection = nested.select('a', -1, 'b');

  const cancel = selection.consume(v => {
    results.push(v);
    if (results.length === 3) {
      expect(results).toEqual([1, 2, 3]);
      cancel();
      done();
    }
  });

  nested.patch({ a: [{ b: 1 }, { b: 2 }] });
  nested.unwrap().a.addLast({ b: 3 });
});

test('array', () => {
  const reactive = Reactive.of([1]);
  reactive.patch([2]);
  expect(reactive.unwrap()).toEqual([2]);
  reactive.patch([2, 3]);
  expect(reactive.unwrap()).toEqual([2, 3]);
  reactive.patch([1]);
  expect(reactive.unwrap()).toEqual([1]);
  reactive.addLast(2, 3);
  expect(reactive.unwrap()).toEqual([1, 2, 3]);
  reactive.addFirst(0, 0);
  expect(reactive.unwrap()).toEqual([0, 0, 1, 2, 3]);
  reactive.replace(2, 5, 5);
  expect(reactive.unwrap()).toEqual([0, 0, 5, 5, 3]);
  reactive.replace(4, 7, 7, 7);
  expect(reactive.unwrap()).toEqual([0, 0, 5, 5, 7, 7, 7]);
  reactive.removeLast(3);
  expect(reactive.unwrap()).toEqual([0, 0, 5, 5]);
  reactive.removeFirst();
  expect(reactive.unwrap()).toEqual([0, 5, 5]);
  reactive.remove(1);
  expect(reactive.unwrap()).toEqual([0, 5]);
  reactive.insert(1, 1, 2, 3, 4);
  expect(reactive.unwrap()).toEqual([0, 1, 2, 3, 4, 5]);
  expect(reactive.pop()).toBe(5);
  expect(reactive.shift()).toBe(0);
  expect(reactive.unwrap()).toEqual([1, 2, 3, 4]);
  reactive.splice(-2, 1);
  expect(reactive.unwrap()).toEqual([1, 2, 4]);
  reactive.splice(-1, 1);
  expect(reactive.unwrap()).toEqual([1, 2]);
  reactive.splice(-100, 1);
  expect(reactive.unwrap()).toEqual([2]);
  reactive.splice(0, 100, [0, 0, 7]);
  expect(reactive.unwrap()).toEqual([0, 0, 7]);
  reactive.splice(100, 0, [7, 7]);
  expect(reactive.unwrap()).toEqual([0, 0, 7, 7, 7]);
  reactive.splice(1, 3, [2]);
  expect(reactive.unwrap()).toEqual([0, 2, 7]);
});

test('object', () => {
  const reactive = Reactive.of<{ a?: number; b?: { c?: number } }>({});
  expect(reactive.unwrap()).toEqual({});
  reactive.setProperty('a', 1);
  expect(reactive.unwrap()).toEqual({ a: 1 });
  reactive.removeProperty('a');
  expect(reactive.unwrap()).toEqual({});

  reactive.patch({ b: { c: 2 } });
  expect(reactive.unwrap()).toEqual({ b: { c: 2 } });

  ReactiveObject.REMOVAL_STRATEGY = (v, k) => v[k] = -1;
  reactive.removeProperty('a');
  expect(reactive.unwrap().a).toBe(-1);
});