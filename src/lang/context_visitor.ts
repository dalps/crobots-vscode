import {
  AssignmentExpression,
  BinaryExpression,
  CallExpression,
  UnaryExpression,
  type Expression,
} from "./expression";
import { LocatedName } from "./loc_utils";
import type { Program } from "./program";
import {
  BlockStatement,
  ExpressionStatement,
  FunctionDeclarationStatement,
  IfStatement,
  ReturnStatement,
  VariableDeclarationStatement,
  WhileStatement,
  type Statement,
} from "./statements";
import { Context, ContextKind } from "./context";

/** You should visit the CST instead of the AST to get more accurate locations */
export class ContextVisitor {
  /**
   * Visit an entire program.
   *
   * This is the main method of the visitor and must be called before
   * performing any query.
   */
  program(ctx: Program): Context {
    return new Context(
      ContextKind.Statement,
      ctx.location,
      undefined,
      "program"
    ).appendChildren(
      ...ctx.toplevelStatements.map((decl) => this.toplevelStmt(decl))
    );
  }

  private toplevelStmt(ctx: Statement) {
    if (ctx instanceof FunctionDeclarationStatement) {
      return this.functionStmt(ctx);
    } else if (ctx instanceof VariableDeclarationStatement) {
      return this.variableStmt(ctx);
    }

    return new Context(ContextKind.Statement, ctx.location, undefined);
  }

  private stmtList(ctx: Statement[]) {
    return ctx.map((stmt) => this.statement(stmt));
  }

  private statement(ctx: Statement) {
    if (ctx instanceof BlockStatement) return this.blockStmt(ctx);
    if (ctx instanceof IfStatement) return this.ifStmt(ctx);
    if (ctx instanceof WhileStatement) return this.whileStmt(ctx);
    if (ctx instanceof ReturnStatement) return this.retStmt(ctx);
    if (ctx instanceof VariableDeclarationStatement)
      return this.variableStmt(ctx);
    if (ctx instanceof ExpressionStatement) return this.exprStmt(ctx);

    return new Context(ContextKind.Statement, ctx.location, undefined);
  }

  private functionStmt(ctx: FunctionDeclarationStatement) {
    return new Context(
      ContextKind.Statement,
      ctx.location,
      undefined,
      "function"
    ).appendChildren(...this.stmtList(ctx.body));
  }

  private variableStmt(ctx: VariableDeclarationStatement) {
    return new Context(
      ContextKind.Statement,
      ctx.location,
      undefined,
      "variable"
    ).appendChildren(
      ...ctx.declarations.flatMap(({ expr }) =>
        // visit the initializer
        expr ? [this.expression(expr)] : []
      )
    );
  }

  private blockStmt(ctx: BlockStatement): Context {
    return new Context(
      ContextKind.Statement,
      ctx.location,
      undefined,
      "block"
    ).appendChildren(...this.stmtList(ctx.body));
  }

  private retStmt(ctx: ReturnStatement) {
    let res = new Context(
      ContextKind.Statement,
      ctx.location,
      undefined,
      "return"
    );
    ctx.expr && res.appendChild(this.expression(ctx.expr));
    return res;
  }

  private ifStmt(ctx: IfStatement) {
    let res = new Context(ContextKind.Statement, ctx.location, undefined, "if")
      .appendChild(this.expression(ctx.condition))
      .appendChild(this.statement(ctx.thenBranch));

    ctx.elseBranch && res.appendChild(this.statement(ctx.elseBranch));

    return res;
  }

  private whileStmt(ctx: WhileStatement): Context {
    return new Context(ContextKind.Statement, ctx.location, undefined, "while")
      .appendChild(this.expression(ctx.condition))
      .appendChild(this.statement(ctx.body));
  }

  private exprStmt(ctx: ExpressionStatement) {
    return new Context(
      ContextKind.Statement,
      ctx.location,
      undefined,
      "exprStmt"
    ).appendChild(this.expression(ctx.expr));
  }

  private expression(ctx: Expression) {
    // terminal node
    return new Context(ContextKind.Expression, ctx.location, undefined, "expr");
  }
}

export const defaultVisitor = new ContextVisitor();
