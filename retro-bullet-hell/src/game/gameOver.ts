export type GamePhase = 'playing' | 'deathSequence' | 'gameOver'

export interface DeathFx {
  flash: number
  shake: number
  ringRadius: number
  ringAlpha: number
}

export function createDeathFx(): DeathFx {
  return { flash: 1.2, shake: 14, ringRadius: 0, ringAlpha: 1 }
}

export function updateDeathFx(fx: DeathFx, dt: number): void {
  fx.flash = Math.max(0, fx.flash - dt * 2.8)
  fx.shake = Math.max(0, fx.shake - dt * 22)
  fx.ringRadius += dt * 420
  fx.ringAlpha = Math.max(0, fx.ringAlpha - dt * 2.2)
}

export function drawDeathFlash(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fx: DeathFx,
  centerX: number,
  centerY: number,
): void {
  if (fx.flash <= 0 && fx.ringAlpha <= 0) return

  if (fx.flash > 0) {
    ctx.save()
    ctx.fillStyle = `rgba(167, 243, 252, ${Math.min(0.55, fx.flash * 0.4)})`
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
  }

  if (fx.ringAlpha > 0) {
    ctx.save()
    ctx.strokeStyle = `rgba(34, 211, 238, ${fx.ringAlpha * 0.7})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(centerX, centerY, fx.ringRadius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
}

export function drawGameOverScreen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  score: number,
  time: number,
  level = 1,
): void {
  const pulse = 0.7 + Math.sin(time * 4) * 0.3

  ctx.save()
  ctx.fillStyle = 'rgba(5, 5, 12, 0.72)'
  ctx.fillRect(0, 0, width, height)

  const cx = width / 2
  const cy = height / 2

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.shadowColor = '#22d3ee'
  ctx.shadowBlur = 24
  ctx.fillStyle = '#f87171'
  ctx.font = 'bold 42px system-ui, sans-serif'
  ctx.fillText('DESTROYED', cx, cy - 72)

  ctx.shadowBlur = 16
  ctx.fillStyle = '#67e8f9'
  ctx.font = 'bold 56px ui-monospace, Consolas, monospace'
  ctx.fillText(String(score), cx, cy)

  ctx.shadowBlur = 0
  ctx.fillStyle = '#9ca3af'
  ctx.font = '16px system-ui, sans-serif'
  ctx.fillText('FINAL SCORE', cx, cy - 36)

  ctx.fillStyle = '#c084fc'
  ctx.font = '15px system-ui, sans-serif'
  ctx.fillText(`Reached level ${level}`, cx, cy + 36)

  ctx.globalAlpha = pulse
  ctx.fillStyle = '#a5f3fc'
  ctx.font = '18px system-ui, sans-serif'
  ctx.fillText('Click or press Space to play again', cx, cy + 64)
  ctx.globalAlpha = 1

  ctx.restore()
}
