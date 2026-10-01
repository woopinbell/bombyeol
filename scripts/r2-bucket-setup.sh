#!/usr/bin/env bash
# R2 버킷 운영 설정을 재현한다(G-05). 버킷 생성은 사용자 승인 후 별도로 한다.
#   사용: scripts/r2-bucket-setup.sh <bucket> <허용 출처(쉼표 구분)>
#   예:   scripts/r2-bucket-setup.sh bombyeol-staging-media https://bombyeol-staging.seungwoo7050.workers.dev
set -euo pipefail
bucket="${1:?bucket}"
origins="${2:?origins}"

# 미확정 업로드(pending/ 접두사)는 1일 뒤 만료. 수명주기 규칙은 키 접두사로만 걸린다.
npx wrangler r2 bucket lifecycle add "$bucket" pending-cleanup pending/ --expire-days 1 --force

# 브라우저 직접 업로드(presign PUT)만 허용. 읽기는 서명 GET URL(<img>)이라 CORS가 필요 없다.
cors="$(mktemp)"
trap 'rm -f "$cors"' EXIT
node -e '
const origins = process.argv[1].split(",");
console.log(JSON.stringify({ rules: [{ allowed: { origins, methods: ["PUT"], headers: ["content-type"] }, maxAgeSeconds: 3600 }] }));
' "$origins" > "$cors"
npx wrangler r2 bucket cors set "$bucket" --file "$cors" --force
