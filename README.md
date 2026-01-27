# VotePulse - 찬반 설문조사 플랫폼

> 🗳️ 스와이프 한 번으로 의견을 표현하고, 실시간으로 결과를 확인하세요

## 📌 프로젝트 개요

VotePulse는 누구나 쉽게 찬반 설문을 만들고 참여할 수 있는 프로슈머 기반 플랫폼입니다.

### 핵심 가치
- **초간단**: 3초만에 투표, 3분만에 설문 등록
- **프로슈머**: 누구나 설문 등록자이자 응답자
- **인사이트**: 성별/연령대별 교차분석 제공
- **재미**: 내 의견이 다수인지 소수인지 바로 확인

### 타겟 사용자
- 🎯 시간 때우며 가벼운 투표를 즐기고 싶은 일반인
- 📊 빠르고 저렴하게 설문 데이터가 필요한 대학원생/스타트업
- 💬 의견 수렴이 필요한 동아리/팀/소상공인

---

## 🛠 기술 스택

| 구성요소 | 기술 |
|----------|------|
| Frontend | React + Vite + TypeScript |
| Backend | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Cache | Cloudflare KV |
| Auth | Clerk (카카오/네이버/구글) |
| Hosting | Cloudflare Pages |

### 왜 Cloudflare?
- ✅ 서버리스 = 관리할 서버 없음
- ✅ 자동 스케일링 = 트래픽 폭증에도 안심
- ✅ 한국 엣지 = 빠른 응답 속도
- ✅ 넉넉한 무료 티어 = 초기 비용 0원

---

## 📁 프로젝트 구조

```
survey-platform/
├── frontend/                 # React 앱
│   ├── src/
│   │   ├── components/      # UI 컴포넌트
│   │   ├── hooks/           # Custom Hooks
│   │   ├── lib/             # 유틸리티
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── workers/                  # Cloudflare Workers API
│   ├── src/
│   │   ├── index.ts         # 메인 라우터
│   │   ├── routes/          # API 라우트
│   │   └── middleware/      # 미들웨어
│   ├── schema.sql           # D1 스키마
│   └── wrangler.toml        # Workers 설정
│
├── docs/
│   ├── PRD.md               # 제품 요구사항
│   └── TRD.md               # 기술 요구사항
│
├── README.md
├── TODO.md                  # 개발 태스크
└── claude.md                # AI 개발 가이드
```

---

## 🚀 빠른 시작

### 사전 요구사항
- Node.js 18+
- Cloudflare 계정
- Clerk 계정

### 1. 레포지토리 클론
```bash
git clone <repository-url>
cd survey-platform
```

### 2. Frontend 설정
```bash
cd frontend
npm install
cp .env.example .env.local
# .env.local에 VITE_CLERK_PUBLISHABLE_KEY 설정
npm run dev
```

### 3. Workers 설정
```bash
cd workers
npm install
# wrangler.toml에서 D1, KV ID 설정
wrangler secret put CLERK_SECRET_KEY
wrangler d1 execute survey-db --file=schema.sql
wrangler dev
```

### 4. 배포
```bash
# Frontend
cd frontend
npm run build
wrangler pages deploy dist

# Workers
cd workers
wrangler deploy
```

---

## 📖 주요 기능

### MVP (Phase 1)
- [x] 소셜 로그인 (카카오/네이버/구글)
- [x] 찬반 설문 등록 (2~4개 옵션)
- [x] 비로그인 투표 지원
- [x] 실시간 결과 확인
- [x] 성별/연령대별 교차분석
- [x] 결과 공유 (링크/카카오톡)

### Phase 2 (예정)
- [ ] 유료 설문 (예치금 + 기프티콘 리워드)
- [ ] 타겟 설문 (특정 속성만 참여)
- [ ] 응답 품질 필터링

### Phase 3 (예정)
- [ ] 확장 프로필 (학력/직업/종교/건강)
- [ ] 고급 분석 (다중 교차, 시계열)
- [ ] B2B API

---

## 📊 데이터 설계

### 개인정보 원칙
> "프로필 공개"가 아닌 "속성을 통계 분석에 제공"

- 개별 응답 + 개별 프로필 연결 제공 ❌
- 교차분석은 최소 k명 이상일 때만 표시
- 민감정보는 별도 명시적 동의 필요

### 주요 테이블
- `users` - 회원 정보
- `user_profiles` - 프로필 속성 + 공유 동의
- `polls` - 설문 정보
- `responses` - 투표 응답 (익명 포함)

---

## 🔒 보안

- HTTPS Only
- Clerk 토큰 검증
- Fingerprint 기반 중복 투표 방지
- SQL Injection 방지 (Prepared Statements)
- XSS 방지 (React 기본 escaping)

---

## 📈 성능 목표

| 지표 | 목표 |
|------|------|
| 동시 접속 | 10,000명+ |
| 투표 응답 시간 | < 200ms |
| 결과 갱신 | < 1초 |
| 가용성 | 99.9% |

---

## 📝 문서

- [PRD (제품 요구사항)](docs/PRD.md)
- [TRD (기술 요구사항)](docs/TRD.md)
- [개발 태스크](TODO.md)
- [AI 개발 가이드](claude.md)

---

## 🤝 기여

이 프로젝트는 현재 개인 프로젝트로 개발 중입니다.

---

## 📄 라이선스

MIT License
