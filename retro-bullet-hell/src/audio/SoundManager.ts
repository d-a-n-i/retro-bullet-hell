type WaveType = OscillatorType

interface ToneOptions {
  frequency: number
  frequencyEnd?: number
  duration: number
  type?: WaveType
  volume?: number
  attack?: number
  decay?: number
  detune?: number
}

export class SoundManager {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private unlocked = false
  private lastShootAt = 0

  async unlock(): Promise<void> {
    if (this.unlocked) return

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (!AudioCtx) return

    this.ctx = new AudioCtx()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.38
    this.master.connect(this.ctx.destination)

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }

    this.unlocked = true
  }

  get isReady(): boolean {
    return this.unlocked && this.ctx !== null && this.master !== null
  }

  playShoot(): void {
    if (!this.canPlay()) return

    const now = performance.now()
    if (now - this.lastShootAt < 28) return
    this.lastShootAt = now

    const variation = (Math.random() - 0.5) * 0.12
    this.playTone({
      frequency: 920 + variation * 200,
      frequencyEnd: 280,
      duration: 0.055,
      type: 'square',
      volume: 0.14,
      attack: 0.002,
      decay: 0.05,
    })
  }

  playEnemyHit(killed: boolean): void {
    if (!this.canPlay()) return

    if (killed) {
      this.playTone({
        frequency: 180,
        frequencyEnd: 70,
        duration: 0.1,
        type: 'sawtooth',
        volume: 0.2,
        attack: 0.003,
        decay: 0.09,
      })
      this.playNoise({ duration: 0.07, volume: 0.12, filterFreq: 900 })
    } else {
      this.playTone({
        frequency: 320,
        frequencyEnd: 140,
        duration: 0.06,
        type: 'triangle',
        volume: 0.15,
        attack: 0.002,
        decay: 0.055,
      })
    }
  }

  playPlayerHit(): void {
    if (!this.canPlay()) return

    this.playTone({
      frequency: 110,
      frequencyEnd: 45,
      duration: 0.18,
      type: 'sawtooth',
      volume: 0.28,
      attack: 0.004,
      decay: 0.16,
    })
    this.playNoise({ duration: 0.14, volume: 0.22, filterFreq: 400 })
    this.playTone({
      frequency: 55,
      duration: 0.22,
      type: 'square',
      volume: 0.12,
      attack: 0.01,
      decay: 0.2,
    })
  }

  private canPlay(): boolean {
    return this.ctx !== null && this.master !== null && this.unlocked
  }

  private playTone(options: ToneOptions): void {
    const ctx = this.ctx!
    const master = this.master!
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = options.type ?? 'square'
    osc.frequency.setValueAtTime(options.frequency, now)
    if (options.frequencyEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, options.frequencyEnd),
        now + options.duration,
      )
    }
    if (options.detune) {
      osc.detune.setValueAtTime(options.detune, now)
    }

    const volume = options.volume ?? 0.2
    const attack = options.attack ?? 0.005
    const decay = options.decay ?? options.duration

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(volume, now + attack)
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay)

    osc.connect(gain)
    gain.connect(master)
    osc.start(now)
    osc.stop(now + options.duration + 0.02)
  }

  private playNoise(options: {
    duration: number
    volume?: number
    filterFreq?: number
  }): void {
    const ctx = this.ctx!
    const master = this.master!
    const now = ctx.currentTime

    const bufferSize = Math.floor(ctx.sampleRate * options.duration)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = options.filterFreq ?? 800
    filter.Q.value = 0.6

    const gain = ctx.createGain()
    const volume = options.volume ?? 0.15
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + options.duration)

    source.connect(filter)
    filter.connect(gain)
    gain.connect(master)
    source.start(now)
    source.stop(now + options.duration + 0.02)
  }
}
