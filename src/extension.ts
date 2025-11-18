import * as vscode from "vscode";
import { init } from "./lang/main";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "extension.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed

      // Display a message box to the user
      vscode.window.showInformationMessage("Hello mondo!");
    }
  );

  context.subscriptions.push(disposable);

  init();
}
