// Audio engine using Web Audio API to procedurally synthesize retro-style sound effects
// and the 10 target sounds for the "Guess the Sound" challenge.

class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {
    // AudioContext will be initialized on user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Create a reusable buffer of white noise
  private createNoiseBuffer(duration: number = 2.0): AudioBuffer {
    const context = this.initContext();
    if (!context) throw new Error('AudioContext not supported');
    
    const bufferSize = context.sampleRate * duration;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Plays a procedural retro beep
  public playBeep(freq: number, duration: number, type: OscillatorType = 'sine', decay: number = 0.1) {
    if (!this.enabled) return;
    const context = this.initContext();
    if (!context) return;

    try {
      const osc = context.createOscillator();
      const gainNode = context.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, context.currentTime);

      gainNode.gain.setValueAtTime(0.2, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(context.destination);

      osc.start();
      osc.stop(context.currentTime + duration);
    } catch (e) {
      console.error('Audio synthesis failed', e);
    }
  }

  // ---------------------------------------------------------------------------
  // CHALLENGE SOUNDS (Challenge 4)
  // ---------------------------------------------------------------------------

  // 1. Rain Sound
  private playRain(duration: number = 2.5) {
    const context = this.initContext();
    if (!context) return;

    const noise = context.createBufferSource();
    noise.buffer = this.createNoiseBuffer(duration);

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, context.currentTime);
    filter.Q.setValueAtTime(1.5, context.currentTime);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.2, context.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, context.currentTime + duration - 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    noise.start();
    noise.stop(context.currentTime + duration);

    // Add tiny randomized pops for rain droplets
    for (let i = 0; i < duration * 15; i++) {
      const delay = Math.random() * (duration - 0.3);
      setTimeout(() => {
        if (!this.enabled) return;
        this.playBeep(Math.random() * 1500 + 1000, 0.015, 'triangle', 0.002);
      }, delay * 1000);
    }
  }

  // 2. Keyboard Sound
  private playKeyboard() {
    // Generate 5-6 fast mechanical clicks resembling typing
    const clickCount = 6;
    for (let i = 0; i < clickCount; i++) {
      const delay = i * 0.15 + Math.random() * 0.08;
      setTimeout(() => {
        if (!this.enabled) return;
        const context = this.initContext();
        if (!context) return;

        // Click transient
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200 + Math.random() * 400, context.currentTime);
        
        gain.gain.setValueAtTime(0.15, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.03);

        osc.connect(gain);
        gain.connect(context.destination);
        osc.start();
        osc.stop(context.currentTime + 0.04);
      }, delay * 1000);
    }
  }

  // 3. Dog Sound (Bark bark)
  private playDog() {
    const bark = (delay: number) => {
      setTimeout(() => {
        if (!this.enabled) return;
        const context = this.initContext();
        if (!context) return;

        const osc = context.createOscillator();
        const osc2 = context.createOscillator();
        const gain = context.createGain();

        osc.type = 'sawtooth';
        osc2.type = 'triangle';

        // Low frequency pitch swept bark
        osc.frequency.setValueAtTime(120, context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(320, context.currentTime + 0.08);
        osc.frequency.exponentialRampToValueAtTime(90, context.currentTime + 0.25);

        osc2.frequency.setValueAtTime(110, context.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(300, context.currentTime + 0.08);
        osc2.frequency.exponentialRampToValueAtTime(80, context.currentTime + 0.25);

        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, context.currentTime);

        gain.gain.setValueAtTime(0.4, context.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);

        osc.start();
        osc2.start();
        osc.stop(context.currentTime + 0.26);
        osc2.stop(context.currentTime + 0.26);
      }, delay * 1000);
    };

    bark(0);
    bark(0.35); // Second bark
  }

  // 4. Bell Sound (Metallic Ringing)
  private playBell() {
    const context = this.initContext();
    if (!context) return;

    // A rich metallic bell is composed of multiple non-harmonic frequencies
    const freqs = [500, 775, 1120, 1560, 2200];
    const duration = 2.5;

    freqs.forEach((freq, idx) => {
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, context.currentTime);

      // Higher overtones decay faster
      const overtoneDecay = duration / (idx + 1);
      gain.gain.setValueAtTime(0.12 / (idx + 1), context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + overtoneDecay);

      osc.connect(gain);
      gain.connect(context.destination);

      osc.start();
      osc.stop(context.currentTime + overtoneDecay + 0.1);
    });
  }

  // 5. Car Sound (Horn and engine rev)
  private playCar() {
    const context = this.initContext();
    if (!context) return;

    // Engine rumble (low hum)
    const engineOsc = context.createOscillator();
    const engineGain = context.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.setValueAtTime(50, context.currentTime);
    engineOsc.frequency.linearRampToValueAtTime(110, context.currentTime + 0.5);
    engineOsc.frequency.linearRampToValueAtTime(70, context.currentTime + 1.2);

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, context.currentTime);

    engineGain.gain.setValueAtTime(0.2, context.currentTime);
    engineGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1.5);

    engineOsc.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(context.destination);
    
    engineOsc.start();
    engineOsc.stop(context.currentTime + 1.5);

    // Beep beep car horn at 0.4s
    const playHorn = (delay: number) => {
      setTimeout(() => {
        if (!this.enabled) return;
        const ctx = this.initContext();
        if (!ctx) return;

        // Two frequencies combined make a classic dual-tone horn
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const hGain = ctx.createGain();

        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.frequency.setValueAtTime(554, ctx.currentTime); // Major third interval

        osc1.type = 'triangle';
        osc2.type = 'triangle';

        hGain.gain.setValueAtTime(0.15, ctx.currentTime);
        hGain.gain.setValueAtTime(0.15, ctx.currentTime + 0.15);
        hGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

        osc1.connect(hGain);
        osc2.connect(hGain);
        hGain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.21);
        osc2.stop(ctx.currentTime + 0.21);
      }, delay * 1000);
    };

    playHorn(0.4);
    playHorn(0.65);
  }

  // 6. Water Sound (Bubbling / Sloshing)
  private playWater(duration: number = 2.0) {
    const context = this.initContext();
    if (!context) return;

    // Water bubbling is done by playing multiple fast bubbles with random high resonant bandpasses
    const bubbleCount = 20;
    for (let i = 0; i < bubbleCount; i++) {
      const delay = (i / bubbleCount) * duration + Math.random() * 0.1;
      setTimeout(() => {
        if (!this.enabled) return;
        const ctx = this.initContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        // Fast pitch swoop upwards simulates bubble popping
        const startFreq = 400 + Math.random() * 600;
        osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(startFreq * 1.8, ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.09);
      }, delay * 1000);
    }
  }

  // 7. Door Sound (Knock knock and creak)
  private playDoor() {
    const context = this.initContext();
    if (!context) return;

    // Wooden Knock sound: Two low thuds
    const knock = (delay: number) => {
      setTimeout(() => {
        if (!this.enabled) return;
        const ctx = this.initContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(90, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, ctx.currentTime);

        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.13);
      }, delay * 1000);
    };

    knock(0);
    knock(0.25);

    // Squeaking door creak
    setTimeout(() => {
      if (!this.enabled) return;
      const ctx = this.initContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1240, ctx.currentTime + 0.6);
      osc.frequency.linearRampToValueAtTime(1180, ctx.currentTime + 1.2);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1500, ctx.currentTime);
      filter.Q.setValueAtTime(10, ctx.currentTime);

      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.3);
    }, 550);
  }

  // 8. Applause Sound
  private playApplause(duration: number = 2.5) {
    const context = this.initContext();
    if (!context) return;

    // Clapping uses dense overlapping bursts of bandpassed noise
    const clapCount = 45;
    for (let i = 0; i < clapCount; i++) {
      const delay = (i / clapCount) * duration + Math.random() * 0.15;
      setTimeout(() => {
        if (!this.enabled) return;
        const ctx = this.initContext();
        if (!ctx) return;

        const noise = ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.1);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        // Overlap multiple clapping hands' resonances
        filter.frequency.setValueAtTime(1000 + Math.random() * 800, ctx.currentTime);
        filter.Q.setValueAtTime(3.0, ctx.currentTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05 + Math.random() * 0.03);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start();
        noise.stop(ctx.currentTime + 0.1);
      }, delay * 1000);
    }
  }

  // 9. Bird Sound (Chirping)
  private playBird() {
    const chirp = (delay: number) => {
      setTimeout(() => {
        if (!this.enabled) return;
        const context = this.initContext();
        if (!context) return;

        const osc = context.createOscillator();
        const gain = context.createGain();

        osc.type = 'sine';
        // Fast pitch sweeping up and down
        osc.frequency.setValueAtTime(2000, context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(3500, context.currentTime + 0.05);
        osc.frequency.exponentialRampToValueAtTime(1800, context.currentTime + 0.12);

        gain.gain.setValueAtTime(0.15, context.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, context.currentTime + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(context.destination);

        osc.start();
        osc.stop(context.currentTime + 0.13);
      }, delay * 1000);
    };

    chirp(0);
    chirp(0.18);
    chirp(0.36);
  }

  // 10. Clock Sound (Tick Tock)
  private playClock() {
    const tick = (delay: number, isTock: boolean) => {
      setTimeout(() => {
        if (!this.enabled) return;
        const context = this.initContext();
        if (!context) return;

        const osc = context.createOscillator();
        const gain = context.createGain();

        osc.type = 'triangle';
        // Tick is slightly higher in frequency, Tock is lower
        const freq = isTock ? 450 : 600;
        osc.frequency.setValueAtTime(freq, context.currentTime);

        // Highly dampened envelope
        gain.gain.setValueAtTime(0.2, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.02);

        osc.connect(gain);
        gain.connect(context.destination);

        osc.start();
        osc.stop(context.currentTime + 0.03);
      }, delay * 1000);
    };

    tick(0, false);     // Tick
    tick(0.6, true);    // Tock
    tick(1.2, false);   // Tick
    tick(1.8, true);    // Tock
  }

  // Master dispatcher for challenge sounds
  public playChallengeSound(soundId: string) {
    if (!this.enabled) return;
    this.initContext();

    switch (soundId) {
      case 'rain': this.playRain(); break;
      case 'keyboard': this.playKeyboard(); break;
      case 'dog': this.playDog(); break;
      case 'bell': this.playBell(); break;
      case 'car': this.playCar(); break;
      case 'water': this.playWater(); break;
      case 'door': this.playDoor(); break;
      case 'applause': this.playApplause(); break;
      case 'bird': this.playBird(); break;
      case 'clock': this.playClock(); break;
      default:
        // Fallback default sound
        this.playBeep(440, 0.5, 'sine');
    }
  }

  // ---------------------------------------------------------------------------
  // INTERACTIVE GAME SFX
  // ---------------------------------------------------------------------------

  // Play Success Sound
  public playSuccess() {
    if (!this.enabled) return;
    const context = this.initContext();
    if (!context) return;

    try {
      const now = context.currentTime;
      // Happy rising major chord arpeggio
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      
      notes.forEach((freq, idx) => {
        const osc = context.createOscillator();
        const gain = context.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.12, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);

        osc.connect(gain);
        gain.connect(context.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.16);
      });
    } catch (e) {
      console.error(e);
    }
  }

  // Play Failure Sound
  public playFailure() {
    if (!this.enabled) return;
    const context = this.initContext();
    if (!context) return;

    try {
      const now = context.currentTime;
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      // Falling pitch sweep
      osc.frequency.linearRampToValueAtTime(80, now + 0.35);

      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);

      osc.start();
      osc.stop(now + 0.36);
    } catch (e) {
      console.error(e);
    }
  }

  // Play Level Clear Sound
  public playLevelClear() {
    if (!this.enabled) return;
    const context = this.initContext();
    if (!context) return;

    try {
      const now = context.currentTime;
      // Uplifting arpeggio melody
      const melody = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6
      const rhythm = [0, 0.08, 0.16, 0.24, 0.32];

      melody.forEach((freq, idx) => {
        const osc = context.createOscillator();
        const gain = context.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + rhythm[idx]);

        gain.gain.setValueAtTime(0.15, now + rhythm[idx]);
        gain.gain.exponentialRampToValueAtTime(0.001, now + rhythm[idx] + 0.25);

        osc.connect(gain);
        gain.connect(context.destination);

        osc.start(now + rhythm[idx]);
        osc.stop(now + rhythm[idx] + 0.26);
      });
    } catch (e) {
      console.error(e);
    }
  }

  // Play Boss Alert sound
  public playBossAlert() {
    if (!this.enabled) return;
    const context = this.initContext();
    if (!context) return;

    try {
      const now = context.currentTime;
      
      // Retro pulsing warning siren
      const siren = (delay: number) => {
        const osc = context!.createOscillator();
        const gain = context!.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now + delay);
        osc.frequency.linearRampToValueAtTime(300, now + delay + 0.2);
        osc.frequency.linearRampToValueAtTime(150, now + delay + 0.4);

        const filter = context!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, now);

        gain.gain.setValueAtTime(0.2, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.45);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(context!.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.5);
      };

      siren(0);
      siren(0.5);
      siren(1.0);
    } catch (e) {
      console.error(e);
    }
  }

  // Play Game Over sound
  public playGameOver() {
    if (!this.enabled) return;
    const context = this.initContext();
    if (!context) return;

    try {
      const now = context.currentTime;
      const notes = [329.63, 293.66, 261.63, 196.00]; // E4, D4, C4, G3 (falling sad progression)
      const timings = [0, 0.2, 0.4, 0.6];

      notes.forEach((freq, idx) => {
        const osc = context.createOscillator();
        const gain = context.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + timings[idx]);

        const filter = context!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(250, now);

        gain.gain.setValueAtTime(0.18, now + timings[idx]);
        gain.gain.exponentialRampToValueAtTime(0.001, now + timings[idx] + 0.35);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(context!.destination);

        osc.start(now + timings[idx]);
        osc.stop(now + timings[idx] + 0.4);
      });
    } catch (e) {
      console.error(e);
    }
  }
}

export const audio = new RetroAudioEngine();
