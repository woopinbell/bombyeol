# S-7 클라이언트 PDF 스파이크

pdf-lib + @pdf-lib/fontkit + Pretendard(TTF, `pretendard` npm). 앱 의존성에 넣지 않은 독립 벤치마크다.

```bash
npm i pdf-lib @pdf-lib/fontkit pretendard playwright-core esbuild pdfjs-dist
cp node_modules/pretendard/dist/public/static/alternative/Pretendard-Regular.ttf font.ttf
npx esbuild entry.js --bundle --format=iife --outfile=bundle.js
printf '<!doctype html><meta charset=utf-8><script src="/bundle.js"></script>' > index.html
python3 -m http.server 8799 &   # 이후 node run.mjs, node verify.mjs
```

결과는 docs 브랜치 `docs/PROGRESS.md` S-7 항목.
