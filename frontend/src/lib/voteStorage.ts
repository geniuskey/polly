const STORAGE_KEY = 'vibepulse_votes';

interface StoredVote {
  optionIndex: number;
  votedAt: string;
}

type VoteStorage = Record<string, StoredVote>;

const getStorage = (): VoteStorage => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const setStorage = (storage: VoteStorage) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch {
    // localStorage might be full or disabled
  }
};

export const saveVote = (pollId: string, optionIndex: number) => {
  const storage = getStorage();
  storage[pollId] = {
    optionIndex,
    votedAt: new Date().toISOString(),
  };
  setStorage(storage);
};

export const getVote = (pollId: string): number | null => {
  const storage = getStorage();
  return storage[pollId]?.optionIndex ?? null;
};

export const hasVoted = (pollId: string): boolean => {
  const storage = getStorage();
  return pollId in storage;
};
