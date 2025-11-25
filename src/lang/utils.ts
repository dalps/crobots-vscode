import { MarkdownString } from "vscode";
import { DEBUG } from "./main";

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

export const StackIsEmpty = new Error("The stack is empty.");

export class Stack<T> {
  protected stack: T[] = [];

  get top(): T {
    const top = this.stack.at(-1);
    if (!top) throw StackIsEmpty;
    return top;
  }

  push(env: T) {
    this.stack.push(env);
  }

  pop(): T | undefined {
    return this.stack.pop();
  }

  clear() {
    this.stack = [];
  }
}

export const LOG_LAYER =
  (lvl = 1): ((...args: string[]) => void) =>
  (...args) =>
    DEBUG && DEBUG === lvl && console.log(...args); // quiet when DEBUG is falsy

export const LOG = LOG_LAYER();
export const LOG2 = LOG_LAYER(2);
export const LOG3 = LOG_LAYER(3);

export const md = (text?: string) => new MarkdownString(text);
