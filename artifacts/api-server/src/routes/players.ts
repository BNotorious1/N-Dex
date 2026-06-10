import { Router } from "express";
import { db, playersTable, teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetPlayerParams, UpdatePlayerParams, UpdatePlayerBody } from "@workspace/api-zod";

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
  });
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
