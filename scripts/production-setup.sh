#!/usr/bin/env bash
# 프로덕션 리소스 만들기(출시 마무리 안내서 "프로덕션 만들기"). 돈, 계정이 걸린 일이라 사람이 직접 실행한다.
# 세션은 이 스크립트를 실행하지 않는다(CLAUDE.md: 클라우드 리소스 생성은 지시가 있을 때만).
#   사용: scripts/production-setup.sh <https://도메인> <Supabase 프로덕션 직결 연결 문자열> --yes
# 하는 일: R2 버킷 bombyeol-media 생성과 운영 설정(수명주기, CORS), Hyperdrive bombyeol 생성.
# 끝나면 출력되는 Hyperdrive id를 wrangler.jsonc env.production.hyperdrive에 넣고, 시크릿을 등록한다.
set -euo pipefail
origin="${1:?https://도메인}"
database_url="${2:?Supabase 프로덕션 연결 문자열}"
[ "${3:-}" = "--yes" ] || { echo "확인: 끝에 --yes를 붙여야 실행합니다(리소스가 만들어집니다)." >&2; exit 2; }

bucket="bombyeol-media"
if npx wrangler r2 bucket list 2>/dev/null | grep -q "name:\s*$bucket$"; then
  echo "R2 $bucket: 이미 있음"
else
  npx wrangler r2 bucket create "$bucket"
fi
"$(dirname "$0")/r2-bucket-setup.sh" "$bucket" "$origin"

if npx wrangler hyperdrive list 2>/dev/null | grep -q "bombyeol "; then
  echo "Hyperdrive bombyeol: 이미 있음(id는 wrangler hyperdrive list로 확인)"
else
  npx wrangler hyperdrive create bombyeol --connection-string="$database_url"
fi

cat <<NEXT

다음(출시 마무리 안내서 순서대로):
1. 위 Hyperdrive id를 wrangler.jsonc env.production.hyperdrive에 넣고 APP_ORIGIN에 $origin 을 넣어 커밋
2. 시크릿 등록: npx wrangler secret put <이름> --env production
   AUTH_SECRET(새로 생성), AUTH_KAKAO_ID, AUTH_KAKAO_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET,
   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY(이 버킷만 권한), FIREBASE_ADMIN_*
3. GitHub 시크릿 PRODUCTION_DATABASE_URL 등록 뒤 Actions의 Migrate production DB 실행
4. npm run cf:deploy:production, node scripts/smoke-staging.mjs $origin
NEXT
