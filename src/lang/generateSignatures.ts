import { generateCstDts } from "chevrotain";
import { PARSER } from "./src/cst_parser.ts";
import { resolve, dirname } from "node:path";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const productions = PARSER.getGAstProductions();
const dts = generateCstDts(productions);
const dtsPath = resolve(__dirname, "src", "cst_parser.d.ts");

writeFileSync(dtsPath, dts);
