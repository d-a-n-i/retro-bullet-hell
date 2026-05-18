import './style.css'

const canvas = document.querySelector<HTMLCanvasElement>('#game')!
const ctx = canvas.getContext('2d', { alpha: false })

if (!ctx) {
  throw new Error('Failed to acquire 2D rendering context')
}

const fpsEl = document.querySelector<HTMLDivElement>('#fps')!

let animationId = 0
let running = false
let lastTimestamp = 0
let fpsFrameCount = 0
let fpsElapsed = 0
let viewportWidth = 0
let viewportHeight = 0

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  viewportWidth = window.innerWidth
  viewportHeight = window.innerHeight

  canvas.width = Math.floor(viewportWidth * dpr)
  canvas.height = Math.floor(viewportHeight * dpr)
  canvas.style.width = `${viewportWidth}px`
  canvas.style.height = `${viewportHeight}px`

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function updateFpsDisplay(fps: number, frameMs: number): void {
  fpsEl.textContent = `${fps.toFixed(0)} FPS · ${frameMs.toFixed(1)} ms`
}

function update(_dt: number): void {
  // Game logic goes here
}

function render(): void {
  ctx.fillStyle = '#0d0d14'
  ctx.fillRect(0, 0, viewportWidth, viewportHeight)
}

function tick(timestamp: number): void {
  if (!running) return

  animationId = requestAnimationFrame(tick)

  if (lastTimestamp === 0) {
    lastTimestamp = timestamp
    return
  }

  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1)
  lastTimestamp = timestamp
  const frameMs = dt * 1000

  fpsFrameCount++
  fpsElapsed += dt
  if (fpsElapsed >= 0.5) {
    const fps = fpsFrameCount / fpsElapsed
    updateFpsDisplay(fps, frameMs)
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

resize()
window.addEventListener('resize', resize)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stop()
  } else {
    start()
  }
})

start()
