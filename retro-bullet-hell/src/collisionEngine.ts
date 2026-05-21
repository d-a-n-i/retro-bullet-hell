import { circlesOverlapSq } from './collision'
import { getContactDamageForEnemy } from './game/levels'
import { handleEnemyDeath } from './entities/enemyDeath'
import type { DebrisParticle } from './entities/Debris'
import type { Enemy } from './entities/Enemy'
import type { Player } from './entities/Player'
import type { Projectile } from './entities/Projectile'

const PROJECTILE_DAMAGE = 1

export interface CollisionResult {
  scoreDelta: number
  newEnemies: Enemy[]
  newDebris: DebrisParticle[]
  playerKilled: boolean
  enemyHits: number
  enemyKills: number
  playerHits: number
}

export function resolveCollisions(
  projectiles: Projectile[],
  enemies: Enemy[],
  player: Player,
  scoreMultiplier: number,
): CollisionResult {
  let scoreDelta = 0
  const newEnemies: Enemy[] = []
  const newDebris: DebrisParticle[] = []
  let playerKilled = false
  let enemyHits = 0
  let enemyKills = 0
  let playerHits = 0

  for (const projectile of projectiles) {
    if (!projectile.active) continue

    const px = projectile.position.x
    const py = projectile.position.y
    const pr = projectile.radius

    for (const enemy of enemies) {
      if (!enemy.active) continue

      if (
        !circlesOverlapSq(
          px,
          py,
          pr,
          enemy.position.x,
          enemy.position.y,
          enemy.radius,
        )
      ) {
        continue
      }

      projectile.active = false
      enemyHits++

      const killed = enemy.takeDamage(PROJECTILE_DAMAGE)
      if (killed) {
        enemyKills++
        const death = handleEnemyDeath(enemy, scoreMultiplier)
        scoreDelta += death.scoreDelta
        newDebris.push(...death.debris)
        newEnemies.push(...death.newEnemies)
      }

      break
    }
  }

  if (player.isAlive && player.invulnTimer <= 0) {
    const plx = player.position.x
    const ply = player.position.y
    const plr = player.radius

    for (const enemy of enemies) {
      if (!enemy.active) continue

      if (
        !circlesOverlapSq(
          plx,
          ply,
          plr,
          enemy.position.x,
          enemy.position.y,
          enemy.radius,
        )
      ) {
        continue
      }

      const contactDamage = getContactDamageForEnemy(enemy.radius)
      const wasAlive = player.isAlive
      const healthBefore = player.health
      player.takeDamage(contactDamage)
      if (player.health < healthBefore) playerHits++

      const death = handleEnemyDeath(enemy, scoreMultiplier)
      scoreDelta += death.scoreDelta
      newDebris.push(...death.debris)
      newEnemies.push(...death.newEnemies)
      enemyHits++
      enemyKills++

      if (wasAlive && !player.isAlive) {
        playerKilled = true
      }
    }
  }

  return {
    scoreDelta,
    newEnemies,
    newDebris,
    playerKilled,
    enemyHits,
    enemyKills,
    playerHits,
  }
}
