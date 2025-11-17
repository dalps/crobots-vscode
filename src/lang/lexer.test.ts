import { test, expect } from "vitest";
import { LEXER } from "./lexer";
import type { IToken } from "chevrotain";

function getTokenName(token: IToken) {
  return token.tokenType.name;
}

test("lex an expression", () => {
  const input = "(2 + 2); a--;";
  const { tokens, errors } = LEXER.tokenize(input);
  const names = tokens.map(getTokenName);
  expect(names).toEqual([
    "LPAREN",
    "CONST",
    "ADD",
    "CONST",
    "RPAREN",
    "SEMICOLON",
    "IDE",
    "DECR",
    "SEMICOLON",
  ]);
  expect(errors).toEqual([]);
});

test("lex comments", () => {
  const input = `
/* wabadabadaba
        is that true?
  
*/
// yes`;
  const { tokens, errors } = LEXER.tokenize(input);
  const names = tokens.map(getTokenName);
  expect(names).toEqual([]);
  expect(errors).toEqual([]);
});

test("lex DocString and its payload", () => {
  const input = `
/** wabadabadaba
        is that true?
  
*/
// yes`;
  const { tokens, errors } = LEXER.tokenize(input);
  const names = tokens.map(getTokenName);
  expect(names).toEqual(["DocString"]);
  expect(errors).toEqual([]);
  expect(tokens[0].image).toEqual(`/** wabadabadaba
        is that true?
  
*/`);
  expect(tokens[0].payload).toEqual(` wabadabadaba
        is that true?
  
`);
});
