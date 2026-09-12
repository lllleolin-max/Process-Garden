/** A visual clock: paused/hidden time never advances lifecycle or ambient motion. */
export class SceneClock {
  time = 1000;
  private previous: number | null = null;
  private frozen = false;

  tick(now: number, frozen: boolean) {
    const deltaMs = this.previous === null || frozen || this.frozen
      ? 0 : Math.max(0, Math.min(64, now - this.previous));
    this.previous = now;
    this.frozen = frozen;
    this.time += deltaMs;
    return { time: this.time, deltaMs };
  }
}
