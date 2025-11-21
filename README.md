# crobots-vscode

This Visual Studio Code extension provides IntelliSense for the [CROBOTS](https://tpoindex.github.io/crobots) programming language.

## Features

* *Syntax highlighting*
* *Document symbols*: hit Ctrl+Shift+O to display a list of definitions
* *Go-to definition*: Ctrl+click or F12 on a symbol to go to its definition
* *References view*: hit Shift+F12 on a symbol to see its definition and occurrences
* *Inline suggestions*: context-sensitive autocompletion for keywords, local variables and intrinsic functions
* *Variable renaming*: hit F2 on a symbol to rename all its occurrences 
* *Rich intrinsic function docs*: signature and mouse-over help

The extension works on files with the `.r` extension.

## Dev notes

The language features are powered by a [chevrotain](https://chevrotain.io/docs/) parser written in TypeScript. I've adapted it from an earlier CROBOTS-inspired web project that's on the back burner, also this is my first time making something close to a language server. Issues and pull requests are welcome.

---

## 🥳

This extension was made for the 40th anniversary of CROBOTS.
Here's to a great game that made history! 🥂