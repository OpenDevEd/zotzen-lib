emacs -nw package.json
git add index.js package.json;
git commit -m "Quick commit. $1";
git push;
npm publish --access=public
