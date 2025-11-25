import { type IToken } from "chevrotain";
import { Position, Range } from "vscode";

export function fromTokens(start: IToken, end?: IToken): Range {
  const startPos = new Position(start.startLine! - 1, start.startColumn! - 1);
  const endPos = end
    ? new Position(end.endLine! - 1, end.endColumn!) // end inclusive
    : new Position(start.endLine! - 1, start.endColumn!);

  return new Range(startPos, endPos);
}

export function fromTokensStrict(start: IToken, end?: IToken) {
  const startCol = end ? start.endColumn! : start.endColumn! - 1;
  const startPos = new Position(start.startLine! - 1, startCol);

  const endPos = end
    ? new Position(end.endLine! - 1, end.startColumn! - 1)
    : new Position(start.endLine! - 1, start.endColumn!);

  return new Range(startPos, endPos);
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
