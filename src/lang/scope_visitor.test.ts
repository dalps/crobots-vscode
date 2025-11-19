import { expect, test } from "vitest";
import { Range } from "vscode";
import { parseProgram } from "./ast_visitor";
import { LocatedName } from "./loc_utils";
import { defaultVisitor as scopeVisitor } from "./scope_visitor";
import type {
  FunctionDeclarationStatement,
  VariableDeclarationStatement,
} from "./statements";

test("test lexical scoping", () => {
  const input = `
int range;
int foo = range * 2;
int bar = foo * range;
int foo = 2;
int bar = foo * 2;`;
  const ast = parseProgram(input);
  scopeVisitor.program(ast);

  const rangeRef1Def = scopeVisitor.queryReferences(
    new LocatedName("range", new Range(3, 11, 3, 16))
  )?.def;
  const rangeRef2Def = scopeVisitor.queryReferences(
    new LocatedName("range", new Range(4, 17, 4, 22))
  )?.def;
  const fooRef1Def = scopeVisitor.queryReferences(
    new LocatedName("range", new Range(4, 11, 4, 13))
  )?.def;
  const fooRef2Def = scopeVisitor.queryReferences(
    new LocatedName("range", new Range(6, 11, 6, 23))
  )?.def;

  expect(rangeRef1Def).toEqual(new Range(2, 5, 2, 10));
  expect(rangeRef1Def).toEqual(rangeRef2Def);

  expect(fooRef2Def).to.not.equal(fooRef2Def);
  expect(fooRef1Def).toEqual(new Range(3, 5, 3, 8));
  expect(fooRef2Def).toEqual(new Range(5, 5, 5, 8));
});

test("test lexical scoping 2", () => {
  const input = `/* counter.r */
int range;
int foo = range * 2;
int bar = foo * range;

main()
{
  int angle, range;
  int res;
  int d;

  res = 1;
  d = damage();
  angle = rand(360);

  while(1) {
    while ((range = scan(angle,res)) > 0)
      drive(angle,50);

    int range = 2;
    while ((range = scan(angle,res)) > 0) {
      drive(angle,50);
    }
  }
}`;
  const ast = parseProgram(input);
  scopeVisitor.program(ast);

  const rangeRef1Def = scopeVisitor.queryReferences(
    new LocatedName("range", new Range(17, 13, 17, 18))
  )?.def;

  expect(rangeRef1Def).toEqual(
    (
      (ast.toplevelStatements[1] as FunctionDeclarationStatement)
        .body[0] as VariableDeclarationStatement
    ).declarations[1].name.location
  );
});
