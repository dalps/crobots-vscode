import * as vscode from "vscode";
import { CompletionItem, CompletionItemKind, Range, SymbolKind } from "vscode";
import { API_SPEC } from "../lang/api";
import { parseProgram } from "../lang/ast_visitor";
import { ContextKind } from "../lang/context";
import { defaultVisitor as contextVisitor } from "../lang/context_cst_visitor";
import { parseProgram as parseCst } from "../lang/cst_parser";
import { LocatedName } from "../lang/loc_utils";
import {
  GLOBAL_SCOPE_ID,
  defaultVisitor as scopeVisitor
} from "../lang/scope_visitor";
import { ROBOT_LANG } from "./crobots.contribution";
import { LOG, LOG2, Maybe, md } from "./utils";

export const DEBUG = 0;
export const LANG_ID = "crobots";

const API_KEYS = Object.keys(API_SPEC);
const KEYWORDS: string[] = ROBOT_LANG["keywords"].concat(
  ROBOT_LANG["typeKeywords"]
);

function getWordAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): Maybe<LocatedName> {
  let location = document.getWordRangeAtPosition(position);
  if (!location) return;
  let word = document.getText(location);

  return new LocatedName(word, location);
}

/**
 * Replacement for ITextModel.findPreviousMatch
 */
function findPreviousMatch(
  document: vscode.TextDocument,
  searchString: string,
  position: vscode.Position
) {
  const line = document.lineAt(position.line);
  const idx = line.text.indexOf(searchString);

  if (idx >= 0) {
    const res = new Range(
      position.line,
      idx,
      position.line,
      idx + searchString.length - 1
    );

    return res;
  }
}

export function getScopeCompletions(
  text: string,
  range: vscode.Range
): CompletionItem[] {
  const ast = parseProgram(text);
  scopeVisitor.program(ast);

  return scopeVisitor
    .queryCompletions(range)
    .map(({ name: { word, location }, container, kind }) => {
      const item = new CompletionItem(
        word,
        kind === SymbolKind.Function
          ? CompletionItemKind.Function
          : CompletionItemKind.Variable
      );
      item.detail = `(${
        kind === SymbolKind.Function ? "function" : "variable"
      })`;
      item.documentation = md(
        `Defined in ${
          container === GLOBAL_SCOPE_ID ? "global scope" : `\`${container}\``
        }, line ${location.start.line}`
      );

      return item;
    });
}

export const KeywordCompletions: CompletionItem[] = KEYWORDS.map(
  (k) => new CompletionItem(k, CompletionItemKind.Keyword)
);

export function getApiCompletions(range: vscode.Range): CompletionItem[] {
  return Object.entries(API_SPEC).map(([label, v]) => {
    let params = Object.keys(v.parameters ?? {});
    let item = new CompletionItem(label, CompletionItemKind.Function);
    item.detail = v.detail;
    item.documentation = md(v.documentation);
    item.range = range;
    return item;
  });
}

export function init(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(LANG_ID, {
      provideCompletionItems(document, position, token, context) {
        const text = document.getText();
        const { cst } = parseCst(text);
        const name = getWordAtPosition(document, position);
        const { location, word } = name ?? {
          location: new Range(position, position),
          word: "",
        };
        const suggestions: CompletionItem[] = [];

        LOG2(`Querying completions at ${location} (typing: ${word})`);

        // Are we inside an expression or a statement?
        const ctxTree = contextVisitor.program(
          cst.children,
          new Range(0, 0, document.lineCount + 1, 0)
        );

        LOG2(`${ctxTree}`);

        const ctx = ctxTree.queryRange(location);
        if (!ctx)
          return [...KeywordCompletions, ...getApiCompletions(location)];

        LOG2(`context under cursor: ${ctx}`);

        switch (ctx.kind) {
          case ContextKind.Identifier:
            // expecting a fresh identifier, no suggestions
            break;
          case ContextKind.Statement:
            suggestions.push(...KeywordCompletions);
          case ContextKind.Expression:
            suggestions.push(...getScopeCompletions(text, location));
            suggestions.push(...getApiCompletions(location));
        }

        return suggestions;
      },
    }),

    vscode.languages.registerHoverProvider(LANG_ID, {
      provideHover(document, position, token) {
        let name = getWordAtPosition(document, position);
        if (!name) return;
        let { location, word } = name;

        let match = API_KEYS.find((k) => k === word);
        if (match === undefined) return;
        let doc = md(API_SPEC[match]?.documentation);
        if (!doc) return;
        // todo: tokenize & show user docstrings

        return new vscode.Hover(
          ["```c\n(intrinsic function)\n```", doc],
          location
        );
      },
    }),

    vscode.languages.registerDefinitionProvider(LANG_ID, {
      provideDefinition(document, position, token) {
        let name = getWordAtPosition(document, position);
        if (!name) return;

        const ast = parseProgram(document.getText());
        scopeVisitor.program(ast);

        const definitionLoc = scopeVisitor.queryReferences(name);

        LOG(`definition for ${name}: ${definitionLoc}`);

        return (
          definitionLoc && new vscode.Location(document.uri, definitionLoc.def)
        );
      },
    }),

    vscode.languages.registerReferenceProvider(LANG_ID, {
      provideReferences(document, position, token, context) {
        let name = getWordAtPosition(document, position);
        if (!name) return;

        const ast = parseProgram(document.getText());
        scopeVisitor.program(ast);

        const refs = scopeVisitor.queryReferences(name)?.refs;

        return (
          refs && refs.map((range) => new vscode.Location(document.uri, range))
        );
      },
    }),

    vscode.languages.registerDocumentHighlightProvider(LANG_ID, {
      provideDocumentHighlights(document, position, token) {
        let name = getWordAtPosition(document, position);
        if (!name) return;

        const ast = parseProgram(document.getText());
        scopeVisitor.program(ast);

        const refs = scopeVisitor.queryReferences(name)?.refs;

        return refs && refs.map((range) => new vscode.DocumentHighlight(range));
      },
    }),

    // https://vscode.dev/github/microsoft/vscode/blob/main/extensions/typescript-language-features/src/languageFeatures/rename.ts#L60
    vscode.languages.registerRenameProvider(LANG_ID, {
      provideRenameEdits(document, position, newName, token) {
        let name = getWordAtPosition(document, position);
        if (!name) return;

        const ast = parseProgram(document.getText());
        scopeVisitor.program(ast);

        const queryRes = scopeVisitor.queryReferences(name);
        if (!queryRes) return;
        const { refs } = queryRes;

        const edit = new vscode.WorkspaceEdit();

        refs.forEach((range) => edit.replace(document.uri, range, newName));

        return edit;
      },
    }),

    vscode.languages.registerDocumentSymbolProvider(LANG_ID, {
      provideDocumentSymbols(document, token) {
        const ast = parseProgram(document.getText());
        scopeVisitor.program(ast);

        const defs = [...scopeVisitor.definitions.values()];
        const containerMap = new Map<string, vscode.DocumentSymbol>();
        defs.forEach(({ name: { word: name, location }, container, kind }) => {
          const sym = new vscode.DocumentSymbol(
            name,
            "",
            kind,
            location,
            location
          );

          switch (container) {
            case undefined:
            case GLOBAL_SCOPE_ID: {
              containerMap.set(name, sym);
              break;
            }
            default: {
              const parent = containerMap.get(container);
              parent?.children.push(sym);
            }
          }
        });

        LOG(`# of definitions ${scopeVisitor.definitions.size}`);
        LOG(`# of output document symbols ${containerMap.size}`);

        return [...containerMap.values()];
      },
    }),

    vscode.languages.registerSignatureHelpProvider(
      LANG_ID,
      {
        provideSignatureHelp(document, position, token, context) {
          const result: vscode.SignatureHelp = {
            activeSignature: 0,
            activeParameter: 0,
            signatures: [],
          };

          // Count param separators until the cursor
          const openParen = findPreviousMatch(document, "(", position);

          // We're outside a call site, nothing to show
          if (!openParen) return;

          const beforeTrigger = openParen.start.translate(0, -1);
          const name = getWordAtPosition(document, beforeTrigger);
          if (!name) return;

          let { location, word: callee } = name;

          const rangeSinceParen = openParen.union(
            new Range(position, position)
          );

          const textSinceParen = document.getText(rangeSinceParen);

          LOG(`Requeseted signature for ${callee} in ${textSinceParen}`);

          // Cursor is outside call site, goodbye
          if (textSinceParen.includes(")")) return;

          const paramIdx = [...textSinceParen.matchAll(/,/g)].length;

          const info = API_SPEC[callee];

          if (info) {
            const parameters = info.parameters ?? [];

            // User typed too many commas, goodbye
            if (paramIdx >= parameters.length) return;

            result.signatures.push({
              activeParameter: paramIdx,
              parameters,
              ...info,
            });
          }

          return result;
        },
      },
      "(",
      ","
    )
    // vscode.languages.registerDocumentFormattingEditProvider(LANG_ID, {
    //   provideDocumentFormattingEdits(document, options, token) {
    //     throw TODO;
    //   },
    // });
  );
}
