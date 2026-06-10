import { Router } from "express";
import { db, leaguesTable, teamsTable, playersTable, gamesTable, leagueImportsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

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

    const values = {
      leagueId,
      name: str(t["nickName"] || t["displayName"] || t["teamName"], "Unknown"),
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

  const rows = players
    .filter((p): p is RawPlayer => typeof p === "object" && p !== null)
    .map((p) => ({
      teamId,
      name: `${str(p["firstName"])} ${str(p["lastName"])}`.trim() || "Unknown",
      position: str(p["position"], "OL"),
      overall: num(p["playerBestOvr"] ?? p["overall"], 70),
      age: num(p["age"], 25),
      devTrait: ni(p, "devTrait"),
      eaPlayerId: p["rosterId"] != null ? String(p["rosterId"]) : null,
      presentationId: ni(p, "presentationId"),
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
    }));

  if (rows.length > 0) await db.insert(playersTable).values(rows);
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

const STAT_TYPES = ["passing", "rushing", "receiving", "defense", "kicking", "punting"] as const;

for (const stat of STAT_TYPES) {
  router.post(`/:leagueId/:platform/:eaLeagueId/:week/:stage/${stat}`, async (req, res) => {
    const leagueId = Number(req.params["leagueId"]);
    const weekIndex = Number(req.params["week"]) - 1;
    const stageStr = req.params["stage"];
    if (isNaN(leagueId)) { res.status(400).json({ error: "Invalid league ID" }); return; }

    await logImport(leagueId, `${stat}:w${weekIndex}:${stageStr}`, "success", 0);
    res.json({ success: true, recordsProcessed: 0 });
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
