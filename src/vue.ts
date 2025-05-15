import { computed, onBeforeUnmount, ref, Ref, UnwrapRef, watch, WatchHandle } from 'vue';
import { isResource, Resource } from './general';
import { Interval } from './timing';

/**
 * @file Utilities for working with Vue
 */

/**
 * Convenience function to define a {@link ref} to a DOM element.
 * If the ref targets a component, its root element will be used.
 */
export function elementRef<T extends Element>(): Ref<UnwrapRef<T | undefined>> {
  let element: Element | undefined;
  return computed<any>({
    get() {
      return element;
    },
    set(value) {
      if (value instanceof Element) {
        element = value;
      } else if (value && '$el' in value) {
        element = value.$el;
      }
    },
  });
}

/**
 * Manages a {@link #time reactive time value in seconds}.
 * Not recommended for use cases requiring high precision, custom timing logic is likely more suitable for that!
 */
export class ReactiveTimer implements Resource {
  /**
   * {@link ref} with the number of elapsed integer seconds.
   * Can be freely updated to any desired integer value while running or paused, either directly or through {@link #reset}.
   *
   * The fractional time (i.e. sub-second elapsed time) is not visible but maintained internally.
   * It's important to note that this is retained during a pause.
   * (e.g. if stopped at 3.5 seconds, the timer will reach 4 seconds only half a second after being resumed).
   * One exception is when the user updates the ref value while paused, the fraction is reset to 0.
   */
  readonly time: Ref<number>;

  private interval?: Interval;
  private started = false;
  private previousTime = 0;
  private accumulator = 0;
  private cancelWatch: WatchHandle;

  /**
   * @param start initial time; default = 0
   * @param updateIntervalMs update interval in ms; default = 100
   */
  constructor(start = 0, private updateIntervalMs = 100) {
    this.time = ref(start);
    this.cancelWatch = watch(this.time, () => {
      // if the time is changed while we're not running, it must be an external change
      // in this case we reset the accumulator to avoid small glitches
      if (!this.started) this.accumulator = 0;
    });
  }

  start(): this {
    if (!this.started) {
      this.previousTime = performance.now();
      this.interval = new Interval(this.updateIntervalMs, () => this.update());
      this.started = true;
    }
    return this;
  }

  stop(): this {
    if (this.started) {
      this.interval?.cancel();
      this.update();
      this.started = false;
    }
    return this;
  }

  reset(time = 0): this {
    this.time.value = time;
    return this;
  }

  private update(): void {
    const currentTime = performance.now();
    this.accumulator += currentTime - this.previousTime;
    this.previousTime = currentTime;
    if (this.accumulator >= 1000) {
      const seconds = Math.floor(this.accumulator / 1000);
      this.time.value += seconds;
      this.accumulator -= seconds * 1000;
    }
  }

  free(): void {
    this.stop();
    this.cancelWatch();
  }
}

/**
 * Convenience function that runs the given cleanup tasks {@link onBeforeUnmount}.
 * A task can either be an ordinary function or a {@link Resource} that needs to be freed.
 */
export function cleanup(...tasks: Array<() => any | Resource>): void {
  onBeforeUnmount(() => tasks.forEach(t => isResource(t) ? t.free() : t()));
}
