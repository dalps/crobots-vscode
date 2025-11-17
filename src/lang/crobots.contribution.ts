import * as monaco from "monaco-editor";
import { API_SPEC } from "./api";

export const ROBOT_CONF: monaco.languages.LanguageConfiguration = {
  brackets: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
  ],

  comments: {
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },

  // indentationRules: {
  //   decreaseIndentPattern: /^\s*[\}\]\)].*$/m,
  //   increaseIndentPattern: /^.*(\{[^}]*|\([^)]*|\[[^\]]*)$/m,
  //   // e.g.  * ...| or */| or *-----*/|
  //   unIndentedLinePattern:
  //     "^(\\t|[ ])*[ ]\\*[^/]*\\*/\\s*$|^(\\t|[ ])*[ ]\\*/\\s*$|^(\\t|[ ])*\\*([ ]([^\\*]|\\*(?!/))*)?$"
  //   ,
  //   indentNextLinePattern:
  //     /^((.*=>\\s*)|((.*[^\w]+|\s*)((if|while|for)\s*\(.*\)\s*|else\s*)))$/,
  // },

  onEnterRules: [
    // Indent when pressing enter from inside {}
    // Not needed, it's the default behavior
    {
      beforeText: new RegExp("^.*\\{[^\\}]*$"),
      afterText: new RegExp("^\\s*\\}.*$"),
      action: {
        indentAction: monaco.languages.IndentAction.IndentOutdent,
        appendText: "\t",
      },
    },
    {
      beforeText: /^.*\{[^\}]*$/m,
      afterText: /^\s*\}.*$/m,
      action: {
        indentAction: monaco.languages.IndentAction.Indent,
      },
    },
    {
      // e.g. /** | */
      beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
      afterText: /^\s*\*\/$/,
      action: {
        indentAction: monaco.languages.IndentAction.IndentOutdent,
        appendText: " * ",
      },
    },
    {
      // e.g. /** ...|
      beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
      action: {
        indentAction: monaco.languages.IndentAction.None,
        appendText: " * ",
      },
    },
    {
      // e.g.  * ...|
      beforeText: /^(\t|(\ \ ))*\ \*(\ ([^\*]|\*(?!\/))*)?$/,
      action: {
        indentAction: monaco.languages.IndentAction.None,
        appendText: "* ",
      },
    },
    {
      // e.g.  */|
      beforeText: /^(\t|(\ \ ))*\ \*\/\s*$/,
      action: {
        indentAction: monaco.languages.IndentAction.None,
        removeText: 1,
      },
    },
  ],

  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },

    { open: "'", close: "'", notIn: ["string", "comment"] },
    { open: '"', close: '"', notIn: ["string"] },

    { open: "/*", close: " */" },
    { open: "/**", close: " */" },
  ],
};

export const TYPE_KEYWORDS = ["int"];
export const KEYWORDS = [
  "do",
  "if",
  "else",
  "return",
  "while",
  "true",
  "false",
];

export const INTRINSICS = Object.keys(API_SPEC);
export const IDE_REGEX = /[a-zA-Z_][\w_]*/;

export const ROBOT_LANG: monaco.languages.IMonarchLanguage = {
  defaultToken: "invalid",
  tokenPostfix: ".r",

  intrinsics: INTRINSICS,

  keywords: KEYWORDS,

  typeKeywords: TYPE_KEYWORDS,

  operators: [
    "=",
    ">",
    "<",
    "!",
    "~",
    "?",
    ":",
    "==",
    "<=",
    ">=",
    "!=",
    "&&",
    "||",
    "++",
    "--",
    "+",
    "-",
    "*",
    "/",
    "&",
    "|",
    "^",
    "%",
    "<<",
    ">>",
    "+=",
    "-=",
    "*=",
    "/=",
    "&=",
    "|=",
    "^=",
    "%=",
    "<<=",
    ">>=",
  ],

  symbols: /[=><!~&|+\-*\/\^%]+/,

  // C# style strings
  escapes:
    /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  tokenizer: {
    root: [
      // identifiers and keywords
      [
        IDE_REGEX,
        {
          cases: {
            "@intrinsics": "intrinsic",
            "@typeKeywords": "keyword",
            "@keywords": "keyword",
            "@default": "identifier",
          },
        },
      ],

      // whitespace
      { include: "@whitespace" },

      // delimiters and operators
      [/[{}()\[\]]/, "@brackets"],
      [/[<>](?!@symbols)/, "@brackets"],
      [/@symbols/, { cases: { "@operators": "operator", "@default": "" } }],

      // @ annotations.
      // As an example, we emit a debugging log message on these tokens.
      // Note: message are supressed during the first load -- change some lines to see them.
      [
        /@\s*[a-zA-Z_\$][\w\$]*/,
        { token: "annotation", log: "annotation token: $0" },
      ],

      // numbers
      [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
      [/0[xX][0-9a-fA-F]+/, "number.hex"],
      [/\d+/, "number"],

      // delimiter: after number because of .\d floats
      [/[;,.]/, "delimiter"],

      // strings
      [/"([^"\\]|\\.)*$/, "string.invalid"], // non-teminated string
      [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],

      // characters
      [/'[^\\']'/, "string"],
      [/(')(@escapes)(')/, ["string", "string.escape", "string"]],
      [/'/, "string.invalid"],
    ],

    comment: [
      [/[^\/*]+/, "comment"],
      [/\/\*/, "comment", "@push"], // nested comment
      ["\\*/", "comment", "@pop"],
      [/[\/*]/, "comment"],
    ],

    string: [
      [/[^\\"]+/, "string"],
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
      [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
    ],

    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"],
    ],
  },
};
