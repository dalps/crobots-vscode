import type { CstNode, CstNodeLocation, ParserMethod } from "chevrotain";
import { Range } from "vscode";
import * as cst_parser from "./cst_parser";
import type * as cst_types from "./cst_parser_visitor";
import {
  AssignmentExpression,
  BinaryExpression,
  CallExpression,
  Const,
  UnaryExpression,
  type AssignmentExprLhs,
  type BinaryExprRhs,
  type Expression,
} from "./expression";
import { EMPTY_RANGE, fromTokens, LocatedName } from "./loc_utils";
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
import { zip } from "./utils";

type Maybe<T> = T | undefined;

function rangeOfCstNodeLocation(loc: CstNodeLocation) {
  return new Range(
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
    return cstNode && super.visit(cstNode);
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
        name.location.union(fromTokens(rbrace)),
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
        fromTokens(int, ctx.SEMICOLON?.at(0))
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
      new BlockStatement(body, fromTokens(lbrace, rbrace))
    );
  }

  retStmt(ctx: cst_types.RetStmtCstChildren) {
    let ret = ctx.RETURN?.at(0);
    let expr = this.visit<Expression>(ctx.expression);

    // expr is not required
    return (
      ret && new ReturnStatement(expr, fromTokens(ret, ctx.SEMICOLON?.at(0)))
    );
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
        fromTokens(ifKw).union(elseBranch?.location || thenBranch.location)
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
        fromTokens(whileKw).union(
          rangeOfCstNodeLocation(ctx.statement?.at(0).location)
        )
      )
    );
  }

  doWhileStmt(ctx: cst_types.DoWhileStmtCstChildren) {
    let doKw = ctx.DO?.at(0);
    let body = this.visit<Statement>(ctx.statement);
    let condition = this.visit<Expression>(ctx.expression);
    let loc = doKw && fromTokens(doKw, ctx.SEMICOLON?.at(0));

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
      new ExpressionStatement(expr, fromTokens(semi).union(expr.location))
    );
  }

  emptyStmt(ctx: cst_types.EmptyStmtCstChildren): Maybe<Statement> {
    let semi = ctx.SEMICOLON?.at(0);
    return semi && new EmptyStatement(fromTokens(semi));
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
          fromTokens(op).union(expr.location)
        )) ||
      expr
    );
  }

  binaryLeftAssocExpr(
    ctx: cst_types.BinaryLeftAssocExprChildren
  ): Maybe<Expression> {
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
          (acc, rhs) => (rhs ? acc.union(rhs.expr.location) : acc),
          lhs.location as Range
        )) ||
      EMPTY_RANGE;

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
      names &&
      expr &&
      names.reduce(
        (acc, name) => (name ? acc.union(name.name.location) : acc),
        expr.location || EMPTY_RANGE
      );

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
        fromTokens(op).union(name.location)
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

    return lit && new Const(Number.parseInt(lit.image), fromTokens(lit));
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
      new CallExpression(name, args, name.location.union(fromTokens(rparen)))
    );
  }

  identifier(ctx: cst_types.IdentifierCstChildren): Maybe<LocatedName> {
    let ide = ctx.IDE?.at(0);

    return ide && LocatedName.fromToken(ide);
  }
}

export const defaultVisitor = new ASTVisitor();

export function parse<T>(
  input: string,
  rule: ParserMethod<any, CstNode>
): Maybe<T> {
  const { cst, errors } = cst_parser.parse(input, rule);

  // TODO: report compilation errors here
  return defaultVisitor.visit<T>(cst);
}

const { PARSER: P } = cst_parser;

export const parseExpression = (input: string) =>
  parse<Expression>(input, P.expression.bind(P));

export const parseStatement = (input: string) =>
  parse<Statement>(input, P.statement.bind(P));

export const parseProgram = (input: string) =>
  parse<Program>(input, P.program.bind(P));
