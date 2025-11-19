export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export function equals(a: number, b: number, epsilon = Number.EPSILON) {
  return Math.abs(a - b) < epsilon;
}

export function normalizeDegrees(deg: number) {
  return (deg + 360) % 360;
}
