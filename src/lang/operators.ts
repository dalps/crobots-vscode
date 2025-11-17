export type BinaryOperator =
  | "ADD"
  | "MINUS"
  | "MUL"
  | "DIV"
  | "MOD"
  | "EQ"
  | "NEQ"
  | "GT"
  | "LT"
  | "GEQ"
  | "LEQ"
  | "LAND"
  | "LOR"
  | "LSHIFT"
  | "RSHIFT";

export type UnaryOperator = "MINUS" | "LNOT";

function bton(b: boolean) {
  return b ? 1 : 0;
}

export const UNARY_OPS: Record<UnaryOperator, (a: number) => number> = {
  MINUS: (a) => -a,
  LNOT: (a) => ~a,
};

export const BINARY_OPS: Record<
  BinaryOperator,
  (a: number, b: number) => number
> = {
  ADD: (a, b) => a + b,
  MINUS: (a, b) => a - b,
  MUL: (a, b) => a * b,
  DIV: (a, b) => Math.trunc(a / b),
  MOD: (a, b) => a % b,
  EQ: (a, b) => bton(a === b),
  NEQ: (a, b) => bton(a !== b),
  GT: (a, b) => bton(a > b),
  LT: (a, b) => bton(a < b),
  GEQ: (a, b) => bton(a >= b),
  LEQ: (a, b) => bton(a <= b),
  LAND: (a, b) => a & b,
  LOR: (a, b) => a | b,
  LSHIFT: (a, b) => a << b,
  RSHIFT: (a, b) => a >> b,
};
