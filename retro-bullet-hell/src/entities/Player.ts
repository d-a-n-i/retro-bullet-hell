import { lerpAngle } from '../math/angle'
import { Vector2D } from '../Vector2D'
import type { Input } from '../input/Input'
import { Projectile } from './Projectile'

export interface WorldBounds {
  width: number
  height: number
}

export type WeaponType = 'SINGLE' | 'SPREAD' | 'BURST'

export interface WeaponConfig {
  weaponType: WeaponType
  /** Milliseconds between shots. */
  fireRate: number
  bulletSpeed: number
  spreadCount: number
  spreadArcDeg: number
}

const DEFAULT_WEAPON: WeaponConfig = {
  weaponType: 'SINGLE',
  fireRate: 55,
  bulletSpeed: 1100,
  spreadCount: 5,
  spreadArcDeg: 15,
}

const BURST_COUNT = 20
const SPREAD_COLORS = ['#22d3ee', '#34d399', '#2dd4bf', '#6ee7b7', '#5eead4']

export class Player {
  readonly position = new Vector2D()
  readonly velocity = new Vector2D()
  readonly radius = 14
  readonly speed = 2200
  readonly friction = 0.85
  readonly maxHealth = 100
  health = 100
  hitsTaken = 0
  invulnTimer = 0
  weapon: WeaponConfig = { ...DEFAULT_WEAPON }
  /** Exact aim used for firing (updated every frame). */
  aimAngle = 0
  /** Smoothed angle for ship rendering. */
  displayAngle = 0
  private fireAccumulator = 0

  constructor(x: number, y: number) {
    this.position.x = x
    this.position.y = y
    this.displayAngle = -Math.PI / 2
    this.aimAngle = this.displayAngle
  }

  get isAlive(): boolean {
    return this.health > 0
  }

  takeDamage(amount: number): void {
    if (!this.isAlive || this.invulnTimer > 0) return
    this.health = Math.max(0, this.health - amount)
    this.hitsTaken++
    this.invulnTimer = 0.75
  }

  updateAim(aim: Vector2D, dt: number): void {
    this.aimAngle = Math.atan2(
      aim.y - this.position.y,
      aim.x - this.position.x,
    )
    const smooth = 1 - Math.exp(-20 * dt)
    this.displayAngle = lerpAngle(this.displayAngle, this.aimAngle, smooth)
  }

  update(dt: number, input: Input, bounds: WorldBounds): Projectile[] {
    this.updateAim(input.pointer, dt)

    const direction = input.getMovementDirection()

    if (direction.magnitude() > 0) {
      this.velocity.add(direction.clone().scale(this.speed * dt))
    }

    const frictionFactor = Math.pow(this.friction, dt * 60)
    this.velocity.scale(frictionFactor)

    this.position.add(this.velocity.clone().scale(dt))
    this.clampToBounds(bounds)

    this.invulnTimer = Math.max(0, this.invulnTimer - dt)

    const shots: Projectile[] = []
    if (input.isPointerDown()) {
      const shotsPerSecond = 1000 / this.weapon.fireRate
      this.fireAccumulator += dt * shotsPerSecond
      while (this.fireAccumulator >= 1) {
        shots.push(...this.fire())
        this.fireAccumulator -= 1
      }
    } else {
      this.fireAccumulator = 0
    }

    return shots
  }

  fire(): Projectile[] {
    const { bulletSpeed } = this.weapon
    const nose = this.getMuzzlePosition()

    switch (this.weapon.weaponType) {
      case 'SINGLE':
        return [
          this.createProjectile(
            nose.x,
            nose.y,
            this.aimAngle,
            bulletSpeed,
            SPREAD_COLORS[0]!,
          ),
        ]

      case 'SPREAD':
        return this.fireSpread(nose.x, nose.y, this.aimAngle, bulletSpeed)

      case 'BURST':
        return this.fireBurst(nose.x, nose.y, bulletSpeed)

      default:
        return []
    }
  }

  getMuzzlePosition(): { x: number; y: number } {
    const offset = this.radius * 1.35
    return {
      x: this.position.x + Math.cos(this.aimAngle) * offset,
      y: this.position.y + Math.sin(this.aimAngle) * offset,
    }
  }

  constrainToBounds(bounds: WorldBounds): void {
    this.clampToBounds(bounds)
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const angle = this.displayAngle
    const r = this.radius
    const flicker =
      this.invulnTimer > 0 && Math.floor(this.invulnTimer * 20) % 2 === 0

    ctx.save()
    ctx.translate(this.position.x, this.position.y)
    ctx.rotate(angle)

    if (flicker) ctx.globalAlpha = 0.45

    ctx.shadowColor = '#22d3ee'
    ctx.shadowBlur = 22

    ctx.beginPath()
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(34, 211, 238, 0.25)'
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(r * 1.6, 0)
    ctx.lineTo(-r * 1.1, r * 0.85)
    ctx.lineTo(-r * 0.55, 0)
    ctx.lineTo(-r * 1.1, -r * 0.85)
    ctx.closePath()
    ctx.fillStyle = '#67e8f9'
    ctx.fill()

    ctx.shadowBlur = 10
    ctx.strokeStyle = '#a5f3fc'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.shadowBlur = 0
    ctx.fillStyle = '#ecfeff'
    ctx.beginPath()
    ctx.arc(r * 0.35, 0, 2.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = 1
    ctx.restore()
  }

  private fireSpread(
    x: number,
    y: number,
    aimAngle: number,
    bulletSpeed: number,
  ): Projectile[] {
    const count = this.weapon.spreadCount === 3 ? 3 : 5
    const halfArc = (this.weapon.spreadArcDeg * Math.PI) / 180
    const shots: Projectile[] = []

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1)
      const offset = (t * 2 - 1) * halfArc
      const angle = aimAngle + offset
      const color = SPREAD_COLORS[i % SPREAD_COLORS.length]!
      shots.push(this.createProjectile(x, y, angle, bulletSpeed, color))
    }

    return shots
  }

  private fireBurst(x: number, y: number, bulletSpeed: number): Projectile[] {
    const shots: Projectile[] = []

    for (let i = 0; i < BURST_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / BURST_COUNT
      const color = SPREAD_COLORS[i % SPREAD_COLORS.length]!
      shots.push(this.createProjectile(x, y, angle, bulletSpeed, color))
    }

    return shots
  }

  private createProjectile(
    x: number,
    y: number,
    angle: number,
    speed: number,
    color: string,
  ): Projectile {
    return new Projectile(x, y, angle, speed, 4, color)
  }

  private clampToBounds(bounds: WorldBounds): void {
    const min = this.radius
    const maxX = bounds.width - this.radius
    const maxY = bounds.height - this.radius

    this.position.x = Math.max(min, Math.min(maxX, this.position.x))
    this.position.y = Math.max(min, Math.min(maxY, this.position.y))

    if (this.position.x <= min || this.position.x >= maxX) {
      this.velocity.x = 0
    }
    if (this.position.y <= min || this.position.y >= maxY) {
      this.velocity.y = 0
    }
  }
}
