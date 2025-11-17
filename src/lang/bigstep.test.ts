import { expect, test } from "vitest";
import { parseExpression } from "./embedded_parser";
import { STATE } from "./state";

test("evaluate 2 + 2", () => {
  const input = "2 + 2";
  expect(parseExpression(input).eval()).toEqual(4);
});

test("evaluate (2 + 2) * 2", () => {
  const input = "(2 + 2) * 2";
  expect(parseExpression(input).eval()).toEqual(8);
});

test("evaluate (8 % 10) / (-2 - -2)", () => {
  const input = "(8 % 10) / (-2 + -2)";
  expect(parseExpression(input).eval()).toEqual(-2);
});

test("integer division works", () => {
  let input = "361 / 360";
  expect(parseExpression(input).eval()).toEqual(1);

  input = "-359 / 360";
  // expect(parseExpression(input).eval()).toEqual(0); // nope
  expect(parseExpression(input).eval() === 0).toBeTruthy();

  input = "359 / 360";
  expect(parseExpression(input).eval() === 0).toBeTruthy();

  input = "-361 / 360";
  expect(parseExpression(input).eval()).toEqual(-1);
});

test("evaluate an assignment", () => {
  // there's something wrong with assignments
  STATE.defineVar("x");
  const input = "x = 2 + 2";
  let ast = parseExpression(input);
  expect(ast.eval(STATE)).to.equal(4);
  expect(STATE.readVar("x")).toEqual(4);
});

test("evaluate a sequence of assignements", () => {
  STATE.defineVar("o", 22);
  STATE.defineVar("p", 3);
  STATE.defineVar("q");
  const input = "o += q = p *= 2";
  expect(parseExpression(input).eval(STATE)).toEqual(28);
  expect(STATE.readVar("o")).toEqual(28);
  expect(STATE.readVar("p")).toEqual(6);
  expect(STATE.readVar("q")).toEqual(6);
});
