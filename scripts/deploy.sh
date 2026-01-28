#!/bin/bash
set -e

echo "========================================="
echo "  VotePulse 배포 스크립트"
echo "========================================="

# 1. 로그인 확인
echo ""
echo "[1/6] Cloudflare 로그인 확인..."
if ! npx wrangler whoami 2>/dev/null | grep -q "Account"; then
  echo "  -> 로그인이 필요합니다. 브라우저에서 로그인하세요."
  npx wrangler login
fi
echo "  -> 로그인 확인 완료"

# 2. D1 데이터베이스 생성 (없으면)
echo ""
echo "[2/6] D1 데이터베이스 확인..."
DB_ID=$(npx wrangler d1 list 2>/dev/null | grep "survey-db" | awk '{print $1}')
if [ -z "$DB_ID" ]; then
  echo "  -> survey-db 생성 중..."
  npx wrangler d1 create survey-db
  DB_ID=$(npx wrangler d1 list 2>/dev/null | grep "survey-db" | awk '{print $1}')
  echo "  -> 생성 완료: $DB_ID"
else
  echo "  -> 이미 존재: $DB_ID"
fi

# 3. KV 네임스페이스 생성 (없으면)
echo ""
echo "[3/6] KV 네임스페이스 확인..."
KV_ID=$(npx wrangler kv namespace list 2>/dev/null | grep -A1 "votepulse-cache" | grep "id" | awk -F'"' '{print $4}')
if [ -z "$KV_ID" ]; then
  echo "  -> votepulse-cache 생성 중..."
  npx wrangler kv namespace create "votepulse-cache"
  KV_ID=$(npx wrangler kv namespace list 2>/dev/null | grep -A1 "votepulse-cache" | grep "id" | awk -F'"' '{print $4}')
  echo "  -> 생성 완료: $KV_ID"
else
  echo "  -> 이미 존재: $KV_ID"
fi

echo ""
echo "========================================="
echo "  리소스 ID 확인"
echo "========================================="
echo "  D1 ID: $DB_ID"
echo "  KV ID: $KV_ID"
echo ""
echo "  !! wrangler.toml의 placeholder를 위 ID로 교체하세요 !!"
echo "  !! 그 다음 아래 명령어를 순서대로 실행하세요 !!"
echo ""
echo "========================================="
echo "  배포 명령어"
echo "========================================="
echo ""
echo "  # 1. D1 스키마 마이그레이션"
echo "  cd workers"
echo "  npx wrangler d1 execute survey-db --file=schema.sql --remote"
echo ""
echo "  # 2. Clerk Secret Key 등록"
echo "  npx wrangler secret put CLERK_SECRET_KEY"
echo ""
echo "  # 3. Workers 배포"
echo "  npx wrangler deploy"
echo ""
echo "  # 4. Frontend 빌드 & Pages 배포"
echo "  cd ../frontend"
echo "  npm run build"
echo "  npx wrangler pages deploy dist --project-name=votepulse"
echo ""
echo "========================================="
