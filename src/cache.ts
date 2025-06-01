
export interface CacheLoader<T, P extends Array<any>> {
  (...params: P): T | Promise<T>;
}

export interface TtlCacheOptions<P extends Array<any>> {
  /**
   * Time to live of any cache entry, in milliseconds (i.e. how long data is cached).
   * Set to {@link !Number.POSITIVE_INFINITY} to never expire.
   * Default: 1 hour.
   */
  ttl: number;

  /**
   * Function used to generate a unique cache key for a given list of loader parameters.
   * Default: {@link !JSON.stringify}
   * @param params
   */
  getKey: (params: P) => string;
}

export class TtlCacheEntry<T> {
  constructor(
    public expireTime: number,
    public value: T,
  ) {
  }

  isValid(now: number): boolean {
    return now < this.expireTime;
  }
}

/**
 * Basic key-value cache that stores the results of a given load function based on the parameters that are passed to it.
 * Results remain valid for a limited time (Time To Live).
 * Note that expired results are not proactively cleared, they're just reloaded once requested again.
 */
export class TtlCache<T, P extends Array<any>> {
  /**
   * Default options.
   * Change these to apply your preferred configuration.
   * Changes apply only to future cache instances.
   */
  static OPTIONS: TtlCacheOptions<any> = {
    ttl: 60 * 60 * 1000,
    getKey: JSON.stringify,
  };

  protected entries = new Map<string, TtlCacheEntry<T>>();
  protected options: TtlCacheOptions<P>;

  /**
   * @param load function that loads the underlying values. It gets passed the same parameters as {@link get}.
   *             The load function may be synchronous or asynchronous (i.e. returning a promise).
   * @param options optional, see {@link TtlCache.OPTIONS}
   */
  constructor(
    private load: CacheLoader<T, P>,
    options?: Partial<TtlCacheOptions<P>>,
  ) {
    this.options = { ...TtlCache.OPTIONS, ...options };
  }

  /**
   * Returns the value associated with the given parameters if available and not expired, or calls the load function to generate it.
   * @param params parameters for the load function.
   */
  async get(...params: P): Promise<T> {
    const key = this.options.getKey(params);
    const now = Date.now();
    const entry = this.entries.get(key);
    if (entry?.isValid(now)) return entry.value;
    const value = await this.load(...params);
    this.entries.set(key, new TtlCacheEntry(now + this.options.ttl, value));
    return value;
  }

  /**
   * Returns any value currently associated with the given parameters, even if expired.
   * @param params parameters for the load function.
   */
  getCached(...params: P): T | undefined {
    const key = this.options.getKey(params);
    const entry = this.entries.get(key);
    return entry?.value;
  }

  /**
   * Discards all stored values.
   */
  clear(): void {
    this.entries.clear();
  }
}

/**
 * {@link TtlCache} extension that can be useful with load functions that return partial lists, see member functions.
 */
export class ArrayTtlCache<T, P extends Array<any>> extends TtlCache<Array<T>, P> {
  constructor(
    load: CacheLoader<Array<T>, P>,
    options?: TtlCacheOptions<P>,
  ) {
    super(load, options);
  }

  /**
   * Like {@link TtlCache.getCached} but returns an empty array if no values are currently associated with the given parameters.
   */
  getCached(...params: P): Array<T> {
    return super.getCached(...params) ?? [];
  }

  /**
   * Returns a single array concatenating all cached values.
   */
  getAllCached(): Array<T> {
    return [...this.entries.values()].flatMap(e => e.value);
  }
}
