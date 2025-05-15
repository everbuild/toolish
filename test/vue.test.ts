import { delay } from '../src/timing';
import { ReactiveTimer } from '../src/vue';

test('ReactiveTimer', async () => {
  const timer = new ReactiveTimer().start();
  await delay(1200);
  expect(timer.time.value).toBe(1);
  timer.stop()
});