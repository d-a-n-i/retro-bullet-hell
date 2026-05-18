import { Vector2D } from '../Vector2D'

export type EnemyType = 'CHASER' | 'TANK'

const CHASER_STATS = {
  radius: 12,
  health: 1,
  speed: 200,
  color: '#f87171',
  score: 10,
  homingDuration: 0.55,
}

const TANK_STATS = {
  radius: 28,
  health: 8,
  speed: 65,
  color: '#c084fc',
  score: 50,
  homingDuration: 0.85,
}

const MINI_CHASER_STATS = {
  radius: 8,
  health: 1,
  speed: 280,
  color: '#fb7185',
  score: 5,
  homingDuration: 0.22,
}

export class Enemy {
  readonly position = new Vector2D()
  readonly velocity = new Vector2D()
  active = true
  readonly type: EnemyType
  readonly maxHealth: number
  health: number
  readonly radius: number
  readonly speed: number
  readonly color: string
  readonly baseScoreValue: number
  readonly isMiniChaser: boolean
  courseLocked = false
  private homingElapsed = 0
  private readonly homingDuration: number

  private constructor(
    type: EnemyType,
    stats: typeof CHASER_STATS,
    isMiniChaser = false,
  ) {
    this.type = type
    this.radius = stats.radius
    this.maxHealth = stats.health
    this.health = stats.health
    this.speed = stats.speed
    this.color = stats.color
    this.baseScoreValue = stats.score
    this.isMiniChaser = isMiniChaser
    this.homingDuration = stats.homingDuration
  }

  static create(type: EnemyType, x: number, y: number): Enemy {
    const enemy = new Enemy(type, type === 'TANK' ? TANK_STATS : CHASER_STATS)
    enemy.position.x = x
    enemy.position.y = y
    return enemy
  }

  static createMiniChaser(x: number, y: number, burstAngle: number): Enemy {
    const enemy = new Enemy('CHASER', MINI_CHASER_STATS, true)
    enemy.position.x = x
    enemy.position.y = y
    const burstSpeed = 160
    enemy.velocity.x = Math.cos(burstAngle) * burstSpeed
    enemy.velocity.y = Math.sin(burstAngle) * burstSpeed
    return enemy
  }

  createSplitChasers(): Enemy[] {
    if (this.type !== 'TANK') return []

    return Array.from({ length: 3 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 3 + (Math.random() - 0.5) * 0.4
      return Enemy.createMiniChaser(this.position.x, this.position.y, angle)
    })
  }

  update(dt: number, playerPos: Vector2D): void {
    if (!this.active) return

    if (!this.courseLocked) {
      this.homingElapsed += dt

      const dx = playerPos.x - this.position.x
      const dy = playerPos.y - this.position.y
      const distSq = dx * dx + dy * dy

      if (distSq > 0) {
        const invDist = 1 / Math.sqrt(distSq)
        this.velocity.x = dx * invDist * this.speed
        this.velocity.y = dy * invDist * this.speed
      }

      if (this.homingElapsed >= this.homingDuration) {
        this.courseLocked = true
      }
    }

    this.position.x += this.velocity.x * dt
    this.position.y += this.velocity.y * dt
  }

  takeDamage(amount: number): boolean {
    if (!this.active) return false
    this.health -= amount
    if (this.health <= 0) {
      this.active = false
      return true
    }
    return false
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return

    const { x, y } = this.position
    const r = this.radius

    ctx.save()
    ctx.shadowColor = this.color
    ctx.shadowBlur = this.type === 'TANK' ? 18 : 12

    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = this.color
    ctx.fill()

    if (this.type === 'TANK') {
      ctx.strokeStyle = '#e9d5ff'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    ctx.restore()
  }
}

export function updateEnemies(
  enemies: Enemy[],
  dt: number,
  playerPos: Vector2D,
  frozen: boolean,
): void {
  if (frozen) return
  for (const enemy of enemies) {
    if (enemy.active) enemy.update(dt, playerPos)
  }
}

export function compactEnemies(enemies: Enemy[]): void {
  let write = 0
  for (let read = 0; read < enemies.length; read++) {
    const enemy = enemies[read]!
    if (enemy.active) {
      if (write !== read) enemies[write] = enemy
      write++
    }
  }
  enemies.length = write
}

export function drawEnemies(
  ctx: CanvasRenderingContext2D,
  enemies: readonly Enemy[],
): void {
  for (const enemy of enemies) {
    enemy.draw(ctx)
  }
}
