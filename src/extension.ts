import * as vscode from "vscode";
import { initLanguageFeatures, updateDiagnostics } from "./lang/main";

export function activate(context: vscode.ExtensionContext) {
  const collection = vscode.languages.createDiagnosticCollection("crobots");

  vscode.window.activeTextEditor &&
    updateDiagnostics(vscode.window.activeTextEditor.document, collection);

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.runRobot", () => {
      vscode.window.showInformationMessage("Not implemented");
    }),

    vscode.commands.registerCommand("extension.openManual", () => {
      vscode.commands.executeCommand(
        "simpleBrowser.api.open",
        vscode.Uri.parse(
          "https://tpoindex.github.io/crobots/docs/crobots_manual.html"
        ),
        {
          viewColumn: vscode.ViewColumn.Beside,
        }
      );
    }),

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
