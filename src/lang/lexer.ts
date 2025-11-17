import {
  createToken,
  Lexer,
  type IMultiModeLexerDefinition,
  type ITokenConfig,
  type TokenType,
} from "chevrotain";
import { IDE_REGEX } from "./crobots.contribution";

// prettier-ignore
export type TokenAlias = "(" | ")" | "{" | "}" | ";" | "*" | "/" | "%" | "+" | "-" | "=" | "+=" | "-=" | "*=" | "/=" | "%=" | "," | "!" | "&&" | "||" | "<<" | ">>" | "<" | ">" | "<=" | ">=" | "==" | "!=" | "++" | "--" | "int" | "return" | "if" | "else" | "while" | "do" | "x" | "42";

export const Identifier = createToken({
  name: "IDE",
  pattern: IDE_REGEX,
});

export const IntConst = createToken({
  name: "CONST",
  pattern: /[0-9]+/,
});

export const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

export const LineComment = createToken({
  name: "LineComment",
  pattern: /\/\/[^\n]*/,
  group: Lexer.SKIPPED,
});

export const AnyCharacter = createToken({
  name: "Anything",
  pattern: /./,
  group: Lexer.SKIPPED,
});

export const EnterMultilineComment = createToken({
  name: "EnterMultilineComment",
  pattern: "/*",
  group: Lexer.SKIPPED,
  push_mode: "comment_mode",
});

export const ExitMultilineComment = createToken({
  name: "ExitMultilineComment",
  pattern: "*/",
  group: Lexer.SKIPPED,
  pop_mode: true,
});

// https://chevrotain.io/docs/guide/custom_token_patterns.html#custom-payloads
// https://regex101.com/r/GM9cXP/2
const docStringPattern = /\/\*\*((?:.|\n|\r|\r\n)*?)\*\//y; // important: not greedy

const matchDocString: chevrotain.CustomPatternMatcherFunc = (
  text: string,
  startOffset: number
) => {
  docStringPattern.lastIndex = startOffset;

  const execResult = docStringPattern.exec(text);

  if (execResult) {
    const content = execResult[1];
    execResult.payload = content;
  }

  return execResult;
};

// https://vscode.dev/github/microsoft/monaco-editor/blob/main/src/language/typescript/lib/typescriptServices.js#L23399
export const DocString = createToken({
  name: "DocString",
  pattern: matchDocString,
  line_breaks: true,
  start_chars_hint: ["/**"],
});

export const CATEGORIES = {
  AdditionOperator: createToken({
    name: "AdditionOperator",
    pattern: Lexer.NA,
  }),
  MultiplicationOperator: createToken({
    name: "MultiplicationOperator",
    pattern: Lexer.NA,
  }),
  AssignmentOperator: createToken({
    name: "AssignmentOperator",
    pattern: Lexer.NA,
  }),
  IncrementOperator: createToken({
    name: "IncrementOperator",
    pattern: Lexer.NA,
  }),
  EqualityOperator: createToken({
    name: "EqualityOperator",
    pattern: Lexer.NA,
  }),
  ComparisonOperator: createToken({
    name: "ComparisonOperator",
    pattern: Lexer.NA,
  }),
  ShiftOperator: createToken({
    name: "ShiftOperator",
    pattern: Lexer.NA,
  }),
  UnaryOperator: createToken({
    name: "UnaryOperator",
    pattern: Lexer.NA,
  }),
  Keyword: createToken({
    name: "Keyword",
    pattern: Lexer.NA,
  }),
};

const C = CATEGORIES;
export const ALIASES: Record<string, TokenAlias> = {};

// Symbols & operators
export const SYMBOLS: {
  [index: string]: Partial<ITokenConfig> & {
    alias: TokenAlias;
  };
} = {
  LPAREN: { pattern: /\(/, alias: "(" },
  RPAREN: { pattern: /\)/, alias: ")" },
  LBRACE: { pattern: /\{/, alias: "{" },
  RBRACE: { pattern: /\}/, alias: "}" },
  SEMICOLON: { pattern: /;/, alias: ";" },
  EQ: { pattern: /==/, alias: "==", categories: C.EqualityOperator },
  NEQ: { pattern: /!=/, alias: "!=", categories: C.EqualityOperator },
  INCR: { pattern: /\+\+/, alias: "++", categories: C.IncrementOperator },
  DECR: { pattern: /--/, alias: "--", categories: C.IncrementOperator },
  ADD_ASSIGN: { pattern: /\+=/, alias: "+=", categories: C.AssignmentOperator },
  SUB_ASSIGN: { pattern: /-=/, alias: "-=", categories: C.AssignmentOperator },
  MUL_ASSIGN: { pattern: /\*=/, alias: "*=", categories: C.AssignmentOperator },
  DIV_ASSIGN: { pattern: /\/=/, alias: "/=", categories: C.AssignmentOperator },
  MOD_ASSIGN: { pattern: /%=/, alias: "%=", categories: C.AssignmentOperator },
  ASSIGN: { pattern: /=/, alias: "=", categories: C.AssignmentOperator },
  MUL: { pattern: /\*/, alias: "*", categories: C.MultiplicationOperator },
  DIV: { pattern: /\//, alias: "/", categories: C.MultiplicationOperator },
  MOD: { pattern: /%/, alias: "%", categories: C.MultiplicationOperator },
  ADD: { pattern: /\+/, alias: "+", categories: C.AdditionOperator },
  MINUS: {
    pattern: /-/,
    alias: "-",
    categories: [C.AdditionOperator, C.UnaryOperator],
  },
  COMMA: { pattern: /,/, alias: "," },
  LNOT: { pattern: /!/, alias: "!", categories: [C.UnaryOperator] },
  LAND: { pattern: /&&/, alias: "&&" },
  LOR: { pattern: /\|\|/, alias: "||" },
  LSHIFT: { pattern: /<</, alias: "<<", categories: C.ShiftOperator },
  RSHIFT: { pattern: />>/, alias: ">>", categories: C.ShiftOperator },
  LEQ: { pattern: /<=/, alias: "<=", categories: C.ComparisonOperator },
  GEQ: { pattern: />=/, alias: ">=", categories: C.ComparisonOperator },
  LT: { pattern: /</, alias: "<", categories: C.ComparisonOperator },
  GT: { pattern: />/, alias: ">", categories: C.ComparisonOperator },
  INT_TYPE: { pattern: /int/, alias: "int", categories: C.Keyword },
  RETURN: {
    pattern: /return/,
    alias: "return",
    categories: C.Keyword,
    longer_alt: Identifier,
  },
  IF: {
    pattern: /if/,
    alias: "if",
    categories: C.Keyword,
    longer_alt: Identifier,
  },
  ELSE: {
    pattern: /else/,
    alias: "else",
    categories: C.Keyword,
    longer_alt: Identifier,
  },
  WHILE: {
    pattern: /while/,
    alias: "while",
    categories: C.Keyword,
    longer_alt: Identifier,
  },
  DO: {
    pattern: /do/,
    alias: "do",
    categories: C.Keyword,
    longer_alt: Identifier,
  },
};

const SymbolsAndKeywords = Object.entries(SYMBOLS).map(
  ([name, { alias, pattern, categories }]) => {
    ALIASES[name] = alias;
    if (categories) {
      return createToken({ name, pattern, categories });
    } else {
      return createToken({ name, pattern });
    }
  }
);

ALIASES["IDE"] = "x";
ALIASES["CONST"] = "42";

// Convenience structure that maps aliases to tokens
export const TOKENS = {} as Record<TokenAlias, TokenType>;

// Create the lexer
[
  WhiteSpace, //
  LineComment,
  DocString,
  EnterMultilineComment,
  ...SymbolsAndKeywords,
  Identifier,
  IntConst,
  ...Object.values(CATEGORIES),
].forEach((t) => {
  const name = ALIASES[t.name] || t.name;
  TOKENS[name] = t;
});

const modes = {
  comment_mode: [
    ExitMultilineComment, //
    AnyCharacter,
    WhiteSpace,
  ],
  code_mode: Object.values(TOKENS),
};

const multiModeLexerDefinition: IMultiModeLexerDefinition & {
  defaultMode: keyof typeof modes;
} = {
  defaultMode: "code_mode",
  modes,
};

export const LEXER = new Lexer(multiModeLexerDefinition);
