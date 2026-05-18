/** Cumulative score required to reach this level (level 1 = 0). */
export function getScoreThresholdForLevel(level: number): number {
  if (level <= 1) return 0

  let cumulative = 0
  for (let l = 1; l < level; l++) {
    cumulative += Math.floor(180 * Math.pow(1.8, l - 1))
  }
  return cumulative
}

export function getLevelForScore(score: number): number {
  let level = 1
  while (score >= getScoreThresholdForLevel(level + 1)) {
    level++
  }
  return level
}

/** Points needed from current score to reach the next level. */
export function getPointsToNextLevel(score: number, level: number): number {
  const next = getScoreThresholdForLevel(level + 1)
  return Math.max(0, next - score)
}

/** Higher levels award more points per kill. */
export function getScoreMultiplier(level: number): number {
  return Math.pow(1.32, level - 1)
}

/**
 * Exponential spawn acceleration per level (lower interval = faster spawns).
 * Level 1 ≈ 1×, level 5 ≈ 3.4× faster, level 8 ≈ 7× faster.
 */
export function getLevelSpawnFactor(level: number): number {
  return Math.pow(0.62, level - 1)
}

const BASE_SPAWN_INTERVAL = 2.2
const MIN_SPAWN_INTERVAL = 0.06

export function getSpawnInterval(
  level: number,
  gameTime: number,
): number {
  const timeRamp = Math.max(0.5, BASE_SPAWN_INTERVAL - gameTime * 0.01)
  const levelFactor = getLevelSpawnFactor(level)
  return Math.max(MIN_SPAWN_INTERVAL, timeRamp * levelFactor)
}

/** Contact damage scales with enemy radius (larger = harder hit). */
export function getContactDamageForEnemy(radius: number): number {
  const refRadius = 12
  const base = 7
  const scale = radius / refRadius
  return Math.round(base * scale * scale)
}
