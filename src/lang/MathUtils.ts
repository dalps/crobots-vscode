import * as LJS from "littlejsengine";
import { vec2OfPolar } from "../utils";
const { vec2, rgb, clamp } = LJS;

type vec2 = LJS.Vector2;

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export function equals(a: number, b: number, epsilon = Number.EPSILON) {
  return Math.abs(a - b) < epsilon;
}

export function normalizeDegrees(deg: number) {
  return (deg + 360) % 360;
}

export function pickRandom(options: any[]): any {
  return options[Math.floor(Math.random() * options.length)];
}

export function clamp2(min: vec2, max: vec2, p: vec2): vec2 {
  return vec2(clamp(min.x, max.x, p.x), clamp(min.y, max.y, p.y));
}

export function clamp2I(min: vec2, max: vec2, p: vec2): vec2 {
  p.x = clamp(min.x, max.x, p.x);
  p.y = clamp(min.y, max.y, p.y);
  return p;
}

export function lerp(min: number, max: number, t: number) {
  return min * (1 - t) + max * t;
}

export function distribute(
  min: number,
  max: number,
  subs: number,
  cb: (n: number, i: number) => void = () => {}
) {
  if (subs <= 1) return [lerp(min, max, 0.5)];

  const ps: number[] = [];
  for (let i = 0; i < subs; i++) {
    const n = lerp(min, max, i / (subs - 1));
    ps.push(n);
    cb(n, i);
  }
  return ps;
}

export function damp(
  current: number,
  target: number,
  lambda: number,
  dt: number
) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/**
 * Does `p` lie in the disk spanning the diameter `ab`?
 */
export function inDisk(a: vec2, b: vec2, p: vec2) {
  return a.subtract(p).dot(b.subtract(p)) <= 0;
}

/**
 * Does `p` lie on segment `ab`?
 */
export function onSegment(a: vec2, b: vec2, p: vec2) {
  return orient(a, b, p) === 0 && inDisk(a, b, p);
}

export function lerp2(min: vec2, max: vec2, t: number): vec2 {
  return vec2(lerp(min.x, max.x, t), lerp(min.y, max.y, t));
}

export function lerp2I(min: vec2, max: vec2, t: number): vec2 {
  min.x = lerp(min.x, max.x, t);
  min.y = lerp(min.y, max.y, t);
  return min;
}

export function damp2I(
  current: vec2,
  target: vec2,
  lambda: number,
  dt: number
): vec2 {
  current.x = damp(current.x, target.x, lambda, dt);
  current.y = damp(current.y, target.y, lambda, dt);
  return current;
}

/**
 * Compare the projections of `p` and `q` on the line of direction `v`
 */
export function cmpProj(v: vec2, p: vec2, q: vec2) {
  return v.dot(p) < v.dot(q);
}

/**
 * The distance between the vec2 `p` and the segment `ab`
 */
export function segPointDistance(a: vec2, b: vec2, p: vec2) {
  if (!a.equals(b)) {
    const v = b.subtract(a); // direction

    // Is `p` closest to its projection on `ab`?
    if (cmpProj(v, a, p) && cmpProj(v, p, b)) {
      return Math.abs(v.cross(p) - v.cross(a)) / v.length(); // distance to line: see Lecomte p. 57
    }
  }

  return Math.min(p.subtract(a).length(), p.subtract(b).length());
}

/**
 * Returns a positive number if `c` is to the left of the segment `[ab]`, negative if `c` is to the right of `[ab]`, zero if the three vec2s are collinear.
 */
export function orient(a: vec2, b: vec2, c: vec2) {
  return b.subtract(a).cross(c.subtract(a));
}

/**
 * Do segments `ab` and `cd` intersect?
 */
export function properInter(a: vec2, b: vec2, c: vec2, d: vec2) {
  let oa = orient(c, d, a);
  let ob = orient(c, d, b);
  let oc = orient(a, b, c);
  let od = orient(a, b, d);

  if (oa * ob < 0 && oc * od < 0) {
    return a
      .scale(ob)
      .subtract(b.scale(oa))
      .scale(1 / (ob - oa));
  }

  return undefined;
}

export function squareVertices(
  center: vec2,
  side: number,
  dir: number
): vec2[] {
  return [0, 0, 0, 0].map((_v, idx) => {
    let r = side * 0.5 * Math.SQRT2;
    let a = (dir + 45 + idx * 90) * DEG2RAD;
    return center.add(vec2OfPolar(a, r));
  });
}

export function rectAxes(rect: vec2[]) {
  return [
    [0, 1],
    [1, 2],
  ].map(([a, b]) => rect[a].subtract(rect[b]).normalize());
}

export interface SATResult {
  test: boolean;
  penetration: number;
  axis: vec2;
}

/**
 * Separating Axes Theorem
 */
export function sat(square1: vec2[], square2: vec2[]): SATResult {
  let axes = [...rectAxes(square1), ...rectAxes(square2)];

  let info = {
    test: true,
    penetration: Infinity,
    axis: vec2(0, 0),
  };

  axes.find((axis) => {
    let [projs1, projs2] = [square1, square2].map((vs) =>
      vs.map((v) => v.dot(axis))
    );

    let minA = Math.min(...projs1),
      maxA = Math.max(...projs1),
      minB = Math.min(...projs2),
      maxB = Math.max(...projs2);

    let pleft = maxA - minB,
      pright = maxB - minA;
    let pen = Math.min(pleft, pright);
    let direction = pleft < pright ? -1 : 1;

    if (pen < Math.abs(info.penetration)) {
      info.penetration = direction * pen;
      info.axis = axis;
    }

    info.test = minA <= maxB && minB <= maxA; // not disjoint, no separation on this axis

    return !info.test; // we're after a collision, so we don't want the objects to be disjoint
  });

  return info;
}
