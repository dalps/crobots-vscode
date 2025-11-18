entrypoints := "src/extension.ts"
common_opts := "--format=cjs --platform=node --bundle --external:vscode --outfile='out/extension.js'"

default: build

build:
  esbuild {{entrypoints}} {{common_opts}} --minify

watch:
  esbuild {{entrypoints}} {{common_opts}} --sourcemap --watch
  

