import { MarkdownString } from "vscode";
import { DEBUG } from "./main";

export type Maybe<T> = T | undefined;

export const TODO = new Error("TODO");

export function zip<A, B>(as: A[], bs: B[]): [A, B][] {
  let result: [A, B][] = [];

  const swap = as.length < bs.length;
  let [xs, ys] = swap ? [as, bs] : [bs, as];

  xs.forEach((x, idx) => {
    let y = ys.at(idx)!;
    result.push((swap ? [x, y] : [y, x]) as [A, B]);
  });

  return result;
}

/**
 * `Array.prototype.splice` but functional
 */
export function fsplice<T>(
  arr: T[],
  start: number,
  deleteCount: number,
  ...items: T[]
) {
  const newArr = arr.slice();
  newArr.splice(start, deleteCount, ...items);
  return newArr;
}

export const LOG_LAYER =
  (lvl = 1): ((...args: string[]) => void) =>
  (...args) =>
    DEBUG && DEBUG === lvl && console.log(...args); // quiet when DEBUG is falsy

export const LOG = LOG_LAYER();
export const LOG2 = LOG_LAYER(2);
export const LOG3 = LOG_LAYER(3);

export const md = (text?: string) => new MarkdownString(text);

export const toRgb = ({ r = 0, g = 0, b = 0, a = 1 }) => {
  return `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`;
};

export const toHsl = ({ h = 0, s = 0, l = 0, a = 1 }) => {
  return `hsl(${Math.round(h * 360)}deg ${Math.round(s * 100)}% ${Math.round(
    l * 100
  )}% / ${a.toFixed(2)})`;
};

export const hsla = ({ h = 0, s = 1, l = 0.5, a = 1 }) => new Color(h, s, l, a);

export class Color {
  constructor(public h = 0, public s = 1, public l = 0.5, public a = 1) {}

  with({ h = this.h, s = this.s, l = this.l, a = this.a }) {
    return new Color(h, s, l, a);
  }

  toString() {
    return toHsl(this);
  }
}
