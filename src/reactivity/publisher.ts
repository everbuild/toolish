/**
 * Notifies its subscribers when data gets updated
 */
export interface Publisher {
  subscribe(subscriber: Subscriber): void;

  unsubscribe(subscriber: Subscriber): void;

  updateSubscribers(): void;

  hasSubscribers(): boolean;
}

/**
 * Receives notifications when data gets updated
 */
export interface Subscriber {
  update(): void;
}

/**
 * Can subscribe to a given publisher to receive notifications when data gets updated
 */
export interface SubscriptionTracker {
  subscribeTo(publisher: Publisher): void;
}
