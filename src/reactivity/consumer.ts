import { Resource } from '../general';
import { Consumer } from '../types';
import type { Reactive } from './base';
import { Subscriber } from './publisher';

export class ReactiveConsumer<T> implements Subscriber, Resource {
  constructor(
    private base: Reactive<T>,
    private consumer: Consumer<T>,
  ) {
    this.base.subscribe(this);
    this.update();
  }

  update(): void {
    this.consumer(this.base.unwrap());
  }

  free() {
    this.base.unsubscribe(this);
  }
}