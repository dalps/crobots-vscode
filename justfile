entrypoints := "src/extension.ts"
common_opts := "--format=cjs --platform=node --bundle --external:vscode --outfile='out/extension.js'"

default: build

build:
    esbuild {{ entrypoints }} {{ common_opts }} --sourcemap

watch:
    esbuild {{ entrypoints }} {{ common_opts }} --sourcemap --watch

bundle:
    esbuild {{ entrypoints }} {{ common_opts }} --minify

# invokes build command from npm scripts
package version:
    vsce pack {{ version }} -o vsix/

publish:
    vsce publish

stats:
    vsce show dalps.crobots-vscode
