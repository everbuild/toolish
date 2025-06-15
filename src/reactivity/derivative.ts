import { ReusableResource } from '../general';
import { Reactive, Unreactive } from './base';
import { ReactiveFactory } from './internal';
import { Publisher, Subscriber, SubscriptionTracker } from './publisher';

/**
 * Produces a value based on other reactive values.
 *
 * Called with a {@link SubscriptionTracker} that must be used to identify the reactive values it depends on,
 * which ensures it gets reevaluated whenever one of these change.
 * If you pass the tracker to {@link Reactive.get} this is done for you, so this is usually the recommended way to go.
 *
 * Note that the function is only evaluated when needed (on the first unwrap since creation and any unwrap
 * after a dependency update), effectively caching the result.
 */
export interface Derivation<T> {
  (tracker: SubscriptionTracker): T;
}

/**
 * Produces a new reactive value based on other reactive values using a {@link Derivation} function.
 */
export class ReactiveDerivative<T> extends Reactive<T> implements Subscriber, SubscriptionTracker, ReusableResource {
  private valid = false;
  private value?: T;
  private subscriptions = new Set<Publisher>();

  constructor(
    private derivation: Derivation<T>,
  ) {
    super();
  }

  unwrap(): T {
    if (this.valid) return this.value!;
    const oldSubscriptions = [...this.subscriptions];
    this.subscriptions.clear();
    this.value = this.derivation(this);
    oldSubscriptions.forEach(s => this.subscriptions.has(s) || s.unsubscribe(this));
    this.valid = true;
    return this.value;
  }

  update(): void {
    this.valid = false;
    this.updateSubscribers();
  }

  subscribeTo(publisher: Publisher): void {
    publisher.subscribe(this);
    this.subscriptions.add(publisher);
  }

  unsubscribe(subscriber: Subscriber) {
    super.unsubscribe(subscriber);
    if (!this.hasSubscribers()) this.free();
  }

  free(): void {
    this.valid = false;
    this.value = undefined;
    this.subscriptions.forEach(s => s.unsubscribe(this));
    this.subscriptions.clear();
  }
}

ReactiveFactory.derivative = d => new ReactiveDerivative(d);