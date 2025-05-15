import { removeBy, sortBy } from './array';
import { MaybePromiseLike } from './async';
import { Cancel } from './general';
import { getOrCreateEntry } from './map';
import { Constructor } from './types';

/**
 * Function that receives an event.
 * May return a promise to indicate when they're done.
 * Other return values are ignored.
 * Set {@link AbstractEvent.handled} to true to stop all further event processing.
 */
export interface EventHandler<Event> {
  (event: Event): MaybePromiseLike<any>;
}

/**
 * Extend this class to model your own events with any needed data (and behavior).
 */
export abstract class AbstractEvent {
  /**
   * {@link EventHandler}s can set this to true to stop all further event processing.
   */
  handled = false;

  /**
   * Used by {@link EventBus.submit} to determine what event sources to process and in what order.
   * This default implementation returns the class hierarchy from the current class upto AbstractEvent.
   * This means that subclasses (more specific) get processed before superclasses (more generic).
   * Override this to customize processing behavior for specific events.
   */
  getTypeChain(): Array<Constructor<AbstractEvent>> {
    const chain = [];
    let type: any = this.constructor;
    while (type) {
      chain.push(type);
      if (type === AbstractEvent) break;
      type = Object.getPrototypeOf(type);
    }
    return chain;
  }
}

/**
 * Supports handling events of a single type.
 * A typical use case is managing your own EventSource instances and registering handlers and submitting events directly trough them.
 *
 * E.g.
 * ```
 * const assetLoaded = new EventSource<AssetEvent>();
 * assetLoaded.handle(e => use(e.asset));
 * assetLoaded.submit(new AssetEvent(asset));
 * ```
 */
export class EventSource<T extends AbstractEvent> {
  private handlers: Array<{
    handler: EventHandler<T>;
    priority: number;
  }> = [];

  /**
   * Register an {@link EventHandler}
   * @param handler
   * @param priority handlers are called by ascending priority (e.g. priority 0 is called before 1)
   * @returns a function that calls {@link unhandle} for you.
   * @see EventHandler for more details
   */
  handle(handler: EventHandler<T>, priority = 1000): Cancel {
    this.handlers.push({ handler, priority });
    sortBy(this.handlers, 'priority');
    return () => this.unhandle(handler);
  }

  /**
   * Unregister given {@link EventHandler}
   */
  unhandle(handler: EventHandler<T>): void {
    removeBy(this.handlers, w => w.handler === handler);
  }

  /**
   * Call the current handlers according to the {@link handle | priority they were registered with}.
   *
   * It's important to realise that even though handlers are free to perform asynchronous actions, they're processed sequentially.
   * If a handler returns a promise, further processing waits until it settles.
   *
   * Handlers can {@link AbstractEvent.handled | stop} further processing.
   *
   * @returns a promise that settles when processing is done
   */
  async submit(event: T): Promise<void> {
    for (const { handler } of this.handlers) {
      await handler(event); // eslint-disable-line no-await-in-loop
      if (event.handled) break;
    }
  }

  canBeRemoved(): boolean {
    return this.handlers.length === 0;
  }
}

/**
 * Supports handling events of multiple types.
 * A typical use case is a shared event bus to achieve bidirectional communication between multiple modules without interdependencies.
 * Each module only needs to depend on a shared instance and event definitions.
 * Internally manages an {@link EventSource} for each event type a handler is registered for.
 */
export class EventBus {
  private sourceMap = new Map<Constructor<any>, EventSource<any>>();

  /**
   * Like {@link EventSource.handle}, but for a specific event type.
   *
   * E.g.:
   * ```
   * eventBus.handle(AssetEvent, e => use(e.asset));
   * ```
   *
   * You're free to create a hierarchy of event classes and handle any subclass of {@link AbstractEvent}
   * (including AbstractEvent itself, although it's usually only advisable for very general purposes, like debugging or logging).
   */
  handle<T extends AbstractEvent>(type: Constructor<T>, handler: EventHandler<T>, priority?: number): Cancel {
    const source = getOrCreateEntry(this.sourceMap, type, () => new EventSource<any>());
    source.handle(handler, priority);
    return () => this.unhandle(type, handler);
  }

  /**
   * Like {@link EventSource.unhandle}, but for a specific event type.
   */
  unhandle<T extends AbstractEvent>(type: Constructor<T>, handler: EventHandler<T>): void {
    const source = this.sourceMap.get(type);
    source?.unhandle(handler);
    if (source?.canBeRemoved()) this.sourceMap.delete(type);
  }

  /**
   * Like {@link EventSource.submit}, but sequentially processes all event sources for the types and in the order returned by {@link AbstractEvent.getTypeChain}.
   * @returns a promise that settles when all processing is done
   */
  async submit(event: AbstractEvent): Promise<void> {
    for (const type of event.getTypeChain()) {
      const source = this.sourceMap.get(type);
      await source?.submit(event); // eslint-disable-line no-await-in-loop
      if (event.handled) break;
    }
  }
}