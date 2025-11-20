import {
  CstParser,
  generateCstDts,
  ParserMethod,
  type CstNode,
  type IRecognitionException,
} from "chevrotain";
import { CATEGORIES as C, DocString, LEXER, TOKENS as T } from "./lexer";
import { LOG } from "./utils";

export class CRobotsParser extends CstParser {
  constructor() {
    super(Object.values(T), {
      nodeLocationTracking: "full",
      recoveryEnabled: true, // fault recovery on
    });
    this.performSelfAnalysis();
  }

  // A program is a sequence of declarations
  public program = this.RULE("program", () => {
    this.MANY(() => this.SUBRULE(this.toplevelStmt));
  });

  private toplevelStmt = this.RULE("toplevelStmt", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.functionStmt) },
      { ALT: () => this.SUBRULE(this.variableStmt) },
    ]);
  });

  // Statements
  private stmtList = this.RULE(
    "stmtList",
    () => {
      this.MANY(() => this.SUBRULE(this.statement));
    },
    {
      resyncEnabled: true, // enabled by default
    }
  );

  public statement = this.RULE("statement", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.emptyStmt) },
      { ALT: () => this.SUBRULE(this.exprStmt) },
      { ALT: () => this.SUBRULE(this.ifStmt) },
      { ALT: () => this.SUBRULE(this.whileStmt) },
      { ALT: () => this.SUBRULE(this.doWhileStmt) },
      { ALT: () => this.SUBRULE(this.blockStmt) },
      { ALT: () => this.SUBRULE(this.retStmt) },
      { ALT: () => this.SUBRULE(this.variableStmt) },
    ]);
  });

  private functionStmt = this.RULE("functionStmt", () => {
    this.OPTION(() => this.CONSUME(DocString));
    this.SUBRULE(this.identifier);
    this.CONSUME(T["("]);
    this.MANY_SEP({ SEP: T[","], DEF: () => this.SUBRULE2(this.identifier) });
    this.CONSUME(T[")"]);
    this.CONSUME(T["{"]);
    this.SUBRULE(this.stmtList);
    this.CONSUME(T["}"]);
  });

  private variableStmt = this.RULE("variableStmt", () => {
    this.CONSUME(T["int"]);
    this.AT_LEAST_ONE_SEP({
      SEP: T[","],
      DEF: () => this.SUBRULE(this.variableDecl),
    });
    this.CONSUME(T[";"]);
  });

  private variableDecl = this.RULE("variableDecl", () => {
    this.SUBRULE(this.identifier);
    this.OPTION(() => {
      this.CONSUME(T["="]);
      this.SUBRULE(this.expression);
    });
  });

  private blockStmt = this.RULE("blockStmt", () => {
    this.CONSUME(T["{"]);
    this.SUBRULE(this.stmtList);
    this.CONSUME(T["}"]);
  });

  private retStmt = this.RULE("retStmt", () => {
    this.CONSUME(T["return"]);
    this.OPTION(() => {
      this.SUBRULE(this.expression);
    });
    this.CONSUME(T[";"]);
  });

  private ifStmt = this.RULE("ifStmt", () => {
    this.CONSUME(T["if"]);
    this.CONSUME(T["("]);
    this.SUBRULE(this.expression);
    this.CONSUME(T[")"]);
    this.SUBRULE(this.statement);
    this.OPTION(() => {
      this.CONSUME(T["else"]);
      this.SUBRULE2(this.statement);
    });
  });

  private whileStmt = this.RULE("whileStmt", () => {
    this.CONSUME(T["while"]);
    this.CONSUME(T["("]);
    this.SUBRULE(this.expression);
    this.CONSUME(T[")"]);
    this.SUBRULE(this.statement);
  });

  private doWhileStmt = this.RULE("doWhileStmt", () => {
    this.CONSUME(T["do"]);
    this.SUBRULE2(this.statement);
    this.CONSUME2(T["while"]);
    this.CONSUME2(T["("]);
    this.SUBRULE2(this.expression);
    this.CONSUME2(T[")"]);
    this.CONSUME(T[";"]);
  });

  private exprStmt = this.RULE("exprStmt", () => {
    this.SUBRULE(this.expression);
    this.CONSUME(T[";"]);
  });

  private emptyStmt = this.RULE("emptyStmt", () => {
    this.CONSUME2(T[";"]);
  });

  // Expressions
  public expression = this.RULE("expression", () => {
    this.SUBRULE(this.assignExpr);
  });

  private unaryExpr = this.RULE("unaryExpr", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.incrExpr) },
      {
        ALT: () => {
          this.OPTION(() => this.CONSUME(C.UnaryOperator));
          this.SUBRULE(this.atomExpr);
        },
      },
    ]);
  });

  private incrExpr = this.RULE("incrExpr", () => {
    this.CONSUME(C.IncrementOperator);
    this.SUBRULE(this.identifier);
  });

  private binaryLeftAssocExpr = [
    T["&&"],
    T["||"],
    C.EqualityOperator,
    C.ComparisonOperator,
    C.ShiftOperator,
    C.AdditionOperator,
    C.MultiplicationOperator,
  ].reduceRight(
    (acc, tok) =>
      this.RULE(`${tok.name}Expr`, () => {
        this.SUBRULE(acc, { LABEL: "lhs" });

        this.MANY(() => {
          this.CONSUME(tok, { LABEL: "operator" });
          this.SUBRULE2(acc, { LABEL: "rhs" });
        });
      }),
    this.unaryExpr
  );

  private assignExpr = this.RULE("assignExpr", () => {
    this.MANY(() => {
      this.SUBRULE2(this.identifier, { LABEL: "lhs" });
      this.CONSUME(C.AssignmentOperator);
    });
    this.SUBRULE(this.binaryLeftAssocExpr, { LABEL: "rhs" });
  });

  private atomExpr = this.RULE("atomExpr", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.callExpr) },
      { ALT: () => this.SUBRULE2(this.groupExpr) },
      { ALT: () => this.SUBRULE3(this.identifier) },
      { ALT: () => this.SUBRULE(this.constExpr) },
    ]);
  });

  private constExpr = this.RULE("constExpr", () => this.CONSUME(T["42"]));

  private groupExpr = this.RULE("groupExpr", () => {
    this.CONSUME(T["("]);
    this.SUBRULE(this.expression);
    this.CONSUME(T[")"]);
  });

  private callExpr = this.RULE("callExpr", () => {
    this.SUBRULE(this.identifier);
    this.CONSUME(T["("]);
    this.MANY_SEP({
      SEP: T[","],
      DEF: () => this.SUBRULE(this.expression),
    });
    this.CONSUME(T[")"]);
  });

  private identifier = this.RULE("identifier", () => this.CONSUME(T["x"]));
}

export const PARSER = new CRobotsParser();

export function parse(
  input: string,
  rule: ParserMethod<any, CstNode>
): { cst: CstNode; errors: IRecognitionException[] } {
  const lexResult = LEXER.tokenize(input);

  PARSER.input = lexResult.tokens;
  const cst = rule();

  LOG(`### CST ###`);
  LOG(cst);
  LOG(`###########`);

  if (PARSER.errors.length > 0) {
    LOG(
      "There are parsing errors!\n" +
        PARSER.errors.map(
          ({ message, token }, i) =>
            `[${i}]: at line ${token.startLine} columns ${token.startColumn}-${token.endColumn}, ${message}\n`
        )
    );
  }

  return { cst, errors: PARSER.errors };
}

export const parseExpression = (input: string) =>
  parse(input, PARSER.expression);

export const parseStatement = (input: string) => parse(input, PARSER.statement);

export const parseProgram = (input: string) => parse(input, PARSER.program);

export function generateSignatures() {
  const productions = PARSER.getGAstProductions();
  const dst = generateCstDts(productions);

  console.log(dst);
  return dst;
}

// generateSignatures();

export const CRobotsCSTVisitor = PARSER.getBaseCstVisitorConstructor();
