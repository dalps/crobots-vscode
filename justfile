entrypoints := "src/extension.ts"
common_opts := "--format=cjs --platform=node --external:vscode --outfile='out/extension.js'"

default: build

build:
  esbuild {{entrypoints}} {{common_opts}} --bundle --minify

watch:
  esbuild {{entrypoints}} {{common_opts}} --sourcemap --watch
  

