import { type IToken } from "chevrotain";
import * as monaco from "monaco-editor";

export const DUMMY = new monaco.Range(0, 0, 0, 0);

export function mkRange(start: IToken, end?: IToken) {
  if (end) {
    const startPos = new monaco.Position(start.startLine!, start.startColumn!);
    const endPos = new monaco.Position(end.endLine!, end.endColumn!);
    return monaco.Range.fromPositions(startPos, endPos);
  }

  return new monaco.Range(
    start.startLine!,
    start.startColumn!,
    start.endLine!,
    start.endColumn! + 1
  );
}

export function mkStrictRange(start: IToken, end?: IToken) {
  if (end) {
    return new monaco.Range(
      start.startLine!,
      start.endColumn! + 1,
      end.endLine!,
      end.startColumn!
    );
  }

  return new monaco.Range(
    start.startLine!,
    start.endColumn!,
    start.endLine!,
    start.endColumn! + 1
  );
}

export interface LocatedName {
  name: string;
  location: monaco.IRange;
}

export class LocatedName implements LocatedName {
  static fromToken(tok: IToken) {
    const range = mkRange(tok);
    return new LocatedName(tok.image, range);
  }

  constructor(public name: string, public location: monaco.IRange) {}

  toString() {
    return `${this.name}${this.location}`;
  }
}
