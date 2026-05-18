import { Vector2D } from '../Vector2D'
import type { WorldBounds } from './Player'

export class Projectile {
  readonly position = new Vector2D()
  readonly velocity = new Vector2D()
  active = true
  life: number
  readonly radius: number
  readonly color: string

  constructor(
    x: number,
    y: number,
    angle: number,
    speed: number,
    radius = 4,
    color = '#22d3ee',
    lifetime = 2.5,
  ) {
    this.radius = radius
    this.color = color
    this.position.x = x
    this.position.y = y
    this.velocity.x = Math.cos(angle) * speed
    this.velocity.y = Math.sin(angle) * speed
    this.life = lifetime
  }

  update(dt: number, bounds: WorldBounds): boolean {
    if (!this.active) return false

    this.life -= dt
    if (this.life <= 0) {
      this.deactivate()
      return false
    }

    this.position.x += this.velocity.x * dt
    this.position.y += this.velocity.y * dt

    if (this.isOffScreen(bounds)) {
      this.deactivate()
      return false
    }

    return true
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return

    ctx.beginPath()
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = this.color
    ctx.fill()
  }

  private deactivate(): void {
    this.active = false
  }

  private isOffScreen(bounds: WorldBounds): boolean {
    const { x, y } = this.position
    const margin = this.radius
    return (
      x < -margin ||
      x > bounds.width + margin ||
      y < -margin ||
      y > bounds.height + margin
    )
  }
}

export function updateProjectiles(
  projectiles: Projectile[],
  dt: number,
  bounds: WorldBounds,
): void {
  let write = 0
  for (let read = 0; read < projectiles.length; read++) {
    const projectile = projectiles[read]!
    if (projectile.update(dt, bounds)) {
      if (write !== read) projectiles[write] = projectile
      write++
    }
  }
  projectiles.length = write
}

export function drawProjectiles(
  ctx: CanvasRenderingContext2D,
  projectiles: readonly Projectile[],
): void {
  if (projectiles.length === 0) return

  ctx.save()
  ctx.shadowBlur = 10
  ctx.shadowColor = 'cyan'

  for (const projectile of projectiles) {
    projectile.draw(ctx)
  }

  ctx.restore()
}
