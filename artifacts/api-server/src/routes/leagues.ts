import { Router } from "express";
import { db, leaguesTable, teamsTable, gamesTable, playersTable, membersTable, playerGameStatsTable, playerTransactionsTable, tradesTable, tradePlayersTable, joinRequestsTable, gameOfWeekTable } from "@workspace/db";
import { eq, like, and, sql, desc, isNotNull, or, inArray } from "drizzle-orm";
import {
  ListLeaguesQueryParams,
  CreateLeagueBody,
  UpdateLeagueBody,
  GetLeagueParams,
  UpdateLeagueParams,
  DeleteLeagueParams,
  GetLeagueSummaryParams,
  GetLeagueStandingsParams,
  GetLeagueStatLeadersParams,
  GetLeagueTeamsParams,
  AddLeagueTeamBody,
  AddLeagueTeamParams,
  GetLeagueMembersParams,
  AddLeagueMemberParams,
  AddLeagueMemberBody,
  UpdateLeagueMemberParams,
  UpdateLeagueMemberBody,
  DeleteLeagueMemberParams,
  GetLeagueGamesParams,
  CreateGameBody,
  CreateGameParams,
} from "@workspace/api-zod";

const router = Router();

function buildDefaultExportInfo(): Record<string, unknown> {
  const statistics: Record<string, Record<string, null>> = {};
  for (let i = 0; i < 18; i++) {
    statistics[String(i)] = {
      games: null, team: null, passing: null, rushing: null,
      receiving: null, kicking: null, punting: null, defense: null,
    };
  }
  return { league: null, rosters: null, statistics };
}

function formatLeague(league: typeof leaguesTable.$inferSelect) {
  return {
    id: league.id,
    name: league.name,
    commissioner_name: league.commissionerName,
    platform: league.platform,
    difficulty: league.difficulty,
    category: league.category,
    skill_level: league.skillLevel,
    advance_time_hours: league.advanceTimeHours,
    week: league.week,
    season: league.season,
    phase: league.phase,
    member_count: league.memberCount,
    max_members: league.maxMembers,
    is_cross_play: league.isCrossPlay,
    is_money_league: league.isMoneyLeague,
    description: league.description,
    created_at: league.createdAt.toISOString(),
    is_ea_connected: league.isEaConnected,
    export_info: (league.exportInfo as Record<string, unknown> | null) ?? buildDefaultExportInfo(),
  };
}

function isCompleted(status: string | null) {
  return status === "COMPLETED" || status === "FINAL";
}

function computeTeamRecords(games: (typeof gamesTable.$inferSelect)[]) {
  const records = new Map<number, { wins: number; losses: number; ties: number }>();
  const ensure = (id: number) => {
    if (!records.has(id)) records.set(id, { wins: 0, losses: 0, ties: 0 });
    return records.get(id)!;
  };
  for (const g of games) {
    if (!isCompleted(g.status)) continue;
    const h = g.homeScore ?? 0;
    const a = g.awayScore ?? 0;
    if (h > a) { ensure(g.homeTeamId).wins++;  ensure(g.awayTeamId).losses++; }
    else if (a > h) { ensure(g.awayTeamId).wins++;  ensure(g.homeTeamId).losses++; }
    else           { ensure(g.homeTeamId).ties++;   ensure(g.awayTeamId).ties++;  }
  }
  return records;
}

function formatTeam(team: typeof teamsTable.$inferSelect) {
  return {
    id: team.id,
    league_id: team.leagueId,
    name: team.name,
    city: team.city,
    abbreviation: team.abbreviation,
    conference: team.conference,
    division: team.division,
    wins: team.wins,
    losses: team.losses,
    ties: team.ties,
    overall_rating: team.overallRating,
    is_user_team: team.isUserTeam,
    primary_color: team.primaryColor,
    secondary_color: team.secondaryColor,
    user_name: team.userName ?? null,
  };
}

function formatGame(game: typeof gamesTable.$inferSelect, homeTeamName?: string | null, awayTeamName?: string | null) {
  return {
    id: game.id,
    league_id: game.leagueId,
    home_team_id: game.homeTeamId,
    away_team_id: game.awayTeamId,
    home_team_name: homeTeamName ?? null,
    away_team_name: awayTeamName ?? null,
    home_score: game.homeScore,
    away_score: game.awayScore,
    week: game.week,
    season: game.season,
    status: game.status,
  };
}

function formatPlayer(player: typeof playersTable.$inferSelect) {
  return {
    id: player.id,
    team_id: player.teamId,
    name: player.name,
    position: player.position,
    overall: player.overall,
    age: player.age,
    speed: player.speed,
    strength: player.strength,
    awareness: player.awareness,
    throwing_power: player.throwingPower,
    catching: player.catching,
    tackling: player.tackling,
    portrait_id: player.portraitId ?? null,
    years_pro: player.yearsPro ?? null,
  };
}

// GET /leagues
router.get("/", async (req, res) => {
  const parseResult = ListLeaguesQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const params = parseResult.data;
  const conditions = [];
  if (params.platform) conditions.push(eq(leaguesTable.platform, params.platform));
  if (params.difficulty) conditions.push(eq(leaguesTable.difficulty, params.difficulty));
  if (params.category) conditions.push(eq(leaguesTable.category, params.category));
  if (params.skill_level) conditions.push(eq(leaguesTable.skillLevel, params.skill_level));
  if (params.is_cross_play !== undefined) conditions.push(eq(leaguesTable.isCrossPlay, params.is_cross_play));
  if (params.is_money_league !== undefined) conditions.push(eq(leaguesTable.isMoneyLeague, params.is_money_league));
  if (params.search) conditions.push(like(leaguesTable.name, `%${params.search}%`));

  const leagues = await db
    .select()
    .from(leaguesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${leaguesTable.createdAt} DESC`);

  res.json(leagues.map(formatLeague));
});

// POST /leagues
router.post("/", async (req, res) => {
  const parseResult = CreateLeagueBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const data = parseResult.data;
  const [league] = await db.insert(leaguesTable).values({
    name: data.name,
    commissionerName: data.commissioner_name,
    platform: data.platform ?? "PS5",
    difficulty: data.difficulty ?? "ALL_MADDEN",
    category: data.category ?? "REGULAR",
    skillLevel: data.skill_level ?? "INTERMEDIATE",
    advanceTimeHours: data.advance_time_hours ?? 48,
    maxMembers: data.max_members ?? 32,
    isCrossPlay: data.is_cross_play ?? false,
    isMoneyLeague: data.is_money_league ?? false,
    description: data.description,
  }).returning();
  res.status(201).json(formatLeague(league));
});

// GET /leagues/featured
router.get("/featured", async (_req, res) => {
  const leagues = await db
    .select()
    .from(leaguesTable)
    .orderBy(sql`${leaguesTable.memberCount} DESC`)
    .limit(6);
  res.json(leagues.map(formatLeague));
});

// GET /leagues/:id
router.get("/:id", async (req, res) => {
  const parseResult = GetLeagueParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.id, parseResult.data.id));
  if (!league) {
    res.status(404).json({ error: "League not found" });
    return;
  }
  res.json(formatLeague(league));
});

// PATCH /leagues/:id
router.patch("/:id", async (req, res) => {
  const parseResult = UpdateLeagueParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyResult = UpdateLeagueBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const data = bodyResult.data;
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.difficulty !== undefined) updates.difficulty = data.difficulty;
  if (data.category !== undefined) updates.category = data.category;
  if (data.skill_level !== undefined) updates.skillLevel = data.skill_level;
  if (data.advance_time_hours !== undefined) updates.advanceTimeHours = data.advance_time_hours;
  if (data.week !== undefined) updates.week = data.week;
  if (data.season !== undefined) updates.season = data.season;
  if (data.phase !== undefined) updates.phase = data.phase;
  if (data.member_count !== undefined) updates.memberCount = data.member_count;
  if (data.is_cross_play !== undefined) updates.isCrossPlay = data.is_cross_play;
  if (data.is_money_league !== undefined) updates.isMoneyLeague = data.is_money_league;
  if (data.description !== undefined) updates.description = data.description;

  const [league] = await db
    .update(leaguesTable)
    .set(updates)
    .where(eq(leaguesTable.id, parseResult.data.id))
    .returning();
  if (!league) {
    res.status(404).json({ error: "League not found" });
    return;
  }
  res.json(formatLeague(league));
});

// DELETE /leagues/:id
router.delete("/:id", async (req, res) => {
  const parseResult = DeleteLeagueParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(leaguesTable).where(eq(leaguesTable.id, parseResult.data.id));
  res.status(204).send();
});

// GET /leagues/:id/summary
router.get("/:id/summary", async (req, res) => {
  const parseResult = GetLeagueSummaryParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const leagueId = parseResult.data.id;
  const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.id, leagueId));
  if (!league) {
    res.status(404).json({ error: "League not found" });
    return;
  }
  const allTeams = await db.select().from(teamsTable).where(eq(teamsTable.leagueId, leagueId));
  const allGames = await db.select().from(gamesTable).where(eq(gamesTable.leagueId, leagueId));
  const records = computeTeamRecords(allGames);

  const topTeams = [...allTeams]
    .sort((a, b) => {
      const rA = records.get(a.id) ?? { wins: 0, losses: 0, ties: 0 };
      const rB = records.get(b.id) ?? { wins: 0, losses: 0, ties: 0 };
      return rB.wins - rA.wins || rA.losses - rB.losses;
    })
    .slice(0, 5);

  const teamMap = new Map(allTeams.map(t => [t.id, t]));
  const recentGames = allGames
    .filter(g => isCompleted(g.status))
    .sort((a, b) => b.week - a.week)
    .slice(0, 5)
    .map(g => formatGame(g, teamMap.get(g.homeTeamId)?.name, teamMap.get(g.awayTeamId)?.name));

  const totalGamesPlayed = allGames.filter(g => isCompleted(g.status)).length;

  res.json({
    league: formatLeague(league),
    top_teams: topTeams.map(t => {
      const r = records.get(t.id) ?? { wins: 0, losses: 0, ties: 0 };
      return { ...formatTeam(t), wins: r.wins, losses: r.losses, ties: r.ties };
    }),
    recent_games: recentGames,
    total_teams: allTeams.length,
    total_games_played: totalGamesPlayed,
    current_week: league.week,
  });
});

// GET /leagues/:id/standings
router.get("/:id/standings", async (req, res) => {
  const parseResult = GetLeagueStandingsParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const leagueId = parseResult.data.id;
  const teams = await db.select().from(teamsTable).where(eq(teamsTable.leagueId, leagueId));
  const allGames = await db.select().from(gamesTable).where(eq(gamesTable.leagueId, leagueId));

  const records = computeTeamRecords(allGames);

  const pointsMap = new Map<number, { for: number; against: number }>();
  for (const game of allGames) {
    if (!isCompleted(game.status)) continue;
    const hScore = game.homeScore ?? 0;
    const aScore = game.awayScore ?? 0;
    if (!pointsMap.has(game.homeTeamId)) pointsMap.set(game.homeTeamId, { for: 0, against: 0 });
    if (!pointsMap.has(game.awayTeamId)) pointsMap.set(game.awayTeamId, { for: 0, against: 0 });
    pointsMap.get(game.homeTeamId)!.for += hScore;
    pointsMap.get(game.homeTeamId)!.against += aScore;
    pointsMap.get(game.awayTeamId)!.for += aScore;
    pointsMap.get(game.awayTeamId)!.against += hScore;
  }

  const standings = teams
    .sort((a, b) => {
      const rA = records.get(a.id) ?? { wins: 0, losses: 0, ties: 0 };
      const rB = records.get(b.id) ?? { wins: 0, losses: 0, ties: 0 };
      return rB.wins - rA.wins || rA.losses - rB.losses;
    })
    .map(team => {
      const r = records.get(team.id) ?? { wins: 0, losses: 0, ties: 0 };
      return {
        team: { ...formatTeam(team), wins: r.wins, losses: r.losses, ties: r.ties },
        wins: r.wins,
        losses: r.losses,
        ties: r.ties,
        points_for: pointsMap.get(team.id)?.for ?? 0,
        points_against: pointsMap.get(team.id)?.against ?? 0,
        conference: team.conference,
        division: team.division,
      };
    });

  res.json(standings);
});

// GET /leagues/:id/stats/leaders
router.get("/:id/stats/leaders", async (req, res) => {
  const parseResult = GetLeagueStatLeadersParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const leagueId = parseResult.data.id;

  type ColRef = typeof playerGameStatsTable.pssYds | typeof playerGameStatsTable.rshYds |
    typeof playerGameStatsTable.recYds | typeof playerGameStatsTable.defTotalTackles |
    typeof playerGameStatsTable.defSacks | typeof playerGameStatsTable.defInts;

  const getLeaders = async (col: ColRef, label: string) => {
    const rows = await db
      .select({
        player: playersTable,
        team: teamsTable,
        val: sql<string>`COALESCE(SUM(${col}), 0)`,
      })
      .from(playerGameStatsTable)
      .innerJoin(playersTable, eq(playerGameStatsTable.playerId, playersTable.id))
      .innerJoin(teamsTable, eq(playersTable.teamId, teamsTable.id))
      .where(eq(playerGameStatsTable.leagueId, leagueId))
      .groupBy(playersTable.id, teamsTable.id)
      .orderBy(desc(sql`COALESCE(SUM(${col}), 0)`))
      .limit(10);
    return rows
      .map(r => ({ ...r, numVal: parseFloat(r.val) || 0 }))
      .filter(r => r.numVal > 0)
      .slice(0, 5)
      .map(r => ({
        player: formatPlayer(r.player),
        team_name: r.team.name,
        team_id: r.team.id,
        team_abbreviation: r.team.abbreviation,
        team_color: r.team.primaryColor ?? null,
        stat_label: label,
        stat_value: r.numVal,
      }));
  };

  const [passing, rushing, receiving, tackles, sacks, interceptions] = await Promise.all([
    getLeaders(playerGameStatsTable.pssYds, "Pass YDS"),
    getLeaders(playerGameStatsTable.rshYds, "Rush YDS"),
    getLeaders(playerGameStatsTable.recYds, "Rec YDS"),
    getLeaders(playerGameStatsTable.defTotalTackles, "Tackles"),
    getLeaders(playerGameStatsTable.defSacks, "Sacks"),
    getLeaders(playerGameStatsTable.defInts, "INT"),
  ]);

  res.json({ passing, rushing, receiving, defense: tackles, tackles, sacks, interceptions });
});

// GET /leagues/:id/game-of-week
router.get("/:id/game-of-week", async (req, res) => {
  const leagueId = Number(req.params.id);
  if (isNaN(leagueId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db
    .select()
    .from(gameOfWeekTable)
    .where(eq(gameOfWeekTable.leagueId, leagueId))
    .orderBy(desc(gameOfWeekTable.createdAt))
    .limit(1);

  if (rows.length === 0) { res.json(null); return; }

  const gotw = rows[0];
  const teamIds = [gotw.homeTeamId, gotw.awayTeamId].filter(Boolean) as number[];
  const teams = teamIds.length > 0
    ? await db.select().from(teamsTable).where(inArray(teamsTable.id, teamIds))
    : [];
  const teamMap = new Map(teams.map(t => [t.id, t]));

  const formatTeamBrief = (t: typeof teamsTable.$inferSelect) => ({
    id: t.id, league_id: t.leagueId, name: t.name, city: t.city, abbreviation: t.abbreviation,
    conference: t.conference, division: t.division, wins: t.wins, losses: t.losses, ties: t.ties,
    overall_rating: t.overallRating, is_user_team: t.isUserTeam,
    primary_color: t.primaryColor ?? null, secondary_color: t.secondaryColor ?? null,
  });

  res.json({
    id: gotw.id,
    league_id: gotw.leagueId,
    week: gotw.week,
    season: gotw.season,
    home_team_id: gotw.homeTeamId ?? null,
    away_team_id: gotw.awayTeamId ?? null,
    home_team: gotw.homeTeamId && teamMap.has(gotw.homeTeamId) ? formatTeamBrief(teamMap.get(gotw.homeTeamId)!) : null,
    away_team: gotw.awayTeamId && teamMap.has(gotw.awayTeamId) ? formatTeamBrief(teamMap.get(gotw.awayTeamId)!) : null,
    headline: gotw.headline ?? null,
    description: gotw.description ?? null,
    kickoff: gotw.kickoff ?? null,
    created_at: gotw.createdAt.toISOString(),
  });
});

// POST /leagues/:id/game-of-week
router.post("/:id/game-of-week", async (req, res) => {
  const leagueId = Number(req.params.id);
  if (isNaN(leagueId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = req.body as { week: number; season: number; home_team_id?: number | null; away_team_id?: number | null; headline?: string | null; description?: string | null; kickoff?: string | null };

  // Delete existing GOTW for this league, then insert new
  await db.delete(gameOfWeekTable).where(eq(gameOfWeekTable.leagueId, leagueId));

  const [inserted] = await db.insert(gameOfWeekTable).values({
    leagueId,
    week: body.week,
    season: body.season,
    homeTeamId: body.home_team_id ?? null,
    awayTeamId: body.away_team_id ?? null,
    headline: body.headline ?? null,
    description: body.description ?? null,
    kickoff: body.kickoff ?? null,
  }).returning();

  res.status(201).json({
    id: inserted.id,
    league_id: inserted.leagueId,
    week: inserted.week,
    season: inserted.season,
    home_team_id: inserted.homeTeamId ?? null,
    away_team_id: inserted.awayTeamId ?? null,
    home_team: null,
    away_team: null,
    headline: inserted.headline ?? null,
    description: inserted.description ?? null,
    kickoff: inserted.kickoff ?? null,
    created_at: inserted.createdAt.toISOString(),
  });
});

// DELETE /leagues/:id/game-of-week
router.delete("/:id/game-of-week", async (req, res) => {
  const leagueId = Number(req.params.id);
  if (isNaN(leagueId)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(gameOfWeekTable).where(eq(gameOfWeekTable.leagueId, leagueId));
  res.status(204).end();
});

// GET /leagues/:id/stats/seasons
router.get("/:id/stats/seasons", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const rows = await db
    .selectDistinct({
      season: playerGameStatsTable.season,
      week: playerGameStatsTable.week,
    })
    .from(playerGameStatsTable)
    .where(eq(playerGameStatsTable.leagueId, id))
    .orderBy(playerGameStatsTable.season, playerGameStatsTable.week);

  const seasons = [...new Set(rows.map(r => r.season))].sort((a, b) => a - b);
  const weeksBySeason: Record<string, number[]> = {};
  for (const row of rows) {
    const key = String(row.season);
    if (!weeksBySeason[key]) weeksBySeason[key] = [];
    if (!weeksBySeason[key].includes(row.week)) weeksBySeason[key].push(row.week);
  }

  res.json({ seasons, weeks_by_season: weeksBySeason });
});

// GET /leagues/:id/stats/players
router.get("/:id/stats/players", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const season = req.query.season !== undefined ? Number(req.query.season) : null;
  const week = req.query.week !== undefined ? Number(req.query.week) : null;
  const regularSeasonOnly = req.query.regularSeason !== "false";

  const baseWhere = regularSeasonOnly
    ? and(eq(playerGameStatsTable.leagueId, id), eq(playerGameStatsTable.stageIndex, 1))
    : eq(playerGameStatsTable.leagueId, id);
  const withSeason = season !== null && !isNaN(season)
    ? and(baseWhere, eq(playerGameStatsTable.season, season))
    : baseWhere;
  const whereClause = week !== null && !isNaN(week)
    ? and(withSeason, eq(playerGameStatsTable.week, week))
    : withSeason;

  const rows = await db
    .select({
      player: playersTable,
      team: teamsTable,
      gp: sql<number>`COUNT(DISTINCT ${playerGameStatsTable.gameId})`.as("gp"),
      pss_att:    sql<number>`COALESCE(SUM(${playerGameStatsTable.pssAtt}), 0)`.as("pss_att"),
      pss_cmp:    sql<number>`COALESCE(SUM(${playerGameStatsTable.pssCmp}), 0)`.as("pss_cmp"),
      pss_yds:    sql<number>`COALESCE(SUM(${playerGameStatsTable.pssYds}), 0)`.as("pss_yds"),
      pss_tds:    sql<number>`COALESCE(SUM(${playerGameStatsTable.pssTds}), 0)`.as("pss_tds"),
      pss_ints:   sql<number>`COALESCE(SUM(${playerGameStatsTable.pssInts}), 0)`.as("pss_ints"),
      pss_sacks:  sql<number>`COALESCE(SUM(${playerGameStatsTable.pssSacks}), 0)`.as("pss_sacks"),
      pss_lng:    sql<number>`COALESCE(MAX(${playerGameStatsTable.pssLng}), 0)`.as("pss_lng"),
      pss_rating: sql<number>`COALESCE(AVG(NULLIF(${playerGameStatsTable.pssRating}, 0)), 0)`.as("pss_rating"),
      rsh_att:    sql<number>`COALESCE(SUM(${playerGameStatsTable.rshAtt}), 0)`.as("rsh_att"),
      rsh_yds:    sql<number>`COALESCE(SUM(${playerGameStatsTable.rshYds}), 0)`.as("rsh_yds"),
      rsh_tds:    sql<number>`COALESCE(SUM(${playerGameStatsTable.rshTds}), 0)`.as("rsh_tds"),
      rsh_lng:    sql<number>`COALESCE(MAX(${playerGameStatsTable.rshLng}), 0)`.as("rsh_lng"),
      rsh_btk:    sql<number>`COALESCE(SUM(${playerGameStatsTable.rshBtk}), 0)`.as("rsh_btk"),
      fmb:        sql<number>`COALESCE(SUM(${playerGameStatsTable.fmb}), 0)`.as("fmb"),
      fmb_lost:   sql<number>`COALESCE(SUM(${playerGameStatsTable.fmbLost}), 0)`.as("fmb_lost"),
      rec_catches: sql<number>`COALESCE(SUM(${playerGameStatsTable.recCatches}), 0)`.as("rec_catches"),
      rec_tgts:   sql<number>`COALESCE(SUM(${playerGameStatsTable.recTgts}), 0)`.as("rec_tgts"),
      rec_yds:    sql<number>`COALESCE(SUM(${playerGameStatsTable.recYds}), 0)`.as("rec_yds"),
      rec_tds:    sql<number>`COALESCE(SUM(${playerGameStatsTable.recTds}), 0)`.as("rec_tds"),
      rec_drops:  sql<number>`COALESCE(SUM(${playerGameStatsTable.recDrops}), 0)`.as("rec_drops"),
      rec_lng:    sql<number>`COALESCE(MAX(${playerGameStatsTable.recLng}), 0)`.as("rec_lng"),
      rec_yac:    sql<number>`COALESCE(SUM(${playerGameStatsTable.recYac}), 0)`.as("rec_yac"),
      def_total_tackles: sql<number>`COALESCE(SUM(${playerGameStatsTable.defTotalTackles}), 0)`.as("def_total_tackles"),
      def_tfl:    sql<number>`COALESCE(SUM(${playerGameStatsTable.defTfl}), 0)`.as("def_tfl"),
      def_sacks:  sql<number>`COALESCE(SUM(${playerGameStatsTable.defSacks}), 0)`.as("def_sacks"),
      def_ints:   sql<number>`COALESCE(SUM(${playerGameStatsTable.defInts}), 0)`.as("def_ints"),
      def_ff:     sql<number>`COALESCE(SUM(${playerGameStatsTable.defFf}), 0)`.as("def_ff"),
      def_pd:     sql<number>`COALESCE(SUM(${playerGameStatsTable.defPd}), 0)`.as("def_pd"),
      def_tds:    sql<number>`COALESCE(SUM(${playerGameStatsTable.defTds}), 0)`.as("def_tds"),
      def_fum_rec: sql<number>`COALESCE(SUM(${playerGameStatsTable.defFumRec}), 0)`.as("def_fum_rec"),
      def_safeties: sql<number>`COALESCE(SUM(${playerGameStatsTable.defSafeties}), 0)`.as("def_safeties"),
      fg_att:     sql<number>`COALESCE(SUM(${playerGameStatsTable.fgAtt}), 0)`.as("fg_att"),
      fg_made:    sql<number>`COALESCE(SUM(${playerGameStatsTable.fgMade}), 0)`.as("fg_made"),
      fg_lng:     sql<number>`COALESCE(MAX(${playerGameStatsTable.fgLng}), 0)`.as("fg_lng"),
      xp_att:     sql<number>`COALESCE(SUM(${playerGameStatsTable.xpAtt}), 0)`.as("xp_att"),
      xp_made:    sql<number>`COALESCE(SUM(${playerGameStatsTable.xpMade}), 0)`.as("xp_made"),
      punt_att:   sql<number>`COALESCE(SUM(${playerGameStatsTable.puntAtt}), 0)`.as("punt_att"),
      punt_yds:   sql<number>`COALESCE(SUM(${playerGameStatsTable.puntYds}), 0)`.as("punt_yds"),
      punt_avg:   sql<number>`COALESCE(AVG(NULLIF(${playerGameStatsTable.puntAvg}, 0)), 0)`.as("punt_avg"),
      punt_lng:   sql<number>`COALESCE(MAX(${playerGameStatsTable.puntLng}), 0)`.as("punt_lng"),
      punt_in20:  sql<number>`COALESCE(SUM(${playerGameStatsTable.puntIn20}), 0)`.as("punt_in20"),
    })
    .from(playerGameStatsTable)
    .innerJoin(playersTable, eq(playerGameStatsTable.playerId, playersTable.id))
    .innerJoin(teamsTable, eq(playersTable.teamId, teamsTable.id))
    .where(whereClause)
    .groupBy(playerGameStatsTable.playerId, playersTable.id, teamsTable.id);

  const fmt = (row: typeof rows[0]) => ({
    player: formatPlayer(row.player),
    team_name: row.team.name,
    team_id: row.team.id,
    team_abbreviation: row.team.abbreviation,
    team_color: row.team.primaryColor ?? null,
    gp: Number(row.gp),
    pss_att:    Number(row.pss_att),
    pss_cmp:    Number(row.pss_cmp),
    pss_yds:    Number(row.pss_yds),
    pss_tds:    Number(row.pss_tds),
    pss_ints:   Number(row.pss_ints),
    pss_sacks:  Number(row.pss_sacks),
    pss_lng:    Number(row.pss_lng),
    pss_rating: Math.round(Number(row.pss_rating)),
    rsh_att:    Number(row.rsh_att),
    rsh_yds:    Number(row.rsh_yds),
    rsh_tds:    Number(row.rsh_tds),
    rsh_lng:    Number(row.rsh_lng),
    rsh_btk:    Number(row.rsh_btk),
    fmb:        Number(row.fmb),
    fmb_lost:   Number(row.fmb_lost),
    rec_catches: Number(row.rec_catches),
    rec_tgts:   Number(row.rec_tgts),
    rec_yds:    Number(row.rec_yds),
    rec_tds:    Number(row.rec_tds),
    rec_drops:  Number(row.rec_drops),
    rec_lng:    Number(row.rec_lng),
    rec_yac:    Number(row.rec_yac),
    def_total_tackles: Number(row.def_total_tackles),
    def_tfl:    Number(row.def_tfl),
    def_sacks:  Number(row.def_sacks),
    def_ints:   Number(row.def_ints),
    def_ff:     Number(row.def_ff),
    def_pd:     Number(row.def_pd),
    def_tds:    Number(row.def_tds),
    def_fum_rec: Number(row.def_fum_rec),
    def_safeties: Number(row.def_safeties),
    fg_att:     Number(row.fg_att),
    fg_made:    Number(row.fg_made),
    fg_lng:     Number(row.fg_lng),
    xp_att:     Number(row.xp_att),
    xp_made:    Number(row.xp_made),
    punt_att:   Number(row.punt_att),
    punt_yds:   Number(row.punt_yds),
    punt_avg:   Math.round(Number(row.punt_avg)),
    punt_lng:   Number(row.punt_lng),
    punt_in20:  Number(row.punt_in20),
  });

  const all = rows.map(fmt);
  res.json({
    passing:   all.filter(p => p.pss_att > 0),
    rushing:   all.filter(p => p.rsh_att > 0),
    receiving: all.filter(p => p.rec_catches > 0 || p.rec_tgts > 0),
    defense:   all.filter(p => p.def_total_tackles > 0 || p.def_sacks > 0 || p.def_ints > 0 || p.def_pd > 0 || p.def_ff > 0),
    kicking:   all.filter(p => p.fg_att > 0 || p.xp_att > 0),
    punting:   all.filter(p => p.punt_att > 0),
  });
});

const OFF_POSITIONS = ["QB","HB","FB","WR","TE","LT","LG","C","RG","RT"];
const DEF_POSITIONS = ["LE","RE","DT","LOLB","MLB","ROLB","CB","FS","SS"];

// GET /leagues/:id/teams
router.get("/:id/teams", async (req, res) => {
  const parseResult = GetLeagueTeamsParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const leagueId = parseResult.data.id;
  const [rows, allGames, playerCounts] = await Promise.all([
    db
      .select({
        team: teamsTable,
        memberDiscord: membersTable.discordName,
        memberGamertag: membersTable.gamerTag,
      })
      .from(teamsTable)
      .leftJoin(membersTable, eq(membersTable.teamId, teamsTable.id))
      .where(eq(teamsTable.leagueId, leagueId)),
    db.select().from(gamesTable).where(eq(gamesTable.leagueId, leagueId)),
    db
      .select({
        teamId: playersTable.teamId,
        rosterCount: sql<number>`count(*)::int`,
        offDevCount: sql<number>`count(*) filter (where ${playersTable.position} = any(${sql.raw(`array['${OFF_POSITIONS.join("','")}']`)}) and ${playersTable.devTrait} >= 1)::int`,
        defDevCount: sql<number>`count(*) filter (where ${playersTable.position} = any(${sql.raw(`array['${DEF_POSITIONS.join("','")}']`)}) and ${playersTable.devTrait} >= 1)::int`,
      })
      .from(playersTable)
      .innerJoin(teamsTable, eq(playersTable.teamId, teamsTable.id))
      .where(eq(teamsTable.leagueId, leagueId))
      .groupBy(playersTable.teamId),
  ]);
  const records = computeTeamRecords(allGames);
  const countMap = new Map(playerCounts.map(c => [c.teamId, c]));
  res.json(rows.map(r => {
    const rec = records.get(r.team.id) ?? { wins: 0, losses: 0, ties: 0 };
    const counts = countMap.get(r.team.id);
    return {
      ...formatTeam(r.team),
      wins: rec.wins,
      losses: rec.losses,
      ties: rec.ties,
      member_discord: r.memberDiscord ?? null,
      member_gamertag: r.memberGamertag ?? null,
      roster_count: counts?.rosterCount ?? 0,
      offense_dev_count: counts?.offDevCount ?? 0,
      defense_dev_count: counts?.defDevCount ?? 0,
    };
  }));
});

// GET /leagues/:id/members
router.get("/:id/members", async (req, res) => {
  const parseResult = GetLeagueMembersParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const members = await db.select().from(membersTable).where(eq(membersTable.leagueId, parseResult.data.id));
  res.json(members.map(m => ({
    id: m.id,
    league_id: m.leagueId,
    team_id: m.teamId ?? null,
    discord_name: m.discordName,
    gamer_tag: m.gamerTag ?? null,
    permissions: m.permissions,
    date_joined: m.createdAt.toISOString(),
  })));
});

// POST /leagues/:id/members
router.post("/:id/members", async (req, res) => {
  const paramResult = AddLeagueMemberParams.safeParse({ id: Number(req.params.id) });
  if (!paramResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyResult = AddLeagueMemberBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Invalid body", details: bodyResult.error.issues });
    return;
  }
  const data = bodyResult.data;
  const [member] = await db.insert(membersTable).values({
    leagueId: paramResult.data.id,
    discordName: data.discord_name,
    gamerTag: data.gamer_tag ?? null,
    teamId: data.team_id ?? null,
    permissions: data.permissions ?? 0,
  }).returning();
  res.status(201).json({
    id: member.id,
    league_id: member.leagueId,
    team_id: member.teamId ?? null,
    discord_name: member.discordName,
    gamer_tag: member.gamerTag ?? null,
    permissions: member.permissions,
    date_joined: member.createdAt.toISOString(),
  });
});

// PATCH /leagues/:id/members/:memberId
router.patch("/:id/members/:memberId", async (req, res) => {
  const paramResult = UpdateLeagueMemberParams.safeParse({
    id: Number(req.params.id),
    memberId: Number(req.params.memberId),
  });
  if (!paramResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const bodyResult = UpdateLeagueMemberBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Invalid body", details: bodyResult.error.issues });
    return;
  }
  const data = bodyResult.data;
  const updates: Record<string, unknown> = {};
  if (data.discord_name !== undefined) updates.discordName = data.discord_name;
  if (data.gamer_tag !== undefined) updates.gamerTag = data.gamer_tag;
  if (data.team_id !== undefined) updates.teamId = data.team_id;
  if (data.permissions !== undefined) updates.permissions = data.permissions;

  const [member] = await db
    .update(membersTable)
    .set(updates)
    .where(eq(membersTable.id, paramResult.data.memberId))
    .returning();
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.json({
    id: member.id,
    league_id: member.leagueId,
    team_id: member.teamId ?? null,
    discord_name: member.discordName,
    gamer_tag: member.gamerTag ?? null,
    permissions: member.permissions,
    date_joined: member.createdAt.toISOString(),
  });
});

// DELETE /leagues/:id/members/:memberId
router.delete("/:id/members/:memberId", async (req, res) => {
  const paramResult = DeleteLeagueMemberParams.safeParse({
    id: Number(req.params.id),
    memberId: Number(req.params.memberId),
  });
  if (!paramResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  await db.delete(membersTable).where(eq(membersTable.id, paramResult.data.memberId));
  res.status(204).send();
});

// GET /leagues/:id/join-requests
router.get("/:id/join-requests", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const rows = await db.select().from(joinRequestsTable).where(eq(joinRequestsTable.leagueId, id));
  res.json(rows.map(r => ({
    id: r.id,
    league_id: r.leagueId,
    team_id: r.teamId ?? null,
    discord_name: r.discordName,
    discord_id: r.discordId ?? null,
    gamer_tag: r.gamerTag ?? null,
    platform: r.platform ?? null,
    message: r.message ?? null,
    status: r.status,
    created_at: r.createdAt.toISOString(),
  })));
});

// POST /leagues/:id/join-requests
router.post("/:id/join-requests", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { discord_name, discord_id, gamer_tag, platform, message, team_id } = req.body as Record<string, string | number | undefined>;
  if (!discord_name) { res.status(400).json({ error: "discord_name required" }); return; }
  const [row] = await db.insert(joinRequestsTable).values({
    leagueId: id,
    discordName: String(discord_name),
    discordId: discord_id ? String(discord_id) : null,
    gamerTag: gamer_tag ? String(gamer_tag) : null,
    platform: platform ? String(platform) : null,
    message: message ? String(message) : null,
    teamId: team_id ? Number(team_id) : null,
    status: "pending",
  }).returning();
  res.status(201).json({
    id: row.id,
    league_id: row.leagueId,
    team_id: row.teamId ?? null,
    discord_name: row.discordName,
    discord_id: row.discordId ?? null,
    gamer_tag: row.gamerTag ?? null,
    platform: row.platform ?? null,
    message: row.message ?? null,
    status: row.status,
    created_at: row.createdAt.toISOString(),
  });
});

// PATCH /leagues/:id/join-requests/:requestId
router.patch("/:id/join-requests/:requestId", async (req, res) => {
  const id = Number(req.params.id);
  const requestId = Number(req.params.requestId);
  if (!id || !requestId) { res.status(400).json({ error: "Invalid params" }); return; }
  const { status, team_id } = req.body as { status?: string; team_id?: number | null };
  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (team_id !== undefined) updates.teamId = team_id;
  const [row] = await db.update(joinRequestsTable).set(updates).where(eq(joinRequestsTable.id, requestId)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    id: row.id,
    league_id: row.leagueId,
    team_id: row.teamId ?? null,
    discord_name: row.discordName,
    discord_id: row.discordId ?? null,
    gamer_tag: row.gamerTag ?? null,
    platform: row.platform ?? null,
    message: row.message ?? null,
    status: row.status,
    created_at: row.createdAt.toISOString(),
  });
});

// DELETE /leagues/:id/join-requests/:requestId
router.delete("/:id/join-requests/:requestId", async (req, res) => {
  const requestId = Number(req.params.requestId);
  if (!requestId) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(joinRequestsTable).where(eq(joinRequestsTable.id, requestId));
  res.status(204).send();
});

// POST /leagues/:id/teams
router.post("/:id/teams", async (req, res) => {
  const paramResult = AddLeagueTeamParams.safeParse({ id: Number(req.params.id) });
  if (!paramResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyResult = AddLeagueTeamBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const data = bodyResult.data;
  const [team] = await db.insert(teamsTable).values({
    leagueId: paramResult.data.id,
    name: data.name,
    city: data.city,
    abbreviation: data.abbreviation,
    conference: data.conference,
    division: data.division,
    overallRating: data.overall_rating ?? 75,
    isUserTeam: data.is_user_team ?? false,
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
  }).returning();
  res.status(201).json(formatTeam(team));
});

// GET /leagues/:id/games
router.get("/:id/games", async (req, res) => {
  const parseResult = GetLeagueGamesParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const leagueId = parseResult.data.id;
  const allGames = await db.select().from(gamesTable).where(eq(gamesTable.leagueId, leagueId));
  const teams = await db.select().from(teamsTable).where(eq(teamsTable.leagueId, leagueId));
  const teamMap = new Map(teams.map(t => [t.id, t]));

  res.json(allGames.map(g => formatGame(g, teamMap.get(g.homeTeamId)?.name, teamMap.get(g.awayTeamId)?.name)));
});

// POST /leagues/:id/games
router.post("/:id/games", async (req, res) => {
  const paramResult = CreateGameParams.safeParse({ id: Number(req.params.id) });
  if (!paramResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyResult = CreateGameBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const data = bodyResult.data;
  const [game] = await db.insert(gamesTable).values({
    leagueId: paramResult.data.id,
    homeTeamId: data.home_team_id,
    awayTeamId: data.away_team_id,
    week: data.week,
    season: data.season,
  }).returning();
  res.status(201).json(formatGame(game));
});

// ── helpers ──────────────────────────────────────────────────────────────────
async function loadTrade(tradeId: number, leagueId: number) {
  const [trade] = await db.select().from(tradesTable)
    .where(and(eq(tradesTable.id, tradeId), eq(tradesTable.leagueId, leagueId)))
    .limit(1);
  if (!trade) return null;

  const teams = await db.select().from(teamsTable)
    .where(inArray(teamsTable.id, [trade.teamAId, trade.teamBId]));
  const teamMap = new Map(teams.map(t => [t.id, t]));

  const tps = await db.select().from(tradePlayersTable)
    .innerJoin(playersTable, eq(tradePlayersTable.playerId, playersTable.id))
    .where(eq(tradePlayersTable.tradeId, trade.id));

  const teamA = teamMap.get(trade.teamAId)!;
  const teamB = teamMap.get(trade.teamBId)!;

  const playersFromA = tps.filter(r => r.trade_players.fromTeamId === trade.teamAId).map(r => ({
    id: r.players.id, name: r.players.name, position: r.players.position,
    overall: r.players.overall, portrait_id: r.players.portraitId ?? null,
  }));
  const playersFromB = tps.filter(r => r.trade_players.fromTeamId === trade.teamBId).map(r => ({
    id: r.players.id, name: r.players.name, position: r.players.position,
    overall: r.players.overall, portrait_id: r.players.portraitId ?? null,
  }));

  return {
    id: trade.id,
    league_id: trade.leagueId,
    season: trade.season,
    week: trade.week ?? null,
    status: trade.status,
    team_a: { id: teamA.id, name: teamA.name, abbreviation: teamA.abbreviation, primary_color: teamA.primaryColor ?? null },
    team_b: { id: teamB.id, name: teamB.name, abbreviation: teamB.abbreviation, primary_color: teamB.primaryColor ?? null },
    players_from_a: playersFromA,
    players_from_b: playersFromB,
    notes: trade.notes ?? null,
    created_at: trade.createdAt.toISOString(),
  };
}

// GET /leagues/:id/trades
router.get("/:id/trades", async (req, res) => {
  const leagueId = Number(req.params.id);
  if (isNaN(leagueId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const trades = await db.select().from(tradesTable)
    .where(eq(tradesTable.leagueId, leagueId))
    .orderBy(desc(tradesTable.createdAt));

  const results = await Promise.all(trades.map(t => loadTrade(t.id, leagueId)));
  res.json(results.filter(Boolean));
});

// POST /leagues/:id/trades
router.post("/:id/trades", async (req, res) => {
  const leagueId = Number(req.params.id);
  if (isNaN(leagueId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { season, week, team_a_id, team_b_id, players_from_a = [], players_from_b = [], notes } = req.body as {
    season: number; week?: number; team_a_id: number; team_b_id: number;
    players_from_a: number[]; players_from_b: number[]; notes?: string;
  };

  if (!season || !team_a_id || !team_b_id) {
    res.status(400).json({ error: "season, team_a_id, and team_b_id are required" }); return;
  }

  const [trade] = await db.insert(tradesTable).values({
    leagueId, season, week: week ?? null, status: "PENDING",
    teamAId: team_a_id, teamBId: team_b_id, notes: notes ?? null,
  }).returning();

  const playerRows = [
    ...players_from_a.map((pid: number) => ({ tradeId: trade!.id, playerId: pid, fromTeamId: team_a_id })),
    ...players_from_b.map((pid: number) => ({ tradeId: trade!.id, playerId: pid, fromTeamId: team_b_id })),
  ];
  if (playerRows.length > 0) await db.insert(tradePlayersTable).values(playerRows);

  const result = await loadTrade(trade!.id, leagueId);
  res.status(201).json(result);
});

// PATCH /leagues/:id/trades/:tradeId
router.patch("/:id/trades/:tradeId", async (req, res) => {
  const leagueId = Number(req.params.id);
  const tradeId = Number(req.params.tradeId);
  if (isNaN(leagueId) || isNaN(tradeId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { status } = req.body as { status: string };
  if (!status) { res.status(400).json({ error: "status is required" }); return; }

  await db.update(tradesTable)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(tradesTable.id, tradeId), eq(tradesTable.leagueId, leagueId)));

  const result = await loadTrade(tradeId, leagueId);
  if (!result) { res.status(404).json({ error: "Trade not found" }); return; }
  res.json(result);
});

// DELETE /leagues/:id/trades/:tradeId
router.delete("/:id/trades/:tradeId", async (req, res) => {
  const leagueId = Number(req.params.id);
  const tradeId = Number(req.params.tradeId);
  if (isNaN(leagueId) || isNaN(tradeId)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(tradesTable).where(and(eq(tradesTable.id, tradeId), eq(tradesTable.leagueId, leagueId)));
  res.status(204).end();
});

// GET /leagues/:id/trades/counts — NOTE: must be defined BEFORE /:id/trades/:tradeId to avoid "counts" being parsed as a tradeId
router.get("/:id/trades/counts", async (req, res) => {
  const leagueId = Number(req.params.id);
  if (isNaN(leagueId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const teams = await db.select().from(teamsTable).where(eq(teamsTable.leagueId, leagueId));
  const trades = await db.select().from(tradesTable).where(eq(tradesTable.leagueId, leagueId));

  const counts = teams.map(team => {
    const teamTrades = trades.filter(t => t.teamAId === team.id || t.teamBId === team.id);
    return {
      team_id: team.id,
      team_name: team.name,
      team_abbreviation: team.abbreviation,
      team_color: team.primaryColor ?? null,
      pending:   teamTrades.filter(t => t.status === "PENDING").length,
      approved:  teamTrades.filter(t => t.status === "APPROVED").length,
      denied:    teamTrades.filter(t => t.status === "DENIED").length,
      cancelled: teamTrades.filter(t => t.status === "CANCELLED").length,
      total:     teamTrades.length,
    };
  });

  res.json(counts);
});

// GET /leagues/:id/transactions
router.get("/:id/transactions", async (req, res) => {
  const leagueId = Number(req.params.id);
  if (isNaN(leagueId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db
    .select()
    .from(playerTransactionsTable)
    .innerJoin(playersTable, eq(playerTransactionsTable.playerId, playersTable.id))
    .innerJoin(teamsTable, eq(playersTable.teamId, teamsTable.id))
    .where(eq(playerTransactionsTable.leagueId, leagueId))
    .orderBy(desc(playerTransactionsTable.createdAt));

  res.json(rows.map(r => ({
    id: r.player_transactions.id,
    player: {
      id: r.players.id,
      name: r.players.name,
      position: r.players.position,
      overall: r.players.overall,
      portrait_id: r.players.portraitId ?? null,
    },
    team: {
      id: r.teams.id,
      name: r.teams.name,
      abbreviation: r.teams.abbreviation,
      primary_color: r.teams.primaryColor ?? null,
    },
    season: r.player_transactions.season,
    week: r.player_transactions.week ?? null,
    transaction_type: r.player_transactions.transactionType,
    from_team: r.player_transactions.fromTeam ?? null,
    to_team: r.player_transactions.toTeam ?? null,
    notes: r.player_transactions.notes ?? null,
    created_at: r.player_transactions.createdAt.toISOString(),
  })));
});

// GET /leagues/:id/draft
router.get("/:id/draft", async (req, res) => {
  const leagueId = Number(req.params.id);
  if (isNaN(leagueId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const teams = await db.select().from(teamsTable).where(eq(teamsTable.leagueId, leagueId));
  const teamMap = new Map(teams.map(t => [t.id, t]));

  const players = await db
    .select()
    .from(playersTable)
    .where(
      and(
        sql`${playersTable.teamId} IN (SELECT id FROM teams WHERE league_id = ${leagueId})`,
        or(isNotNull(playersTable.draftRound), isNotNull(playersTable.rookieYear))
      )
    )
    .orderBy(playersTable.draftRound, playersTable.draftPick);

  res.json(players.map(p => {
    const team = teamMap.get(p.teamId);
    return {
      player_id: p.id,
      name: p.name,
      position: p.position,
      overall: p.overall,
      age: p.age,
      dev_trait: p.devTrait ?? null,
      portrait_id: p.portraitId ?? null,
      draft_round: p.draftRound ?? null,
      draft_pick: p.draftPick ?? null,
      rookie_year: p.rookieYear ?? null,
      years_pro: p.yearsPro ?? null,
      team_id: p.teamId,
      team_name: team?.name ?? "Unknown",
      team_abbreviation: team?.abbreviation ?? "UNK",
      team_color: team?.primaryColor ?? null,
    };
  }));
});

// GET /leagues/:id/players
router.get("/:id/players", async (req, res) => {
  const leagueId = Number(req.params.id);
  if (isNaN(leagueId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const teams = await db.select().from(teamsTable).where(eq(teamsTable.leagueId, leagueId));
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const players = await db
    .select()
    .from(playersTable)
    .where(sql`${playersTable.teamId} IN (SELECT id FROM teams WHERE league_id = ${leagueId})`);
  res.json(
    players.map((p) => ({
      ...formatPlayer(p),
      team_name: teamMap.get(p.teamId)?.name ?? "Unknown",
      team_abbreviation: teamMap.get(p.teamId)?.abbreviation ?? "UNK",
      team_city: teamMap.get(p.teamId)?.city ?? "",
      team_primary_color: teamMap.get(p.teamId)?.primaryColor ?? null,
    }))
  );
});

export default router;
