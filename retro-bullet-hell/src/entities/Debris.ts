import { Vector2D } from '../Vector2D'

const DEBRIS_LIFETIME = 0.5

export class DebrisParticle {
  readonly position = new Vector2D()
  readonly velocity = new Vector2D()
  life = DEBRIS_LIFETIME
  readonly maxLife = DEBRIS_LIFETIME
  readonly radius: number
  readonly color: string

  constructor(
    x: number,
    y: number,
    angle: number,
    speed: number,
    radius: number,
    color: string,
  ) {
    this.radius = radius
    this.color = color
    this.position.x = x
    this.position.y = y
    this.velocity.x = Math.cos(angle) * speed
    this.velocity.y = Math.sin(angle) * speed
  }

  update(dt: number): boolean {
    this.life -= dt
    if (this.life <= 0) return false

    const drag = Math.pow(0.92, dt * 60)
    this.velocity.scale(drag)
    this.position.x += this.velocity.x * dt
    this.position.y += this.velocity.y * dt
    return true
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = Math.max(0, this.life / this.maxLife)
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = this.color
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

export function spawnDebrisBurst(
  x: number,
  y: number,
  color: string,
  count = 12,
  options?: { speedMin?: number; speedMax?: number; lifetime?: number },
): DebrisParticle[] {
  const particles: DebrisParticle[] = []
  const speedMin = options?.speedMin ?? 120
  const speedMax = options?.speedMax ?? 400
  const lifetime = options?.lifetime ?? DEBRIS_LIFETIME

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = speedMin + Math.random() * (speedMax - speedMin)
    const radius = 1.5 + Math.random() * 3.5
    const particle = new DebrisParticle(x, y, angle, speed, radius, color)
    particle.life = lifetime
    particles.push(particle)
  }

  return particles
}

const PLAYER_DEATH_COLORS = ['#22d3ee', '#67e8f9', '#a5f3fc', '#34d399', '#ecfeff']

export function spawnPlayerDeathBurst(x: number, y: number): DebrisParticle[] {
  const particles: DebrisParticle[] = []

  for (let i = 0; i < 28; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 80 + Math.random() * 520
    const color =
      PLAYER_DEATH_COLORS[i % PLAYER_DEATH_COLORS.length] ?? '#67e8f9'
    const particle = new DebrisParticle(
      x,
      y,
      angle,
      speed,
      2 + Math.random() * 4,
      color,
    )
    particle.life = 0.65 + Math.random() * 0.35
    particles.push(particle)
  }

  return particles
}

export function updateDebris(debris: DebrisParticle[], dt: number): void {
  let write = 0
  for (let read = 0; read < debris.length; read++) {
    const particle = debris[read]!
    if (particle.update(dt)) {
      if (write !== read) debris[write] = particle
      write++
    }
  }
  debris.length = write
}

export function drawDebris(
  ctx: CanvasRenderingContext2D,
  debris: readonly DebrisParticle[],
): void {
  if (debris.length === 0) return

  ctx.save()
  ctx.shadowBlur = 6
  ctx.shadowColor = 'rgba(255, 255, 255, 0.4)'

  for (const particle of debris) {
    particle.draw(ctx)
  }

  ctx.restore()
}
