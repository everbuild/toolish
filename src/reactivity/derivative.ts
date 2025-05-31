import { ReusableResource } from '../general';
import { MaybeReactiveDeep, Reactive, Unreactive } from './base';
import { ReactiveFactory } from './internal';
import { Publisher, Subscriber, SubscriptionTracker } from './publisher';

export interface Derivation<T> {
  (tracker: SubscriptionTracker): MaybeReactiveDeep<T>;
}

/**
 * Produces a new reactive value based on other reactive values using a {@link Derivation} function.
 * The function is called with a {@link SubscriptionTracker} intended to track dependencies to used reactive values,
 * which ensures that it gets reevaluated whenever one of these change.
 * If you pass the tracker to {@link Reactive.unwrap} this is done for you, so this is usually the recommended way to go.
 * Note that the function is only evaluated when needed (on the first unwrap since creation or any unwrap after a dependency update), effectively caching the result.
 */
export class ReactiveDerivative<T> extends Reactive<Unreactive<T>> implements Subscriber, SubscriptionTracker, ReusableResource {
  private valid = false;
  private value?: Unreactive<T>;
  private subscriptions = new Set<Publisher>();

  constructor(
    private derivation: Derivation<T>,
  ) {
    super();
  }

  unwrap(): Unreactive<T> {
    if (this.valid) return this.value!;
    const oldSubscriptions = [...this.subscriptions];
    this.subscriptions.clear();
    this.value = Reactive.unwrap(this.derivation(this), this);
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