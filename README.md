# crobots-vscode

This Visual Studio Code extension provides IntelliSense for the [CROBOTS](https://tpoindex.github.io/crobots) programming language.

## Features

* *Syntax highlighting*
* *Document symbols*: hit Ctrl+Shift+O to display the list of symbols defined in the program
* *Go-to definition*: Ctrl+Click or F12 on a symbol to go to its definition
* *References view*: hit Shift+F12 on a symbol to view all its occurrences
* *Inline suggestions*: context-sensitive autocompletion for keywords, local variables and intrinsic functions
* *Variable renaming*: hit F2 on a symbol to rename all its occurrences 
* *Rich intrinsic function docs*: get signature and mouse-over help for instrinsic functions

The extension works on files with the `.r` extension.

## Dev notes

The language features are powered by a [chevrotain](https://chevrotain.io/docs/) parser written in TypeScript. Issues and pull requests are welcome.

---

This extension was made for the 40th anniversary of CROBOTS. Hope it boosts someone's submission to the [Crobots 2025 Tournament](https://crobots.deepthought.it/home.php?page=tournament2025&link=0). 🥳