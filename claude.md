# Claude.md - AI 개발 가이드

> 이 문서는 Claude Code가 이 프로젝트를 이해하고 개발을 도울 수 있도록 작성된 가이드입니다.

## 프로젝트 컨텍스트

### 한 줄 요약
한국 대상 찬반 설문조사 웹 플랫폼. 누구나 설문을 만들고 참여할 수 있는 프로슈머 모델.

### 핵심 원칙
1. **초간단 UX** - 3초 투표, 3분 설문 등록
2. **프라이버시 퍼스트** - "프로필 공개"가 아닌 "통계 분석에 속성 제공"
3. **스케일러블** - 하루 수십만 명 대응 가능한 서버리스 아키텍처
4. **한국 Only** - MVP는 한국어, 한국 소셜 로그인(카카오/네이버)

### 기술 스택
- **Frontend**: React + Vite + TypeScript
- **Backend**: Cloudflare Workers (TypeScript)
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **Auth**: Clerk

---

## 개발 규칙

### 코드 스타일

#### TypeScript
```typescript
// ✅ 함수형 컴포넌트 + 화살표 함수
const PollCard = ({ poll }: { poll: Poll }) => {
  // ...
};

// ✅ 타입은 별도 정의
interface Poll {
  id: string;
  question: string;
  options: string[];
}

// ✅ async/await 사용
const fetchPolls = async (): Promise<Poll[]> => {
  const response = await fetch('/api/polls');
  return response.json();
};
```

#### 네이밍
```typescript
// 컴포넌트: PascalCase
PollCard, CreatePoll, ResultsChart

// 함수/변수: camelCase
fetchPolls, handleVote, isLoading

// 상수: SCREAMING_SNAKE_CASE
const MAX_OPTIONS = 4;
const API_BASE_URL = '/api';

// 파일명: 컴포넌트는 PascalCase, 나머지는 camelCase
PollCard.tsx, usePolls.ts, api.ts
```

#### 디렉토리 구조
```
components/     # 재사용 가능한 UI 컴포넌트
hooks/          # Custom React Hooks
lib/            # 유틸리티 함수
routes/         # Workers API 라우트
middleware/     # Workers 미들웨어
```

### API 설계

#### 엔드포인트 패턴
```
GET    /api/polls          # 목록 조회
GET    /api/polls/:id      # 단일 조회
POST   /api/polls          # 생성
POST   /api/polls/:id/vote # 투표 (리소스 액션)
```

#### 응답 형식
```typescript
// 성공
{
  "data": { ... },
  "meta": { "cursor": "..." }
}

// 에러
{
  "error": {
    "code": "DUPLICATE_VOTE",
    "message": "이미 투표한 설문입니다"
  }
}
```

#### 에러 코드
```typescript
const ErrorCodes = {
  // 400 Bad Request
  INVALID_INPUT: '입력값이 올바르지 않습니다',
  MISSING_FIELD: '필수 항목이 누락되었습니다',
  
  // 401 Unauthorized
  UNAUTHORIZED: '로그인이 필요합니다',
  INVALID_TOKEN: '유효하지 않은 토큰입니다',
  
  // 403 Forbidden
  FORBIDDEN: '권한이 없습니다',
  
  // 404 Not Found
  POLL_NOT_FOUND: '설문을 찾을 수 없습니다',
  
  // 409 Conflict
  DUPLICATE_VOTE: '이미 투표한 설문입니다',
  
  // 500 Internal Server Error
  INTERNAL_ERROR: '서버 오류가 발생했습니다',
};
```

---

## 주요 데이터 모델

### Poll (설문)
```typescript
interface Poll {
  id: string;
  creatorId: string | null;
  question: string;
  options: string[];  // 2~4개
  category: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}
```

### Response (응답)
```typescript
interface Response {
  id: string;
  pollId: string;
  optionIndex: number;
  userId: string | null;  // null = 익명
  fingerprint: string;
  gender: string | null;      // share 동의 시만 저장
  ageGroup: string | null;
  region: string | null;
  createdAt: string;
}
```

### UserProfile (프로필)
```typescript
interface UserProfile {
  userId: string;
  gender: 'male' | 'female' | 'other' | null;
  ageGroup: '10s' | '20s' | '30s' | '40s' | '50s' | '60+' | null;
  region: string | null;
  shareGender: boolean;     // 통계 분석 제공 동의
  shareAgeGroup: boolean;
  shareRegion: boolean;
}
```

### VoteResult (결과)
```typescript
interface VoteResult {
  total: number;
  options: {
    index: number;
    count: number;
    percentage: number;
  }[];
  byGender?: Record<string, { options: number[]; count: number }>;
  byAgeGroup?: Record<string, { options: number[]; count: number }>;
}
```

---

## 핵심 비즈니스 로직

### 1. 중복 투표 방지
```typescript
// 클라이언트에서 fingerprint 생성
const fingerprint = await generateFingerprint();

// 서버에서 검증
const existing = await db
  .prepare('SELECT 1 FROM responses WHERE poll_id = ? AND fingerprint = ?')
  .bind(pollId, fingerprint)
  .first();

if (existing) {
  throw new Error('DUPLICATE_VOTE');
}
```

### 2. 교차분석 결과 (소표본 제한)
```typescript
const MIN_SAMPLE_SIZE = 5;  // 최소 표본 수

function filterSmallSamples(results: SegmentResult): SegmentResult {
  return Object.fromEntries(
    Object.entries(results).filter(([_, data]) => data.count >= MIN_SAMPLE_SIZE)
  );
}
```

### 3. 프로필 속성 저장 (동의 시만)
```typescript
// 투표 시 프로필 스냅샷
const demographics = {
  gender: profile.shareGender ? profile.gender : null,
  ageGroup: profile.shareAgeGroup ? profile.ageGroup : null,
  region: profile.shareRegion ? profile.region : null,
};
```

### 4. KV 실시간 카운트
```typescript
// 투표 시 KV 업데이트
const key = `poll:${pollId}:counts`;
const counts = await kv.get(key, 'json') || initCounts(optionCount);

counts.total++;
counts.options[optionIndex]++;

if (demographics.gender) {
  counts.byGender[demographics.gender][optionIndex]++;
}

await kv.put(key, JSON.stringify(counts));
```

---

## 주의사항

### 보안
- [ ] 모든 사용자 입력 검증 (질문 길이, 옵션 개수 등)
- [ ] SQL은 반드시 Prepared Statement 사용
- [ ] Clerk 토큰은 서버에서 검증
- [ ] 민감 정보 로깅 금지

### 성능
- [ ] KV 캐시 적극 활용
- [ ] 무거운 집계는 비동기로
- [ ] 페이지네이션 필수 (cursor 기반)

### UX
- [ ] 로딩 상태 표시 (스켈레톤)
- [ ] 에러 메시지 한글로
- [ ] 모바일 우선 디자인

---

## 자주 하는 작업

### 새 API 엔드포인트 추가
1. `workers/src/routes/`에 라우트 파일 생성 또는 수정
2. `workers/src/index.ts`에 라우트 등록
3. 타입 정의 추가
4. 테스트

### 새 컴포넌트 추가
1. `frontend/src/components/`에 컴포넌트 파일 생성
2. Props 타입 정의
3. 스토리북 or 실제 페이지에서 테스트

### D1 스키마 변경
1. `workers/schema.sql` 수정
2. 마이그레이션 SQL 작성
3. `wrangler d1 execute survey-db --file=migration.sql`

---

## 참고 문서

- [PRD (제품 요구사항)](docs/PRD.md) - 기능 요구사항, 페르소나
- [TRD (기술 요구사항)](docs/TRD.md) - 아키텍처, API 상세, DB 스키마
- [TODO](TODO.md) - 개발 태스크 목록

---

## 빠른 명령어

```bash
# Frontend 개발 서버
cd frontend && npm run dev

# Workers 로컬 테스트
cd workers && wrangler dev

# D1 쿼리 실행
wrangler d1 execute survey-db --command "SELECT * FROM polls LIMIT 10"

# 배포
cd frontend && npm run build && wrangler pages deploy dist
cd workers && wrangler deploy
```
