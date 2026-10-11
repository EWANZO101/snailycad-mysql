type Listener<T> = (payload: T) => void;

/** a minimal typed event emitter (no Node dependency, works in the FiveM NUI) */
export class Emitter<Events extends Record<string, unknown>> {
  #listeners = new Map<keyof Events, Set<Listener<never>>>();

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>) {
    let set = this.#listeners.get(event);
    if (!set) {
      set = new Set();
      this.#listeners.set(event, set);
    }
    set.add(listener as Listener<never>);
    return () => this.off(event, listener);
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>) {
    this.#listeners.get(event)?.delete(listener as Listener<never>);
  }

  protected emit<K extends keyof Events>(event: K, payload: Events[K]) {
    for (const listener of this.#listeners.get(event) ?? []) {
      try {
        (listener as Listener<Events[K]>)(payload);
      } catch (error) {
        console.error(`[radio] ${String(event)} listener failed`, error);
      }
    }
  }
}
