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

type TouchRole = 'move' | 'aim'

interface TrackedPointer {
  role: TouchRole
  originX: number
  originY: number
  currentX: number
  currentY: number
}

export interface JoystickRenderState {
  active: boolean
  originX: number
  originY: number
  currentX: number
  currentY: number
  maxRadius: number
}

const JOYSTICK_MAX_RADIUS = 60

export class Input {
  private readonly keysDown = new Set<string>()
  private mouseDown = false
  private readonly pointers = new Map<number, TrackedPointer>()
  /** Pointer id whose position drives `pointer` (for aim). */
  private activeAimPointer: number | null = null
  /** Pointer id of the joystick touch (for movement). */
  private activeMovePointer: number | null = null
  readonly pointer = new Vector2D()
  private readonly target: HTMLElement
  /** Reported by host to size the joystick zone correctly each frame. */
  private viewportWidth = 0
  private viewportHeight = 0
  /** Fired any time the user provides any input (used to dismiss UI hints). */
  onAnyInput: (() => void) | null = null

  constructor(target: HTMLElement) {
    this.target = target
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
    target.addEventListener('pointerdown', this.onPointerDown)
    target.addEventListener('pointermove', this.onPointerMove)
    target.addEventListener('pointerup', this.onPointerUp)
    target.addEventListener('pointercancel', this.onPointerUp)
    target.addEventListener('contextmenu', this.onContextMenu)
  }

  setViewport(width: number, height: number): void {
    this.viewportWidth = width
    this.viewportHeight = height
  }

  isDown(code: string): boolean {
    return this.keysDown.has(code)
  }

  isPointerDown(): boolean {
    return this.mouseDown || this.activeAimPointer !== null
  }

  /**
   * Cardinal input is combined as (-1 | 0 | 1) per axis, then normalized so
   * diagonals (e.g. W + D) stay unit length — otherwise speed would be ~√2× faster.
   * If a virtual joystick is active, that overrides keyboard input.
   */
  getMovementDirection(): Vector2D {
    if (this.activeMovePointer !== null) {
      const stick = this.pointers.get(this.activeMovePointer)
      if (stick) {
        const dx = stick.currentX - stick.originX
        const dy = stick.currentY - stick.originY
        const mag = Math.hypot(dx, dy)
        if (mag < 8) return new Vector2D(0, 0)
        const clamped = Math.min(mag, JOYSTICK_MAX_RADIUS) / JOYSTICK_MAX_RADIUS
        return new Vector2D((dx / mag) * clamped, (dy / mag) * clamped)
      }
    }

    const raw = new Vector2D()
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) raw.y -= 1
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) raw.y += 1
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) raw.x -= 1
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) raw.x += 1
    return raw.normalized()
  }

  getJoystickState(): JoystickRenderState {
    if (this.activeMovePointer === null) {
      return {
        active: false,
        originX: 0,
        originY: 0,
        currentX: 0,
        currentY: 0,
        maxRadius: JOYSTICK_MAX_RADIUS,
      }
    }

    const stick = this.pointers.get(this.activeMovePointer)!
    return {
      active: true,
      originX: stick.originX,
      originY: stick.originY,
      currentX: stick.currentX,
      currentY: stick.currentY,
      maxRadius: JOYSTICK_MAX_RADIUS,
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
    this.target.removeEventListener('pointerdown', this.onPointerDown)
    this.target.removeEventListener('pointermove', this.onPointerMove)
    this.target.removeEventListener('pointerup', this.onPointerUp)
    this.target.removeEventListener('pointercancel', this.onPointerUp)
    this.target.removeEventListener('contextmenu', this.onContextMenu)
    this.keysDown.clear()
    this.pointers.clear()
    this.mouseDown = false
    this.activeAimPointer = null
    this.activeMovePointer = null
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!MOVEMENT_KEYS.has(event.code)) {
      this.onAnyInput?.()
      return
    }
    event.preventDefault()
    this.keysDown.add(event.code)
    this.onAnyInput?.()
  }

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keysDown.delete(event.code)
  }

  private onBlur = (): void => {
    this.keysDown.clear()
    this.mouseDown = false
    this.pointers.clear()
    this.activeAimPointer = null
    this.activeMovePointer = null
  }

  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault()
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    event.preventDefault()
    this.target.setPointerCapture?.(event.pointerId)
    const { x, y } = this.getLocalPosition(event)

    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      const role: TouchRole = this.isInJoystickZone(x, y) ? 'move' : 'aim'
      this.pointers.set(event.pointerId, {
        role,
        originX: x,
        originY: y,
        currentX: x,
        currentY: y,
      })
      if (role === 'move') {
        this.activeMovePointer = event.pointerId
      } else {
        this.activeAimPointer = event.pointerId
        this.pointer.x = x
        this.pointer.y = y
      }
    } else {
      this.mouseDown = true
      this.pointer.x = x
      this.pointer.y = y
    }

    this.onAnyInput?.()
  }

  private onPointerMove = (event: PointerEvent): void => {
    const { x, y } = this.getLocalPosition(event)
    const tracked = this.pointers.get(event.pointerId)

    if (tracked) {
      tracked.currentX = x
      tracked.currentY = y
      if (tracked.role === 'aim') {
        this.pointer.x = x
        this.pointer.y = y
      }
      return
    }

    if (event.pointerType === 'mouse') {
      this.pointer.x = x
      this.pointer.y = y
    }
  }

  private onPointerUp = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse') {
      if (event.button === 0 || event.type === 'pointercancel') {
        this.mouseDown = false
      }
      return
    }

    const tracked = this.pointers.get(event.pointerId)
    this.pointers.delete(event.pointerId)
    if (!tracked) return

    if (tracked.role === 'move' && this.activeMovePointer === event.pointerId) {
      this.activeMovePointer = null
    }
    if (tracked.role === 'aim' && this.activeAimPointer === event.pointerId) {
      this.activeAimPointer = this.findNextAimPointer()
      if (this.activeAimPointer !== null) {
        const next = this.pointers.get(this.activeAimPointer)!
        this.pointer.x = next.currentX
        this.pointer.y = next.currentY
      }
    }
  }

  private findNextAimPointer(): number | null {
    let result: number | null = null
    for (const [id, tracked] of this.pointers) {
      if (tracked.role === 'aim') result = id
    }
    return result
  }

  private getLocalPosition(event: PointerEvent): { x: number; y: number } {
    const rect = this.target.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  /**
   * The joystick zone covers the bottom-left quadrant so the player's right
   * thumb can aim/shoot anywhere else. The cutoff scales with screen size so
   * it stays comfortable on both phones and tablets.
   */
  private isInJoystickZone(x: number, y: number): boolean {
    const w = this.viewportWidth || window.innerWidth
    const h = this.viewportHeight || window.innerHeight
    return x < w * 0.5 && y > h * 0.5
  }
}
