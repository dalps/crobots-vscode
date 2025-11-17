import { expect, test } from "vitest";
import { parseExpression, parseProgram, parseStatement } from "./ast_visitor";
import {
  AssignmentExpression,
  BinaryExpression,
  Const,
  NoRuleApplies,
  traceExpression,
} from "./expression";
import { STATE } from "./state";
import {
  BlockExecution,
  EmptyStatement,
  SequenceStatement,
  traceStatement,
} from "./statements";
import { normalizeDegrees } from "../utils/MathUtils";

test("step 2 + 2 is a value", () => {
  const input = "2 + 2";
  expect(parseExpression(input).step()).toEqual({ value: 4 });
});

test("two steps on 2 + 2 throws", () => {
  const input = "2 + 2";
  expect(() => parseExpression(input).step().step()).toThrowError(
    NoRuleApplies
  );
});

test("step on (2 + 2) * 2 yields a new expression", () => {
  const input = "(2 + 2) * 2";
  expect(parseExpression(input).step()).toBeInstanceOf(BinaryExpression);
});

test("step on a declaration", () => {
  const input = "int x = 0, y = 2 + 2;";
  expect(() =>
    parseStatement(input).step(STATE).step(STATE).step(STATE)
  ).toThrowError(NoRuleApplies);
});

test("step on an if statement", () => {
  const input = "if (0) { ++x; } else { return 0; }";
  expect(parseStatement(input).step(STATE).step(STATE).stmt).toBeInstanceOf(
    BlockExecution
  );
});

test("step on a while statement", () => {
  const input = "while (1) { ++x; }";
  const ast = parseStatement(input);
  expect(ast.step(STATE).step(STATE).step(STATE).stmt).toBeInstanceOf(
    SequenceStatement
  );
});

test("test sequencing of statements of a block", () => {
  const input = "{ ++x; 0; {}; return x; }";
  const ast = parseStatement(input);
  expect(ast.step(STATE).stmt.body).toBeInstanceOf(SequenceStatement);
});

test("test sequencing of statements of an empty block", () => {
  const input = "{}";
  const ast = parseStatement(input);
  expect(ast.step(STATE).stmt.body).toBeInstanceOf(EmptyStatement);
});

test("test function call", () => {
  STATE.defineFunc("foo", [], [parseStatement(`return 0;`)]);
  const input = "foo()";
  const ast = parseExpression(input);
  expect(ast.step(STATE)).toEqual({ value: 0 });
});

test("test variables in a sum are reduced one at a time", () => {
  STATE.defineVar("x", 42);
  STATE.defineVar("y", 3);
  const ast = parseExpression("x+y");
  expect(ast.eval(STATE)).toEqual(45);
  expect(ast.step(STATE).step(STATE).step(STATE)).toEqual({ value: 45 });
});

test("test function call with arguments", () => {
  STATE.defineFunc("foo", ["x", "y"], [parseStatement(`return x + y;`)]);
  const input = "foo(42, 3)";
  const ast = parseExpression(input);
  expect(ast.step(STATE).step(STATE).step(STATE).step(STATE)).toEqual({
    value: 45,
  });
});

test("evaluate a sequence of assignements", () => {
  const input = "o += q = p *= 2";
  let ast = parseExpression(input);

  STATE.defineVar("o", 22);
  STATE.defineVar("p", 3);
  STATE.defineVar("q");

  expect(STATE.readVar("p")).toEqual(3);
  expect(STATE.readVar("q")).toEqual(0);
  expect(STATE.readVar("o")).toEqual(22);

  expect((ast = ast.step(STATE))).toBeInstanceOf(AssignmentExpression);
  expect(STATE.readVar("p")).toEqual(6);
  expect(STATE.readVar("q")).toEqual(0);
  expect(STATE.readVar("o")).toEqual(22);

  expect((ast = ast.step(STATE))).toBeInstanceOf(AssignmentExpression);
  expect(STATE.readVar("q")).toEqual(6);
  expect(STATE.readVar("p")).toEqual(6);
  expect(STATE.readVar("o")).toEqual(22);

  expect((ast = ast.step(STATE))).toBeInstanceOf(Const);
  expect(STATE.readVar("p")).toEqual(6);
  expect(STATE.readVar("q")).toEqual(6);
  expect(STATE.readVar("o")).toEqual(28);
});

test("test preincrement", () => {
  STATE.defineVar("x", 42);
  const input = "++x";
  const ast = parseExpression(input);
  expect(ast.step(STATE)).toEqual({ value: 43 });
  expect(STATE.readVar("x")).toEqual(43);
});

test("test an assignment", () => {
  // there's something wrong with assignments
  STATE.defineVar("x");
  const input = "x = 2 + 2";
  let ast = parseExpression(input);

  expect(ast.step(STATE)).toBeInstanceOf(AssignmentExpression);
  expect(STATE.readVar("x")).to.not.eq(4);
  expect(ast.step(STATE).step(STATE)).toEqual({ value: 4 });
  expect(STATE.readVar("x")).toEqual(4);
});

test("test trace", () => {
  const input = "{ x = (88 + 2) / 2; 0; {}; return x; }";
  const ast = parseStatement(input);
  expect(traceStatement(ast, STATE).at(0)).toHaveProperty("value", 45);
});

test("test a while loop", () => {
  STATE.defineVar("d", 10);
  const input = "while (d > 0) { --d; }";
  const ast = parseStatement(input);
  const tr = traceStatement(ast, STATE);
  expect(tr.length).toBeLessThan(100);
  expect(STATE.readVar("d")).toEqual(0);
});

test("test negation", () => {
  STATE.defineVar("d", 10);
  const input = "-d";
  const ast = parseExpression(input);
  const tr = traceExpression(ast, STATE);
  expect(tr.at(0)).toEqual({ value: -10 });
  expect(STATE.readVar("d")).toEqual(10);
});

test("test normalizDegrees() implemented in robot code", () => {
  const input = `
normalize_degrees(deg) {
  while (deg < 0) deg += 360;

  return deg - (deg / 360) * 360;
}

main() { return normalize_degrees(-93); }
`;
  const ast = parseProgram(input);
  ast.readToplevel();
  expect(ast.go().at(0)).toEqual({ value: normalizeDegrees(-93) });
});
