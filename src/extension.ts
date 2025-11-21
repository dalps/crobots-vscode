import * as vscode from "vscode";
import { init as initLanguageFeatures } from "./lang/main";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "extension.runRobot",
    () => {
      vscode.window.showInformationMessage("Not implemented");
    }
  );

  context.subscriptions.push(disposable);

  // todo: push the disposables created by init
  initLanguageFeatures();
}
