import type { RobotAPI } from "./api";
import {
  EnvironmentStack,
  EnvironmentValueKind,
  FunctionData,
  VariableData,
  type FunctionEnvval,
  type LocationEnvval,
} from "./environment";
import type { Identifier, Parameter } from "./expression";
import { MemoryTable, type MemoryValue } from "./memory";
import type { Statement } from "./statements";

export const UndefinedVariable = (x: Identifier) =>
  new Error(`${x} is undefined.`);

export const NotAVariable = (x: Identifier) =>
  new Error(`${x} is not a variable.`);

export const NotAFunction = (x: Identifier) =>
  new Error(`${x} is not a function.`);

export class State {
  public api?: RobotAPI;

  static fresh() {
    return new State(new MemoryTable(), new EnvironmentStack());
  }

  constructor(
    private memory: MemoryTable,
    private envStack: EnvironmentStack
  ) {}

  save() {
    this.envStack.push(new Map(this.envStack.top));
  }

  restore() {
    this.envStack.pop();
  }

  readVar(name: Identifier): MemoryValue {
    const data = this.envStack.query(name);
    if (!data) throw UndefinedVariable(name);

    switch (data.kind) {
      case EnvironmentValueKind.Location:
        return this.memory.read(data.loc);
      case EnvironmentValueKind.FunctionData:
        throw NotAVariable(name);
    }
  }

  updateVar(name: Identifier, newValue: MemoryValue) {
    const data = this.envStack.query(name) as LocationEnvval;
    if (!data) throw UndefinedVariable(name);

    return this.memory.write(data.loc, newValue);
  }

  defineVar(name: Identifier, initValue = 0) {
    const loc = this.memory.freshLoc;
    this.envStack.bind(name, VariableData(loc));
    this.memory.write(loc, initValue);
  }

  defineFunc(name: Identifier, params: Parameter[], body: Statement[]) {
    this.envStack.bind(name, FunctionData(name, params, body));
  }

  readFunc(name: Identifier): FunctionEnvval {
    const data = this.envStack.query(name);
    if (!data) throw UndefinedVariable(name);

    switch (data.kind) {
      case EnvironmentValueKind.FunctionData:
        return data;
      case EnvironmentValueKind.Location:
        throw NotAFunction(name);
    }
  }

  toString() {
    return `
envstack
${this.envStack}

memory loc:value
${this.memory}
`;
  }
}

export const STATE = State.fresh(); // to be used only for tests
