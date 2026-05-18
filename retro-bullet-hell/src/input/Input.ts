import { Vector2D } from '../Vector2D'

const MOVEMENT_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
])

export class Input {
  private readonly keysDown = new Set<string>()
  private pointerDown = false
  readonly pointer = new Vector2D()
  private readonly target: HTMLElement

  constructor(target: HTMLElement) {
    this.target = target
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
    target.addEventListener('mousemove', this.onPointerMove)
    target.addEventListener('mousedown', this.onPointerDown)
    window.addEventListener('mouseup', this.onPointerUp)
  }

  isDown(code: string): boolean {
    return this.keysDown.has(code)
  }

  isPointerDown(): boolean {
    return this.pointerDown
  }

  /**
   * Cardinal input is combined as (-1 | 0 | 1) per axis, then normalized so
   * diagonals (e.g. W + D) stay unit length — otherwise speed would be ~√2× faster.
   */
  getMovementDirection(): Vector2D {
    const raw = new Vector2D()

    if (this.isDown('KeyW') || this.isDown('ArrowUp')) raw.y -= 1
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) raw.y += 1
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) raw.x -= 1
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) raw.x += 1

    return raw.normalized()
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
    this.target.removeEventListener('mousemove', this.onPointerMove)
    this.target.removeEventListener('mousedown', this.onPointerDown)
    window.removeEventListener('mouseup', this.onPointerUp)
    this.keysDown.clear()
    this.pointerDown = false
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!MOVEMENT_KEYS.has(event.code)) return
    event.preventDefault()
    this.keysDown.add(event.code)
  }

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keysDown.delete(event.code)
  }

  private onBlur = (): void => {
    this.keysDown.clear()
    this.pointerDown = false
  }

  private onPointerMove = (event: MouseEvent): void => {
    this.setPointerFromEvent(event)
  }

  private onPointerDown = (event: MouseEvent): void => {
    if (event.button !== 0) return
    this.pointerDown = true
    this.setPointerFromEvent(event)
  }

  private onPointerUp = (event: MouseEvent): void => {
    if (event.button !== 0) return
    this.pointerDown = false
  }

  private setPointerFromEvent(event: MouseEvent): void {
    const rect = this.target.getBoundingClientRect()
    this.pointer.x = event.clientX - rect.left
    this.pointer.y = event.clientY - rect.top
  }
}
