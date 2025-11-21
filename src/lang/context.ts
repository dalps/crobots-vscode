import { Range } from "vscode";
import { EMPTY_RANGE, showRange } from "./loc_utils";
import { LOG } from "./utils";

export enum ContextKind {
  Statement,
  Expression,
  Identifier,
}

export function stringOfContextKind(kind: ContextKind) {
  switch (kind) {
    case ContextKind.Statement:
      return "Statement";
    case ContextKind.Expression:
      return "Expression";
    case ContextKind.Identifier:
      return "Identifier";
  }
}

interface ContextData {
  kind: ContextKind;
  range?: Range;
  label?: string;
}

export interface ContextNode extends ContextData {
  parent?: ContextNode;
  children: ContextNode[];
}

/**
 * A tree of scopes. Each node contains a map of the names
 * that are visible within the scope's range.
 *
 * Invariant: the children ranges do not overlap and all
 * of them are strictly contained in the parent's range.
 */

export class Context implements ContextNode {
  public children: Context[] = [];

  constructor(
    public kind: ContextKind,
    public range: Range,
    public parent?: Context,
    public label?: string
  ) {}

  visitUp(visitor: (child: ContextData) => void) {
    visitor({ kind: this.kind, label: this.label, range: this.range });
    this.parent?.visitUp(visitor);
  }

  visitDown(visitor: (child: ContextData) => void) {
    visitor({ kind: this.kind, label: this.label, range: this.range });
    this.children.forEach((ch) => ch.visitDown(visitor));
  }

  appendChild(scope: Context): Context {
    scope.parent = this;

    // enlarge the parent's range
    this.range =
      (this.range && scope.range && this.range.union(scope.range)) ||
      this.range ||
      scope.range ||
      EMPTY_RANGE;
    this.children.push(scope);

    return this;
  }

  appendChildren(...children: Context[]): Context {
    children.forEach((ch) => this.appendChild(ch));
    return this;
  }

  /**
   * Get the smallest node that contains the given range.
   */
  queryRange(range: Range): Context | undefined {
    LOG(`querying ` + this.label);

    if (!this.range?.contains(range)) return;

    return this.children.reduce(
      (result, ch) => ch.queryRange(range) || result,
      this
    );
  }

  toString(level = 0): string {
    return `${"|   ".repeat(level)}${this.label}${showRange(
      this.range
    )} { ${stringOfContextKind(this.kind)} }
${this.children.map((ch) => ch.toString(level + 1)).join("")}`;
  }
}
