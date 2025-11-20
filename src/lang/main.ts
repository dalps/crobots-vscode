import type { CompletionItem } from "vscode";
import * as vscode from "vscode";
import { Range } from "vscode";
import { API_SPEC } from "../lang/api";
import { Maybe, parseProgram } from "../lang/ast_visitor";
import { ContextKind, stringOfContextKind } from "../lang/context";
import { defaultVisitor as contextVisitor } from "../lang/context_cst_visitor";
import { parseProgram as parseCst } from "../lang/cst_parser";
import { LocatedName, showRange } from "../lang/loc_utils";
import { defaultVisitor as scopeVisitor } from "../lang/scope_visitor";
import { ROBOT_LANG } from "./crobots.contribution";
import { LOG } from "./utils";

export const LANG_ID = "crobots";
export const THEME_ID = "robotTheme";

const { SymbolKind, CompletionItemKind } = vscode;

// vscode.languages.setMonarchTokensProvider(LANG_ID, ROBOT_LANG);

const API_KEYS = Object.keys(API_SPEC);
const KEYWORDS: string[] = ROBOT_LANG["keywords"].concat(
  ROBOT_LANG["typeKeywords"]
);

export function getScopeCompletions(
  document: vscode.TextDocument,
  range: vscode.Range
): vscode.CompletionItem[] {
  const text = document.getText();
  const { cst } = parseCst(text);
  const ast = parseProgram(text);

  scopeVisitor.program(ast);

  const ctxTree = contextVisitor.program(
    cst.children,
    new Range(0, 0, document.lineCount + 1, 0)
  );

  // are dealing with an expression or a statement?
  const context = ctxTree.queryRange(range);

  LOG(`
Context under cursor ${range}: ${stringOfContextKind(context?.kind)}
${context}`);

  const suggestions: CompletionItem[] = [];

  switch (context?.kind) {
    case ContextKind.Identifier:
      // no suggestions
      break;
    case ContextKind.Statement:
      suggestions.push(...getKeywordCompletions(range));
    case ContextKind.Expression:
      suggestions.push(
        ...scopeVisitor.queryCompletions(range).map(
          ({
            name: { word: name, location },
            container,
            kind,
          }): CompletionItem => ({
            label: name,
            insertText: name,
            detail: `(${
              kind === SymbolKind.Function ? "function" : "variable"
            })`,
            documentation: `*Defined in ${container}, line ${location.start.line}*`,
            range,
            kind:
              kind === SymbolKind.Function
                ? CompletionItemKind.Function
                : CompletionItemKind.Variable,
            // you could sort sort based on locality
          })
        )
      );
      suggestions.push(...getApiCompletions(range));
  }

  return suggestions;
}

export function getKeywordCompletions(range: vscode.Range): CompletionItem[] {
  return KEYWORDS.map((k) => ({
    label: k,
    insertText: k,
    kind: CompletionItemKind.Keyword,
    range,
  }));
}

export function getApiCompletions(range: vscode.Range): CompletionItem[] {
  return Object.entries(API_SPEC).map(([label, v]) => {
    let params = Object.keys(v.parameters ?? {});
    return {
      label,
      detail: v.detail,
      documentation: v.documentation,
      kind: CompletionItemKind.Function,
      insertText: label,
      range,
    };
  });
}

export function init() {
  Range.toString = function (this: vscode.Range) {
    return `[${this.start.line}:${this.start.character}-${this.end.line}:${this.end.character}]`;
  };

  vscode.languages.registerCompletionItemProvider(LANG_ID, {
    provideCompletionItems(document, position, token, context) {
      let name = getWordAtPosition(document, position);
      if (!name) return;
      let { location, word } = name;

      let matches = KEYWORDS.concat(API_KEYS).filter((k) => k.includes(word));

      return {
        items:
          matches.length <= 0 ? [] : getScopeCompletions(document, location),
      };
    },
  });

  vscode.languages.registerHoverProvider(LANG_ID, {
    provideHover(document, position, token) {
      let name = getWordAtPosition(document, position);
      if (!name) return;
      let { location, word } = name;

      let match = API_KEYS.find((k) => k === word);

      if (match === undefined) return;

      // todo: tokenize & show docstrings

      return {
        contents: [API_SPEC[match].documentation ?? ""],
        range: location,
      };
    },
  });

  function getWordAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Maybe<LocatedName> {
    let location = document.getWordRangeAtPosition(position);
    if (!location) return;
    let word = document.getText(location);

    return new LocatedName(word, location);
  }

  vscode.languages.registerDefinitionProvider(LANG_ID, {
    provideDefinition(document, position, token) {
      let name = getWordAtPosition(document, position);
      if (!name) return;

      const ast = parseProgram(document.getText());
      scopeVisitor.program(ast);

      const definitionLoc = scopeVisitor.queryReferences(name);

      LOG(`definition for ${name}: ${definitionLoc}`);
      return definitionLoc && { range: definitionLoc.def, uri: document.uri };
    },
  });

  vscode.languages.registerReferenceProvider(LANG_ID, {
    provideReferences(document, position, token, context) {
      let name = getWordAtPosition(document, position);
      if (!name) return;
      let { location, word } = name;

      const ast = parseProgram(document.getText());
      scopeVisitor.program(ast);

      const refs = word && scopeVisitor.queryReferences(name);

      if (refs) {
        return refs.refs.map((range) => ({ range, uri: document.uri }));
      }
    },
  });

  vscode.languages.registerDocumentHighlightProvider(LANG_ID, {
    provideDocumentHighlights(document, position, token) {
      let name = getWordAtPosition(document, position);
      if (!name) return;
      let { location, word } = name;

      const ast = parseProgram(document.getText());
      scopeVisitor.program(ast);

      const refs = word && scopeVisitor.queryReferences(name);

      if (refs) {
        return refs.refs.map((range) => ({ range }));
      }
    },
  });

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
  });

  vscode.languages.registerDocumentSymbolProvider(LANG_ID, {
    provideDocumentSymbols(document, token) {
      const ast = parseProgram(document.getText());
      scopeVisitor.program(ast);

      LOG(`number of definitions: ${scopeVisitor.definitions.size}`);

      const symbols: vscode.DocumentSymbol[] = [
        ...scopeVisitor.definitions.values(),
      ].map(
        ({ name: { word: name, location }, container, kind }) =>
          new vscode.DocumentSymbol(name, "", kind, location, location)
      );

      return symbols;
    },
  });

  // Replacement for ITextModel.findPreviousMatch
  function findPreviousMatch(
    document: vscode.TextDocument,
    searchString: string,
    position: vscode.Position
  ) {
    const line = document.lineAt(position.line);
    const res = line.text.search(searchString);
    return res === -1
      ? undefined
      : new Range(
          position.line,
          res,
          res + searchString.length - 1,
          position.line
        );
  }

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

        const beforeTrigger = openParen.start;
        const name = getWordAtPosition(document, beforeTrigger);
        if (!name) return;

        let { location, word: callee } = name;

        const rangeSinceParen = openParen.union(new Range(position, position));

        const textSinceParen = document.getText(rangeSinceParen);

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
  );
}

// vscode.languages.registerDocumentFormattingEditProvider(LANG_ID, {
//   provideDocumentFormattingEdits(document, options, token) {
//     throw TODO;
//   },
// });
