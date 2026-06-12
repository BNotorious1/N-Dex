import { Router } from "express";
import { db, playersTable, teamsTable, playerAbilitiesTable, playerGameStatsTable, gamesTable, playerAwardsTable, AWARD_TYPES, playerTransactionsTable, TRANSACTION_TYPES } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { GetPlayerParams, UpdatePlayerParams, UpdatePlayerBody, GetPlayerAwardsParams, AddPlayerAwardParams, AddPlayerAwardBody, DeletePlayerAwardParams, GetPlayerTransactionsParams, AddPlayerTransactionParams, AddPlayerTransactionBody, DeletePlayerTransactionParams } from "@workspace/api-zod";

const router = Router();

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

// GET /players/:id — returns full PlayerDetail with team context
router.get("/:id", async (req, res) => {
  const parseResult = GetPlayerParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const rows = await db
    .select({
      player: playersTable,
      team: {
        id: teamsTable.id,
        name: teamsTable.name,
        city: teamsTable.city,
        abbreviation: teamsTable.abbreviation,
        primaryColor: teamsTable.primaryColor,
        secondaryColor: teamsTable.secondaryColor,
        leagueId: teamsTable.leagueId,
      },
    })
    .from(playersTable)
    .innerJoin(teamsTable, eq(playersTable.teamId, teamsTable.id))
    .where(eq(playersTable.id, parseResult.data.id))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "Player not found" });
    return;
  }

  const { player, team } = rows[0]!;

  const abilities = await db
    .select()
    .from(playerAbilitiesTable)
    .where(eq(playerAbilitiesTable.playerId, player.id))
    .orderBy(playerAbilitiesTable.slotIndex);

  res.json({
    id: player.id,
    team_id: player.teamId,
    team_name: team.name,
    team_city: team.city,
    team_abbreviation: team.abbreviation,
    team_primary_color: team.primaryColor,
    team_secondary_color: team.secondaryColor,
    league_id: team.leagueId,
    name: player.name,
    position: player.position,
    overall: player.overall,
    age: player.age,
    dev_trait: player.devTrait,
    ea_player_id: player.eaPlayerId,
    presentation_id: player.presentationId,
    portrait_id: player.portraitId,
    birth_year: player.birthYear,
    birth_month: player.birthMonth,
    birth_day: player.birthDay,
    // Physical
    speed: player.speed,
    acceleration: player.acceleration,
    agility: player.agility,
    strength: player.strength,
    stamina: player.stamina,
    injury: player.injury,
    toughness: player.toughness,
    jumping: player.jumping,
    // Mental
    awareness: player.awareness,
    confidence: player.confidence,
    play_recognition: player.playRecognition,
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
    lead_block: player.leadBlock,
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
    kick_accuracy: player.kickAccuracy,
    kick_power: player.kickPower,
    kick_return: player.kickReturn,
    long_snap: player.longSnap,
    // Traits
    clutch_trait: player.clutchTrait,
    high_motor_trait: player.highMotorTrait,
    penalty_trait: player.penaltyTrait,
    predict_trait: player.predictTrait,
    decision_maker_trait: player.decisionMakerTrait,
    qb_style_trait: player.qbStyleTrait,
    force_pass_trait: player.forcePassTrait,
    sense_pressure_trait: player.sensePressureTrait,
    throw_away_trait: player.throwAwayTrait,
    tight_spiral_trait: player.tightSpiralTrait,
    cover_ball_trait: player.coverBallTrait,
    fight_for_yards_trait: player.fightForYardsTrait,
    run_style: player.runStyle,
    feet_in_bounds_trait: player.feetInBoundsTrait,
    hp_catch_trait: player.hpCatchTrait,
    play_ball_trait: player.playBallTrait,
    pos_catch_trait: player.posCatchTrait,
    yac_catch_trait: player.yacCatchTrait,
    drop_open_pass_trait: player.dropOpenPassTrait,
    big_hit_trait: player.bigHitTrait,
    strip_ball_trait: player.stripBallTrait,
    dl_bull_rush_trait: player.dlBullRushTrait,
    dl_spin_trait: player.dlSpinTrait,
    dl_swim_trait: player.dlSwimTrait,
    lb_style_trait: player.lbStyleTrait,
    abilities: abilities.map(a => ({
      slot_index: a.slotIndex,
      title: a.title,
      description: a.description,
      activation_description: a.activationDescription,
      deactivation_description: a.deactivationDescription,
      is_passive: a.isPassive,
      logo_id: a.logoId,
      ovr_threshold: a.ovrThreshold,
    })),
  });
});

// GET /players/:id/gamelog
router.get("/:id/gamelog", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const playerRows = await db
    .select({ teamId: playersTable.teamId })
    .from(playersTable)
    .where(eq(playersTable.id, id))
    .limit(1);

  if (playerRows.length === 0) { res.status(404).json({ error: "Player not found" }); return; }
  const teamId = playerRows[0]!.teamId;

  const homeTeamAlias = alias(teamsTable, "home_team");
  const awayTeamAlias = alias(teamsTable, "away_team");

  const rows = await db
    .select({
      id: playerGameStatsTable.id,
      season: playerGameStatsTable.season,
      week: playerGameStatsTable.week,
      weekIndex: playerGameStatsTable.weekIndex,
      stageIndex: playerGameStatsTable.stageIndex,
      pssAtt: playerGameStatsTable.pssAtt,
      pssCmp: playerGameStatsTable.pssCmp,
      pssYds: playerGameStatsTable.pssYds,
      pssTds: playerGameStatsTable.pssTds,
      pssInts: playerGameStatsTable.pssInts,
      pssSacks: playerGameStatsTable.pssSacks,
      pssLng: playerGameStatsTable.pssLng,
      pssRating: playerGameStatsTable.pssRating,
      rshAtt: playerGameStatsTable.rshAtt,
      rshYds: playerGameStatsTable.rshYds,
      rshTds: playerGameStatsTable.rshTds,
      rshLng: playerGameStatsTable.rshLng,
      fmb: playerGameStatsTable.fmb,
      fmbLost: playerGameStatsTable.fmbLost,
      recCatches: playerGameStatsTable.recCatches,
      recTgts: playerGameStatsTable.recTgts,
      recYds: playerGameStatsTable.recYds,
      recTds: playerGameStatsTable.recTds,
      recDrops: playerGameStatsTable.recDrops,
      recLng: playerGameStatsTable.recLng,
      recYac: playerGameStatsTable.recYac,
      defTotalTackles: playerGameStatsTable.defTotalTackles,
      defTfl: playerGameStatsTable.defTfl,
      defSacks: playerGameStatsTable.defSacks,
      defInts: playerGameStatsTable.defInts,
      defFf: playerGameStatsTable.defFf,
      defPd: playerGameStatsTable.defPd,
      defTds: playerGameStatsTable.defTds,
      defFumRec: playerGameStatsTable.defFumRec,
      fgAtt: playerGameStatsTable.fgAtt,
      fgMade: playerGameStatsTable.fgMade,
      fgLng: playerGameStatsTable.fgLng,
      xpAtt: playerGameStatsTable.xpAtt,
      xpMade: playerGameStatsTable.xpMade,
      puntAtt: playerGameStatsTable.puntAtt,
      puntYds: playerGameStatsTable.puntYds,
      puntAvg: playerGameStatsTable.puntAvg,
      puntLng: playerGameStatsTable.puntLng,
      puntIn20: playerGameStatsTable.puntIn20,
      puntTbs: playerGameStatsTable.puntTbs,
      gameStatus: gamesTable.status,
      homeTeamId: gamesTable.homeTeamId,
      homeScore: gamesTable.homeScore,
      awayScore: gamesTable.awayScore,
      homeAbbr: homeTeamAlias.abbreviation,
      homeColor: homeTeamAlias.primaryColor,
      awayAbbr: awayTeamAlias.abbreviation,
      awayColor: awayTeamAlias.primaryColor,
    })
    .from(playerGameStatsTable)
    .leftJoin(gamesTable, eq(playerGameStatsTable.gameId, gamesTable.id))
    .leftJoin(homeTeamAlias, eq(gamesTable.homeTeamId, homeTeamAlias.id))
    .leftJoin(awayTeamAlias, eq(gamesTable.awayTeamId, awayTeamAlias.id))
    .where(eq(playerGameStatsTable.playerId, id))
    .orderBy(playerGameStatsTable.season, playerGameStatsTable.weekIndex);

  res.json(rows.map(r => {
    const isHome = r.homeTeamId != null ? r.homeTeamId === teamId : null;
    const isFinal = r.gameStatus === "FINAL";
    const ps = isHome ? r.homeScore : r.awayScore;
    const os = isHome ? r.awayScore : r.homeScore;
    let result: string | null = null;
    if (isFinal && ps != null && os != null) {
      result = ps > os ? "W" : ps < os ? "L" : "T";
    }
    return {
      id: r.id,
      season: r.season,
      week: r.week,
      week_index: r.weekIndex,
      stage_index: r.stageIndex,
      game_status: r.gameStatus ?? null,
      opponent_abbreviation: (isHome ? r.awayAbbr : r.homeAbbr) ?? null,
      opponent_primary_color: (isHome ? r.awayColor : r.homeColor) ?? null,
      is_home: isHome,
      result,
      player_score: ps ?? null,
      opponent_score: os ?? null,
      pss_att: r.pssAtt ?? null,
      pss_cmp: r.pssCmp ?? null,
      pss_yds: r.pssYds ?? null,
      pss_tds: r.pssTds ?? null,
      pss_ints: r.pssInts ?? null,
      pss_sacks: r.pssSacks ?? null,
      pss_lng: r.pssLng ?? null,
      pss_rating: r.pssRating ?? null,
      rsh_att: r.rshAtt ?? null,
      rsh_yds: r.rshYds ?? null,
      rsh_tds: r.rshTds ?? null,
      rsh_lng: r.rshLng ?? null,
      fmb: r.fmb ?? null,
      fmb_lost: r.fmbLost ?? null,
      rec_catches: r.recCatches ?? null,
      rec_tgts: r.recTgts ?? null,
      rec_yds: r.recYds ?? null,
      rec_tds: r.recTds ?? null,
      rec_drops: r.recDrops ?? null,
      rec_lng: r.recLng ?? null,
      rec_yac: r.recYac ?? null,
      def_total_tackles: r.defTotalTackles ?? null,
      def_tfl: r.defTfl ?? null,
      def_sacks: r.defSacks ?? null,
      def_ints: r.defInts ?? null,
      def_ff: r.defFf ?? null,
      def_pd: r.defPd ?? null,
      def_tds: r.defTds ?? null,
      def_fum_rec: r.defFumRec ?? null,
      fg_att: r.fgAtt ?? null,
      fg_made: r.fgMade ?? null,
      fg_lng: r.fgLng ?? null,
      xp_att: r.xpAtt ?? null,
      xp_made: r.xpMade ?? null,
      punt_att: r.puntAtt ?? null,
      punt_yds: r.puntYds ?? null,
      punt_avg: r.puntAvg ?? null,
      punt_lng: r.puntLng ?? null,
      punt_in20: r.puntIn20 ?? null,
      punt_tbs: r.puntTbs ?? null,
    };
  }));
});

// GET /players/:id/awards
router.get("/:id/awards", async (req, res) => {
  const parseResult = GetPlayerAwardsParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const awards = await db
    .select()
    .from(playerAwardsTable)
    .where(eq(playerAwardsTable.playerId, parseResult.data.id))
    .orderBy(playerAwardsTable.season);
  res.json(awards.map(a => ({
    id: a.id,
    player_id: a.playerId,
    league_id: a.leagueId,
    season: a.season,
    award_type: a.awardType,
    created_at: a.createdAt.toISOString(),
  })));
});

// POST /players/:id/awards
router.post("/:id/awards", async (req, res) => {
  const paramResult = AddPlayerAwardParams.safeParse({ id: Number(req.params.id) });
  if (!paramResult.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyResult = AddPlayerAwardBody.safeParse(req.body);
  if (!bodyResult.success) { res.status(400).json({ error: "Invalid body", details: bodyResult.error.issues }); return; }
  const { league_id, season, award_type } = bodyResult.data;
  if (!(AWARD_TYPES as readonly string[]).includes(award_type)) {
    res.status(400).json({ error: `Invalid award_type. Must be one of: ${AWARD_TYPES.join(", ")}` });
    return;
  }
  const [award] = await db.insert(playerAwardsTable).values({
    playerId: paramResult.data.id,
    leagueId: league_id,
    season,
    awardType: award_type,
  }).returning();
  if (!award) { res.status(500).json({ error: "Insert failed" }); return; }
  res.status(201).json({
    id: award.id,
    player_id: award.playerId,
    league_id: award.leagueId,
    season: award.season,
    award_type: award.awardType,
    created_at: award.createdAt.toISOString(),
  });
});

// DELETE /players/:id/awards/:awardId
router.delete("/:id/awards/:awardId", async (req, res) => {
  const parseResult = DeletePlayerAwardParams.safeParse({ id: Number(req.params.id), awardId: Number(req.params.awardId) });
  if (!parseResult.success) { res.status(400).json({ error: "Invalid params" }); return; }
  const deleted = await db
    .delete(playerAwardsTable)
    .where(and(eq(playerAwardsTable.id, parseResult.data.awardId), eq(playerAwardsTable.playerId, parseResult.data.id)))
    .returning();
  if (!deleted.length) { res.status(404).json({ error: "Award not found" }); return; }
  res.status(204).end();
});

// GET /players/:id/transactions
router.get("/:id/transactions", async (req, res) => {
  const parseResult = GetPlayerTransactionsParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const rows = await db
    .select()
    .from(playerTransactionsTable)
    .where(eq(playerTransactionsTable.playerId, parseResult.data.id))
    .orderBy(desc(playerTransactionsTable.season), desc(playerTransactionsTable.week));
  res.json(rows.map(t => ({
    id: t.id,
    player_id: t.playerId,
    league_id: t.leagueId,
    season: t.season,
    week: t.week ?? null,
    transaction_type: t.transactionType,
    from_team: t.fromTeam ?? null,
    to_team: t.toTeam ?? null,
    notes: t.notes ?? null,
    created_at: t.createdAt.toISOString(),
  })));
});

// POST /players/:id/transactions
router.post("/:id/transactions", async (req, res) => {
  const paramResult = AddPlayerTransactionParams.safeParse({ id: Number(req.params.id) });
  if (!paramResult.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyResult = AddPlayerTransactionBody.safeParse(req.body);
  if (!bodyResult.success) { res.status(400).json({ error: "Invalid body", details: bodyResult.error.issues }); return; }
  const { league_id, season, week, transaction_type, from_team, to_team, notes } = bodyResult.data;
  if (!(TRANSACTION_TYPES as readonly string[]).includes(transaction_type)) {
    res.status(400).json({ error: `Invalid transaction_type. Must be one of: ${TRANSACTION_TYPES.join(", ")}` });
    return;
  }
  const [row] = await db.insert(playerTransactionsTable).values({
    playerId: paramResult.data.id,
    leagueId: league_id,
    season,
    week: week ?? null,
    transactionType: transaction_type,
    fromTeam: from_team ?? null,
    toTeam: to_team ?? null,
    notes: notes ?? null,
  }).returning();
  if (!row) { res.status(500).json({ error: "Insert failed" }); return; }
  res.status(201).json({
    id: row.id,
    player_id: row.playerId,
    league_id: row.leagueId,
    season: row.season,
    week: row.week ?? null,
    transaction_type: row.transactionType,
    from_team: row.fromTeam ?? null,
    to_team: row.toTeam ?? null,
    notes: row.notes ?? null,
    created_at: row.createdAt.toISOString(),
  });
});

// DELETE /players/:id/transactions/:transactionId
router.delete("/:id/transactions/:transactionId", async (req, res) => {
  const parseResult = DeletePlayerTransactionParams.safeParse({ id: Number(req.params.id), transactionId: Number(req.params.transactionId) });
  if (!parseResult.success) { res.status(400).json({ error: "Invalid params" }); return; }
  const deleted = await db
    .delete(playerTransactionsTable)
    .where(and(eq(playerTransactionsTable.id, parseResult.data.transactionId), eq(playerTransactionsTable.playerId, parseResult.data.id)))
    .returning();
  if (!deleted.length) { res.status(404).json({ error: "Transaction not found" }); return; }
  res.status(204).end();
});

// PATCH /players/:id
router.patch("/:id", async (req, res) => {
  const paramResult = UpdatePlayerParams.safeParse({ id: Number(req.params.id) });
  if (!paramResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyResult = UpdatePlayerBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const data = bodyResult.data;
  const updates: Record<string, unknown> = {};
  if (data.overall !== undefined) updates.overall = data.overall;
  if (data.speed !== undefined) updates.speed = data.speed;
  if (data.strength !== undefined) updates.strength = data.strength;
  if (data.awareness !== undefined) updates.awareness = data.awareness;
  if (data.throwing_power !== undefined) updates.throwingPower = data.throwing_power;
  if (data.catching !== undefined) updates.catching = data.catching;
  if (data.tackling !== undefined) updates.tackling = data.tackling;

  const [player] = await db.update(playersTable).set(updates).where(eq(playersTable.id, paramResult.data.id)).returning();
  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }
  res.json(formatPlayer(player));
});

export default router;
