import { Router } from "express";
import { db, leaguesTable, teamsTable, gamesTable, playersTable, membersTable } from "@workspace/db";
import { eq, like, and, sql } from "drizzle-orm";
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
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const leagueId = parseResult.data.id;
  const teams = await db.select().from(teamsTable).where(eq(teamsTable.leagueId, leagueId));
  const teamMap = new Map(teams.map(t => [t.id, t]));

  const players = await db
    .select()
    .from(playersTable)
    .where(
      sql`${playersTable.teamId} IN (SELECT id FROM teams WHERE league_id = ${leagueId})`
    );

  const makeStatLine = (player: typeof playersTable.$inferSelect, label: string, value: number) => ({
    player: formatPlayer(player),
    team_name: teamMap.get(player.teamId)?.name ?? "Unknown",
    stat_label: label,
    stat_value: value,
  });

  const qbs = players.filter(p => p.position === "QB").sort((a, b) => (b.throwingPower ?? 0) - (a.throwingPower ?? 0)).slice(0, 5);
  const rushers = players.filter(p => ["RB", "FB"].includes(p.position)).sort((a, b) => b.speed - a.speed).slice(0, 5);
  const receivers = players.filter(p => ["WR", "TE"].includes(p.position)).sort((a, b) => (b.catching ?? 0) - (a.catching ?? 0)).slice(0, 5);
  const defenders = players.filter(p => ["DL", "LB", "CB", "S"].includes(p.position)).sort((a, b) => (b.tackling ?? 0) - (a.tackling ?? 0)).slice(0, 5);

  res.json({
    passing: qbs.map(p => makeStatLine(p, "Throwing Power", p.throwingPower ?? 0)),
    rushing: rushers.map(p => makeStatLine(p, "Speed", p.speed)),
    receiving: receivers.map(p => makeStatLine(p, "Catching", p.catching ?? 0)),
    defense: defenders.map(p => makeStatLine(p, "Tackling", p.tackling ?? 0)),
  });
});

// GET /leagues/:id/teams
router.get("/:id/teams", async (req, res) => {
  const parseResult = GetLeagueTeamsParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const leagueId = parseResult.data.id;
  const [rows, allGames] = await Promise.all([
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
  ]);
  const records = computeTeamRecords(allGames);
  res.json(rows.map(r => {
    const rec = records.get(r.team.id) ?? { wins: 0, losses: 0, ties: 0 };
    return {
      ...formatTeam(r.team),
      wins: rec.wins,
      losses: rec.losses,
      ties: rec.ties,
      member_discord: r.memberDiscord ?? null,
      member_gamertag: r.memberGamertag ?? null,
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
  }).returning();
  res.status(201).json({
    id: member.id,
    league_id: member.leagueId,
    team_id: member.teamId ?? null,
    discord_name: member.discordName,
    gamer_tag: member.gamerTag ?? null,
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
