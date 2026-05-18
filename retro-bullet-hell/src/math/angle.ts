/** Shortest-path interpolation between two angles (radians). */
export function lerpAngle(from: number, to: number, t: number): number {
  let diff = to - from
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return from + diff * t
}
