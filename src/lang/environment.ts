import { Stack } from "../utils/Stack";
import type { Identifier, Parameter } from "./expression";
import type { Statement } from "./statements";

export enum EnvironmentValueKind {
  Location,
  FunctionData,
}

export interface FunctionEnvval {
  kind: EnvironmentValueKind.FunctionData;
  name: string;
  params: string[];
  body: Statement[];
  toString(): string;
}

export interface LocationEnvval {
  kind: EnvironmentValueKind.Location;
  loc: Location;
  toString(): string;
}

export type EnvironmentValue = FunctionEnvval | LocationEnvval;

export function FunctionData(
  name: Identifier,
  params: Parameter[],
  body: Statement[]
): FunctionEnvval {
  return {
    kind: EnvironmentValueKind.FunctionData,
    name,
    params,
    body,
    toString() {
      return `${this.name}(${this.params})`;
    },
  };
}

export function VariableData(loc: Location): LocationEnvval {
  return {
    kind: EnvironmentValueKind.Location,
    loc,
    toString() {
      return `${this.loc}`;
    },
  };
}

export type Environment = Map<Identifier, EnvironmentValue>;

export class EnvironmentStack extends Stack<Environment> {
  constructor() {
    super();
    this.push(new Map());
  }

  pushEmpty() {
    this.push(new Map());
  }

  query(name: Identifier) {
    return this.top?.get(name);
  }

  bind(name: Identifier, value: EnvironmentValue) {
    this.top?.set(name, value);
  }

  toString() {
    return this.stack
      .map((env, i) => {
        const s: string[] = [];
        env.forEach((val, name) =>
          s.push(val.params ? `${val}` : `${name}:${val}`)
        );
        return `${i} <${s.join(", ")}>`;
      })
      .join("\n");
  }
}
