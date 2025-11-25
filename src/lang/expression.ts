import { Range } from "vscode";
import { ALIASES } from "./lexer";
import { EMPTY_RANGE, LocatedName } from "./loc_utils";

export type Identifier = string;
export type Parameter = Identifier;

export type BinaryExprRhs = { op: BinaryOperator; expr: Expression };

export type AssignmentExprLhs = {
  op?: BinaryOperator;
  name: LocatedName;
};

export interface ASTNode {
  location: Range;
  toString(level?: number): string;
}

export interface Expression extends ASTNode {}

export type BinaryOperator =
  | "ADD"
  | "MINUS"
  | "MUL"
  | "DIV"
  | "MOD"
  | "EQ"
  | "NEQ"
  | "GT"
  | "LT"
  | "GEQ"
  | "LEQ"
  | "LAND"
  | "LOR"
  | "LSHIFT"
  | "RSHIFT";

export type UnaryOperator = "MINUS" | "LNOT";

export class Nil implements Expression {
  location: Range;

  toString(): string {
    return "()";
  }
}

export class Const implements Expression {
  constructor(public value: number, public location: Range) {}

  toString(): string {
    return this.value.toString();
  }
}

export class IdentifierExpression extends LocatedName implements Expression {
  toString(): string {
    return this.word;
  }
}

export class UnaryExpression implements Expression {
  constructor(
    public op: UnaryOperator,
    public expr: Expression,
    public location: Range
  ) {}

  toString(): string {
    return `${ALIASES[this.op]}${this.expr}`;
  }
}

export class BinaryExpression implements Expression {
  constructor(
    public lhs: Expression,
    public rhs: BinaryExprRhs[],
    public location: Range
  ) {}

  toString(): string {
    return this.rhs.reduce(
      (acc, { op, expr }) => `${acc} ${ALIASES[op]} ${expr}`,
      `${this.lhs}`
    );
  }
}

export class AssignmentExpression implements Expression {
  constructor(
    public names: AssignmentExprLhs[],
    public expr: Expression,
    public location: Range
  ) {}

  toString(): string {
    return this.names.reduceRight(
      (acc, { op, name }) => `${name.word} ${op ? ALIASES[op] : "="} ${acc}`,
      `${this.expr}`
    );
  }
}

export class CallExpression implements Expression {
  constructor(
    public name: LocatedName,
    public args: Expression[],
    public location: Range
  ) {}

  toString(): string {
    return `${this.name.word}(${this.args.join(", ")})`;
  }
}

export const ENTRY_POINT: Expression = new CallExpression(
  new LocatedName("main"),
  [],
  EMPTY_RANGE
);
