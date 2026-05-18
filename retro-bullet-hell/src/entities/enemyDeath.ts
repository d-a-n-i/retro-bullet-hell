import { spawnDebrisBurst } from './Debris'
import type { DebrisParticle } from './Debris'
import type { Enemy } from './Enemy'

export interface EnemyDeathResult {
  scoreDelta: number
  debris: DebrisParticle[]
  newEnemies: Enemy[]
}

export function handleEnemyDeath(
  enemy: Enemy,
  scoreMultiplier: number,
): EnemyDeathResult {
  const scoreDelta = Math.round(enemy.baseScoreValue * scoreMultiplier)
  const debris = spawnDebrisBurst(
    enemy.position.x,
    enemy.position.y,
    enemy.color,
    10 + Math.floor(Math.random() * 6),
  )
  const newEnemies =
    enemy.type === 'TANK' ? enemy.createSplitChasers() : []

  enemy.active = false

  return { scoreDelta, debris, newEnemies }
}
