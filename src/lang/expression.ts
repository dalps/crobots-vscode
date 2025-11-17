import { fsplice } from "../utils";
import { MATH_API } from "./api";
import { LocatedName } from "./loc_utils";
import { ALIASES } from "./lexer";
import type { BinaryOperator, UnaryOperator } from "./operators";
import { BINARY_OPS, UNARY_OPS } from "./operators";
import { State } from "./state";
import {
  FunctionDeclarationStatement,
  SequenceStatement,
  StatementStepResultKind,
  VariableDeclarationStatement,
  type Statement,
} from "./statements";
import * as monaco from "monaco-editor";

export const NoRuleApplies = new Error(
  "This object cannot be reduced any further."
);
NoRuleApplies.name = "NoRuleApplies";

export const ArgumentMismatch = (f: string, expected: number, actual: number) =>
  new Error(
    `Arguments to function ${f} do not match its prototype.
${f} expects exactly ${expected} arguments, but ${actual} were passed.`
  );

export type Identifier = string;
export type Parameter = Identifier;

export class Reference {
  public ref:
    | WeakRef<VariableDeclarationStatement | FunctionDeclarationStatement>
    | undefined;

  constructor(
    public name: string,
    obj?: VariableDeclarationStatement | FunctionDeclarationStatement
  ) {
    this.ref = obj ? new WeakRef(obj) : undefined;
  }

  get obj() {
    return this.ref?.deref();
  }

  get broken() {
    return this.ref === undefined;
  }
}

export type BinaryExprRhs = { op: BinaryOperator; expr: Expression };

export type AssignmentExprLhs = {
  op?: BinaryOperator;
  name: LocatedName;
};

export interface Value {
  value: number | null;
}

export interface ASTNode {
  location: monaco.IRange;
  toString(level?: number): string;
}

export interface Expression extends ASTNode {
  // abstract stuck: boolean;
  get isValue(): boolean;
  eval(st?: State): number;
  step(st?: State): Expression;
}

const TODO = new Error("TODO");

export class Nil implements Expression, Value {
  value = null;

  get isValue(): boolean {
    return true;
  }

  eval() {
    return this.value;
  }

  step(): Expression {
    throw NoRuleApplies;
  }

  toString(): string {
    return "()";
  }
}

export class Const implements Expression, Value {
  constructor(public value: number, public location: monaco.IRange) {}

  get isValue(): boolean {
    return true;
  }

  eval(): number {
    return this.value;
  }

  step(): Expression {
    throw NoRuleApplies;
  }

  toString(): string {
    return this.value.toString();
  }
}

export class IdentifierExpression extends LocatedName implements Expression {
  get isValue(): boolean {
    return false;
  }

  eval(st: State): number {
    return st.readVar(this.name);
  }

  step(st: State): Expression {
    return new Const(this.eval(st));
  }

  toString(): string {
    return this.name;
  }
}

export class UnaryExpression implements Expression {
  constructor(
    public op: UnaryOperator,
    public expr: Expression,
    public location: monaco.IRange
  ) {}

  get isValue(): boolean {
    return false;
  }

  eval(st: State): number {
    return UNARY_OPS[this.op](this.expr.eval(st));
  }

  step(st: State): Expression {
    if (this.expr.isValue) {
      return new Const(UNARY_OPS[this.op](this.expr.eval(st)));
    } else {
      return new UnaryExpression(this.op, this.expr.step(st));
    }
  }

  toString(): string {
    return `${ALIASES[this.op]}${this.expr}`;
  }
}

export class BinaryExpression implements Expression {
  constructor(
    public lhs: Expression,
    public rhs: BinaryExprRhs[],
    public location: monaco.IRange
  ) {}

  get isValue(): boolean {
    return false;
  }

  eval(st: State): number {
    const lv = this.lhs.eval(st);

    return this.rhs.reduce(
      (acc, { op, expr }) => BINARY_OPS[op](acc, expr.eval(st)),
      lv
    );
  }

  step(st: State): Expression {
    const rhs0 = this.rhs.at(0)!;

    if (this.lhs.isValue && rhs0.expr.isValue) {
      const f = BINARY_OPS[rhs0.op];

      return new Const(f(this.lhs.eval(st), rhs0.expr.eval(st)));
    } else if (this.lhs.isValue) {
      const newRhs = fsplice(this.rhs, 0, 1, {
        ...rhs0,
        expr: rhs0.expr.step(st),
      });

      return new BinaryExpression(this.lhs, newRhs);
    } else {
      return new BinaryExpression(this.lhs.step(st), this.rhs);
    }
  }

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
    public location: monaco.IRange
  ) {}

  get isValue(): boolean {
    return false;
  }

  eval(st: State): number {
    return this.names.reduceRight((acc, { name, op }) => {
      let newValue: number;

      if (op) {
        // operator assignment
        const prevValue = st.readVar(name.name);
        newValue = BINARY_OPS[op](prevValue, acc);
      } else {
        // normal assignment
        newValue = acc;
      }

      st.updateVar(name.name, newValue);
      return newValue;
    }, this.expr.eval(st));
  }

  step(st: State): Expression {
    if (this.expr.isValue) {
      const rhs = this.expr.eval(st);
      const newNames = this.names.slice();

      const { name, op } = newNames.pop()!;
      let newValue: number;

      if (op) {
        // operator assignment
        const prevValue = st.readVar(name.name);
        newValue = BINARY_OPS[op](prevValue, rhs);
      } else {
        // normal assignment
        newValue = rhs;
      }

      const newRhs = new Const(newValue);

      st.updateVar(name.name, newValue);

      if (newNames.length > 0) {
        return new AssignmentExpression(newNames, newRhs);
      } else {
        return newRhs;
      }
    } else {
      return new AssignmentExpression(this.names, this.expr.step(st));
    }
  }

  toString(): string {
    return this.names.reduceRight(
      (acc, { op, name }) => `${name} ${op ? ALIASES[op] : "="} ${acc}`,
      `${this.expr}`
    );
  }
}

export class CallExpression implements Expression {
  constructor(
    public name: LocatedName,
    public args: Expression[],
    public location: monaco.IRange
  ) {}

  get isValue(): boolean {
    return false;
  }

  eval(_st: State): number {
    throw TODO;
  }

  step(st: State): Expression {
    const needsStep = this.args.findIndex((e) => !e.isValue);

    if (needsStep < 0) {
      // all arguments are values

      const cb = (st.api && st.api[this.name.name]) || MATH_API[this.name.name];

      if (cb) {
        // this is an api call
        if (this.args.length !== cb.length)
          throw ArgumentMismatch(this.name.name, cb.length, this.args.length);

        const res = cb(...this.args.map((e) => e.eval(st)));
        return res ? new Const(res) : new Nil();
      }

      // this is a user-defined function call
      const { params, body } = st.readFunc(this.name.name);

      if (this.args.length !== params.length)
        throw ArgumentMismatch(this.name.name, params.length, this.args.length);

      st.save();
      params.forEach((name, i) => st.defineVar(name, this.args[i].eval(st)));

      return new CallExecution(SequenceStatement.from(body)).step(st);
    } else {
      const e = this.args[needsStep];
      const newArgs = fsplice(this.args, needsStep, 1, e.step(st));

      return new CallExpression(this.name, newArgs, this.location);
    }
  }

  toString(): string {
    return `${this.name.name}(${this.args
      .map((arg) => arg.toString())
      .join(", ")})`;
  }
}

export class CallExecution implements Expression {
  constructor(public body: Statement) {}

  get isValue(): boolean {
    return false;
  }

  eval(_st: State): number {
    throw TODO;
  }

  step(st: State): Expression {
    const body1 = this.body.step(st);

    switch (body1.kind) {
      case StatementStepResultKind.State:
        st.restore();
        return new Nil();

      case StatementStepResultKind.Return:
        st.restore();

        return body1.value !== undefined ? new Const(body1.value) : new Nil();

      case StatementStepResultKind.Statement:
        return new CallExecution(body1.stmt);
    }
  }

  toString(): string {
    return `<{ ${this.body} }>`;
  }
}

export function traceExpression(
  expr: Expression,
  st: State,
  gas?: number
): Expression[] {
  try {
    if (gas === 0) throw NoRuleApplies;

    const expr1 = expr.step(st);
    const tr = traceExpression(expr1, st, gas ? gas - 1 : undefined);
    tr.push(expr);
    return tr;
  } catch (error: any) {
    if (error.name !== "NoRuleApplies") throw expr;

    return [expr];
  }
}

export const ENTRY_POINT: Expression = new CallExpression(
  new Reference("main"),
  []
);
