import type { VoteCounts } from '../types';

export const initCounts = (optionCount: number): VoteCounts => ({
  total: 0,
  options: new Array(optionCount).fill(0),
  byGender: {},
  byAgeGroup: {},
});

export const getVoteCounts = async (
  kv: KVNamespace,
  pollId: string,
): Promise<VoteCounts | null> => {
  return kv.get(`poll:${pollId}:counts`, 'json');
};

export const incrementVoteCount = async (
  kv: KVNamespace,
  pollId: string,
  optionIndex: number,
  optionCount: number,
  demographics: { gender?: string | null; ageGroup?: string | null },
): Promise<VoteCounts> => {
  const key = `poll:${pollId}:counts`;
  const current =
    (await kv.get<VoteCounts>(key, 'json')) || initCounts(optionCount);

  current.total++;
  current.options[optionIndex]++;

  if (demographics.gender) {
    if (!current.byGender[demographics.gender]) {
      current.byGender[demographics.gender] = new Array(optionCount).fill(0);
    }
    current.byGender[demographics.gender][optionIndex]++;
  }

  if (demographics.ageGroup) {
    if (!current.byAgeGroup[demographics.ageGroup]) {
      current.byAgeGroup[demographics.ageGroup] = new Array(optionCount).fill(
        0,
      );
    }
    current.byAgeGroup[demographics.ageGroup][optionIndex]++;
  }

  await kv.put(key, JSON.stringify(current));
  return current;
};

export const formatResults = (counts: VoteCounts) => {
  const MIN_SAMPLE_SIZE = 5;

  const options = counts.options.map((count, index) => ({
    index,
    count,
    percentage: counts.total > 0 ? (count / counts.total) * 100 : 0,
  }));

  const byGender: Record<string, { options: number[]; count: number }> = {};
  for (const [gender, genderCounts] of Object.entries(counts.byGender)) {
    const total = genderCounts.reduce((a, b) => a + b, 0);
    if (total >= MIN_SAMPLE_SIZE) {
      byGender[gender] = {
        options: genderCounts.map((c) =>
          total > 0 ? (c / total) * 100 : 0,
        ),
        count: total,
      };
    }
  }

  const byAgeGroup: Record<string, { options: number[]; count: number }> = {};
  for (const [ageGroup, ageCounts] of Object.entries(counts.byAgeGroup)) {
    const total = ageCounts.reduce((a, b) => a + b, 0);
    if (total >= MIN_SAMPLE_SIZE) {
      byAgeGroup[ageGroup] = {
        options: ageCounts.map((c) => (total > 0 ? (c / total) * 100 : 0)),
        count: total,
      };
    }
  }

  return {
    total: counts.total,
    options,
    byGender: Object.keys(byGender).length > 0 ? byGender : undefined,
    byAgeGroup: Object.keys(byAgeGroup).length > 0 ? byAgeGroup : undefined,
  };
};
