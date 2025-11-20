import { type IToken } from "chevrotain";
import * as vscode from "vscode";
import { Range, Position } from "vscode";

export function fromTokens(start: IToken, end?: IToken): Range {
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

export function fromTokensStrict(start: IToken, end?: IToken) {
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

export const strictContainsRange = (r1: Range, r2: Range) =>
  !r1.isEqual(r2) && r1.contains(r2);

export const showRange = ({ start, end }: Range) =>
  `[ ${showPosition(start)}, ${showPosition(end)} ]`;

export const showPosition = ({ line, character }: Position) =>
  `${line}:${character}`;

export const EMPTY_RANGE = new Range(0, 0, 0, 0);

export interface LocatedName {
  word: string;
  location: Range;
}

export class LocatedName implements LocatedName {
  static fromToken(tok: IToken) {
    const range = fromTokens(tok);
    return new LocatedName(tok.image, range);
  }

  constructor(public word: string, public location: Range) {}

  toString() {
    return `${this.word}${showRange(this.location)}`;
  }
}
