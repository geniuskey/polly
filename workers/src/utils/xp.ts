import type { Env } from '../types';
import { XP_REWARDS, getLevelFromXp } from '../types';

export async function addXp(
  db: Env['survey_db'],
  userId: string,
  amount: number,
  reason: string
): Promise<{ xp: number; level: number; levelUp: boolean }> {
  // Get current user XP
  const user = await db.prepare(
    'SELECT xp, level FROM users WHERE id = ?'
  ).bind(userId).first<{ xp: number; level: number }>();

  if (!user) {
    return { xp: 0, level: 1, levelUp: false };
  }

  const oldLevel = user.level || 1;
  const newXp = (user.xp || 0) + amount;
  const newLevel = getLevelFromXp(newXp);
  const levelUp = newLevel > oldLevel;

  // Update user XP and level
  await db.prepare(
    'UPDATE users SET xp = ?, level = ? WHERE id = ?'
  ).bind(newXp, newLevel, userId).run();

  // Record XP history
  await db.prepare(
    'INSERT INTO xp_history (user_id, amount, reason) VALUES (?, ?, ?)'
  ).bind(userId, amount, reason).run();

  return { xp: newXp, level: newLevel, levelUp };
}

export async function addVoteXp(
  db: Env['survey_db'],
  userId: string
): Promise<{ xp: number; level: number; levelUp: boolean; dailyBonus: boolean }> {
  // Check if user already got daily bonus today
  const today = new Date().toISOString().split('T')[0];
  const user = await db.prepare(
    'SELECT last_daily_bonus FROM users WHERE id = ?'
  ).bind(userId).first<{ last_daily_bonus: string | null }>();

  let dailyBonus = false;
  let totalXp = XP_REWARDS.VOTE;

  if (user?.last_daily_bonus !== today) {
    // Give daily bonus
    dailyBonus = true;
    totalXp += XP_REWARDS.DAILY_BONUS;
    await db.prepare(
      'UPDATE users SET last_daily_bonus = ? WHERE id = ?'
    ).bind(today, userId).run();
  }

  const reason = dailyBonus ? 'vote_with_daily_bonus' : 'vote';
  const result = await addXp(db, userId, totalXp, reason);

  return { ...result, dailyBonus };
}

export async function addPollCreationXp(
  db: Env['survey_db'],
  userId: string
): Promise<{ xp: number; level: number; levelUp: boolean }> {
  return addXp(db, userId, XP_REWARDS.CREATE_POLL, 'create_poll');
}

export async function addCommentXp(
  db: Env['survey_db'],
  userId: string
): Promise<{ xp: number; level: number; levelUp: boolean }> {
  return addXp(db, userId, XP_REWARDS.COMMENT, 'comment');
}

export async function getUserXpStats(
  db: Env['survey_db'],
  userId: string
): Promise<{
  xp: number;
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progress: number;
}> {
  const user = await db.prepare(
    'SELECT xp, level FROM users WHERE id = ?'
  ).bind(userId).first<{ xp: number; level: number }>();

  const xp = user?.xp || 0;
  const level = user?.level || 1;

  const xpForCurrentLevel = level * level * 50;
  const xpForNextLevel = (level + 1) * (level + 1) * 50;
  const xpInCurrentLevel = xp - (level > 1 ? level * level * 50 : 0);
  const xpNeededForNext = xpForNextLevel - xpForCurrentLevel;
  const progress = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNext) * 100));

  return {
    xp,
    level,
    xpForCurrentLevel,
    xpForNextLevel,
    progress: Math.max(0, progress),
  };
}
