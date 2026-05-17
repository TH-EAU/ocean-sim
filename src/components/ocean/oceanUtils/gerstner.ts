// Mirrors ocean.vert.chunk.glsl exactly — keep constants in sync
const WAVE_SPEED = 1.2;

export function sampleOceanY(
  x: number,
  z: number,
  direction: [number, number],
  disturbtion: number,
  time: number,
): number {
  const amplitude  = disturbtion * 1.5;
  const wavelength = Math.max(disturbtion * 50.0, 0.5);
  const k          = (2 * Math.PI) / wavelength;
  const omega      = WAVE_SPEED * Math.sqrt(9.81 * k);

  const len = Math.hypot(direction[0], direction[1]);
  const dx  = direction[0] / len;
  const dz  = direction[1] / len;

  const phi = k * (dx * x + dz * z) - omega * time;
  return amplitude * Math.sin(phi);
}
