import { expect, test } from "vitest";
import { parseProgram } from "./ast_visitor";
import { CallExpression, ENTRY_POINT, traceExpression } from "./expression";
import { STATE } from "./state";

test("test a small program", () => {
  const input = `
foo(x) { return x + 42; }
main() { return foo(3) + 3; }
`;
  const prog = parseProgram(input);
  prog.readToplevel();
  expect(prog.go().at(0)).toEqual({ value: 48 });
});

test("test a program that doesn't loop", () => {
  const input = `
foo(x) { return x + 42; }
main() { int x = 3; while(foo(x) > 45) { --x; }return x; }
`;
  const prog = parseProgram(input);
  prog.readToplevel();
  expect(prog.go().at(0)).toEqual({ value: 3 });
});

test("test a program that branches", () => {
  const input = `
foo(x) { return x + 42; }
main() { int x = 3; if(foo(x) > 42) { --x; }return x; }
`;
  const prog = parseProgram(input);
  prog.readToplevel();
  expect(prog.go().at(0)).toEqual({ value: 2 });
});

test("test a program that loops", () => {
  const input = `
foo(x) { return x + 42; }
main() { int x = 3; while(foo(x) > 42) { --x; } return x; }
`;
  const prog = parseProgram(input);
  prog.readToplevel();
  expect(prog.go().at(0)).toEqual({ value: 0 });
});

test("trace distance", () => {
  const input = `
distance(x1, y1, x2, y2) {
  int x, y, d_squared;

  x = x1 - x2;
  y = y1 - y2;
  d_squared = ((x * x) + (y * y));

  return (d_squared);
}

main() {
  int p1x = 0;
  int p1y = 0;
  int p2x = 3;
  int p2y = 5;

  return distance(p1x, p1y, p2x, p2y);
}`;

  const ast = parseProgram(input);

  expect(() => ast.state.readFunc("distance")).toThrowError();
  expect(() => ast.state.readFunc("main")).toThrowError();

  ast.readToplevel();
  expect(ast.state.readFunc("distance")).toBeDefined();
  expect(ast.state.readFunc("main")).toBeDefined();

  // expect(
  //   ENTRY_POINT.step(ast.state)
  //     .step(ast.state)
  //     .step(ast.state)
  //     .step(ast.state)
  //     .step(ast.state)
  //     .step(ast.state)
  //     .step(ast.state)
  //     .step(ast.state) // call distance()
  // );

  expect(ast.go().at(0)).toEqual({ value: 34 });
});

test("references", () => {
  const input = `int x = 7;

foo(y) {
  return x + y;
}

main() {
  int x = 42;

  foo(x + 3);
}`;

  const ast = parseProgram(input);

  console.log(ast);
});
