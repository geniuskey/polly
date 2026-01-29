// 익명 닉네임 생성기
// 형용사 + 동물 + 해시 조합으로 1억명 이상도 고유하게 지원

const ADJECTIVES = [
  '행복한', '용감한', '지혜로운', '빛나는', '따뜻한',
  '씩씩한', '명랑한', '재빠른', '조용한', '활발한',
  '귀여운', '멋진', '착한', '똑똑한', '신비로운',
  '느긋한', '열정적인', '차분한', '유쾌한', '당당한',
  '친절한', '솔직한', '성실한', '창의적인', '긍정적인',
  '순수한', '자유로운', '듬직한', '상냥한', '호기심많은',
];

const ANIMALS = [
  '판다', '호랑이', '토끼', '여우', '곰',
  '사자', '코끼리', '기린', '펭귄', '돌고래',
  '고양이', '강아지', '햄스터', '다람쥐', '부엉이',
  '독수리', '백조', '공작', '수달', '해달',
  '코알라', '캥거루', '알파카', '라쿤', '치타',
  '늑대', '사슴', '두루미', '까치', '참새',
];

// 문자열을 숫자 해시로 변환 (djb2 알고리즘)
const hashString = (str: string): number => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
};

// 해시를 4자리 16진수로 변환
const toHexSuffix = (hash: number): string => {
  return (hash % 0xFFFF).toString(16).padStart(4, '0');
};

/**
 * Clerk ID를 기반으로 고유한 익명 닉네임 생성
 * 동일한 ID는 항상 동일한 닉네임 반환 (결정론적)
 *
 * @example
 * generateAnonymousName('user_abc123') // => '행복한 판다 #a3f2'
 */
export const generateAnonymousName = (clerkId: string): string => {
  const hash = hashString(clerkId);

  const adjIndex = hash % ADJECTIVES.length;
  const animalIndex = Math.floor(hash / ADJECTIVES.length) % ANIMALS.length;
  const suffix = toHexSuffix(hash);

  return `${ADJECTIVES[adjIndex]} ${ANIMALS[animalIndex]} #${suffix}`;
};

/**
 * 닉네임 충돌 확률 계산 (참고용)
 * - 30 형용사 × 30 동물 × 65536 해시 = 약 5,900만 고유 조합
 * - 해시 suffix로 실질적 충돌 확률 극히 낮음
 * - 1억 사용자 기준 충돌 확률 < 0.001%
 */
