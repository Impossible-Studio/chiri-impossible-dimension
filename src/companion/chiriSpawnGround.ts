/** Spawn-only validation. Never use the top of an overhead prop as the floor. */
export type GroundPoint = { x: number; y: number; z: number }

export function resolveChiriSpawnFloor(
  target: GroundPoint,
  sample: GroundPoint | undefined,
  sampleAge: number,
  limits: { maxAge: number; maxHorizontalError: number; maxStepUp: number; maxStepDown: number }
): number | undefined {
  if (!sample || !Number.isFinite(sample.y) || sampleAge > limits.maxAge) return undefined
  const dx = sample.x - target.x
  const dz = sample.z - target.z
  if (dx * dx + dz * dz > limits.maxHorizontalError ** 2) return undefined
  const step = sample.y - target.y
  if (step > limits.maxStepUp || step < -limits.maxStepDown) return undefined
  return sample.y
}

/** Wait for the avatar's initial fall/placement to settle before revealing Chiri. */
export class ChiriSpawnReadiness {
  private previousGroundY: number | undefined
  private stableSeconds = 0
  private elapsedSeconds = 0

  reset() {
    this.previousGroundY = undefined
    this.stableSeconds = 0
    this.elapsedSeconds = 0
  }

  update(dt: number, groundY: number, jumping: boolean, config: {
    minWaitSeconds: number; stableSeconds: number; maxVerticalSpeed: number
  }) {
    const elapsed = Math.max(0, Math.min(dt, 0.1))
    this.elapsedSeconds += elapsed
    const stable = this.previousGroundY !== undefined && !jumping &&
      Number.isFinite(groundY) && elapsed > 0 &&
      Math.abs(groundY - this.previousGroundY) / elapsed <= config.maxVerticalSpeed
    this.stableSeconds = stable ? this.stableSeconds + elapsed : 0
    this.previousGroundY = groundY
    return this.elapsedSeconds >= config.minWaitSeconds && this.stableSeconds >= config.stableSeconds
  }
}
