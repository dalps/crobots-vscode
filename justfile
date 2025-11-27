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

get-docs:
    cd docs && pandoc --extract-media=. --from=html --to=gfm -o crobots_manual.md https://tpoindex.github.io/crobots/docs/crobots_manual.html --verbose
    # bad: pandoc --from=html --to=gfm --embed-resources --standalone -o docs/crobots_manual.md https://tpoindex.github.io/crobots/docs/crobots_manual.html

get-icon:
    inkscape --export-type=png --export-width=128 icons/icon-light.svg
    inkscape --export-type=png --export-width=128 icons/icon-dark.svg
