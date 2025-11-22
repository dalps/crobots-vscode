import * as vscode from "vscode";
import { Range } from "vscode";
import {
  AssignmentExpression,
  BinaryExpression,
  CallExpression,
  UnaryExpression,
  type Expression,
} from "./expression";
import {
  LocatedName,
  showPosition,
  showRange,
  strictContainsRange,
} from "./loc_utils";
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
import { LOG } from "./utils";

type SymbolKind = vscode.SymbolKind.Function | vscode.SymbolKind.Variable;

const { SymbolKind } = vscode;

export const GLOBAL_SCOPE_ID = "global_scope";
export const BLOCK_SCOPE_ID = "<block>";

interface Definition {
  kind: SymbolKind;
  name: LocatedName;
  container?: string;
}

interface ScopeError {
  message: string;
  location: Range;
}

interface ScopeData {
  names: Map<string, Definition>;
  range?: Range;
  label?: string;
}

interface ScopeNode extends ScopeData {
  parent?: ScopeNode;
  children: ScopeNode[];
}

/**
 * A tree of scopes. Each node contains a map of the names
 * that are visible within the scope's range.
 *
 * Invariant: the children ranges do not overlap and all
 * of them are strictly contained in the parent's range.
 */
export class Scope implements ScopeNode {
  public names: Map<string, Definition> = new Map();
  public children: Scope[] = [];

  constructor(
    public range: Range,
    public parent?: Scope,
    public label?: string
  ) {}

  visitUp(visitor: (child: ScopeData) => void) {
    visitor({ names: this.names, label: this.label, range: this.range });
    this.parent?.visitUp(visitor);
  }

  visitDown(visitor: (child: ScopeData) => void) {
    visitor({ names: this.names, label: this.label, range: this.range });
    this.children.forEach((ch) => ch.visitDown(visitor));
  }

  addName(name: LocatedName, kind: SymbolKind): Definition {
    const def = { name, kind, container: this.label };
    this.names.set(name.word, def);
    return def;
  }

  appendChild(scope: Scope) {
    // validate
    const scopeSmaller = this.range.contains(scope.range);

    if (!scopeSmaller) {
      LOG(
        `Warning: refusing to append scope ${scope.range} because it is larger than this ${this.range}.`
      );
      return;
    }

    const scopeOverlap = this.children.find((ch) => {
      const inter = ch.range.intersection(scope.range);
      inter &&
        LOG(
          `Warning: refusing to append scope ${scope.range} because it overlaps with the child ${ch.range}.`
        );

      return inter;
    });

    if (scopeOverlap) return;

    // append
    scope.parent = this;
    this.children.push(scope);
  }

  /**
   * Get the smallest scope that contains the given range.
   */
  queryRange(range: Range): Scope | undefined {
    // By the invariant, if this scope doesn't contain the range then neither its children do
    // You might want to generalize this for a predicate
    if (!strictContainsRange(this.range, range)) return;

    return this.children.reduce(
      (result, ch) => ch.queryRange(range) || result,
      this
    );
  }

  /**
   * Search for a name's definition in the scope or in its ancestors.
   */
  queryName(name: LocatedName): Definition | undefined {
    if (!strictContainsRange(this.range, name.location)) return;

    return this.names.get(name.word) || this.parent?.queryName(name);
  }

  toString(level = 0): string {
    return `${"|   ".repeat(level)}${this.label}${showRange(this.range)} { ${[
      ...this.names.entries(),
    ]
      .map(([k, _v]) => `${k}`)
      .join(", ")} }
${this.children.map((ch) => ch.toString(level + 1)).join("")}`;
  }
}

export class ScopeVisitor {
  public errors = new Map<LocatedName, ScopeError>();

  public definitions = new Set<Definition>();

  /** Cache for variables references */
  private variablesRefs = new Map<LocatedName, Range>();

  /** Cache for function references */
  private functionsRefs = new Map<LocatedName, Range | undefined>();

  private globalScope?: Scope;
  private activeScope?: Scope;

  /** Save the current scope and perform some work in a child scope */
  private inScope(
    work: () => any,
    range: Range,
    label = this.activeScope?.label
  ) {
    // work in a new scope
    const parent = this.activeScope;
    const child = new Scope(range, undefined, label);
    parent?.appendChild(child);
    this.activeScope = child;

    work();

    // restore the parent scope
    this.activeScope = parent;
  }

  /**
   * Get an array of suggestions for a given location in the code.
   */
  queryCompletions(range: Range): Definition[] {
    const scope = this.globalScope?.queryRange(range);

    let defs: Map<string, Definition> = new Map();

    scope?.visitUp((data) => {
      data.names.forEach((nameData, name) => {
        if (defs.has(name)) return;
        defs.set(name, nameData);
      });
    });

    return [...defs.values()];
  }

  /**
   * Get the definition and the references of a name.
   */
  queryReferences(searchName: LocatedName) {
    const allRefs = [
      ...this.variablesRefs.entries(),
      ...this.functionsRefs.entries(),
    ];

    let def = allRefs.find(
      ([ref]) =>
        ref.word === searchName.word &&
        ref.location &&
        searchName.location.contains(ref.location)
    );

    if (def && def[1]) {
      const [_k, defRange] = def;

      // filter all the references with the same definition
      let refs = allRefs
        .filter(([_ref, otherDef]) => otherDef && defRange.contains(otherDef))
        .map(([name]) => name.location);

      return { def: defRange, refs };
    }

    return undefined;
  }

  private defineFunction(name: LocatedName) {
    if (!this.activeScope) return;

    let def = this.activeScope.addName(name, SymbolKind.Function);

    this.functionsRefs.set(name, name.location); // include the definition in the references

    // set previous undefined references (bit of a hack)
    this.functionsRefs.forEach(
      (_, k) => k.word === name.word && this.functionsRefs.set(k, name.location)
    );

    this.definitions.add(def);
  }

  private defineVariable(name: LocatedName) {
    if (!this.activeScope) return;

    let def = this.activeScope?.addName(name, SymbolKind.Variable);

    this.variablesRefs.set(name, name.location); // include the definition in the references
    this.definitions.add(def);
  }

  /**
   * Visit an entire program.
   *
   * This is the main method of the visitor and must be called before
   * performing any query.
   */
  program(ctx: Program) {
    // init
    this.variablesRefs.clear();
    this.functionsRefs.clear();
    this.definitions.clear();

    // reset the global scope
    this.globalScope = new Scope(ctx.location, undefined, GLOBAL_SCOPE_ID);
    this.activeScope = this.globalScope;

    ctx.toplevelStatements.forEach((decl) => this.toplevelStmt(decl));

    LOG(`\n${this.globalScope}`);
  }

  private toplevelStmt(ctx: Statement) {
    if (ctx instanceof FunctionDeclarationStatement) {
      this.functionStmt(ctx);
    } else if (ctx instanceof VariableDeclarationStatement) {
      this.variableStmt(ctx);
    }
  }

  private stmtList(ctx: Statement[]) {
    ctx.forEach((stmt) => this.statement(stmt));
  }

  private statement(ctx: Statement) {
    if (ctx instanceof BlockStatement) this.blockStmt(ctx);
    else if (ctx instanceof IfStatement) this.ifStmt(ctx);
    else if (ctx instanceof WhileStatement) this.whileStmt(ctx);
    else if (ctx instanceof ReturnStatement) this.retStmt(ctx);
    else if (ctx instanceof VariableDeclarationStatement)
      this.variableStmt(ctx);
    else if (ctx instanceof ExpressionStatement) this.exprStmt(ctx);
  }

  private functionStmt(ctx: FunctionDeclarationStatement) {
    this.defineFunction(ctx.name);

    this.inScope(
      () => {
        // record the params
        ctx.params.forEach((name) => this.defineVariable(name));

        // visit the body
        this.stmtList(ctx.body);
      },
      ctx.location,
      ctx.name.word
    );
  }

  private variableStmt(ctx: VariableDeclarationStatement) {
    ctx.declarations.forEach(({ name, expr }) => {
      this.defineVariable(name);

      // visit the initializer
      expr && this.expression(expr);
    });
  }

  private blockStmt(ctx: BlockStatement) {
    this.inScope(
      () => this.stmtList(ctx.body),
      ctx.location,
      this.activeScope?.label || GLOBAL_SCOPE_ID
    );
  }

  private retStmt(ctx: ReturnStatement) {
    ctx.expr && this.expression(ctx.expr);
  }

  private ifStmt(ctx: IfStatement) {
    this.expression(ctx.condition);
    this.statement(ctx.thenBranch);
    ctx.elseBranch && this.statement(ctx.elseBranch);
  }

  private whileStmt(ctx: WhileStatement) {
    this.expression(ctx.condition);
    this.statement(ctx.body);
  }

  private exprStmt(ctx: ExpressionStatement) {
    this.expression(ctx.expr);
  }

  private expression(ctx: Expression) {
    if (ctx instanceof BinaryExpression) this.binaryLeftAssocExpr(ctx);
    else if (ctx instanceof UnaryExpression) this.unaryExpr(ctx);
    else if (ctx instanceof AssignmentExpression) this.assignExpr(ctx);
    else if (ctx instanceof CallExpression) this.callExpr(ctx);
    else if (ctx instanceof LocatedName) this.identifier(ctx);
  }

  private unaryExpr(ctx: UnaryExpression) {
    this.expression(ctx.expr);
  }

  private binaryLeftAssocExpr(ctx: BinaryExpression) {
    this.expression(ctx.lhs);
    ctx.rhs.forEach(({ expr }) => this.expression(expr));
  }

  private assignExpr(ctx: AssignmentExpression) {
    ctx.names.forEach(({ name }) => this.identifier(name));
    this.expression(ctx.expr);
  }

  private callExpr(ctx: CallExpression) {
    const { word: callName, location } = ctx.name;
    const def = this.activeScope?.queryName(ctx.name);

    if (!def) {
      // this.errors.set(ctx.name, {
      //   message: `${location}: ${callName} is undefined.`,
      //   loc: location,
      // });
      // return;
    }

    if (def && def.kind === SymbolKind.Variable) {
      this.errors.set(ctx.name, {
        message: `${location}: ${callName} is a variable, but a function is expected here.`,
        location,
      });
      return;
    }

    this.functionsRefs.set(ctx.name, def?.name.location);

    // visit the args
    ctx.args.forEach((expr) => this.expression(expr));
  }

  private identifier(ctx: LocatedName) {
    const { word: varName, location } = ctx;
    const def = this.activeScope?.queryName(ctx);

    if (!def) {
      this.errors.set(ctx, {
        message: `${location}: ${varName} is undefined.`,
        location,
      });
      return;
    }

    if (def.kind === SymbolKind.Function) {
      this.errors.set(ctx, {
        message: `${location}: ${varName} is a function, but a variable is expected here.`,
        location,
      });
      return;
    }

    this.variablesRefs.set(ctx, def.name.location);
  }
}

export const defaultVisitor = new ScopeVisitor();
