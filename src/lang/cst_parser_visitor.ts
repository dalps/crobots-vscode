import type { CstNode, ICstVisitor, IToken } from "chevrotain";

export interface ProgramCstNode extends CstNode {
  name: "program";
  children: ProgramCstChildren;
}

export type ProgramCstChildren = {
  toplevelStmt?: ToplevelStmtCstNode[];
};

export interface ToplevelStmtCstNode extends CstNode {
  name: "toplevelStmt";
  children: ToplevelStmtCstChildren;
}

export type ToplevelStmtCstChildren = {
  functionStmt?: FunctionStmtCstNode[];
  variableStmt?: VariableStmtCstNode[];
};

export interface StmtListCstNode extends CstNode {
  name: "stmtList";
  children: StmtListCstChildren;
}

export type StmtListCstChildren = {
  statement?: StatementCstNode[];
};

export interface StatementCstNode extends CstNode {
  name: "statement";
  children: StatementCstChildren;
}

export type StatementCstChildren = {
  emptyStmt?: EmptyStmtCstNode[];
  exprStmt?: ExprStmtCstNode[];
  ifStmt?: IfStmtCstNode[];
  whileStmt?: WhileStmtCstNode[];
  doWhileStmt?: DoWhileStmtCstNode[];
  blockStmt?: BlockStmtCstNode[];
  retStmt?: RetStmtCstNode[];
  variableStmt?: VariableStmtCstNode[];
};

export interface FunctionStmtCstNode extends CstNode {
  name: "functionStmt";
  children: FunctionStmtCstChildren;
}

export type FunctionStmtCstChildren = {
  DocString?: IToken[];
  identifier: IdentifierCstNode[];
  LPAREN: IToken[];
  COMMA?: IToken[];
  RPAREN: IToken[];
  LBRACE: IToken[];
  stmtList: StmtListCstNode[];
  RBRACE: IToken[];
};

export interface VariableStmtCstNode extends CstNode {
  name: "variableStmt";
  children: VariableStmtCstChildren;
}

export type VariableStmtCstChildren = {
  INT_TYPE: IToken[];
  variableDecl: VariableDeclCstNode[];
  COMMA?: IToken[];
  SEMICOLON: IToken[];
};

export interface VariableDeclCstNode extends CstNode {
  name: "variableDecl";
  children: VariableDeclCstChildren;
}

export type VariableDeclCstChildren = {
  identifier: IdentifierCstNode[];
  ASSIGN?: IToken[];
  expression?: ExpressionCstNode[];
};

export interface BlockStmtCstNode extends CstNode {
  name: "blockStmt";
  children: BlockStmtCstChildren;
}

export type BlockStmtCstChildren = {
  LBRACE: IToken[];
  stmtList: StmtListCstNode[];
  RBRACE: IToken[];
};

export interface RetStmtCstNode extends CstNode {
  name: "retStmt";
  children: RetStmtCstChildren;
}

export type RetStmtCstChildren = {
  RETURN: IToken[];
  expression?: ExpressionCstNode[];
  SEMICOLON: IToken[];
};

export interface IfStmtCstNode extends CstNode {
  name: "ifStmt";
  children: IfStmtCstChildren;
}

export type IfStmtCstChildren = {
  IF: IToken[];
  LPAREN: IToken[];
  expression: ExpressionCstNode[];
  RPAREN: IToken[];
  statement: StatementCstNode[];
  ELSE?: IToken[];
};

export interface WhileStmtCstNode extends CstNode {
  name: "whileStmt";
  children: WhileStmtCstChildren;
}

export type WhileStmtCstChildren = {
  WHILE: IToken[];
  LPAREN: IToken[];
  expression: ExpressionCstNode[];
  RPAREN: IToken[];
  statement: StatementCstNode[];
};

export interface DoWhileStmtCstNode extends CstNode {
  name: "doWhileStmt";
  children: DoWhileStmtCstChildren;
}

export type DoWhileStmtCstChildren = {
  DO: IToken[];
  statement: StatementCstNode[];
  WHILE: IToken[];
  LPAREN: IToken[];
  expression: ExpressionCstNode[];
  RPAREN: IToken[];
  SEMICOLON: IToken[];
};

export interface ExprStmtCstNode extends CstNode {
  name: "exprStmt";
  children: ExprStmtCstChildren;
}

export type ExprStmtCstChildren = {
  expression: ExpressionCstNode[];
  SEMICOLON: IToken[];
};

export interface EmptyStmtCstNode extends CstNode {
  name: "emptyStmt";
  children: EmptyStmtCstChildren;
}

export type EmptyStmtCstChildren = {
  SEMICOLON: IToken[];
};

export interface ExpressionCstNode extends CstNode {
  name: "expression";
  children: ExpressionCstChildren;
}

export type ExpressionCstChildren = {
  assignExpr: AssignExprCstNode[];
};

export interface UnaryExprCstNode extends CstNode {
  name: "unaryExpr";
  children: UnaryExprCstChildren;
}

export type UnaryExprCstChildren = {
  incrExpr?: IncrExprCstNode[];
  UnaryOperator?: IToken[];
  atomExpr?: AtomExprCstNode[];
};

export interface IncrExprCstNode extends CstNode {
  name: "incrExpr";
  children: IncrExprCstChildren;
}

export type IncrExprCstChildren = {
  IncrementOperator: IToken[];
  identifier: IdentifierCstNode[];
};

export interface MultiplicationOperatorExprCstNode extends CstNode {
  name: "MultiplicationOperatorExpr";
  children: MultiplicationOperatorExprCstChildren;
}

export type MultiplicationOperatorExprCstChildren = {
  lhs: UnaryExprCstNode[];
  operator?: IToken[];
  rhs?: UnaryExprCstNode[];
};

export interface AdditionOperatorExprCstNode extends CstNode {
  name: "AdditionOperatorExpr";
  children: AdditionOperatorExprCstChildren;
}

export type AdditionOperatorExprCstChildren = {
  lhs: MultiplicationOperatorExprCstNode[];
  operator?: IToken[];
  rhs?: MultiplicationOperatorExprCstNode[];
};

export interface ShiftOperatorExprCstNode extends CstNode {
  name: "ShiftOperatorExpr";
  children: ShiftOperatorExprCstChildren;
}

export type ShiftOperatorExprCstChildren = {
  lhs: AdditionOperatorExprCstNode[];
  operator?: IToken[];
  rhs?: AdditionOperatorExprCstNode[];
};

export interface ComparisonOperatorExprCstNode extends CstNode {
  name: "ComparisonOperatorExpr";
  children: ComparisonOperatorExprCstChildren;
}

export type ComparisonOperatorExprCstChildren = {
  lhs: ShiftOperatorExprCstNode[];
  operator?: IToken[];
  rhs?: ShiftOperatorExprCstNode[];
};

export interface EqualityOperatorExprCstNode extends CstNode {
  name: "EqualityOperatorExpr";
  children: EqualityOperatorExprCstChildren;
}

export type EqualityOperatorExprCstChildren = {
  lhs: ComparisonOperatorExprCstNode[];
  operator?: IToken[];
  rhs?: ComparisonOperatorExprCstNode[];
};

export interface LORExprCstNode extends CstNode {
  name: "LORExpr";
  children: LORExprCstChildren;
}

export type LORExprCstChildren = {
  lhs: EqualityOperatorExprCstNode[];
  operator?: IToken[];
  rhs?: EqualityOperatorExprCstNode[];
};

export interface LANDExprCstNode extends CstNode {
  name: "LANDExpr";
  children: LANDExprCstChildren;
}

export type LANDExprCstChildren = {
  lhs: LORExprCstNode[];
  operator?: IToken[];
  rhs?: LORExprCstNode[];
};

export interface AssignExprCstNode extends CstNode {
  name: "assignExpr";
  children: AssignExprCstChildren;
}

export type AssignExprCstChildren = {
  lhs?: IdentifierCstNode[];
  AssignmentOperator?: IToken[];
  rhs: LANDExprCstNode[];
};

export interface AtomExprCstNode extends CstNode {
  name: "atomExpr";
  children: AtomExprCstChildren;
}

export type AtomExprCstChildren = {
  callExpr?: CallExprCstNode[];
  groupExpr?: GroupExprCstNode[];
  identifier?: IdentifierCstNode[];
  constExpr?: ConstExprCstNode[];
};

export interface ConstExprCstNode extends CstNode {
  name: "constExpr";
  children: ConstExprCstChildren;
}

export type ConstExprCstChildren = {
  CONST: IToken[];
};

export interface GroupExprCstNode extends CstNode {
  name: "groupExpr";
  children: GroupExprCstChildren;
}

export type GroupExprCstChildren = {
  LPAREN: IToken[];
  expression: ExpressionCstNode[];
  RPAREN: IToken[];
};

export interface CallExprCstNode extends CstNode {
  name: "callExpr";
  children: CallExprCstChildren;
}

export type CallExprCstChildren = {
  identifier: IdentifierCstNode[];
  LPAREN: IToken[];
  expression?: ExpressionCstNode[];
  COMMA?: IToken[];
  RPAREN: IToken[];
};

export interface IdentifierCstNode extends CstNode {
  name: "identifier";
  children: IdentifierCstChildren;
}

export type IdentifierCstChildren = {
  IDE: IToken[];
};

export interface BinaryLeftAssocExprChildren {
  lhs: CstNode[];
  operator?: IToken[];
  rhs?: CstNode[];
}

export interface ICstNodeVisitor<IN, OUT> extends ICstVisitor<IN, OUT> {
  program(children: ProgramCstChildren, param?: IN): OUT;
  toplevelStmt(children: ToplevelStmtCstChildren, param?: IN): OUT;
  stmtList(children: StmtListCstChildren, param?: IN): OUT;
  statement(children: StatementCstChildren, param?: IN): OUT;
  functionStmt(children: FunctionStmtCstChildren, param?: IN): OUT;
  variableStmt(children: VariableStmtCstChildren, param?: IN): OUT;
  variableDecl(children: VariableDeclCstChildren, param?: IN): OUT;
  blockStmt(children: BlockStmtCstChildren, param?: IN): OUT;
  retStmt(children: RetStmtCstChildren, param?: IN): OUT;
  ifStmt(children: IfStmtCstChildren, param?: IN): OUT;
  whileStmt(children: WhileStmtCstChildren, param?: IN): OUT;
  doWhileStmt(children: DoWhileStmtCstChildren, param?: IN): OUT;
  exprStmt(children: ExprStmtCstChildren, param?: IN): OUT;
  emptyStmt(children: EmptyStmtCstChildren, param?: IN): OUT;
  expression(children: ExpressionCstChildren, param?: IN): OUT;
  unaryExpr(children: UnaryExprCstChildren, param?: IN): OUT;
  incrExpr(children: IncrExprCstChildren, param?: IN): OUT;
  assignExpr(children: AssignExprCstChildren, param?: IN): OUT;
  atomExpr(children: AtomExprCstChildren, param?: IN): OUT;
  constExpr(children: ConstExprCstChildren, param?: IN): OUT;
  groupExpr(children: GroupExprCstChildren, param?: IN): OUT;
  callExpr(children: CallExprCstChildren, param?: IN): OUT;
  identifier(children: IdentifierCstChildren, param?: IN): OUT;
}
