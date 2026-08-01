import { Router } from "express";
import { db, leaguesTable, teamsTable, playersTable, playerAbilitiesTable, playerGameStatsTable, gamesTable, leagueImportsTable } from "@workspace/db";
import { eq, and, or, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// ─── Normalisation helpers ────────────────────────────────────────────────────

function toArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (val != null && typeof val === "object") return [val as T];
  return [];
}

function getNestedArray<T>(obj: Record<string, unknown>, ...keys: string[]): T[] {
  let cur: unknown = obj;
  for (const k of keys) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) break;
    cur = (cur as Record<string, unknown>)[k];
  }
  return toArray<T>(cur);
}

function num(v: unknown, def = 0): number {
  const n = typeof v === "number" ? v : def;
  return Math.round(n);
}

function numDec(v: unknown, def = 0): number {
  return typeof v === "number" ? v : def;
}

function str(v: unknown, def = ""): string {
  return typeof v === "string" ? v : String(def);
}

function intToHex(n: unknown): string | null {
  if (typeof n !== "number" || n === 0) return null;
  return `#${n.toString(16).padStart(6, "0")}`;
}

const CONFERENCE_MAP: Record<number, string> = { 0: "AFC", 1: "NFC" };
const DIVISION_MAP: Record<number, string> = { 0: "East", 1: "West", 2: "North", 3: "South" };

type RawTeam = Record<string, unknown>;
type RawPlayer = Record<string, unknown>;
type RawStanding = Record<string, unknown>;
type RawGame = Record<string, unknown>;

// ─── Core upsert functions (exported for use from ea.ts) ─────────────────────

function parseDivName(t: RawTeam): { conference: string; division: string } {
  // Blaze export provides "divName": "AFC North" — parse it directly.
  // Fall back to numeric conference/division fields (Companion App format).
  const divName = str(t["divName"], "");
  if (divName) {
    const conf = divName.startsWith("NFC") ? "NFC" : "AFC";
    const div = divName.includes("North") ? "North"
      : divName.includes("South") ? "South"
      : divName.includes("West") ? "West"
      : "East";
    return { conference: conf, division: div };
  }
  const conferenceNum = num(t["conference"], -1);
  const divisionNum = num(t["division"], -1);
  return {
    conference: CONFERENCE_MAP[conferenceNum] ?? "AFC",
    division: DIVISION_MAP[divisionNum] ?? "East",
  };
}

export async function upsertLeagueTeams(leagueId: number, teams: RawTeam[]): Promise<number> {
  let count = 0;
  for (const t of teams) {
    const eaTeamId = typeof t["teamId"] === "number" ? t["teamId"] : null;
    if (eaTeamId === null) continue;

    const { conference, division } = parseDivName(t);

    const rawUserName = str(t["userName"], "");
    const values = {
      leagueId,
      name: str(t["teamName"] || t["nickName"] || t["displayName"], "Unknown"),
      city: str(t["cityName"], "Unknown"),
      abbreviation: str(t["abbrName"], "???").toUpperCase().slice(0, 4),
      conference,
      division,
      wins: num(t["wins"]),
      losses: num(t["losses"]),
      ties: num(t["ties"]),
      overallRating: num(t["ovrRating"], 75),
      primaryColor: intToHex(t["primaryColor"]),
      secondaryColor: intToHex(t["secondaryColor"]),
      eaTeamId,
      isUserTeam: false,
      userName: rawUserName || null,
    };

    const existing = await db
      .select({ id: teamsTable.id })
      .from(teamsTable)
      .where(and(eq(teamsTable.leagueId, leagueId), eq(teamsTable.eaTeamId, eaTeamId)))
      .limit(1);

    if (existing.length > 0) {
      await db.update(teamsTable).set(values).where(eq(teamsTable.id, existing[0]!.id));
    } else {
      await db.insert(teamsTable).values(values);
    }
    count++;
  }
  return count;
}

export async function upsertTeamRoster(
  leagueId: number,
  eaTeamId: number,
  players: RawPlayer[],
): Promise<number> {
  const dbTeam = await db
    .select({ id: teamsTable.id })
    .from(teamsTable)
    .where(and(eq(teamsTable.leagueId, leagueId), eq(teamsTable.eaTeamId, eaTeamId)))
    .limit(1);

  if (dbTeam.length === 0) return 0;
  const teamId = dbTeam[0]!.id;

  await db.delete(playersTable).where(eq(playersTable.teamId, teamId));

  function ni(p: RawPlayer, key: string): number | null {
    return typeof p[key] === "number" ? (p[key] as number) : null;
  }

  function deriveYearsPro(p: RawPlayer): number | null {
    const explicit = ni(p, "yearsPro");
    if (explicit !== null) return explicit;
    const age = num(p["age"], -1);
    if (age < 22) return null;
    return age - 22;
  }

  const validPlayers = players
    .filter((p): p is RawPlayer => typeof p === "object" && p !== null);

  const rows = validPlayers.map((p) => ({
      teamId,
      name: `${str(p["firstName"])} ${str(p["lastName"])}`.trim() || "Unknown",
      position: str(p["position"], "OL"),
      overall: num(p["playerBestOvr"] ?? p["overall"], 70),
      age: num(p["age"], 25),
      devTrait: ni(p, "devTrait"),
      yearsPro: deriveYearsPro(p),
      rookieYear: ni(p, "rookieYear"),
      draftRound: ni(p, "draftRound"),
      draftPick: ni(p, "draftPick"),
      eaPlayerId: p["rosterId"] != null ? String(p["rosterId"]) : null,
      presentationId: ni(p, "presentationId"),
      portraitId: ni(p, "portraitId"),
      birthYear: ni(p, "birthYear"),
      birthMonth: ni(p, "birthMonth"),
      birthDay: ni(p, "birthDay"),
      // Physical
      speed: num(p["speedRating"], 75),
      acceleration: ni(p, "accelRating"),
      agility: ni(p, "agilityRating"),
      strength: num(p["strengthRating"], 70),
      stamina: ni(p, "staminaRating"),
      injury: ni(p, "injuryRating"),
      toughness: ni(p, "toughRating"),
      jumping: ni(p, "jumpRating"),
      // Mental
      awareness: num(p["awareRating"] ?? p["awareness"], 70),
      confidence: ni(p, "confRating"),
      playRecognition: ni(p, "playRecRating"),
      // Passing
      throwingPower: ni(p, "throwPowerRating"),
      throwAccuracy: ni(p, "throwAccRating"),
      throwAccuracyShort: ni(p, "throwAccShortRating"),
      throwAccuracyMid: ni(p, "throwAccMidRating"),
      throwAccuracyDeep: ni(p, "throwAccDeepRating"),
      throwOnRun: ni(p, "throwOnRunRating"),
      throwUnderPressure: ni(p, "throwUnderPressureRating"),
      playAction: ni(p, "playActionRating"),
      breakSack: ni(p, "breakSackRating"),
      // Receiving
      catching: ni(p, "catchRating"),
      catchInTraffic: ni(p, "cITRating"),
      spectacularCatch: ni(p, "specCatchRating"),
      routeRunShort: ni(p, "routeRunShortRating"),
      routeRunMid: ni(p, "routeRunMedRating"),
      routeRunDeep: ni(p, "routeRunDeepRating"),
      release: ni(p, "releaseRating"),
      // Ball carrying
      carrying: ni(p, "carryRating"),
      ballCarrierVision: ni(p, "bCVRating"),
      breakTackle: ni(p, "breakTackleRating"),
      stiffArm: ni(p, "stiffArmRating"),
      spinMove: ni(p, "spinMoveRating"),
      jukeMove: ni(p, "jukeMoveRating"),
      trucking: ni(p, "truckRating"),
      changeOfDirection: ni(p, "changeOfDirectionRating"),
      // Blocking
      runBlock: ni(p, "runBlockRating"),
      runBlockPower: ni(p, "runBlockPowerRating"),
      runBlockFinesse: ni(p, "runBlockFinesseRating"),
      passBlock: ni(p, "passBlockRating"),
      passBlockPower: ni(p, "passBlockPowerRating"),
      passBlockFinesse: ni(p, "passBlockFinesseRating"),
      impactBlock: ni(p, "impactBlockRating"),
      leadBlock: ni(p, "leadBlockRating"),
      // Defense
      tackling: ni(p, "tackleRating"),
      hitPower: ni(p, "hitPowerRating"),
      pursuit: ni(p, "pursuitRating"),
      blockShed: ni(p, "blockShedRating"),
      finesseMoves: ni(p, "finesseMovesRating"),
      powerMoves: ni(p, "powerMovesRating"),
      manCoverage: ni(p, "manCoverRating"),
      zoneCoverage: ni(p, "zoneCoverRating"),
      press: ni(p, "pressRating"),
      // Special teams
      kickAccuracy: ni(p, "kickAccRating"),
      kickPower: ni(p, "kickPowerRating"),
      kickReturn: ni(p, "kickRetRating"),
      longSnap: ni(p, "longSnapRating"),
      // Traits
      clutchTrait: ni(p, "clutchTrait"),
      highMotorTrait: ni(p, "highMotorTrait"),
      penaltyTrait: ni(p, "penaltyTrait"),
      predictTrait: ni(p, "predictTrait"),
      decisionMakerTrait: ni(p, "decisionMakerTrait"),
      qbStyleTrait: ni(p, "qBStyleTrait"),
      forcePassTrait: ni(p, "forcePassTrait"),
      sensePressureTrait: ni(p, "sensePressureTrait"),
      throwAwayTrait: ni(p, "throwAwayTrait"),
      tightSpiralTrait: ni(p, "tightSpiralTrait"),
      coverBallTrait: ni(p, "coverBallTrait"),
      fightForYardsTrait: ni(p, "fightForYardsTrait"),
      runStyle: ni(p, "runStyle"),
      feetInBoundsTrait: ni(p, "feetInBoundsTrait"),
      hpCatchTrait: ni(p, "hPCatchTrait"),
      playBallTrait: ni(p, "playBallTrait"),
      posCatchTrait: ni(p, "posCatchTrait"),
      yacCatchTrait: ni(p, "yACCatchTrait"),
      dropOpenPassTrait: ni(p, "dropOpenPassTrait"),
      bigHitTrait: ni(p, "bigHitTrait"),
      stripBallTrait: ni(p, "stripBallTrait"),
      dlBullRushTrait: ni(p, "dLBullRushTrait"),
      dlSpinTrait: ni(p, "dLSpinTrait"),
      dlSwimTrait: ni(p, "dLSwimTrait"),
      lbStyleTrait: ni(p, "lBStyleTrait"),
      // Body measurements
      height: ni(p, "height"),
      weight: ni(p, "weight"),
      college: typeof p["college"] === "string" ? (p["college"] as string).trim() || null : null,
      // Contract
      contractSalary: ni(p, "contractSalary"),
      contractBonus: ni(p, "contractBonus"),
      contractLength: ni(p, "contractLength"),
      contractYearsLeft: ni(p, "contractYearsLeft"),
      capHit: ni(p, "capHit"),
      depthChartOrder: ni(p, "depthChartOrder"),
    }));

  const insertedPlayers = rows.length > 0
    ? await db.insert(playersTable).values(rows).returning({ id: playersTable.id })
    : [];

  // Insert abilities
  type AbilityRow = typeof playerAbilitiesTable.$inferInsert;
  const abilityRows: AbilityRow[] = [];
  for (let i = 0; i < insertedPlayers.length; i++) {
    const playerId = insertedPlayers[i]!.id;
    const p = validPlayers[i]!;
    const slots = toArray<Record<string, unknown>>(p["signatureSlotList"]);
    slots.forEach((slot, slotIdx) => {
      if (slot["isEmpty"] === true) return;
      const ability = slot["signatureAbility"];
      if (!ability || typeof ability !== "object") return;
      const ab = ability as Record<string, unknown>;
      const title = str(ab["signatureTitle"]);
      if (!title) return;
      const activationDesc = str(ab["signatureActivationDescription"]) || null;
      const deactivationDesc = str(ab["signatureDeactivationDescription"]) || null;
      abilityRows.push({
        playerId,
        slotIndex: slotIdx,
        title,
        description: str(ab["signatureDescription"]),
        activationDescription: activationDesc,
        deactivationDescription: deactivationDesc,
        isPassive: ab["isPassive"] === true,
        logoId: typeof ab["signatureLogoId"] === "number" ? (ab["signatureLogoId"] as number) : null,
        ovrThreshold: typeof slot["ovrThreshold"] === "number" ? (slot["ovrThreshold"] as number) : null,
      });
    });
  }
  if (abilityRows.length > 0) await db.insert(playerAbilitiesTable).values(abilityRows);

  return rows.length;
}

export async function upsertStandings(leagueId: number, standings: RawStanding[]): Promise<number> {
  let count = 0;
  for (const s of standings) {
    const eaTeamId = typeof s["teamId"] === "number" ? s["teamId"] : null;
    if (eaTeamId === null) continue;

    await db
      .update(teamsTable)
      .set({
        wins: num(s["wins"]),
        losses: num(s["losses"]),
        ties: num(s["ties"]),
      })
      .where(and(eq(teamsTable.leagueId, leagueId), eq(teamsTable.eaTeamId, eaTeamId)));
    count++;
  }
  return count;
}

export async function upsertWeekSchedule(
  leagueId: number,
  games: RawGame[],
  season: number,
  targetWeekIndex?: number,
  targetStageIndex?: number,
): Promise<number> {
  const allTeams = await db
    .select({ id: teamsTable.id, eaTeamId: teamsTable.eaTeamId })
    .from(teamsTable)
    .where(eq(teamsTable.leagueId, leagueId));

  const teamByEaId = new Map(
    allTeams.filter((t) => t.eaTeamId != null).map((t) => [t.eaTeamId!, t.id]),
  );
  if (teamByEaId.size === 0) return 0;

  if (targetWeekIndex != null && targetStageIndex != null) {
    await db
      .delete(gamesTable)
      .where(
        and(
          eq(gamesTable.leagueId, leagueId),
          eq(gamesTable.weekIndex, targetWeekIndex),
          eq(gamesTable.stageIndex, targetStageIndex),
        ),
      );
  } else {
    await db.delete(gamesTable).where(eq(gamesTable.leagueId, leagueId));
  }

  const rows: typeof gamesTable.$inferInsert[] = [];

  for (const g of games) {
    const homeEaId = typeof g["homeTeamId"] === "number" ? g["homeTeamId"] : null;
    const rawAway = g["visitorTeamId"] ?? g["awayTeamId"];
    const awayEaId = typeof rawAway === "number" ? rawAway : null;
    if (homeEaId === null || awayEaId === null) continue;

    const homeTeamId = teamByEaId.get(homeEaId);
    const awayTeamId = teamByEaId.get(awayEaId);
    if (!homeTeamId || !awayTeamId) continue;

    // Blaze uses "status" field; Companion App uses "resultType". Both share same enum.
    // GameResult: NOT_PLAYED=1, AWAY_WIN=2, HOME_WIN=3, TIE=4
    const gameStatus = typeof g["status"] === "number" ? g["status"]
      : typeof g["resultType"] === "number" ? g["resultType"] : 1;
    const isFinal = gameStatus >= 2; // 2=AWAY_WIN, 3=HOME_WIN, 4=TIE
    const wi = typeof g["weekIndex"] === "number" ? g["weekIndex"] : (targetWeekIndex ?? 0);
    const si = typeof g["stageIndex"] === "number" ? g["stageIndex"] : (targetStageIndex ?? 1);

    const rawVisitorScore = g["visitorScore"] ?? g["awayScore"];
    rows.push({
      leagueId,
      homeTeamId,
      awayTeamId,
      homeScore: isFinal && typeof g["homeScore"] === "number" ? g["homeScore"] : null,
      awayScore: isFinal && typeof rawVisitorScore === "number" ? rawVisitorScore : null,
      week: wi + 1,
      season,
      status: isFinal ? "FINAL" : "SCHEDULED",
      weekIndex: wi,
      stageIndex: si,
    });
  }

  if (rows.length > 0) await db.insert(gamesTable).values(rows);
  return rows.length;
}

// ─── Log helper ──────────────────────────────────────────────────────────────

async function logImport(
  leagueId: number,
  importType: string,
  status: "success" | "error",
  recordsProcessed: number,
  errorMessage?: string,
): Promise<void> {
  await db
    .insert(leagueImportsTable)
    .values({ leagueId, importType, status, recordsProcessed, errorMessage })
    .catch(() => {});
}

// ─── Resolve N-Dex leagueId from req params ──────────────────────────────────

async function resolveLeague(leagueId: number) {
  const rows = await db
    .select({ id: leaguesTable.id, season: leaguesTable.season })
    .from(leaguesTable)
    .where(eq(leaguesTable.id, leagueId))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Legacy single-endpoint route (backward compat) ──────────────────────────

router.post("/:leagueId", async (req, res) => {
  const leagueId = Number(req.params["leagueId"]);
  if (isNaN(leagueId)) { res.status(400).json({ error: "Invalid league ID" }); return; }

  const league = await resolveLeague(leagueId);
  if (!league) { res.status(404).json({ error: "League not found" }); return; }

  const body = req.body as Record<string, unknown>;
  const leagueType = typeof body["leagueType"] === "string" ? body["leagueType"] : "unknown";

  let recordsProcessed = 0;
  let status: "success" | "error" = "success";
  let errorMessage: string | undefined;

  try {
    switch (leagueType) {
      case "leagueTeams": {
        const teams = getNestedArray<RawTeam>(body, "leagueTeamInfoList", "leagueTeamInfo")
          .concat(toArray<RawTeam>(body["teamInfoList"]));
        recordsProcessed = await upsertLeagueTeams(leagueId, teams);
        break;
      }
      case "leagueRosters": {
        const teamRosters = toArray<Record<string, unknown>>(body["teamRosters"]);
        for (const r of teamRosters) {
          const eaTeamId = typeof r["teamId"] === "number" ? r["teamId"] : null;
          if (eaTeamId === null) continue;
          const players = getNestedArray<RawPlayer>(r, "playerInfoList", "playerInfo")
            .concat(toArray<RawPlayer>(r["players"]));
          recordsProcessed += await upsertTeamRoster(leagueId, eaTeamId, players);
        }
        break;
      }
      case "leagueStandings": {
        const standings = getNestedArray<RawStanding>(body, "teamStandingInfoList", "teamStandingInfo")
          .concat(toArray<RawStanding>(body["teamStandingInfoList"]));
        recordsProcessed = await upsertStandings(leagueId, standings);
        break;
      }
      case "leagueSchedules": {
        const games = getNestedArray<RawGame>(body, "scheduleInfoList", "scheduleInfo")
          .concat(toArray<RawGame>(body["scheduleInfoList"]));
        recordsProcessed = await upsertWeekSchedule(leagueId, games, league.season);
        break;
      }
      default:
        req.log.info({ leagueType }, "Unhandled import type — logged only");
    }
  } catch (err) {
    req.log.error({ err, leagueType, leagueId }, "Companion App import error");
    status = "error";
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  await logImport(leagueId, leagueType, status, recordsProcessed, errorMessage);
  res.status(200).json({ success: status === "success", leagueType, recordsProcessed });
});

// ─── Companion App path-based routes ─────────────────────────────────────────
// Madden Companion App pushes to /<platform>/<eaLeagueId>/<resource>
// Our URL: /api/import/:leagueId  → app appends /:platform/:eaLeagueId/...

router.post("/:leagueId/:platform/:eaLeagueId/leagueTeams", async (req, res) => {
  const leagueId = Number(req.params["leagueId"]);
  if (isNaN(leagueId)) { res.status(400).json({ error: "Invalid league ID" }); return; }

  try {
    const body = req.body as Record<string, unknown>;
    const teams = getNestedArray<RawTeam>(body, "leagueTeamInfoList", "leagueTeamInfo")
      .concat(toArray<RawTeam>(body["teamInfoList"]));
    const count = await upsertLeagueTeams(leagueId, teams);
    await logImport(leagueId, "leagueTeams", "success", count);
    res.json({ success: true, recordsProcessed: count });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logImport(leagueId, "leagueTeams", "error", 0, msg);
    res.status(500).json({ error: msg });
  }
});

router.post("/:leagueId/:platform/:eaLeagueId/standings", async (req, res) => {
  const leagueId = Number(req.params["leagueId"]);
  if (isNaN(leagueId)) { res.status(400).json({ error: "Invalid league ID" }); return; }

  try {
    const body = req.body as Record<string, unknown>;
    const standings = getNestedArray<RawStanding>(body, "teamStandingInfoList", "teamStandingInfo")
      .concat(toArray<RawStanding>(body["teamStandingInfoList"]));
    const count = await upsertStandings(leagueId, standings);
    await logImport(leagueId, "standings", "success", count);
    res.json({ success: true, recordsProcessed: count });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logImport(leagueId, "standings", "error", 0, msg);
    res.status(500).json({ error: msg });
  }
});

router.post("/:leagueId/:platform/:eaLeagueId/team/:teamId/roster", async (req, res) => {
  const leagueId = Number(req.params["leagueId"]);
  const eaTeamId = Number(req.params["teamId"]);
  if (isNaN(leagueId) || isNaN(eaTeamId)) {
    res.status(400).json({ error: "Invalid league or team ID" }); return;
  }

  try {
    const body = req.body as Record<string, unknown>;
    const players = getNestedArray<RawPlayer>(body, "rosterInfoList", "playerInfoList", "playerInfo")
      .concat(getNestedArray<RawPlayer>(body, "playerInfoList", "playerInfo"))
      .concat(toArray<RawPlayer>(body["playerInfo"]));
    const count = await upsertTeamRoster(leagueId, eaTeamId, players);
    await logImport(leagueId, `roster:${eaTeamId}`, "success", count);
    res.json({ success: true, recordsProcessed: count });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logImport(leagueId, `roster:${eaTeamId}`, "error", 0, msg);
    res.status(500).json({ error: msg });
  }
});

router.post("/:leagueId/:platform/:eaLeagueId/freeagents/roster", async (req, res) => {
  res.json({ success: true, recordsProcessed: 0, note: "Free agents not yet persisted" });
});

router.post("/:leagueId/:platform/:eaLeagueId/:week/:stage/schedules", async (req, res) => {
  const leagueId = Number(req.params["leagueId"]);
  const weekIndex = Number(req.params["week"]) - 1;
  const stageStr = req.params["stage"];
  const stageIndex = stageStr === "pre" ? 0 : 1;
  if (isNaN(leagueId)) { res.status(400).json({ error: "Invalid league ID" }); return; }

  try {
    const league = await resolveLeague(leagueId);
    if (!league) { res.status(404).json({ error: "League not found" }); return; }

    const body = req.body as Record<string, unknown>;
    const games = getNestedArray<RawGame>(body, "scheduleInfoList", "scheduleInfo")
      .concat(toArray<RawGame>(body["scheduleInfoList"]));
    const count = await upsertWeekSchedule(leagueId, games, league.season, weekIndex, stageIndex);
    await logImport(leagueId, `schedules:w${weekIndex}:${stageStr}`, "success", count);
    res.json({ success: true, recordsProcessed: count });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logImport(leagueId, "schedules", "error", 0, msg);
    res.status(500).json({ error: msg });
  }
});

// ─── Player stat upsert helpers ──────────────────────────────────────────────

type RawStat = Record<string, unknown>;

export function buildStatSet(
  statType: string,
  s: RawStat,
): Partial<typeof playerGameStatsTable.$inferInsert> {
  if (statType === "passing") {
    return {
      pssAtt:    num(s["pssAtt"]    ?? s["passAtt"]),
      pssCmp:    num(s["pssCmp"]    ?? s["passComp"]   ?? s["passCmp"]),
      pssYds:    num(s["pssYds"]    ?? s["passYds"]),
      pssTds:    num(s["passTDs"]   ?? s["pssTDs"]     ?? s["passTds"]),
      pssInts:   num(s["pssInts"]   ?? s["passInts"]),
      pssSacks:  num(s["pssSacks"]  ?? s["passSacks"]),
      pssLng:    num(s["pssLng"]    ?? s["passLongest"] ?? s["passLng"]),
      pssRating: numDec(s["pssRate"]   ?? s["passerRating"] ?? s["passRating"] ?? s["pssRating"]),
    };
  }
  if (statType === "rushing") {
    return {
      rshAtt:  num(s["rshAtt"]  ?? s["rushAtt"]),
      rshYds:  num(s["rshYds"]  ?? s["rushYds"]),
      rshTds:  num(s["rshTDs"]  ?? s["rushTDs"]  ?? s["rshTds"]),
      rshLng:  num(s["rshLng"]  ?? s["rushLongest"] ?? s["rushLng"]),
      rshBtk:  num(s["rshBrokenTackles"] ?? s["rushBrokenTackles"] ?? s["brokenTackles"] ?? s["rshBtk"]),
      fmb:     num(s["fmb"]     ?? s["rushFum"]   ?? s["fumbles"]),
      fmbLost: num(s["fmbLost"] ?? s["fumLost"]),
    };
  }
  if (statType === "receiving") {
    return {
      recCatches: num(s["recCatches"] ?? s["recReceptions"]),
      recTgts:    num(s["recTgts"]    ?? s["recTargets"]),
      recYds:     num(s["recYds"]     ?? s["recYards"]),
      recTds:     num(s["recTDs"]     ?? s["recTds"]      ?? s["recTouchdowns"]),
      recDrops:   num(s["recDrops"]),
      recLng:     num(s["recLng"]     ?? s["recLongest"]  ?? s["recLong"]),
      recYac:     num(s["recYac"]     ?? s["recYdsAfterCatch"]),
    };
  }
  if (statType === "defense") {
    return {
      defTotalTackles: num(s["defTotalTackles"]),
      defTfl:          numDec(s["defTackleForLoss"] ?? s["defTFL"]         ?? s["defTfl"]),
      defSacks:        numDec(s["defSacks"]),
      defInts:         num(s["defInts"]),
      defFf:           num(s["defForcedFum"]     ?? s["defFF"]          ?? s["defFf"]),
      defPd:           num(s["defDeflections"]   ?? s["defPassDef"]     ?? s["defPD"]),
      defTds:          num(s["defTDs"]           ?? s["defTds"]),
      defFumRec:       num(s["defFumRec"]),
      defCatchesAllowed: num(s["defCatchesAllowed"] ?? s["defCatchAllowed"] ?? s["defCatches"]),
      defSafeties:       num(s["defSafeties"]       ?? s["defSafety"]),
    };
  }
  if (statType === "kicking") {
    return {
      fgAtt:  num(s["fGAtt"]      ?? s["fgAtt"]),
      fgMade: num(s["fGMade"]     ?? s["fgMade"]),
      fgLng:  num(s["fGLongest"]  ?? s["fGLng"]  ?? s["fgLng"]),
      xpAtt:  num(s["xPAtt"]      ?? s["xpAtt"]),
      xpMade: num(s["xPMade"]     ?? s["xpMade"]),
    };
  }
  // punting
  return {
    puntAtt:  num(s["puntAtt"]),
    puntYds:  num(s["puntYds"]),
    puntAvg:  num(s["puntAvg"]    ?? s["puntYdsPerAtt"]),
    puntLng:  num(s["puntLng"]    ?? s["puntLongest"]),
    puntIn20: num(s["puntsIn20"]  ?? s["puntIn20"]),
    puntTbs:  num(s["puntTBs"]    ?? s["puntTbs"]),
  };
}

export const STAT_KEY_MAP: Record<string, string> = {
  passing:   "playerPassingStatInfoList",
  rushing:   "playerRushingStatInfoList",
  receiving: "playerReceivingStatInfoList",
  defense:   "playerDefensiveStatInfoList",
  kicking:   "playerKickingStatInfoList",
  punting:   "playerPuntingStatInfoList",
};

// Tracks which statTypes we've already logged a sample for (resets on server restart)
const _loggedSample = new Set<string>();

export async function processStatBlob(
  leagueId: number,
  weekIndex: number,
  stageIndex: number,
  season: number,
  statType: string,
  body: Record<string, unknown>,
): Promise<number> {
  const listKey = STAT_KEY_MAP[statType];
  if (!listKey) return 0;
  const stats = getNestedArray<RawStat>(body, listKey);
  if (stats.length === 0) {
    const bodyKeys = Object.keys(body);
    logger.warn({ statType, listKey, weekIndex, bodyKeys }, "processStatBlob: 0 stats — response keys logged for diagnosis");
  }
  // One-shot: log the first raw stat record for each stat type so we can see exact Blaze field names
  if (stats.length > 0 && !_loggedSample.has(statType)) {
    _loggedSample.add(statType);
    logger.info({ statType, sample: stats[0] }, "processStatBlob: first raw stat record (field name diagnosis)");
  }
  return upsertPlayerStats(leagueId, weekIndex, stageIndex, season, stats, s => buildStatSet(statType, s));
}

export async function upsertPlayerStats(
  leagueId: number,
  weekIndex: number,
  stageIndex: number,
  season: number,
  stats: RawStat[],
  buildSet: (s: RawStat) => Partial<typeof playerGameStatsTable.$inferInsert>,
): Promise<number> {
  if (stats.length === 0) return 0;

  const playerRows = await db
    .select({ id: playersTable.id, teamId: playersTable.teamId, eaPlayerId: playersTable.eaPlayerId })
    .from(playersTable)
    .innerJoin(teamsTable, eq(playersTable.teamId, teamsTable.id))
    .where(eq(teamsTable.leagueId, leagueId));

  const playerByRosterId = new Map(
    playerRows.filter(p => p.eaPlayerId != null).map(p => [p.eaPlayerId!, p] as const),
  );

  const games = await db
    .select({ id: gamesTable.id, homeTeamId: gamesTable.homeTeamId, awayTeamId: gamesTable.awayTeamId })
    .from(gamesTable)
    .where(and(eq(gamesTable.leagueId, leagueId), eq(gamesTable.weekIndex, weekIndex), eq(gamesTable.stageIndex, stageIndex)));

  const gameByTeamId = new Map<number, number>();
  for (const g of games) {
    gameByTeamId.set(g.homeTeamId, g.id);
    gameByTeamId.set(g.awayTeamId, g.id);
  }

  const week = weekIndex + 1;
  const rows: (typeof playerGameStatsTable.$inferInsert)[] = [];

  for (const s of stats) {
    const rosterId = typeof s["rosterId"] === "number" ? s["rosterId"] : null;
    if (rosterId === null) continue;
    const player = playerByRosterId.get(String(rosterId));
    if (!player) continue;
    const gameId = gameByTeamId.get(player.teamId) ?? null;
    rows.push({
      leagueId, playerId: player.id, gameId,
      season, week, weekIndex, stageIndex,
      ...buildSet(s),
    });
  }

  if (rows.length === 0) return 0;

  const updateSet = buildSet(rows[0]! as RawStat);
  const conflictSet: Record<string, unknown> = { gameId: sql`excluded.game_id` };
  for (const key of Object.keys(updateSet)) {
    const col = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    conflictSet[key] = sql.raw(`excluded.${col}`);
  }

  await db.insert(playerGameStatsTable)
    .values(rows)
    .onConflictDoUpdate({
      target: [playerGameStatsTable.playerId, playerGameStatsTable.weekIndex, playerGameStatsTable.stageIndex],
      set: conflictSet as typeof playerGameStatsTable.$inferInsert,
    });

  return rows.length;
}

const STAT_TYPES = ["passing", "rushing", "receiving", "defense", "kicking", "punting"] as const;

for (const stat of STAT_TYPES) {
  router.post(`/:leagueId/:platform/:eaLeagueId/:week/:stage/${stat}`, async (req, res) => {
    const leagueId = Number(req.params["leagueId"]);
    const weekIndex = Number(req.params["week"]) - 1;
    const stageStr = req.params["stage"];
    const stageIndex = isNaN(Number(stageStr)) ? 1 : Number(stageStr);
    if (isNaN(leagueId)) { res.status(400).json({ error: "Invalid league ID" }); return; }

    const league = await resolveLeague(leagueId);
    if (!league) { res.status(404).json({ error: "League not found" }); return; }

    const body = req.body as Record<string, unknown>;

    const listKey = STAT_KEY_MAP[stat]!;
    const stats = getNestedArray<RawStat>(body, listKey);

    let recordsProcessed = 0;
    let status: "success" | "error" = "success";
    try {
      recordsProcessed = await upsertPlayerStats(leagueId, weekIndex, stageIndex, league.season, stats, s => buildStatSet(stat, s));
    } catch (e) {
      status = "error";
    }

    await logImport(leagueId, `${stat}:w${weekIndex}:${stageStr}`, status, recordsProcessed);
    res.json({ success: status === "success", recordsProcessed });
  });
}

// ─── Import history ───────────────────────────────────────────────────────────

router.get("/:leagueId/history", async (req, res) => {
  const leagueId = Number(req.params["leagueId"]);
  if (isNaN(leagueId)) { res.status(400).json({ error: "Invalid league ID" }); return; }

  const rows = await db
    .select()
    .from(leagueImportsTable)
    .where(eq(leagueImportsTable.leagueId, leagueId))
    .orderBy(leagueImportsTable.createdAt)
    .limit(20);

  res.json(
    rows.reverse().map((r) => ({
      id: r.id,
      import_type: r.importType,
      status: r.status,
      records_processed: r.recordsProcessed,
      error_message: r.errorMessage ?? null,
      created_at: r.createdAt.toISOString(),
    })),
  );
});

export default router;
