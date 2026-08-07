import { Router } from "express";
import { db, teamsTable, playersTable, gamesTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm";
import {
  GetTeamParams,
  UpdateTeamParams,
  UpdateTeamBody,
  GetTeamPlayersParams,
  AddPlayerParams,
  AddPlayerBody,
} from "@workspace/api-zod";

const router = Router();

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

function formatPlayer(player: typeof playersTable.$inferSelect) {
  return {
    id: player.id,
    team_id: player.teamId,
    name: player.name,
    position: player.position,
    overall: player.overall,
    age: player.age,
    years_pro: player.yearsPro,
    dev_trait: player.devTrait,
    portrait_id: player.portraitId,
    // Core ratings
    speed: player.speed,
    strength: player.strength,
    awareness: player.awareness,
    acceleration: player.acceleration,
    agility: player.agility,
    jumping: player.jumping,
    // Passing
    throwing_power: player.throwingPower,
    throw_accuracy: player.throwAccuracy,
    throw_accuracy_short: player.throwAccuracyShort,
    throw_accuracy_mid: player.throwAccuracyMid,
    throw_accuracy_deep: player.throwAccuracyDeep,
    throw_on_run: player.throwOnRun,
    throw_under_pressure: player.throwUnderPressure,
    play_action: player.playAction,
    break_sack: player.breakSack,
    // Receiving
    catching: player.catching,
    catch_in_traffic: player.catchInTraffic,
    spectacular_catch: player.spectacularCatch,
    route_run_short: player.routeRunShort,
    route_run_mid: player.routeRunMid,
    route_run_deep: player.routeRunDeep,
    release: player.release,
    // Ball carrying
    carrying: player.carrying,
    ball_carrier_vision: player.ballCarrierVision,
    break_tackle: player.breakTackle,
    stiff_arm: player.stiffArm,
    spin_move: player.spinMove,
    juke_move: player.jukeMove,
    trucking: player.trucking,
    change_of_direction: player.changeOfDirection,
    // Blocking
    run_block: player.runBlock,
    run_block_power: player.runBlockPower,
    run_block_finesse: player.runBlockFinesse,
    pass_block: player.passBlock,
    pass_block_power: player.passBlockPower,
    pass_block_finesse: player.passBlockFinesse,
    impact_block: player.impactBlock,
    // Defense
    tackling: player.tackling,
    hit_power: player.hitPower,
    pursuit: player.pursuit,
    block_shed: player.blockShed,
    finesse_moves: player.finesseMoves,
    power_moves: player.powerMoves,
    man_coverage: player.manCoverage,
    zone_coverage: player.zoneCoverage,
    press: player.press,
    // Special teams
    kick_power: player.kickPower,
    kick_accuracy: player.kickAccuracy,
    // Body measurements
    height: player.height,
    weight: player.weight,
    college: player.college,
    // Contract
    contract_salary: player.contractSalary,
    contract_bonus: player.contractBonus,
    contract_length: player.contractLength,
    contract_years_left: player.contractYearsLeft,
    cap_hit: player.capHit,
    depth_chart_order: player.depthChartOrder,
    trade_block: player.tradeBlock,
  };
}

function isCompleted(status: string | null) {
  return status === "COMPLETED" || status === "FINAL";
}

// GET /teams/:id
router.get("/:id", async (req, res) => {
  const parseResult = GetTeamParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const teamId = parseResult.data.id;
  const [[team], games] = await Promise.all([
    db.select().from(teamsTable).where(eq(teamsTable.id, teamId)),
    db.select().from(gamesTable).where(
      or(eq(gamesTable.homeTeamId, teamId), eq(gamesTable.awayTeamId, teamId))
    ),
  ]);
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  let wins = 0, losses = 0, ties = 0;
  for (const g of games) {
    if (!isCompleted(g.status)) continue;
    // Only count regular season games (stageIndex = 1); skip postseason
    if (g.stageIndex != null && g.stageIndex !== 1) continue;
    const h = g.homeScore ?? 0;
    const a = g.awayScore ?? 0;
    const isHome = g.homeTeamId === teamId;
    const teamScore = isHome ? h : a;
    const oppScore  = isHome ? a : h;
    if (teamScore > oppScore) wins++;
    else if (oppScore > teamScore) losses++;
    else ties++;
  }
  res.json({ ...formatTeam(team), wins, losses, ties });
});

// PATCH /teams/:id
router.patch("/:id", async (req, res) => {
  const paramResult = UpdateTeamParams.safeParse({ id: Number(req.params.id) });
  if (!paramResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyResult = UpdateTeamBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const data = bodyResult.data;
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.wins !== undefined) updates.wins = data.wins;
  if (data.losses !== undefined) updates.losses = data.losses;
  if (data.ties !== undefined) updates.ties = data.ties;
  if (data.overall_rating !== undefined) updates.overallRating = data.overall_rating;
  if (data.is_user_team !== undefined) updates.isUserTeam = data.is_user_team;
  if (data.primary_color !== undefined) updates.primaryColor = data.primary_color;
  if (data.secondary_color !== undefined) updates.secondaryColor = data.secondary_color;

  const [team] = await db.update(teamsTable).set(updates).where(eq(teamsTable.id, paramResult.data.id)).returning();
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  res.json(formatTeam(team));
});

// GET /teams/:id/players
router.get("/:id/players", async (req, res) => {
  const parseResult = GetTeamPlayersParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const players = await db.select().from(playersTable).where(eq(playersTable.teamId, parseResult.data.id));
  res.json(players.map(formatPlayer));
});

// GET /teams/:id/games
router.get("/:id/games", async (req, res) => {
  const parseResult = GetTeamParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const teamId = parseResult.data.id;

  const homeTeam = aliasedTable(teamsTable, "home_team");
  const awayTeam = aliasedTable(teamsTable, "away_team");

  const games = await db
    .select({
      id: gamesTable.id,
      league_id: gamesTable.leagueId,
      home_team_id: gamesTable.homeTeamId,
      away_team_id: gamesTable.awayTeamId,
      home_score: gamesTable.homeScore,
      away_score: gamesTable.awayScore,
      week: gamesTable.week,
      season: gamesTable.season,
      status: gamesTable.status,
      home_team_name: homeTeam.name,
      away_team_name: awayTeam.name,
      home_team_abbreviation: homeTeam.abbreviation,
      away_team_abbreviation: awayTeam.abbreviation,
      home_team_color: homeTeam.primaryColor,
      away_team_color: awayTeam.primaryColor,
    })
    .from(gamesTable)
    .innerJoin(homeTeam, eq(gamesTable.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(gamesTable.awayTeamId, awayTeam.id))
    .where(or(eq(gamesTable.homeTeamId, teamId), eq(gamesTable.awayTeamId, teamId)))
    .orderBy(gamesTable.week);

  res.json(games);
});

// POST /teams/:id/players
router.post("/:id/players", async (req, res) => {
  const paramResult = AddPlayerParams.safeParse({ id: Number(req.params.id) });
  if (!paramResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyResult = AddPlayerBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const data = bodyResult.data;
  const [player] = await db.insert(playersTable).values({
    teamId: paramResult.data.id,
    name: data.name,
    position: data.position,
    overall: data.overall,
    age: data.age,
    speed: data.speed ?? 75,
    strength: data.strength ?? 70,
    awareness: data.awareness ?? 72,
    throwingPower: data.throwing_power,
    catching: data.catching,
    tackling: data.tackling,
  }).returning();
  res.status(201).json(formatPlayer(player));
});

export default router;
