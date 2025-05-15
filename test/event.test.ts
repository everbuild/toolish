import { sort } from '../src/array';
import { AbstractEvent, EventBus } from '../src/event';

class TaskEvent extends AbstractEvent {
  static timer = 0;
  time = ++TaskEvent.timer;

  constructor(public task: string) {
    super();
  }
}

class TaskAdded extends TaskEvent {
}

class TaskCompleted extends TaskEvent {
}

test('EventBus', async () => {
  const bus = new EventBus();

  const tasks = new Set<string>();
  const log: Array<string> = [];

  bus.handle(TaskEvent, e => log.push(`${e.time}: ${e.task} ${e instanceof TaskAdded ? 'added' : 'completed'}`));
  bus.handle(TaskAdded, addMissingTasks, 1);
  bus.handle(TaskAdded, e => tasks.add(e.task), 0);
  bus.handle(TaskAdded, e => e.task === 'shop' && bus.submit(new TaskCompleted('shop')), 2);
  bus.handle(TaskCompleted, e => {
    expect(tasks).toContain(e.task);
    tasks.delete(e.task);
    return autoCompleteTasksFor(e.task);
  });

  await bus.submit(new TaskAdded('eat'));

  expect(tasks.size).toBe(0);

  // the log is in reverse order due to all events intentionally getting processed sequentially
  sort(log)
  expect(log).toEqual([
    '1: eat added',
    '2: cook added',
    '3: shop added',
    '4: shop completed',
    '5: cook completed',
    '6: eat completed'
  ]);

  function addMissingTasks() {
    if (tasks.has('eat') && !tasks.has('cook')) return bus.submit(new TaskAdded('cook'));
    if (tasks.has('cook') && !tasks.has('shop')) return bus.submit(new TaskAdded('shop'));
  }

  function autoCompleteTasksFor(task: string) {
    if (task === 'shop') return bus.submit(new TaskCompleted('cook'));
    if (task === 'cook') return bus.submit(new TaskCompleted('eat'));
  }
});