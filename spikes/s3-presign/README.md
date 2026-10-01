# S-3 presign 비교 스파이크

`npm i aws4fetch` 후 `node r2check.mjs`(키 유효성·버킷 범위), `node presign.mjs`(서명된 Content-Length/Type 강제). 필요한 환경변수: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`. 결과는 docs 브랜치 PROGRESS S-3.
