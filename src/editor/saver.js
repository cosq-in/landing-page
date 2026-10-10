// Saves edits to Honbu without flooding it or tripping over itself. Per key (a place id, or "book"):
//  - edits within `interval` ms are merged into one save of the latest value (also lets a dragged pin stream out at ~4/s)
//  - only one save per key is ever in flight; the next one starts after it returns, using the version it returned
//  - a rejected save (someone else saved first) is reported with the server's current copy and our pending edits for it are dropped

export class Saver {
  #versions = new Map();
  #latest = new Map();
  #timers = new Map();
  #inflight = new Set();

  constructor({ send, onSaved, onConflict, onError = () => {}, interval = 250 }) {
    Object.assign(this, { send, onSaved, onConflict, onError, interval });
  }

  version(key) { return this.#versions.get(key) ?? 0; }

  /** A version learned from elsewhere (another editor's event); the next save builds on it. */
  setVersion(key, v) { if (v > this.version(key)) this.#versions.set(key, v); }

  busy(key) { return this.#latest.has(key) || this.#timers.has(key) || this.#inflight.has(key); }

  edit(key, value) {
    this.#latest.set(key, value);
    this.#arm(key);
  }

  /** Forget a key entirely, e.g. because the place was deleted. */
  cancel(key) {
    clearTimeout(this.#timers.get(key));
    this.#timers.delete(key);
    this.#latest.delete(key);
    this.#versions.delete(key);
  }

  #arm(key) {
    if (this.#timers.has(key) || this.#inflight.has(key)) return;
    this.#timers.set(key, setTimeout(() => { this.#timers.delete(key); this.#run(key); }, this.interval));
  }

  async #run(key) {
    const value = this.#latest.get(key);
    if (value === undefined || this.#inflight.has(key)) return;
    this.#latest.delete(key);
    this.#inflight.add(key);
    try {
      const r = await this.send(key, value, this.version(key));
      if (r.conflict) {
        this.#latest.delete(key);
        const cur = r.conflict.current;
        if (cur) this.#versions.set(key, cur.version); else this.#versions.delete(key);
        this.onConflict(key, cur);
      } else {
        this.#versions.set(key, r.saved.version);
        this.onSaved(key, r.saved);
      }
    } catch (e) {
      this.#latest.delete(key);
      this.onError(key, e);
    } finally {
      this.#inflight.delete(key);
      if (this.#latest.has(key)) this.#arm(key);
    }
  }
}
