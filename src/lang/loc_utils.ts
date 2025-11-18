import { type IToken } from "chevrotain";
import * as vscode from "vscode";
import { Position, Range } from "vscode";

export const DUMMY = new Range(0, 0, 0, 0);

export function mkRange(start: IToken, end?: IToken): Range {
  if (end) {
    const startPos = new Position(start.startLine!, start.startColumn!);
    const endPos = new Position(end.endLine!, end.endColumn!);
    return new Range(startPos, endPos);
  }

  return new Range(
    start.startLine!,
    start.startColumn!,
    start.endLine!,
    start.endColumn! + 1
  );
}

export function mkStrictRange(start: IToken, end?: IToken) {
  if (end) {
    return new Range(
      start.startLine!,
      start.endColumn! + 1,
      end.endLine!,
      end.startColumn!
    );
  }

  return new Range(
    start.startLine!,
    start.endColumn!,
    start.endLine!,
    start.endColumn! + 1
  );
}

export interface LocatedName {
  name: string;
  location: Range;
}

export class LocatedName implements LocatedName {
  static fromToken(tok: IToken) {
    const range = mkRange(tok);
    return new LocatedName(tok.image, range);
  }

  constructor(public name: string, public location: Range) {}

  toString() {
    return `${this.name}${this.location}`;
  }
}

export const strictContainsRange = (r1: Range, r2: Range) =>
  !r1.isEqual(r2) && r1.contains(r2);
