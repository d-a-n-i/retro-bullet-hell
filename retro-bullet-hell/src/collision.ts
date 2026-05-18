/** Circle overlap test using squared distances (avoids sqrt). */
export function circlesOverlapSq(
  ax: number,
  ay: number,
  radiusA: number,
  bx: number,
  by: number,
  radiusB: number,
): boolean {
  const dx = ax - bx
  const dy = ay - by
  const combined = radiusA + radiusB
  return dx * dx + dy * dy <= combined * combined
}
