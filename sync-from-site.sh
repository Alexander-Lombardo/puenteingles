#!/bin/sh
# Copy the deployed English course (site/english, incl. generated audio) into this repo.
# Run after `node site/tools/sync.js`, then commit + push to publish at puenteingles.app.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
SRC="$HERE/../site/english"
rsync -a --delete \
  --exclude '.git' --exclude '.DS_Store' --exclude 'README.md' --exclude 'reference/' --exclude 'lessons/' \
  --exclude 'CNAME' --exclude '.nojekyll' --exclude 'robots.txt' --exclude 'sync-from-site.sh' --exclude 'README-repo.md' \
  "$SRC/" "$HERE/"
echo "puenteingles: $(find "$HERE" -type f -not -path '*/.git/*' | wc -l | tr -d ' ') files, $(du -sh "$HERE" | cut -f1)"
