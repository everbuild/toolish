import { CancelError } from '../src/general';
import { Debounce, delay, Delay, Interval } from '../src/timing';

test('Delay', async () => {
  const cancelledDelay = new Delay(10000000);
  cancelledDelay.cancel();
  await expect(cancelledDelay.promise).rejects.toBeInstanceOf(CancelError);

  const flushedDelay = new Delay(10000000);
  flushedDelay.flush();
  await expect(flushedDelay.promise).resolves.toBeUndefined();

  const start = performance.now();
  const smallDelay = new Delay(20);
  await smallDelay.promise;
  const actualDuration = performance.now() - start;
  expect(actualDuration).toBeGreaterThan(5);
});

test('Interval', async () => {
  let counter = 0;
  const limitedInterval = new Interval(10, () => counter++).withLimit(3);
  await delay(50);
  expect(counter).toBe(3);

  counter = 0;
  const cancelledInterval = new Interval(10, () => {
    if (++counter === 2) cancelledInterval.cancel();
  });
  await delay(50);
  expect(counter).toBe(2);
});

test('Debounce', done => {
  const log: Array<number> = [];
  let counter = 0;

  const debouncedDouble = new Debounce(40, double);

  debouncedDouble.run(1).then(check);
  debouncedDouble.run(2).then(check);

  delay(10).then(() => {
    debouncedDouble.flush();
  });

  delay(20).then(() => {
    debouncedDouble.run(3).then(check);
    debouncedDouble.run(4).then(check);
  });


  function double(input: number): number {
    log.push(input);
    return input * 2;
  }

  function check(result: number) {
    counter++;

    expect(result).toBe(counter <= 2 ? 4 : 8);

    if (counter === 4) {
      expect(log).toEqual([2, 4]);
      done();
    }
  }
});