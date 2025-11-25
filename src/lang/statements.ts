import { Range } from "vscode";
import { type ASTNode, type Expression } from "./expression";
import type { LocatedName } from "./loc_utils";
import { Maybe } from "./utils";

export interface Statement extends ASTNode {}

export function tabs(level = 1) {
  return "  ".repeat(level);
}

export function indent(level: number, ...lines: string[]) {
  return lines
    .flatMap((l) => l.split("\n"))
    .map((l) => `${tabs(level)}${l}`)
    .join("\n");
}

export enum StatementStepResultKind {
  State,
  Return,
  Statement,
}

export interface Declaration {
  name: LocatedName;
  expr?: Expression;
}

function isToplevelStatement(s: Statement) {
  return (
    s instanceof VariableDeclarationStatement ||
    s instanceof FunctionDeclarationStatement
  );
}

function insertNewline(s1: Statement, s2: Statement) {
  const tl1 = isToplevelStatement(s1);
  const tl2 = isToplevelStatement(s2);
  return !(tl1 && tl2);
}

function insertNewlineInToplevel(s1: Statement, s2: Statement) {
  const v1 = s1 instanceof VariableDeclarationStatement;
  const v2 = s2 instanceof VariableDeclarationStatement;
  return !(v1 && v2);
}

function prettyPrintBody(level: number, prefix: string, body: Statement) {
  if (body instanceof BlockStatement) {
    return [`${prefix} {`, body.toString(level, false), `}`].join("\n");
  }

  return [prefix, indent(1, body.toString(level))].join("\n");
}

export class EmptyStatement implements Statement {
  constructor(public location: Range) {}

  toString(): string {
    return ";";
  }
}

export class IfStatement implements Statement {
  constructor(
    public condition: Expression,
    public thenBranch: Statement,
    public elseBranch: Maybe<Statement>,
    public location: Range
  ) {}

  toString(level = 0): string {
    const lines = [
      prettyPrintBody(level, `if (${this.condition})`, this.thenBranch),
    ];

    if (this.elseBranch)
      lines.push(prettyPrintBody(level, `else`, this.elseBranch));

    return lines.join("\n");
  }
}

export class WhileStatement implements Statement {
  constructor(
    public condition: Expression,
    public body: Statement,
    public location: Range
  ) {}

  toString(level = 0): string {
    return prettyPrintBody(level, `while (${this.condition})`, this.body);
  }
}

export class ExpressionStatement implements Statement {
  constructor(public expr: Expression, public location: Range) {}

  toString(level = 0): string {
    return `${this.expr};`;
  }
}

export class BlockStatement implements Statement {
  constructor(public body: Statement[], public location: Range) {}

  toString(level = 0, braces = false): string {
    const lines: string[] = [];

    braces && lines.push("{");
    lines.push(indent(1, ...this.body.map((stmt) => stmt.toString(level + 1))));
    braces && lines.push("}");

    return lines.join("\n");
  }
}

export class ReturnStatement implements Statement {
  constructor(public expr: Expression | undefined, public location: Range) {}

  toString(level = 0): string {
    return `return ${this.expr};`;
  }
}

export class VariableDeclarationStatement implements Statement {
  constructor(public declarations: Declaration[], public location: Range) {}

  toString(level = 0): string {
    return `int ${this.declarations
      .map(({ name, expr }) => `${name}${expr ? ` = ${expr}` : ``}`)
      .join(", ")};`;
  }
}

export class FunctionDeclarationStatement implements Statement {
  constructor(
    public name: LocatedName,
    public params: LocatedName[],
    public body: Statement[],
    public location: Range,
    public doc?: string
  ) {}

  toString(level = 0): string {
    return [
      `${this.name}(${this.params.join(", ")}) {`,
      indent(1, ...this.body.map((stmt) => stmt.toString(level + 1))),
      `}`,
    ].join(`\n`);
  }
}

export class SequenceStatement implements Statement {
  constructor(
    public left: Statement,
    public right: Statement,
    public location: Range
  ) {}

  static from(...statements: Statement[]): Statement {
    if (statements.length === 1) return statements[0];

    return statements
      .slice(0, -1)
      .reduceRight(
        (acc, s) => new SequenceStatement(s, acc),
        statements.at(-1) ?? new EmptyStatement()
      );
  }

  toString(level = 0): string {
    const lines = [this.left.toString(level)];

    if (insertNewlineInToplevel(this.left, this.right.left)) lines.push("\n");
    lines.push(this.right.toString(level));

    return indent(level, ...lines);
  }
}

/**
 * A Program is a list of declarations, one of which is called main and
 * serves as the entry point of the robot.
 */
export class Program implements ASTNode {
  public toplevel: Statement;

  constructor(public toplevelStatements: Statement[], public location: Range) {
    this.toplevel = SequenceStatement.from(...toplevelStatements);

    this.location = toplevelStatements.reduce(
      (acc, stmt) => acc.union(stmt.location),
      new Range(0, 0, 0, 0)
    );
  }

  toString() {
    return this.toplevel.toString(0);
  }
}
