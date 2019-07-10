#!/bin/bash

for d in fonts/repos/*; do
	pushd $d
	git pull
	popd
done

python3.6 ~/ttf3web/ttf3web.py --no-munge --axes --formats=woff,woff2 fonts/repos/*/fonts/*.?tf fonts
