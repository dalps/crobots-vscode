import * as vscode from "vscode";
import { Position, Range } from "vscode";
import type { RobotAPI } from "./api";
import {
  type ASTNode,
  type Expression,
  ENTRY_POINT,
  traceExpression,
} from "./expression";
import { State } from "./state";
import {
  type Statement,
  SequenceStatement,
  traceStatement,
} from "./statements";

/**
 * A program is a list of declarations, one of which is called main and
 * serves as the entry point of the robot.
 */

export class Program implements ASTNode {
  public trace: Expression[] = [];
  public toplevel: Statement;
  public initialState: State;
  public location: Range;

  constructor(public toplevelStatements: Statement[]) {
    this.toplevel = SequenceStatement.from(toplevelStatements);
    this.initialState = State.fresh();

    this.location = toplevelStatements.reduce(
      (acc, stmt) => acc.union(stmt.location),
      new Range(0, 0, 0, 0)
    );
  }

  readToplevel() {
    traceStatement(this.toplevel, this.initialState);
  }

  plugAPI(api: RobotAPI) {
    this.initialState.api = api;
  }

  step(): RunningProgram {
    return new RunningProgram(this.initialState);
  }

  go(gas = Infinity) {
    return (this.trace = traceExpression(ENTRY_POINT, this.initialState, gas));
  }

  toString() {
    return this.toplevel.toString(0);
  }
}

export class RunningProgram {
  public state: State;
  public previousExpr?: Expression;
  public runningExpr: Expression;

  constructor(initialState: State, startExpr = ENTRY_POINT) {
    this.state = initialState;
    this.runningExpr = startExpr;
  }

  step(): RunningProgram {
    this.previousExpr = this.runningExpr;
    this.runningExpr = this.runningExpr.step(this.state);
    return this;
  }
}
