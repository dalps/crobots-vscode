import * as vscode from "vscode";
import { initLanguageFeatures, updateDiagnostics } from "./lang/main";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.runRobot", () => {
      vscode.window.showInformationMessage("Not implemented");
    })
  );

  const collection = vscode.languages.createDiagnosticCollection("crobots");

  vscode.window.activeTextEditor &&
    updateDiagnostics(vscode.window.activeTextEditor.document, collection);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        updateDiagnostics(editor.document, collection);
      }
    }),

    vscode.workspace.onDidChangeTextDocument((e) =>
      updateDiagnostics(e.document, collection)
    )
  );

  initLanguageFeatures(context);
}
