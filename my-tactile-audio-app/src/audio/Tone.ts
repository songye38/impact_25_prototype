// ---------- Web Audio (sonification) ----------
export class Tone {
    private ctx: AudioContext | null = null;
    private osc: OscillatorNode | null = null;
    private gain: GainNode | null = null;

    async ensure() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (!this.gain) {
            this.gain = this.ctx.createGain();
            this.gain.gain.value = 0.0001; // start silent
            this.gain.connect(this.ctx.destination);
        }
        if (!this.osc) {
            this.osc = this.ctx.createOscillator();
            this.osc.type = "sine";
            this.osc.connect(this.gain);
            this.osc.start();
        }
    }

    async set(type: OscillatorType, freq: number, vol = 0.1) {
        await this.ensure();
        if (!this.ctx || !this.osc || !this.gain) return;
        this.osc.type = type;
        this.osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        this.gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    }

    async ramp(freqFrom: number, freqTo: number, durationMs = 800, vol = 0.12) {
        await this.ensure();
        if (!this.ctx || !this.osc || !this.gain) return;
        const t0 = this.ctx.currentTime;
        this.osc.frequency.setValueAtTime(freqFrom, t0);
        this.osc.frequency.linearRampToValueAtTime(freqTo, t0 + durationMs / 1000);
        this.gain.gain.setValueAtTime(vol, t0);
        this.gain.gain.linearRampToValueAtTime(0.0001, t0 + durationMs / 1000);
    }

    async beep(freq = 440, ms = 200, type: OscillatorType = "sine", vol = 0.12) {
        await this.ensure();
        if (!this.ctx || !this.osc || !this.gain) return;
        const t0 = this.ctx.currentTime;
        this.osc.type = type;
        this.osc.frequency.setValueAtTime(freq, t0);
        this.gain.gain.setValueAtTime(vol, t0);
        this.gain.gain.linearRampToValueAtTime(0.0001, t0 + ms / 1000);
    }

    async silence() {
        await this.ensure();
        if (!this.ctx || !this.gain) return;
        this.gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    }
}

export const tone = new Tone();