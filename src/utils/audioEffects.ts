/**
 * Duolingo-style sound effects synthesis and ambient study audio using Web Audio API
 * Runs natively in all modern browsers without external audio files.
 */
let isGlobalSoundEnabled = true;
let isGlobalMusicEnabled = false;
let ambientMusicNode: { stop: () => void } | null = null;

export function setGlobalSoundEnabled(enabled: boolean): void {
  isGlobalSoundEnabled = enabled;
}

export function setGlobalMusicEnabled(enabled: boolean): void {
  isGlobalMusicEnabled = enabled;
  if (enabled) {
    startAmbientStudyMusic();
  } else {
    stopAmbientStudyMusic();
  }
}

export function getGlobalMusicEnabled(): boolean {
  return isGlobalMusicEnabled;
}

function startAmbientStudyMusic(): void {
  if (typeof window === 'undefined') return;
  if (ambientMusicNode) return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Gentle, soothing warm study chord (F major 9th / C chord soothing drone)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 2.5); // Soft study volume

    const freqs = [174.61, 220.0, 261.63, 329.63, 392.0]; // F3, A3, C4, E4, G4
    const oscillators: OscillatorNode[] = [];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Gentle LFO modulation for warm analog drift
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.12 + idx * 0.04, ctx.currentTime);
      lfoGain.gain.setValueAtTime(0.8, ctx.currentTime);
      lfo.connect(osc.frequency);
      lfo.start();

      oscGain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start();
      oscillators.push(osc);
    });

    masterGain.connect(ctx.destination);

    ambientMusicNode = {
      stop: () => {
        try {
          masterGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
          setTimeout(() => {
            oscillators.forEach((o) => {
              try { o.stop(); } catch {}
            });
            try { ctx.close(); } catch {}
            ambientMusicNode = null;
          }, 1300);
        } catch {
          ambientMusicNode = null;
        }
      },
    };
  } catch (e) {
    console.warn('Unable to start ambient study music', e);
  }
}

function stopAmbientStudyMusic(): void {
  if (ambientMusicNode) {
    ambientMusicNode.stop();
  }
}

class SoundEffects {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (!isGlobalSoundEnabled) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Positive chime (Major chord arpeggio C5 -> E5 -> G5 -> C6)
   */
  playCorrect(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const now = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);

      gain.gain.setValueAtTime(0, now + i * 0.07);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.3);
    });
  }

  /**
   * Gentle error thud (low dual tone)
   */
  playIncorrect(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(220, now); // A3
    osc1.frequency.exponentialRampToValueAtTime(140, now + 0.25);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(180, now);
    osc2.frequency.exponentialRampToValueAtTime(110, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.32);
    osc2.stop(now + 0.32);
  }

  /**
   * Level up / celebration fanfare
   */
  playFanfare(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [440, 554.37, 659.25, 880, 1108.73]; // A4, C#5, E5, A5, C#6
    const now = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i === notes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      const dur = i === notes.length - 1 ? 0.6 : 0.2;
      gain.gain.setValueAtTime(0.2, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + dur);
    });
  }

  /**
   * Crisp button tap
   */
  playTap(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }
}

export const soundEffects = new SoundEffects();

export function playSound(type: 'correct' | 'wrong' | 'fanfare' | 'tap'): void {
  if (!isGlobalSoundEnabled) return;
  switch (type) {
    case 'correct':
      soundEffects.playCorrect();
      break;
    case 'wrong':
      soundEffects.playIncorrect();
      break;
    case 'fanfare':
      soundEffects.playFanfare();
      break;
    case 'tap':
      soundEffects.playTap();
      break;
  }
}
