export class Vector2D {
  x = 0
  y = 0

  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }

  clone(): Vector2D {
    return new Vector2D(this.x, this.y)
  }

  add(other: Vector2D): this {
    this.x += other.x
    this.y += other.y
    return this
  }

  scale(scalar: number): this {
    this.x *= scalar
    this.y *= scalar
    return this
  }

  magnitude(): number {
    return Math.hypot(this.x, this.y)
  }

  normalize(): this {
    const mag = this.magnitude()
    if (mag > 0) {
      this.x /= mag
      this.y /= mag
    }
    return this
  }

  /** Returns a unit vector, or (0, 0) if this vector has zero length. */
  normalized(): Vector2D {
    const mag = this.magnitude()
    if (mag === 0) return new Vector2D(0, 0)
    return new Vector2D(this.x / mag, this.y / mag)
  }
}
