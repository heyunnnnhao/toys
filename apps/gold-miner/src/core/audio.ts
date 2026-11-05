export type SynthSpec = {
  type: OscillatorType;
  freq: number;
  /** frequency at the end of the sound */
  to?: number;
  dur: number;
  gain?: number;
  noise?: boolean;
};

/**
 * Small Web Audio wrapper. Plays decoded sample files when available,
 * otherwise falls back to a synthesized blip so every sound name always works.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private volume = 0.6;

  constructor(private synth: Record<string, SynthSpec>) {}

  /** Must be called from a user gesture (browser autoplay policy). */
  unlock(): void {
    if (typeof AudioContext === 'undefined') return;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  async loadSamples(manifest: Record<string, string>): Promise<void> {
    if (typeof AudioContext === 'undefined') return;
    this.unlock();
    const ctx = this.ctx!;
    await Promise.all(
      Object.entries(manifest).map(async ([name, url]) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          this.buffers.set(name, await ctx.decodeAudioData(await res.arrayBuffer()));
        } catch {
          // keep synth fallback
        }
      }),
    );
  }

  play(name: string): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || ctx.state !== 'running' || this.volume <= 0) return;
    const buf = this.buffers.get(name);
    if (buf) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(master);
      src.start();
      return;
    }
    const spec = this.synth[name];
    if (spec) this.playSynth(ctx, master, spec);
  }

  private playSynth(ctx: AudioContext, out: AudioNode, s: SynthSpec): void {
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(s.gain ?? 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + s.dur);
    g.connect(out);
    if (s.noise) {
      const len = Math.floor(ctx.sampleRate * s.dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(s.freq, t);
      if (s.to) filter.frequency.exponentialRampToValueAtTime(s.to, t + s.dur);
      src.connect(filter).connect(g);
      src.start(t);
      return;
    }
    const osc = ctx.createOscillator();
    osc.type = s.type;
    osc.frequency.setValueAtTime(s.freq, t);
    if (s.to) osc.frequency.exponentialRampToValueAtTime(s.to, t + s.dur);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + s.dur);
  }
}
