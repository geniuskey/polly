# TRD: 찬반 설문조사 플랫폼 기술 설계

## 1. 기술 스택

### 1.1 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare CDN                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐     ┌──────────────────────────────────┐ │
│  │   Cloudflare     │     │       Cloudflare Workers         │ │
│  │     Pages        │────▶│         (API Server)             │ │
│  │  (React SPA)     │     │                                  │ │
│  └──────────────────┘     └──────────┬───────────────────────┘ │
│                                      │                         │
│           ┌──────────────────────────┼──────────────────────┐  │
│           │                          │                      │  │
│           ▼                          ▼                      ▼  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌───────────────┐
│  │  Cloudflare D1  │    │  Cloudflare KV  │    │    Clerk      │
│  │   (SQLite DB)   │    │  (실시간 캐시)   │    │   (Auth)      │
│  └─────────────────┘    └─────────────────┘    └───────────────┘
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 기술 선택 이유

| 구성요소 | 기술 | 선택 이유 |
|----------|------|----------|
| **Frontend** | React + Vite | 빠른 개발, 풍부한 생태계 |
| **Hosting** | Cloudflare Pages | 무료 티어 넉넉, 글로벌 CDN, 한국 엣지 |
| **Backend** | Cloudflare Workers | 서버리스, 자동 스케일, 엣지 실행 |
| **Database** | Cloudflare D1 | 서버리스 SQLite, Workers와 통합 |
| **Cache** | Cloudflare KV | 실시간 투표 카운트, 저지연 |
| **Auth** | Clerk | 소셜 로그인 쉬움, 한국 카카오/네이버 지원 |

---

## 2. 데이터베이스 스키마

### 2.1 ERD

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     users       │     │     polls       │     │    responses    │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ clerk_id        │◀────│ creator_id (FK) │     │ poll_id (FK)    │────▶│
│ created_at      │     │ question        │◀────│ option_index    │
│                 │     │ options (JSON)  │     │ user_id (FK)?   │────▶│
└────────┬────────┘     │ category        │     │ fingerprint     │
         │              │ expires_at      │     │ created_at      │
         │              │ created_at      │     │ age_group?      │
         │              │ is_active       │     │ gender?         │
         ▼              └─────────────────┘     │ region?         │
┌─────────────────┐                            └─────────────────┘
│  user_profiles  │
├─────────────────┤
│ user_id (FK,PK) │
│ gender          │
│ age_group       │
│ region          │
│ share_gender    │
│ share_age_group │
│ share_region    │
│ updated_at      │
└─────────────────┘
```

### 2.2 테이블 정의

#### users
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  clerk_id TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_clerk_id ON users(clerk_id);
```

#### user_profiles
```sql
CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  gender TEXT CHECK (gender IN ('male', 'female', 'other', NULL)),
  age_group TEXT CHECK (age_group IN ('10s', '20s', '30s', '40s', '50s', '60+', NULL)),
  region TEXT, -- 시/도 단위
  share_gender BOOLEAN DEFAULT FALSE,
  share_age_group BOOLEAN DEFAULT FALSE,
  share_region BOOLEAN DEFAULT FALSE,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### polls
```sql
CREATE TABLE polls (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  creator_id TEXT REFERENCES users(id),
  question TEXT NOT NULL,
  options TEXT NOT NULL, -- JSON: ["옵션1", "옵션2", ...]
  category TEXT,
  expires_at DATETIME,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_polls_created_at ON polls(created_at DESC);
CREATE INDEX idx_polls_category ON polls(category);
CREATE INDEX idx_polls_is_active ON polls(is_active);
```

#### responses
```sql
CREATE TABLE responses (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  poll_id TEXT NOT NULL REFERENCES polls(id),
  option_index INTEGER NOT NULL,
  user_id TEXT REFERENCES users(id), -- NULL이면 익명
  fingerprint TEXT NOT NULL, -- 중복 방지용
  gender TEXT, -- 응답 시점 스냅샷 (share 동의한 경우만)
  age_group TEXT,
  region TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(poll_id, fingerprint) -- 설문당 1회 응답
);

CREATE INDEX idx_responses_poll_id ON responses(poll_id);
CREATE INDEX idx_responses_user_id ON responses(user_id);
```

---

## 3. API 설계

### 3.1 엔드포인트 목록

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| GET | `/api/polls` | 설문 목록 (피드) | - |
| GET | `/api/polls/:id` | 설문 상세 + 결과 | - |
| POST | `/api/polls` | 설문 등록 | Required |
| POST | `/api/polls/:id/vote` | 투표 | - |
| GET | `/api/users/me` | 내 정보 | Required |
| PUT | `/api/users/me/profile` | 프로필 수정 | Required |
| GET | `/api/users/me/polls` | 내가 만든 설문 | Required |
| GET | `/api/users/me/votes` | 내가 참여한 설문 | Required |

### 3.2 API 상세

#### GET /api/polls
설문 피드 조회

**Query Parameters:**
```
category?: string   // 카테고리 필터
cursor?: string     // 페이지네이션
limit?: number      // 기본 20, 최대 50
```

**Response:**
```json
{
  "polls": [
    {
      "id": "abc123",
      "question": "짜장면 vs 짬뽕?",
      "options": ["짜장면", "짬뽕"],
      "category": "food",
      "responseCount": 1234,
      "createdAt": "2024-01-15T09:00:00Z",
      "expiresAt": "2024-01-22T09:00:00Z"
    }
  ],
  "nextCursor": "def456"
}
```

#### POST /api/polls/:id/vote
투표 제출

**Request:**
```json
{
  "optionIndex": 0,
  "fingerprint": "browser-fingerprint-hash"
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "total": 1235,
    "options": [
      { "index": 0, "count": 640, "percentage": 51.8 },
      { "index": 1, "count": 595, "percentage": 48.2 }
    ],
    "byAgeGroup": {
      "20s": { "options": [52.1, 47.9], "count": 456 },
      "30s": { "options": [48.3, 51.7], "count": 321 }
    },
    "byGender": {
      "male": { "options": [55.2, 44.8], "count": 567 },
      "female": { "options": [47.1, 52.9], "count": 489 }
    }
  },
  "mySegment": {
    "ageGroup": "20s",
    "gender": "male"
  }
}
```

---

## 4. 실시간 투표 카운트

### 4.1 KV 구조

실시간 카운트는 KV에서 관리하고, 주기적으로 D1과 동기화

```
Key: poll:{pollId}:counts
Value: {
  "total": 1234,
  "options": [640, 595],
  "byGender": {
    "male": [350, 290],
    "female": [290, 305]
  },
  "byAgeGroup": {
    "20s": [200, 180],
    "30s": [150, 170]
  }
}
TTL: 없음 (영구 보관)
```

### 4.2 투표 처리 플로우

```
1. 클라이언트 → Workers: POST /api/polls/:id/vote
2. Workers: fingerprint 중복 체크 (D1)
3. Workers: D1에 response INSERT
4. Workers: KV 카운트 업데이트 (atomic increment)
5. Workers → 클라이언트: 최신 결과 반환
```

### 4.3 KV 업데이트 (Atomic)

```typescript
async function incrementVoteCount(
  kv: KVNamespace,
  pollId: string,
  optionIndex: number,
  demographics: { gender?: string; ageGroup?: string }
) {
  const key = `poll:${pollId}:counts`;
  
  // KV는 atomic increment가 없으므로 read-modify-write
  // 동시성 이슈는 D1이 source of truth이므로 주기적 동기화로 해결
  const current = await kv.get(key, 'json') || initCounts();
  
  current.total++;
  current.options[optionIndex]++;
  
  if (demographics.gender) {
    current.byGender[demographics.gender][optionIndex]++;
  }
  if (demographics.ageGroup) {
    current.byAgeGroup[demographics.ageGroup][optionIndex]++;
  }
  
  await kv.put(key, JSON.stringify(current));
  return current;
}
```

---

## 5. 중복 투표 방지

### 5.1 Fingerprint 생성 (클라이언트)

```typescript
async function generateFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    // Canvas fingerprint
    await getCanvasFingerprint(),
  ];
  
  const raw = components.join('|');
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### 5.2 서버 검증

```typescript
// D1 UNIQUE constraint로 1차 방어
// poll_id + fingerprint 조합 unique

async function checkDuplicate(db: D1Database, pollId: string, fingerprint: string): Promise<boolean> {
  const existing = await db
    .prepare('SELECT 1 FROM responses WHERE poll_id = ? AND fingerprint = ?')
    .bind(pollId, fingerprint)
    .first();
  return !!existing;
}
```

---

## 6. 인증 (Clerk)

### 6.1 Clerk 설정

```typescript
// 지원 소셜 로그인
const socialConnections = [
  'kakao',    // 카카오
  'naver',    // 네이버  
  'google',   // 구글
];
```

### 6.2 Workers에서 인증 확인

```typescript
import { verifyToken } from '@clerk/backend';

async function authenticateRequest(request: Request, env: Env): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    const payload = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
    });
    return payload.sub; // clerk_id
  } catch {
    return null;
  }
}
```

---

## 7. 프로젝트 구조

```
survey-platform/
├── frontend/                 # React 앱
│   ├── src/
│   │   ├── components/
│   │   │   ├── PollCard.tsx
│   │   │   ├── PollFeed.tsx
│   │   │   ├── CreatePoll.tsx
│   │   │   ├── Results.tsx
│   │   │   └── Profile.tsx
│   │   ├── hooks/
│   │   │   ├── usePolls.ts
│   │   │   └── useAuth.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── fingerprint.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── workers/                  # Cloudflare Workers
│   ├── src/
│   │   ├── index.ts         # 메인 라우터
│   │   ├── routes/
│   │   │   ├── polls.ts
│   │   │   └── users.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   └── utils/
│   │       └── kv.ts
│   ├── schema.sql           # D1 스키마
│   ├── package.json
│   └── wrangler.toml
│
├── docs/
│   ├── PRD.md
│   ├── TRD.md
│   └── API.md
│
├── README.md
├── TODO.md
└── claude.md
```

---

## 8. 환경 설정

### 8.1 wrangler.toml

```toml
name = "survey-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "survey-db"
database_id = "xxx"

[[kv_namespaces]]
binding = "KV"
id = "xxx"

[vars]
ENVIRONMENT = "production"

# Secrets (wrangler secret put)
# - CLERK_SECRET_KEY
```

### 8.2 환경 변수

| 변수 | 설명 | 설정 방법 |
|------|------|----------|
| CLERK_PUBLISHABLE_KEY | Clerk 공개키 | Frontend .env |
| CLERK_SECRET_KEY | Clerk 비밀키 | wrangler secret |
| DATABASE_ID | D1 데이터베이스 ID | wrangler.toml |
| KV_NAMESPACE_ID | KV 네임스페이스 ID | wrangler.toml |

---

## 9. 배포

### 9.1 Frontend (Cloudflare Pages)

```bash
# 빌드 설정
Build command: npm run build
Build output directory: dist
Root directory: frontend
```

### 9.2 Backend (Cloudflare Workers)

```bash
# 배포
cd workers
wrangler deploy

# D1 마이그레이션
wrangler d1 execute survey-db --file=schema.sql
```

---

## 10. 모니터링

### 10.1 Cloudflare Analytics
- Workers 요청 수, 에러율, 레이턴시
- Pages 방문자 수, 대역폭

### 10.2 커스텀 메트릭 (향후)
- 일일 투표 수
- 설문 등록 수
- 회원 전환율
- 평균 응답 시간

---

## 11. 스케일링 고려사항

### 11.1 D1 제한
- 읽기: 무제한 (엣지 캐시)
- 쓰기: 분당 10,000 (충분)
- 용량: 2GB (충분)

### 11.2 KV 제한
- 읽기: 무제한
- 쓰기: 초당 1,000 (충분)
- 용량: 무제한

### 11.3 병목 예상 지점
- 인기 설문 동시 투표 → KV read-modify-write 충돌
- 해결: 주기적 D1 동기화로 eventual consistency 허용

---

## 12. 보안 체크리스트

- [ ] HTTPS only
- [ ] CORS 설정 (허용 도메인만)
- [ ] Rate limiting (Workers)
- [ ] SQL injection 방지 (prepared statements)
- [ ] XSS 방지 (React 기본 escaping)
- [ ] Clerk 토큰 검증
- [ ] 민감 정보 암호화 (Phase 2)
