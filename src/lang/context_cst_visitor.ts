import { Context, ContextKind } from "./context";
import * as cst_parser from "./cst_parser";
import * as types from "./cst_parser_visitor";
import * as monaco from "monaco-editor";
import { mkRange, mkStrictRange } from "./loc_utils";

/**
 * Places where an expression context should be reported:
 * * if/while conditions
 * * between every = and , in a variable declaration
 * * between return and ;
 * * before a ; in a blank line (that's an expression statement)
 *
 * Places where identifiers context should be reported (there are no suggestions in this context, since the progammer is expected to type in new names):
 * * between ( and ) in a function declaration
 * * between int and = or between , and = in a variable declaration
 *
 * Everywhere else is a statement context
 */
export default class ContextVisitor
  extends cst_parser.CRobotsCSTVisitor
  implements types.ICstNodeVisitor<void, Context>
{
  program(ctx: types.ProgramCstChildren, range: monaco.Range): Context {
    return new Context(
      ContextKind.Statement,
      range,
      undefined,
      "program"
    ).appendChildren(
      ...(ctx.toplevelStmt ?? []).map((decl) =>
        this.toplevelStmt(decl.children)
      )
    );
  }

  toplevelStmt(ctx: types.ToplevelStmtCstChildren): Context {
    if (ctx.functionStmt) {
      return this.functionStmt(ctx.functionStmt[0].children);
    } else if (ctx.variableStmt) {
      return this.variableStmt(ctx.variableStmt[0].children);
    }

    return new Context(ContextKind.Statement);
  }

  stmtList(ctx: types.StmtListCstChildren): Context[] {
    return (ctx.statement ?? []).map((stmt) => this.statement(stmt.children));
  }

  statement(ctx: types.StatementCstChildren): Context {
    if (ctx.blockStmt) return this.blockStmt(ctx.blockStmt[0].children);
    if (ctx.ifStmt) return this.ifStmt(ctx.ifStmt[0].children);
    if (ctx.whileStmt) return this.whileStmt(ctx.whileStmt[0].children);
    if (ctx.retStmt) return this.retStmt(ctx.retStmt[0].children);
    if (ctx.variableStmt)
      return this.variableStmt(ctx.variableStmt[0].children);
    if (ctx.exprStmt) return this.exprStmt(ctx.exprStmt[0].children);

    return new Context(ContextKind.Statement);
  }

  functionStmt(ctx: types.FunctionStmtCstChildren): Context {
    let res = new Context(
      ContextKind.Statement,
      mkRange(ctx.identifier[0].children.IDE[0]),
      undefined,
      "function"
    );

    res.appendChild(
      new Context(
        ContextKind.Identifier,
        mkRange(ctx.LPAREN[0], ctx.RPAREN[0]),
        undefined,
        "params"
      )
    );

    res.appendChild(this.blockStmt(ctx));

    return res;
  }

  variableStmt(ctx: types.VariableStmtCstChildren): Context {
    const intTok = ctx.INT_TYPE[0]; // must be there
    const semiTok = ctx.SEMICOLON?.at(0);

    let res = new Context(
      ContextKind.Statement,
      mkRange(intTok, semiTok),
      undefined,
      "variable"
    );

    if (!ctx.variableDecl || ctx.variableDecl.length === 0) {
      res.appendChild(
        new Context(
          ContextKind.Identifier,
          mkStrictRange(intTok, semiTok),
          undefined,
          `identifier_0`
        )
      );
    } else
      ctx.variableDecl.forEach(({ children: declCtx }, idx) => {
        const assignTok = declCtx.ASSIGN?.at(0);

        const ideStart = (ctx.COMMA && ctx.COMMA[idx - 1]) ?? intTok;
        const ideEnd = assignTok ?? ctx.COMMA?.at(idx) ?? semiTok ?? intTok;

        res.appendChild(
          new Context(
            ContextKind.Identifier,
            mkStrictRange(ideStart, ideEnd),
            undefined,
            `identifier_${idx}`
          )
        );

        if (declCtx.expression) {
          const exprStart = assignTok!;
          const exprEnd = ctx.COMMA?.at(idx) ?? semiTok;

          res.appendChild(
            new Context(
              ContextKind.Expression,
              mkStrictRange(exprStart, exprEnd),
              undefined,
              `expression_${idx}`
            )
          );
        }
      });

    return res;
  }

  blockStmt(ctx: types.BlockStmtCstChildren): Context {
    let res = new Context(
      ContextKind.Statement,
      mkRange(ctx.LBRACE[0], ctx.RBRACE[0]),
      undefined,
      "block"
    );

    res.appendChildren(...this.stmtList(ctx.stmtList[0].children));

    return res;
  }

  retStmt(ctx: types.RetStmtCstChildren): Context {
    let res = new Context(
      ContextKind.Statement,
      mkRange(ctx.RETURN[0]),
      undefined,
      "return"
    );

    res.appendChild(
      new Context(
        ContextKind.Expression,
        mkRange(ctx.RETURN[0], ctx.SEMICOLON[0]),
        undefined,
        "retExpr"
      )
    );

    return res;
  }

  ifStmt(ctx: types.IfStmtCstChildren): Context {
    let res = new Context(
      ContextKind.Statement,
      mkRange(ctx.IF[0]),
      undefined,
      "if"
    );

    res.appendChild(
      new Context(
        ContextKind.Expression,
        mkRange(ctx.LPAREN[0], ctx.RPAREN[0]),
        undefined,
        "condition"
      )
    );

    ctx.statement?.at(0) &&
      res.appendChild(this.statement(ctx.statement.at(0)?.children));

    ctx.statement?.at(1) &&
      res.appendChild(this.statement(ctx.statement.at(1)?.children));

    return res;
  }

  whileStmt(ctx: types.WhileStmtCstChildren): Context {
    let res = new Context(
      ContextKind.Statement,
      mkRange(ctx.WHILE[0]),
      undefined,
      "while"
    );

    res.appendChild(
      new Context(
        ContextKind.Expression,
        mkRange(ctx.LPAREN[0], ctx.RPAREN[0]),
        undefined,
        "condition"
      )
    );

    ctx.statement?.at(0) &&
      res.appendChild(this.statement(ctx.statement.at(0)?.children));

    return res;
  }

  doWhileStmt(ctx: types.DoWhileStmtCstChildren): Context {
    let res = new Context(
      ContextKind.Statement,
      mkRange(ctx.DO[0]),
      undefined,
      "doWhile"
    );

    res.appendChild(
      new Context(
        ContextKind.Expression,
        mkRange(ctx.LPAREN[0], ctx.RPAREN[0]),
        undefined,
        "condition"
      )
    );

    ctx.statement?.at(0) &&
      res.appendChild(this.statement(ctx.statement.at(0)?.children));

    return res;
  }

  exprStmt(ctx: types.ExprStmtCstChildren): Context {
    let res = new Context(
      ContextKind.Statement,
      mkRange(ctx.SEMICOLON[0]),
      undefined,
      "exprStmt"
    );

    res.appendChild(
      new Context(
        ContextKind.Expression,
        mkRange(ctx.SEMICOLON[0]),
        undefined,
        "expression"
      )
    );

    return res;
  }
}

export const defaultVisitor = new ContextVisitor();
