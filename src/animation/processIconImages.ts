/** Swap decoded icons atomically; late loads must not replace newer requests. */
export class ProcessIconImages {
  private entries = new Map<string, { source: string; ready?: HTMLImageElement; pending?: HTMLImageElement }>();

  get(key: string) { return this.entries.get(key)?.ready; }

  update(key: string, source: string | null, onReady: () => void) {
    const previous = this.entries.get(key);
    if (previous?.source === source) return;
    if (previous?.pending) previous.pending.onload = previous.pending.onerror = null;
    if (!source) {
      this.entries.delete(key);
      if (previous?.ready) onReady();
      return;
    }
    const image = new Image();
    const entry = { source, ready: previous?.ready, pending: image as HTMLImageElement | undefined };
    this.entries.set(key, entry);
    image.onload = () => {
      if (this.entries.get(key) !== entry) return;
      entry.ready = image;
      entry.pending = undefined;
      image.onload = image.onerror = null;
      onReady();
    };
    image.onerror = () => {
      if (this.entries.get(key) !== entry) return;
      entry.pending = undefined;
      image.onload = image.onerror = null;
    };
    image.src = source;
  }

  clear() {
    for (const entry of this.entries.values()) {
      if (entry.pending) entry.pending.onload = entry.pending.onerror = null;
    }
    this.entries.clear();
  }
}
