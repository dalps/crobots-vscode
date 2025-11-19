import * as vscode from "vscode";
import { Position, Range } from "vscode";
import type { LocatedName } from "./loc_utils";
import { NoRuleApplies, type ASTNode, type Expression } from "./expression";
import { State } from "./state";

export interface Statement extends ASTNode {
  step(st: State): StatementStepResult;
}

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

export interface StateResult extends Statement {
  kind: StatementStepResultKind.State;
}

export interface ReturnResult extends Statement {
  kind: StatementStepResultKind.Return;
  value?: number;
}

export interface StatementResult extends Statement {
  kind: StatementStepResultKind.Statement;
  stmt: Statement;
}

export type StatementStepResult = StateResult | ReturnResult | StatementResult;

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

function StateResult(): StateResult {
  return {
    kind: StatementStepResultKind.State,
    step(_st) {
      throw NoRuleApplies;
    },
  };
}

function ReturnResult(value?: number): ReturnResult {
  return {
    kind: StatementStepResultKind.Return,
    value,
    step(_st) {
      throw NoRuleApplies;
    },
  };
}

function StatementResult(stmt: Statement): StatementResult {
  return {
    kind: StatementStepResultKind.Statement,
    stmt,
    step(st) {
      return this.stmt.step(st);
    },
  };
}

export class EmptyStatement implements Statement {
  constructor(public location: Range) {}

  step(): StatementStepResult {
    return StateResult();
  }

  toString(): string {
    return ";";
  }
}

export class IfStatement implements Statement {
  constructor(
    public condition: Expression,
    public thenBranch: Statement,
    public elseBranch?: Statement,
    public location: Range
  ) {}

  step(st: State): StatementStepResult {
    if (this.condition.isValue) {
      const b = this.condition.eval(st);

      return b
        ? StatementResult(this.thenBranch)
        : this.elseBranch
        ? StatementResult(this.elseBranch)
        : StateResult();
    } else {
      return StatementResult(
        new IfStatement(
          this.condition.step(st),
          this.thenBranch,
          this.elseBranch
        )
      );
    }
  }

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

  step(_st: State): StatementStepResult {
    return StatementResult(
      new WhileExecution(this.condition, new SequenceStatement(this.body, this))
    );
  }

  toString(level = 0): string {
    return prettyPrintBody(level, `while (${this.condition})`, this.body);
  }
}

export class WhileExecution implements Statement {
  constructor(public condition: Expression, public body: Statement) {}

  step(st: State): StatementStepResult {
    if (this.condition.isValue) {
      if (this.condition.eval(st)) {
        return StatementResult(this.body);
      } else {
        return StateResult();
      }
    } else {
      return StatementResult(
        new WhileExecution(this.condition.step(st), this.body)
      );
    }
  }
}

export class ExpressionStatement implements Statement {
  constructor(public expr: Expression, public location: Range) {}

  step(st: State): StatementStepResult {
    return this.expr.isValue
      ? StateResult()
      : StatementResult(new ExpressionStatement(this.expr.step(st)));
  }

  toString(level = 0): string {
    return `${this.expr};`;
  }
}

export class BlockStatement implements Statement {
  constructor(public body: Statement[], public location: Range) {}

  step(st: State): StatementStepResult {
    st.save();
    return StatementResult(
      new BlockExecution(SequenceStatement.from(this.body))
    );
  }

  toString(level = 0, braces = false): string {
    const lines: string[] = [];

    braces && lines.push("{");
    lines.push(indent(1, ...this.body.map((stmt) => stmt.toString(level + 1))));
    braces && lines.push("}");

    return lines.join("\n");
  }
}

export class BlockExecution implements Statement {
  constructor(public body: Statement) {}

  step(st: State): StatementStepResult {
    const result = this.body.step(st);

    switch (result.kind) {
      case StatementStepResultKind.State:
      case StatementStepResultKind.Return: {
        st.restore();
        return result;
      }
      case StatementStepResultKind.Statement: {
        return StatementResult(new BlockExecution(result.stmt));
      }
    }
  }

  toString(level = 0): string {
    return indent(level, "<{", this.body.toString(level + 1), "}>");
  }
}

export class ReturnStatement implements Statement {
  constructor(public expr: Expression | undefined, public location: Range) {}

  step(st: State): StatementStepResult {
    if (this.expr) {
      return this.expr.isValue
        ? ReturnResult(this.expr.eval(st))
        : StatementResult(new ReturnStatement(this.expr.step(st)));
    } else {
      return ReturnResult();
    }
  }

  toString(level = 0): string {
    return `return ${this.expr};`;
  }
}

export class VariableDeclarationStatement implements Statement {
  constructor(public declarations: Declaration[], public location: Range) {}

  step(st: State): StatementStepResult {
    const needsStep = this.declarations.findIndex(
      ({ expr }) => expr && !expr.isValue
    );

    if (needsStep < 0) {
      // declare all

      this.declarations.forEach(({ name, expr }) => {
        const init = expr?.eval(st);
        st.defineVar(name.name, init);
      });

      return StateResult();
    } else {
      const d = this.declarations[needsStep];
      this.declarations.splice(needsStep, 1, {
        ...d,
        expr: d.expr?.step(st),
      });

      return StatementResult(
        new VariableDeclarationStatement(this.declarations)
      );
    }
  }

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

  step(st: State): StatementStepResult {
    st.defineFunc(
      this.name.name,
      this.params.map(({ name }) => name),
      this.body
    );
    return StateResult();
  }

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

  step(st: State): StatementStepResult {
    const left1 = this.left.step(st);

    switch (left1.kind) {
      case StatementStepResultKind.Statement:
        return StatementResult(new SequenceStatement(left1.stmt, this.right));
      case StatementStepResultKind.State:
        return StatementResult(this.right);
      case StatementStepResultKind.Return:
        return left1;
    }
  }

  static from(statements: Statement[]): Statement {
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

export function traceStatement(statement: Statement, st: State): Statement[] {
  try {
    const s1 = statement.step(st);
    const tr = traceStatement(s1, st);
    tr.push(statement);
    return tr;
  } catch (e: any) {
    if (e.name !== "NoRuleApplies") throw e;
    return [statement];
  }
}
