import './style.css'
import { resolveCollisions } from './collisionEngine'
import { spawnDebrisBurst, spawnPlayerDeathBurst } from './entities/Debris'
import {
  DebrisParticle,
  drawDebris,
  updateDebris,
} from './entities/Debris'
import {
  compactEnemies,
  drawEnemies,
  Enemy,
  updateEnemies,
} from './entities/Enemy'
import type { EnemyType } from './entities/Enemy'
import { Player } from './entities/Player'
import {
  drawProjectiles,
  Projectile,
  updateProjectiles,
} from './entities/Projectile'
import {
  createLevelAnnounce,
  drawLevelAnnounce,
  isLevelAnnounceFrozen,
  updateLevelAnnounce,
  type LevelAnnounceState,
} from './game/levelAnnounce'
import {
  getLevelForScore,
  getPointsToNextLevel,
  getScoreMultiplier,
  getSpawnInterval,
} from './game/levels'
import {
  createDeathFx,
  drawDeathFlash,
  drawGameOverScreen,
  updateDeathFx,
  type DeathFx,
  type GamePhase,
} from './game/gameOver'
import { SoundManager } from './audio/SoundManager'
import { Input } from './input/Input'

function showBootError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  console.error(error)

  const banner = document.createElement('div')
  banner.id = 'boot-error'
  banner.textContent = `Game failed to start: ${message}`
  document.body.appendChild(banner)
}

function boot(): void {
  const canvas = document.querySelector('#game') as HTMLCanvasElement
  const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D

  const fpsEl = document.querySelector<HTMLDivElement>('#fps')
  const scoreEl = document.querySelector<HTMLDivElement>('#score')
  const healthEl = document.querySelector<HTMLDivElement>('#health')
  const levelEl = document.querySelector<HTMLDivElement>('#level')
  const controlsHintEl = document.querySelector<HTMLDivElement>('#controls-hint')

  const isTouchDevice =
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
  if (controlsHintEl) {
    controlsHintEl.dataset.platform = isTouchDevice ? 'mobile' : 'desktop'
  }

  const input = new Input(canvas)
  const audio = new SoundManager()
  const projectiles: Projectile[] = []
  const enemies: Enemy[] = []
  const debris: DebrisParticle[] = []

  let player!: Player
  let score = 0
  let currentLevel = 1
  let gameTime = 0
  let spawnTimer = 0
  let phase: GamePhase = 'playing'
  let deathFx: DeathFx | null = null
  let deathSequenceTimer = 0
  let gameOverTime = 0
  let levelAnnounce: LevelAnnounceState | null = null
  let shakeX = 0
  let shakeY = 0

  const DEATH_SEQUENCE_DURATION = 0.55
  /** Minimum time on the game-over screen before restart input is accepted. */
  const GAME_OVER_INPUT_DELAY = 1.6

  let controlsHintVisible = true

  function hideControlsHint(): void {
    if (!controlsHintVisible || !controlsHintEl) return
    controlsHintVisible = false
    controlsHintEl.classList.add('is-hidden')
  }

  function unlockAudio(): void {
    void audio.unlock()
  }

  function playShootSounds(): void {
    for (let i = 0; i < player.shotsFiredThisFrame; i++) {
      audio.playShoot()
    }
  }

  function playCollisionSounds(collision: ReturnType<typeof resolveCollisions>): void {
    const chipHits = collision.enemyHits - collision.enemyKills
    for (let i = 0; i < collision.enemyKills; i++) {
      audio.playEnemyHit(true)
    }
    for (let i = 0; i < Math.min(chipHits, 4); i++) {
      audio.playEnemyHit(false)
    }
    for (let i = 0; i < collision.playerHits; i++) {
      audio.playPlayerHit()
    }
  }

  function resetGame(): void {
    player = new Player(window.innerWidth / 2, window.innerHeight / 2)
    projectiles.length = 0
    enemies.length = 0
    debris.length = 0
    score = 0
    currentLevel = 1
    gameTime = 0
    spawnTimer = 0
    phase = 'playing'
    deathFx = null
    deathSequenceTimer = 0
    gameOverTime = 0
    levelAnnounce = null
    shakeX = 0
    shakeY = 0
    syncAimToPlayer()
  }

  function syncAimToPlayer(): void {
    input.pointer.x = player.position.x
    input.pointer.y = player.position.y + 1
  }

  resetGame()

  let animationId = 0
  let running = false
  let lastTimestamp = 0
  let fpsFrameCount = 0
  let fpsElapsed = 0
  let viewportWidth = 0
  let viewportHeight = 0

  function getBounds() {
    return { width: viewportWidth, height: viewportHeight }
  }

  function pickSpawnType(): EnemyType {
    const tankChance = Math.min(0.42, 0.26 + (currentLevel - 1) * 0.035)
    return Math.random() < tankChance ? 'TANK' : 'CHASER'
  }

  function spawnEnemyOutsideBounds(): void {
    const bounds = getBounds()
    const margin = 40
    const edge = Math.floor(Math.random() * 4)
    let x = 0
    let y = 0

    switch (edge) {
      case 0:
        x = Math.random() * bounds.width
        y = -margin
        break
      case 1:
        x = bounds.width + margin
        y = Math.random() * bounds.height
        break
      case 2:
        x = Math.random() * bounds.width
        y = bounds.height + margin
        break
      default:
        x = -margin
        y = Math.random() * bounds.height
        break
    }

    enemies.push(Enemy.create(pickSpawnType(), x, y))
  }

  function addScore(delta: number): void {
    if (delta <= 0) return
    score += delta

    const newLevel = getLevelForScore(score)
    if (newLevel <= currentLevel) return

    currentLevel = newLevel
    levelAnnounce = createLevelAnnounce(newLevel)
    debris.push(
      ...spawnDebrisBurst(
        player.position.x,
        player.position.y,
        '#67e8f9',
        18,
        { speedMin: 90, speedMax: 340, lifetime: 0.55 },
      ),
    )
  }

  function beginDeathSequence(): void {
    phase = 'deathSequence'
    deathSequenceTimer = 0
    gameOverTime = 0
    deathFx = createDeathFx()
    deathFx.ringRadius = player.radius
    debris.push(...spawnPlayerDeathBurst(player.position.x, player.position.y))
    projectiles.length = 0
    levelAnnounce = null
  }

  function tryRestart(): void {
    if (phase !== 'gameOver') return
    if (gameOverTime < GAME_OVER_INPUT_DELAY) return
    resetGame()
  }

  function updateHud(fps: number, frameMs: number): void {
    if (fpsEl) fpsEl.textContent = `${fps.toFixed(0)} FPS · ${frameMs.toFixed(1)} ms`
    if (scoreEl) scoreEl.textContent = `Score ${score}`
    if (levelEl) {
      const toNext = getPointsToNextLevel(score, currentLevel)
      levelEl.textContent =
        toNext > 0 ? `Lv ${currentLevel} · ${toNext} to next` : `Lv ${currentLevel} · MAX`
    }
    if (healthEl) {
      healthEl.textContent =
        phase === 'playing' && player.isAlive
          ? `HP ${Math.ceil(player.health)}`
          : 'DEAD'
    }
  }

  function resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    viewportWidth = window.innerWidth
    viewportHeight = window.innerHeight

    canvas.width = Math.floor(viewportWidth * dpr)
    canvas.height = Math.floor(viewportHeight * dpr)
    canvas.style.width = `${viewportWidth}px`
    canvas.style.height = `${viewportHeight}px`

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    input.setViewport(viewportWidth, viewportHeight)

    if (phase === 'playing') {
      player.constrainToBounds(getBounds())
    }
  }

  function drawJoystick(): void {
    const joystick = input.getJoystickState()
    if (!joystick.active) return

    ctx.save()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.55)'
    ctx.fillStyle = 'rgba(34, 211, 238, 0.08)'

    ctx.beginPath()
    ctx.arc(joystick.originX, joystick.originY, joystick.maxRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    const dx = joystick.currentX - joystick.originX
    const dy = joystick.currentY - joystick.originY
    const mag = Math.hypot(dx, dy)
    const clampedMag = Math.min(mag, joystick.maxRadius)
    const tx = mag === 0 ? joystick.originX : joystick.originX + (dx / mag) * clampedMag
    const ty = mag === 0 ? joystick.originY : joystick.originY + (dy / mag) * clampedMag

    ctx.fillStyle = 'rgba(103, 232, 249, 0.75)'
    ctx.shadowColor = '#22d3ee'
    ctx.shadowBlur = 18
    ctx.beginPath()
    ctx.arc(tx, ty, 22, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  function updatePlaying(dt: number): void {
    const bounds = getBounds()
    const frozen = isLevelAnnounceFrozen(levelAnnounce)

    if (levelAnnounce?.active) {
      updateLevelAnnounce(levelAnnounce, dt)
    }

    const spawned = player.update(dt, input, bounds)
    if (spawned.length > 0) projectiles.push(...spawned)
    if (player.shotsFiredThisFrame > 0) playShootSounds()

    if (!frozen) {
      gameTime += dt
      spawnTimer += dt
      const interval = getSpawnInterval(currentLevel, gameTime)
      while (spawnTimer >= interval) {
        spawnEnemyOutsideBounds()
        spawnTimer -= interval
      }

      updateEnemies(enemies, dt, player.position, false)
      updateProjectiles(projectiles, dt, bounds)
    } else {
      updateDebris(debris, dt)
    }

    const scoreMultiplier = getScoreMultiplier(currentLevel)
    const collision = resolveCollisions(
      projectiles,
      enemies,
      player,
      scoreMultiplier,
    )
    addScore(collision.scoreDelta)
    if (collision.newEnemies.length > 0) enemies.push(...collision.newEnemies)
    if (collision.newDebris.length > 0) debris.push(...collision.newDebris)
    playCollisionSounds(collision)

    if (collision.playerKilled) {
      beginDeathSequence()
    }

    compactEnemies(enemies)
    if (!frozen) {
      updateDebris(debris, dt)
    }
  }

  function updateDeathSequence(dt: number): void {
    deathSequenceTimer += dt
    if (deathFx) {
      updateDeathFx(deathFx, dt)
      deathFx.ringRadius = player.radius + deathSequenceTimer * 380
    }
    updateDebris(debris, dt)

    if (deathSequenceTimer >= DEATH_SEQUENCE_DURATION) {
      phase = 'gameOver'
      gameOverTime = 0
    }
  }

  function update(dt: number): void {
    if (phase === 'playing') {
      updatePlaying(dt)
      return
    }

    if (phase === 'deathSequence') {
      updateDeathSequence(dt)
      return
    }

    gameOverTime += dt
    updateDebris(debris, dt)
  }

  function render(): void {
    if (deathFx && deathFx.shake > 0) {
      shakeX = (Math.random() - 0.5) * deathFx.shake
      shakeY = (Math.random() - 0.5) * deathFx.shake
    } else if (levelAnnounce?.active && levelAnnounce.timer < 0.5) {
      shakeX = (Math.random() - 0.5) * 4
      shakeY = (Math.random() - 0.5) * 4
    } else {
      shakeX = 0
      shakeY = 0
    }

    ctx.save()
    ctx.translate(shakeX, shakeY)

    ctx.fillStyle = '#0d0d14'
    ctx.fillRect(-shakeX, -shakeY, viewportWidth, viewportHeight)

    drawProjectiles(ctx, projectiles)
    drawEnemies(ctx, enemies)
    drawDebris(ctx, debris)

    if (phase === 'playing' && player.isAlive) {
      player.draw(ctx)
    }

    ctx.restore()

    if (deathFx) {
      drawDeathFlash(
        ctx,
        viewportWidth,
        viewportHeight,
        deathFx,
        player.position.x,
        player.position.y,
      )
    }

    if (levelAnnounce?.active) {
      drawLevelAnnounce(ctx, viewportWidth, viewportHeight, levelAnnounce)
    }

    if (phase === 'gameOver') {
      drawGameOverScreen(
        ctx,
        viewportWidth,
        viewportHeight,
        score,
        gameOverTime,
        currentLevel,
        gameOverTime >= GAME_OVER_INPUT_DELAY,
        isTouchDevice,
      )
    }

    drawJoystick()
  }

  function tick(timestamp: number): void {
    if (!running) return

    animationId = requestAnimationFrame(tick)

    if (lastTimestamp === 0) {
      lastTimestamp = timestamp
      render()
      updateHud(0, 0)
      return
    }

    const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1)
    lastTimestamp = timestamp
    const frameMs = dt * 1000

    fpsFrameCount++
    fpsElapsed += dt
    if (fpsElapsed >= 0.5) {
      const fps = fpsFrameCount / fpsElapsed
      updateHud(fps, frameMs)
      fpsFrameCount = 0
      fpsElapsed = 0
    }

    update(dt)
    render()
  }

  function start(): void {
    if (running) return
    running = true
    lastTimestamp = 0
    animationId = requestAnimationFrame(tick)
  }

  function stop(): void {
    if (!running) return
    running = false
    cancelAnimationFrame(animationId)
  }

  input.onAnyInput = () => {
    unlockAudio()
    hideControlsHint()
  }

  canvas.addEventListener('pointerdown', () => {
    unlockAudio()
    hideControlsHint()
    if (phase === 'gameOver') tryRestart()
  })

  window.addEventListener('keydown', (event) => {
    unlockAudio()
    hideControlsHint()
    if (event.code === 'Space' || event.code === 'Enter') {
      if (phase === 'gameOver') {
        event.preventDefault()
        tryRestart()
      }
    }
  })

  resize()
  render()
  updateHud(0, 0)
  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop()
    } else {
      start()
    }
  })

  start()
}

try {
  boot()
} catch (error) {
  showBootError(error)
}
