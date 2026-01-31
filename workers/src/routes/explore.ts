import { Hono } from 'hono';
import type { Env, Variables, PollRow } from '../types';
import { success } from '../utils/response';

const explore = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/explore/ranking - 랭킹 (인기/논쟁)
explore.get('/ranking', async (c) => {
  const type = c.req.query('type') || 'popular'; // popular, controversial, rising
  const period = c.req.query('period') || 'week'; // day, week, month, all
  const limit = Math.min(Number(c.req.query('limit')) || 10, 30);

  let dateFilter = '';
  if (period === 'day') {
    dateFilter = "AND p.created_at > datetime('now', '-1 day')";
  } else if (period === 'week') {
    dateFilter = "AND p.created_at > datetime('now', '-7 days')";
  } else if (period === 'month') {
    dateFilter = "AND p.created_at > datetime('now', '-30 days')";
  }

  let query = '';

  if (type === 'popular') {
    // Most responses
    query = `
      SELECT p.*, COUNT(r.id) as response_count
      FROM polls p
      LEFT JOIN responses r ON p.id = r.poll_id
      WHERE p.is_active = 1 ${dateFilter}
      GROUP BY p.id
      ORDER BY response_count DESC
      LIMIT ?
    `;
  } else if (type === 'controversial') {
    // Closest to 50:50 split (for 2-option polls) or even distribution
    query = `
      SELECT p.*, COUNT(r.id) as response_count,
        (SELECT COUNT(DISTINCT option_index) FROM responses WHERE poll_id = p.id) as unique_choices
      FROM polls p
      LEFT JOIN responses r ON p.id = r.poll_id
      WHERE p.is_active = 1 ${dateFilter}
      GROUP BY p.id
      HAVING response_count >= 10
      ORDER BY unique_choices DESC, response_count DESC
      LIMIT ?
    `;
  } else if (type === 'rising') {
    // Fast growing in last 24 hours
    query = `
      SELECT p.*, COUNT(r.id) as response_count,
        (SELECT COUNT(*) FROM responses r2 WHERE r2.poll_id = p.id AND r2.created_at > datetime('now', '-24 hours')) as recent_count
      FROM polls p
      LEFT JOIN responses r ON p.id = r.poll_id
      WHERE p.is_active = 1 ${dateFilter}
      GROUP BY p.id
      HAVING response_count >= 5
      ORDER BY recent_count DESC, response_count DESC
      LIMIT ?
    `;
  }

  const result = await c.env.survey_db.prepare(query).bind(limit).all<PollRow & { response_count: number }>();

  // Get controversy score for each poll
  const polls = await Promise.all((result.results || []).map(async (row, index) => {
    // Calculate controversy score (how close to even split)
    const options = JSON.parse(row.options) as string[];
    const optionCounts = await c.env.survey_db.prepare(`
      SELECT option_index, COUNT(*) as count
      FROM responses WHERE poll_id = ?
      GROUP BY option_index
    `).bind(row.id).all<{ option_index: number; count: number }>();

    let controversyScore = 0;
    if (optionCounts.results && optionCounts.results.length > 1 && row.response_count > 0) {
      const counts = optionCounts.results.map(r => r.count);
      const total = counts.reduce((a, b) => a + b, 0);
      const percentages = counts.map(c => c / total);
      const evenShare = 1 / options.length;
      // Lower deviation = more controversial (closer to even split)
      const deviation = percentages.reduce((sum, p) => sum + Math.abs(p - evenShare), 0) / options.length;
      controversyScore = Math.round((1 - deviation) * 100);
    }

    return {
      rank: index + 1,
      id: row.id,
      question: row.question,
      options,
      responseCount: row.response_count,
      controversyScore,
      createdAt: row.created_at,
    };
  }));

  return success(c, { polls, type, period });
});

// GET /api/explore/search - 검색
explore.get('/search', async (c) => {
  const q = c.req.query('q')?.trim();
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);

  if (!q || q.length < 2) {
    return success(c, { polls: [], query: q });
  }

  const searchTerm = `%${q}%`;

  const result = await c.env.survey_db.prepare(`
    SELECT p.*, COUNT(r.id) as response_count
    FROM polls p
    LEFT JOIN responses r ON p.id = r.poll_id
    WHERE p.is_active = 1 AND p.question LIKE ?
    GROUP BY p.id
    ORDER BY response_count DESC, p.created_at DESC
    LIMIT ?
  `).bind(searchTerm, limit).all<PollRow & { response_count: number }>();

  const polls = (result.results || []).map((row) => ({
    id: row.id,
    question: row.question,
    options: JSON.parse(row.options),
    responseCount: row.response_count,
    createdAt: row.created_at,
  }));

  return success(c, { polls, query: q });
});

// GET /api/explore/tags - 모든 태그 (인기순)
explore.get('/tags', async (c) => {
  const limit = Math.min(Number(c.req.query('limit')) || 30, 100);

  const result = await c.env.survey_db.prepare(`
    SELECT t.*, COUNT(pt.poll_id) as actual_count
    FROM tags t
    LEFT JOIN poll_tags pt ON t.id = pt.tag_id
    GROUP BY t.id
    ORDER BY actual_count DESC
    LIMIT ?
  `).bind(limit).all<{ id: number; name: string; poll_count: number; actual_count: number }>();

  const tags = (result.results || []).map((row) => ({
    id: row.id,
    name: row.name,
    pollCount: row.actual_count,
  }));

  return success(c, { tags });
});

// GET /api/explore/insights - 통계/인사이트
explore.get('/insights', async (c) => {
  // Total stats
  const [totalPolls, totalResponses, totalUsers] = await Promise.all([
    c.env.survey_db.prepare('SELECT COUNT(*) as count FROM polls WHERE is_active = 1').first<{ count: number }>(),
    c.env.survey_db.prepare('SELECT COUNT(*) as count FROM responses').first<{ count: number }>(),
    c.env.survey_db.prepare('SELECT COUNT(DISTINCT fingerprint) as count FROM responses').first<{ count: number }>(),
  ]);

  // Activity by hour (last 7 days)
  const hourlyActivity = await c.env.survey_db.prepare(`
    SELECT strftime('%H', created_at) as hour, COUNT(*) as count
    FROM responses
    WHERE created_at > datetime('now', '-7 days')
    GROUP BY hour
    ORDER BY hour
  `).all<{ hour: string; count: number }>();

  // Most divisive polls (biggest gender gap)
  const genderDivisive = await c.env.survey_db.prepare(`
    SELECT p.id, p.question, p.options,
      COUNT(r.id) as response_count
    FROM polls p
    LEFT JOIN responses r ON p.id = r.poll_id
    WHERE p.is_active = 1 AND r.gender IS NOT NULL
    GROUP BY p.id
    HAVING response_count >= 20
    ORDER BY response_count DESC
    LIMIT 5
  `).all<PollRow & { response_count: number }>();

  // Calculate gender gaps
  const divisivePolls = await Promise.all((genderDivisive.results || []).map(async (row) => {
    const genderStats = await c.env.survey_db.prepare(`
      SELECT gender, option_index, COUNT(*) as count
      FROM responses
      WHERE poll_id = ? AND gender IS NOT NULL
      GROUP BY gender, option_index
    `).bind(row.id).all<{ gender: string; option_index: number; count: number }>();

    const maleVotes: Record<number, number> = {};
    const femaleVotes: Record<number, number> = {};
    let maleTotal = 0, femaleTotal = 0;

    for (const stat of genderStats.results || []) {
      if (stat.gender === 'male') {
        maleVotes[stat.option_index] = stat.count;
        maleTotal += stat.count;
      } else if (stat.gender === 'female') {
        femaleVotes[stat.option_index] = stat.count;
        femaleTotal += stat.count;
      }
    }

    // Calculate max percentage gap
    let maxGap = 0;
    const options = JSON.parse(row.options) as string[];
    for (let i = 0; i < options.length; i++) {
      const malePct = maleTotal > 0 ? ((maleVotes[i] || 0) / maleTotal) * 100 : 0;
      const femalePct = femaleTotal > 0 ? ((femaleVotes[i] || 0) / femaleTotal) * 100 : 0;
      maxGap = Math.max(maxGap, Math.abs(malePct - femalePct));
    }

    return {
      id: row.id,
      question: row.question,
      responseCount: row.response_count,
      genderGap: Math.round(maxGap),
    };
  }));

  // Sort by gender gap
  divisivePolls.sort((a, b) => b.genderGap - a.genderGap);

  // Recent trends - categories
  const categoryTrends = await c.env.survey_db.prepare(`
    SELECT p.category, COUNT(r.id) as response_count
    FROM polls p
    LEFT JOIN responses r ON p.id = r.poll_id
    WHERE p.is_active = 1 AND p.category IS NOT NULL
      AND r.created_at > datetime('now', '-7 days')
    GROUP BY p.category
    ORDER BY response_count DESC
    LIMIT 5
  `).all<{ category: string; response_count: number }>();

  return success(c, {
    totals: {
      polls: totalPolls?.count || 0,
      responses: totalResponses?.count || 0,
      participants: totalUsers?.count || 0,
    },
    hourlyActivity: (hourlyActivity.results || []).map(r => ({
      hour: parseInt(r.hour),
      count: r.count,
    })),
    genderDivisive: divisivePolls.slice(0, 5),
    categoryTrends: (categoryTrends.results || []).map(r => ({
      category: r.category,
      responses: r.response_count,
    })),
  });
});

// GET /api/explore/trends/time-series - 일별/주별 투표 트렌드
explore.get('/trends/time-series', async (c) => {
  const period = c.req.query('period') || 'week'; // week, month
  const granularity = c.req.query('granularity') || 'day'; // day, week

  let dateFilter = '';
  let dateFormat = '%Y-%m-%d';

  if (period === 'week') {
    dateFilter = "WHERE created_at > datetime('now', '-7 days')";
  } else if (period === 'month') {
    dateFilter = "WHERE created_at > datetime('now', '-30 days')";
  }

  if (granularity === 'week') {
    dateFormat = '%Y-W%W';
  }

  // Get vote counts per time unit
  const votesResult = await c.env.survey_db.prepare(`
    SELECT strftime('${dateFormat}', created_at) as date, COUNT(*) as vote_count
    FROM responses
    ${dateFilter}
    GROUP BY date
    ORDER BY date ASC
  `).all<{ date: string; vote_count: number }>();

  // Get new polls per time unit
  const pollsResult = await c.env.survey_db.prepare(`
    SELECT strftime('${dateFormat}', created_at) as date, COUNT(*) as poll_count
    FROM polls
    ${dateFilter}
    GROUP BY date
    ORDER BY date ASC
  `).all<{ date: string; poll_count: number }>();

  // Merge data
  const dataMap: Record<string, { votes: number; polls: number }> = {};
  for (const row of votesResult.results || []) {
    dataMap[row.date] = { votes: row.vote_count, polls: 0 };
  }
  for (const row of pollsResult.results || []) {
    if (!dataMap[row.date]) dataMap[row.date] = { votes: 0, polls: 0 };
    dataMap[row.date].polls = row.poll_count;
  }

  const series = Object.entries(dataMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      votes: data.votes,
      polls: data.polls,
    }));

  return success(c, { series, period, granularity });
});

// GET /api/explore/trends/demographics - 연령/성별/지역별 비교
explore.get('/trends/demographics', async (c) => {
  const type = c.req.query('type') || 'gender'; // gender, age, region
  const period = c.req.query('period') || 'week';

  let dateFilter = '';
  if (period === 'day') {
    dateFilter = "AND r.created_at > datetime('now', '-1 day')";
  } else if (period === 'week') {
    dateFilter = "AND r.created_at > datetime('now', '-7 days')";
  } else if (period === 'month') {
    dateFilter = "AND r.created_at > datetime('now', '-30 days')";
  }

  let groupColumn = '';
  switch (type) {
    case 'gender':
      groupColumn = 'r.gender';
      break;
    case 'age':
      groupColumn = 'r.age_group';
      break;
    case 'region':
      groupColumn = 'r.region';
      break;
    default:
      groupColumn = 'r.gender';
  }

  const result = await c.env.survey_db.prepare(`
    SELECT ${groupColumn} as group_value, COUNT(*) as vote_count
    FROM responses r
    WHERE ${groupColumn} IS NOT NULL ${dateFilter}
    GROUP BY ${groupColumn}
    ORDER BY vote_count DESC
  `).all<{ group_value: string; vote_count: number }>();

  const total = (result.results || []).reduce((sum, r) => sum + r.vote_count, 0);
  const data = (result.results || []).map(row => ({
    group: row.group_value,
    count: row.vote_count,
    percentage: total > 0 ? Math.round((row.vote_count / total) * 100) : 0,
  }));

  return success(c, { data, type, period, total });
});

// GET /api/explore/trends/tags - 태그 인기도 추이
explore.get('/trends/tags', async (c) => {
  const period = c.req.query('period') || 'week';
  const limit = Math.min(Number(c.req.query('limit')) || 10, 20);

  let dateFilter = '';
  let prevDateFilter = '';

  if (period === 'day') {
    dateFilter = "AND r.created_at > datetime('now', '-1 day')";
    prevDateFilter = "AND r.created_at BETWEEN datetime('now', '-2 days') AND datetime('now', '-1 day')";
  } else if (period === 'week') {
    dateFilter = "AND r.created_at > datetime('now', '-7 days')";
    prevDateFilter = "AND r.created_at BETWEEN datetime('now', '-14 days') AND datetime('now', '-7 days')";
  } else if (period === 'month') {
    dateFilter = "AND r.created_at > datetime('now', '-30 days')";
    prevDateFilter = "AND r.created_at BETWEEN datetime('now', '-60 days') AND datetime('now', '-30 days')";
  }

  // Current period tag counts
  const currentResult = await c.env.survey_db.prepare(`
    SELECT t.name as tag, COUNT(*) as vote_count
    FROM responses r
    JOIN poll_tags pt ON r.poll_id = pt.poll_id
    JOIN tags t ON pt.tag_id = t.id
    WHERE 1=1 ${dateFilter}
    GROUP BY t.name
    ORDER BY vote_count DESC
    LIMIT ?
  `).bind(limit).all<{ tag: string; vote_count: number }>();

  // Previous period for comparison
  const prevResult = await c.env.survey_db.prepare(`
    SELECT t.name as tag, COUNT(*) as vote_count
    FROM responses r
    JOIN poll_tags pt ON r.poll_id = pt.poll_id
    JOIN tags t ON pt.tag_id = t.id
    WHERE 1=1 ${prevDateFilter}
    GROUP BY t.name
  `).all<{ tag: string; vote_count: number }>();

  const prevMap = new Map((prevResult.results || []).map(r => [r.tag, r.vote_count]));

  const tags = (currentResult.results || []).map(row => {
    const prevCount = prevMap.get(row.tag) || 0;
    const change = prevCount > 0
      ? Math.round(((row.vote_count - prevCount) / prevCount) * 100)
      : (row.vote_count > 0 ? 100 : 0);

    return {
      tag: row.tag,
      count: row.vote_count,
      prevCount,
      change,
      trend: change > 10 ? 'up' : change < -10 ? 'down' : 'stable',
    };
  });

  return success(c, { tags, period });
});

// GET /api/explore/trends/realtime - 실시간 트렌딩 (최근 1시간)
explore.get('/trends/realtime', async (c) => {
  const limit = Math.min(Number(c.req.query('limit')) || 5, 10);

  // Most active polls in last hour
  const result = await c.env.survey_db.prepare(`
    SELECT p.id, p.question, COUNT(r.id) as recent_votes,
      (SELECT COUNT(*) FROM responses WHERE poll_id = p.id) as total_votes
    FROM polls p
    JOIN responses r ON p.id = r.poll_id
    WHERE r.created_at > datetime('now', '-1 hour')
      AND p.is_active = 1
    GROUP BY p.id
    ORDER BY recent_votes DESC
    LIMIT ?
  `).bind(limit).all<{ id: string; question: string; recent_votes: number; total_votes: number }>();

  const trending = (result.results || []).map((row, index) => ({
    rank: index + 1,
    id: row.id,
    question: row.question,
    recentVotes: row.recent_votes,
    totalVotes: row.total_votes,
  }));

  return success(c, { trending, timestamp: new Date().toISOString() });
});

export default explore;
