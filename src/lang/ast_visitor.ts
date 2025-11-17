import type { CstNode, CstNodeLocation } from "chevrotain";
import * as monaco from "monaco-editor";
import { zip } from "../utils";
import * as cst_parser from "./cst_parser";
import type * as cst_types from "./cst_parser_visitor";
import {
  AssignmentExpression,
  BinaryExpression,
  CallExpression,
  Const,
  UnaryExpression,
  type AssignmentExprLhs,
  type ASTNode,
  type BinaryExprRhs,
  type Expression,
} from "./expression";
import { DUMMY, LocatedName, mkRange } from "./loc_utils";
import type { BinaryOperator, UnaryOperator } from "./operators";
import { Program } from "./program";
import {
  BlockStatement,
  EmptyStatement,
  ExpressionStatement,
  FunctionDeclarationStatement,
  IfStatement,
  ReturnStatement,
  SequenceStatement,
  VariableDeclarationStatement,
  WhileStatement,
  type Declaration,
  type Statement,
} from "./statements";

type Maybe<T> = T | undefined;

function rangeOfCstNodeLocation(loc: CstNodeLocation) {
  return new monaco.Range(
    loc.startLine!,
    loc.startColumn!,
    loc.endLine!,
    loc.endColumn!
  );
}

export default class ASTVisitor
  extends cst_parser.CRobotsCSTVisitor
  implements cst_types.ICstNodeVisitor<any, any>
{
  constructor() {
    super();
    // this.validateVisitor();
  }

  override visit<OUT>(cstNode: Maybe<CstNode | CstNode[]>): Maybe<OUT> {
    return super.visit(cstNode);
  }

  visitList<OUT>(list: Maybe<CstNode[]>): Maybe<OUT>[] {
    return (
      list?.map((obj) => this.visit<OUT>(obj)).filter((o) => o !== undefined) ||
      []
    );
  }

  program(ctx: cst_types.ProgramCstChildren): Program {
    let declarations = this.visitList<Statement>(ctx.toplevelStmt);

    return new Program(declarations);
  }

  toplevelStmt(ctx: cst_types.ToplevelStmtCstChildren) {
    return this.visit<Statement>(ctx.functionStmt ?? ctx.variableStmt);
  }

  stmtList(ctx: cst_types.StmtListCstChildren) {
    return this.visitList<Statement>(ctx.statement);
  }

  statement(ctx: cst_types.StatementCstChildren) {
    return this.visit<Statement>(
      ctx.blockStmt ??
        ctx.ifStmt ??
        ctx.whileStmt ??
        ctx.doWhileStmt ??
        ctx.retStmt ??
        ctx.exprStmt ??
        ctx.variableStmt ??
        ctx.emptyStmt
    );
  }

  functionStmt(ctx: cst_types.FunctionStmtCstChildren): Maybe<Statement> {
    let doc = ctx.DocString?.at(0)?.payload;
    let name = this.visit<LocatedName>(ctx.identifier);
    let params = this.visitList<LocatedName>(ctx.identifier?.slice(1));
    let body = this.visit<Statement[]>(ctx.stmtList);
    let rbrace = ctx.RBRACE?.at(0);

    return (
      name &&
      params &&
      body &&
      rbrace &&
      new FunctionDeclarationStatement(
        name,
        params,
        body,
        (name.location as monaco.Range).plusRange(mkRange(rbrace)),
        doc
      )
    );
  }

  variableStmt(ctx: cst_types.VariableStmtCstChildren) {
    let declarations = this.visitList<Declaration>(ctx.variableDecl);
    let int = ctx.INT_TYPE?.at(0);

    return (
      int &&
      declarations &&
      new VariableDeclarationStatement(
        declarations,
        mkRange(int, ctx.SEMICOLON?.at(0))
      )
    );
  }

  variableDecl(ctx: cst_types.VariableDeclCstChildren): Maybe<Declaration> {
    let name = this.visit<LocatedName>(ctx.identifier);
    let expr = this.visit<Expression>(ctx.expression);

    // expr is not required
    return name && { name, expr };
  }

  blockStmt(ctx: cst_types.BlockStmtCstChildren) {
    let body = this.visit<Statement[]>(ctx.stmtList);
    const lbrace = ctx.LBRACE?.at(0);
    const rbrace = ctx.RBRACE?.at(0);

    return (
      lbrace &&
      body &&
      rbrace &&
      new BlockStatement(body, mkRange(lbrace, rbrace))
    );
  }

  retStmt(ctx: cst_types.RetStmtCstChildren) {
    let ret = ctx.RETURN?.at(0);
    let expr = this.visit<Expression>(ctx.expression);

    // expr is not required
    return ret && new ReturnStatement(expr, mkRange(ret, ctx.SEMICOLON?.at(0)));
  }

  ifStmt(ctx: cst_types.IfStmtCstChildren) {
    let ifKw = ctx.IF?.at(0);
    let condition = this.visit<Expression>(ctx.expression);
    let thenBranch = this.visit<Statement>(ctx.statement);
    let elseBranch = this.visit<Statement>(ctx.statement.at(1));

    return (
      ifKw &&
      condition &&
      thenBranch &&
      new IfStatement(
        condition,
        thenBranch,
        elseBranch,
        mkRange(ifKw).plusRange(elseBranch?.location || thenBranch.location)
      )
    );
  }

  whileStmt(ctx: cst_types.WhileStmtCstChildren) {
    let whileKw = ctx.WHILE?.at(0);
    let condition = this.visit<Expression>(ctx.expression);
    let body = this.visit<Statement>(ctx.statement);

    return (
      whileKw &&
      condition &&
      body &&
      new WhileStatement(
        condition,
        body,
        mkRange(whileKw).plusRange(
          rangeOfCstNodeLocation(ctx.statement?.at(0).location)
        )
      )
    );
  }

  doWhileStmt(ctx: cst_types.DoWhileStmtCstChildren) {
    let doKw = ctx.DO?.at(0);
    let body = this.visit<Statement>(ctx.statement);
    let condition = this.visit<Expression>(ctx.expression);
    let loc = doKw && mkRange(doKw, ctx.SEMICOLON?.at(0));

    return (
      doKw &&
      body &&
      condition &&
      new SequenceStatement(body, new WhileStatement(condition, body, loc), loc)
    );
  }

  exprStmt(ctx: cst_types.ExprStmtCstChildren): Maybe<Statement> {
    let expr = this.visit<Expression>(ctx.expression);
    let semi = ctx.SEMICOLON?.at(0);

    return (
      semi &&
      expr &&
      new ExpressionStatement(expr, mkRange(semi).plusRange(expr.location))
    );
  }

  emptyStmt(ctx: cst_types.EmptyStmtCstChildren): Maybe<Statement> {
    let semi = ctx.SEMICOLON?.at(0);
    return semi && new EmptyStatement(mkRange(semi));
  }

  expression(ctx: cst_types.ExpressionCstChildren) {
    return this.visit<Expression>(ctx.assignExpr);
  }

  unaryExpr(ctx: cst_types.UnaryExprCstChildren) {
    if (ctx.incrExpr) {
      return this.visit<Expression>(ctx.incrExpr);
    }

    let expr = this.visit<Expression>(ctx.atomExpr);
    let op = ctx.UnaryOperator?.at(0);

    return (
      (expr &&
        op &&
        new UnaryExpression(
          op.tokenType.name as UnaryOperator,
          expr,
          mkRange(op).plusRange(expr.location)
        )) ||
      expr
    );
  }

  binaryLeftAssocExpr(ctx: BinaryLeftAssocExprChildren): Maybe<Expression> {
    // base case
    if (ctx.lhs === undefined) {
      // ctx will be an empty object in case of missing syntax
      return this.unaryExpr(ctx as cst_types.UnaryExprCstChildren);
    }

    let lhs = ctx.lhs && this.binaryLeftAssocExpr(ctx.lhs[0].children);

    let rhs: BinaryExprRhs[] = zip(
      ctx.operator?.map((tok) => tok.tokenType.name as BinaryOperator) || [],
      ctx.rhs?.map((expr) => this.binaryLeftAssocExpr(expr.children)) || []
    ).flatMap(([op, expr]) => (op && expr ? [{ op, expr }] : []));

    let rhsRange =
      (lhs &&
        rhs &&
        rhs.reduce(
          (acc, rhs) => (rhs ? acc.plusRange(rhs.expr.location) : acc),
          lhs.location as monaco.Range
        )) ||
      DUMMY;

    return (
      lhs && (rhs.length > 0 ? new BinaryExpression(lhs, rhs, rhsRange) : lhs)
    );
  }

  assignExpr(ctx: cst_types.AssignExprCstChildren) {
    let names: AssignmentExprLhs[] = zip(
      ctx.AssignmentOperator?.map(
        (tok) => tok.tokenType.name as BinaryOperator
      ) || [],
      this.visitList<LocatedName>(ctx.lhs)
    ).flatMap(([op, name]) => (op && name ? [{ op, name }] : []));

    let expr = ctx.rhs && this.binaryLeftAssocExpr(ctx.rhs[0].children);

    let namesRange =
      (names &&
        expr &&
        names.reduce(
          (acc, name) => (name ? acc.plusRange(name.name.location) : acc),
          expr.location as monaco.Range
        )) ||
      DUMMY;

    return (
      expr &&
      (names && names.length > 0
        ? new AssignmentExpression(names, expr, namesRange)
        : expr)
    );
  }

  incrExpr(ctx: cst_types.IncrExprCstChildren) {
    let name = this.visit<LocatedName>(ctx.identifier);
    let op = ctx.IncrementOperator?.at(0);

    return (
      op &&
      name &&
      new AssignmentExpression(
        [{ op: op.tokenType.name === "INCR" ? "ADD" : "MINUS", name }],
        new Const(1, name.location),
        mkRange(op).plusRange(name.location)
      )
    );
  }

  atomExpr(ctx: cst_types.AtomExprCstChildren) {
    return this.visit<Expression>(
      ctx.callExpr ?? ctx.constExpr ?? ctx.groupExpr ?? ctx.identifier
    );
  }

  constExpr(ctx: cst_types.ConstExprCstChildren) {
    let lit = ctx.CONST?.at(0);

    return lit && new Const(Number.parseInt(lit.image), mkRange(lit));
  }

  groupExpr(ctx: cst_types.GroupExprCstChildren) {
    return this.visit<Expression>(ctx.expression);
  }

  callExpr(ctx: cst_types.CallExprCstChildren) {
    let name = this.visit<LocatedName>(ctx.identifier);
    let args = this.visitList<Expression>(ctx.expression);
    let rparen = ctx.RPAREN?.at(0);

    return (
      name &&
      args &&
      rparen &&
      new CallExpression(
        name,
        args,
        (name.location as monaco.Range).plusRange(mkRange(rparen))
      )
    );
  }

  identifier(ctx: cst_types.IdentifierCstChildren): Maybe<LocatedName> {
    let ide = ctx.IDE?.at(0);

    return ide && LocatedName.fromToken(ide);
  }
}

export const defaultVisitor = new ASTVisitor();

export function parse(input: string, rule: string) {
  const { cst, errors } = cst_parser.parse(input, rule);

  // there should be errors of another kind in this phase as well
  const ast = defaultVisitor.visit(cst);

  return ast;
}

export function parseExpression(input: string): Expression {
  return parse(input, "expression");
}

export function parseStatement(input: string): Statement {
  return parse(input, "statement");
}

export function parseProgram(input: string): Program {
  return parse(input, "program");
}
