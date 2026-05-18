export interface LevelAnnounceState {
  active: boolean
  level: number
  timer: number
  readonly duration: number
  freezeTimer: number
}

const ANNOUNCE_DURATION = 2.4
const FREEZE_DURATION = 0.45

export function createLevelAnnounce(level: number): LevelAnnounceState {
  return {
    active: true,
    level,
    timer: 0,
    duration: ANNOUNCE_DURATION,
    freezeTimer: FREEZE_DURATION,
  }
}

export function updateLevelAnnounce(state: LevelAnnounceState, dt: number): void {
  if (!state.active) return
  state.timer += dt
  state.freezeTimer = Math.max(0, state.freezeTimer - dt)
  if (state.timer >= state.duration) {
    state.active = false
  }
}

export function isLevelAnnounceFrozen(state: LevelAnnounceState | null): boolean {
  return state !== null && state.active && state.freezeTimer > 0
}

export function drawLevelAnnounce(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: LevelAnnounceState,
): void {
  const t = state.timer / state.duration
  const enter = Math.min(1, state.timer / 0.28)
  const exit = t > 0.72 ? (1 - t) / 0.28 : 1
  const alpha = enter * exit
  if (alpha <= 0) return

  const cx = width / 2
  const cy = height / 2
  const pulse = 1 + Math.sin(state.timer * 14) * 0.04
  const scale = (0.55 + enter * 0.45) * pulse

  ctx.save()
  ctx.globalAlpha = alpha * 0.22
  ctx.fillStyle = '#22d3ee'
  ctx.fillRect(0, 0, width, height)
  ctx.globalAlpha = 1

  const ringT = state.timer * 2.2
  for (let i = 0; i < 3; i++) {
    const r = 40 + ringT * 120 + i * 36
    ctx.globalAlpha = alpha * (0.35 - i * 0.1)
    ctx.strokeStyle = i % 2 === 0 ? '#67e8f9' : '#c084fc'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(scale, scale)

  ctx.shadowColor = '#22d3ee'
  ctx.shadowBlur = 30
  ctx.fillStyle = '#a5f3fc'
  ctx.font = '600 18px system-ui, sans-serif'
  ctx.fillText('LEVEL UP', 0, -52)

  ctx.shadowBlur = 40
  ctx.fillStyle = '#67e8f9'
  ctx.font = `bold ${72}px ui-monospace, Consolas, monospace`
  ctx.fillText(String(state.level), 0, 8)

  ctx.shadowBlur = 12
  ctx.fillStyle = '#c084fc'
  ctx.font = '500 15px system-ui, sans-serif'
  const mult = Math.pow(1.32, state.level - 1)
  ctx.fillText(
    `${mult.toFixed(1)}× score · spawn surge`,
    0,
    56,
  )

  ctx.restore()
  ctx.restore()
}
