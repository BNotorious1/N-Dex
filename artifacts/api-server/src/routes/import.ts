import { Router } from "express";
import { db, leaguesTable, teamsTable, playersTable, gamesTable, leagueImportsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function intToHex(n: unknown): string | null {
  if (typeof n !== "number") return null;
  return `#${n.toString(16).padStart(6, "0")}`;
}

async function handleLeagueTeams(leagueId: number, body: Record<string, unknown>): Promise<number> {
  const list = body["teamInfoList"];
  if (!Array.isArray(list)) return 0;

  for (const t of list) {
    if (typeof t !== "object" || t === null) continue;
    const team = t as Record<string, unknown>;
    const eaTeamId = typeof team["teamId"] === "number" ? team["teamId"] : null;
    if (eaTeamId === null) continue;

    const existing = await db
      .select()
      .from(teamsTable)
      .where(and(eq(teamsTable.leagueId, leagueId), eq(teamsTable.eaTeamId, eaTeamId)))
      .limit(1);

    const city = String(team["cityName"] ?? "");
    const name = String(team["nickName"] ?? "");
    const abbreviation = String(team["abbrName"] ?? "").toUpperCase();
    const overallRating = typeof team["ovrRating"] === "number" ? team["ovrRating"] : 75;
    const primaryColor = intToHex(team["primaryColor"]);
    const secondaryColor = intToHex(team["secondaryColor"]);

    if (existing.length > 0) {
      await db
        .update(teamsTable)
        .set({ city, name, abbreviation, overallRating, primaryColor, secondaryColor })
        .where(eq(teamsTable.id, existing[0].id));
    } else {
      await db.insert(teamsTable).values({
        leagueId,
        city,
        name,
        abbreviation,
        conference: "AFC",
        division: "East",
        overallRating,
        primaryColor,
        secondaryColor,
        eaTeamId,
        wins: 0,
        losses: 0,
        ties: 0,
        isUserTeam: false,
      });
    }
  }
  return list.length;
}

async function handleLeagueRosters(leagueId: number, body: Record<string, unknown>): Promise<number> {
  const teamRosters = body["teamRosters"];
  if (!Array.isArray(teamRosters)) return 0;

  let total = 0;
  for (const roster of teamRosters) {
    if (typeof roster !== "object" || roster === null) continue;
    const r = roster as Record<string, unknown>;
    const eaTeamId = typeof r["teamId"] === "number" ? r["teamId"] : null;
    if (eaTeamId === null) continue;

    const dbTeam = await db
      .select()
      .from(teamsTable)
      .where(and(eq(teamsTable.leagueId, leagueId), eq(teamsTable.eaTeamId, eaTeamId)))
      .limit(1);

    if (dbTeam.length === 0) continue;
    const teamId = dbTeam[0].id;

    const players = r["players"];
    if (!Array.isArray(players)) continue;

    await db.delete(playersTable).where(eq(playersTable.teamId, teamId));

    const rows = players
      .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
      .map((p) => ({
        teamId,
        name: `${p["firstName"] ?? ""} ${p["lastName"] ?? ""}`.trim() || "Unknown",
        position: String(p["position"] ?? "QB"),
        overall: typeof p["overall"] === "number" ? p["overall"] : 70,
        age: typeof p["age"] === "number" ? p["age"] : 25,
        speed: typeof p["speedRating"] === "number" ? p["speedRating"] : 75,
        strength: typeof p["strengthRating"] === "number" ? p["strengthRating"] : 70,
        awareness: typeof p["awareRating"] === "number" ? p["awareRating"] : 70,
        throwingPower: typeof p["throwPowerRating"] === "number" ? p["throwPowerRating"] : null,
        catching: typeof p["catchRating"] === "number" ? p["catchRating"] : null,
        tackling: typeof p["tackleRating"] === "number" ? p["tackleRating"] : null,
      }));

    if (rows.length > 0) {
      await db.insert(playersTable).values(rows);
      total += rows.length;
    }
  }
  return total;
}

async function handleLeagueStandings(leagueId: number, body: Record<string, unknown>): Promise<number> {
  const list = body["teamStandingInfoList"];
  if (!Array.isArray(list)) return 0;

  let count = 0;
  for (const s of list) {
    if (typeof s !== "object" || s === null) continue;
    const standing = s as Record<string, unknown>;
    const eaTeamId = typeof standing["teamId"] === "number" ? standing["teamId"] : null;
    if (eaTeamId === null) continue;

    const dbTeam = await db
      .select()
      .from(teamsTable)
      .where(and(eq(teamsTable.leagueId, leagueId), eq(teamsTable.eaTeamId, eaTeamId)))
      .limit(1);

    if (dbTeam.length === 0) continue;

    await db
      .update(teamsTable)
      .set({
        wins: typeof standing["wins"] === "number" ? standing["wins"] : 0,
        losses: typeof standing["losses"] === "number" ? standing["losses"] : 0,
        ties: typeof standing["ties"] === "number" ? standing["ties"] : 0,
      })
      .where(eq(teamsTable.id, dbTeam[0].id));
    count++;
  }
  return count;
}

async function handleLeagueSchedules(leagueId: number, body: Record<string, unknown>): Promise<number> {
  const list = body["scheduleInfoList"];
  if (!Array.isArray(list)) return 0;

  const allTeams = await db
    .select()
    .from(teamsTable)
    .where(eq(teamsTable.leagueId, leagueId));

  const teamByEaId = new Map(allTeams.filter((t) => t.eaTeamId !== null).map((t) => [t.eaTeamId!, t.id]));
  if (teamByEaId.size === 0) return 0;

  await db.delete(gamesTable).where(eq(gamesTable.leagueId, leagueId));

  const rows: typeof gamesTable.$inferInsert[] = [];
  const leagueRow = await db.select().from(leaguesTable).where(eq(leaguesTable.id, leagueId)).limit(1);
  const season = leagueRow[0]?.season ?? 2025;

  for (const s of list) {
    if (typeof s !== "object" || s === null) continue;
    const sch = s as Record<string, unknown>;
    const eaStatus = typeof sch["status"] === "number" ? sch["status"] : 1;
    if (eaStatus === 4) continue;

    const homeEaId = typeof sch["homeTeamId"] === "number" ? sch["homeTeamId"] : null;
    const awayEaId = typeof sch["awayTeamId"] === "number" ? sch["awayTeamId"] : null;
    if (homeEaId === null || awayEaId === null) continue;

    const homeTeamId = teamByEaId.get(homeEaId);
    const awayTeamId = teamByEaId.get(awayEaId);
    if (!homeTeamId || !awayTeamId) continue;

    const weekIndex = typeof sch["weekIndex"] === "number" ? sch["weekIndex"] : 0;
    const isFinal = eaStatus === 2;

    rows.push({
      leagueId,
      homeTeamId,
      awayTeamId,
      homeScore: isFinal && typeof sch["homeScore"] === "number" ? sch["homeScore"] : null,
      awayScore: isFinal && typeof sch["awayScore"] === "number" ? sch["awayScore"] : null,
      week: weekIndex + 1,
      season,
      status: isFinal ? "FINAL" : "SCHEDULED",
    });
  }

  if (rows.length > 0) {
    await db.insert(gamesTable).values(rows);
  }
  return rows.length;
}

router.post("/:leagueId", async (req, res) => {
  const leagueId = Number(req.params["leagueId"]);
  if (isNaN(leagueId)) {
    res.status(400).json({ error: "Invalid league ID" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const leagueType = typeof body["leagueType"] === "string" ? body["leagueType"] : "unknown";

  let recordsProcessed = 0;
  let status = "success";
  let errorMessage: string | undefined;

  try {
    const leagues = await db.select().from(leaguesTable).where(eq(leaguesTable.id, leagueId)).limit(1);
    if (leagues.length === 0) {
      res.status(404).json({ error: "League not found" });
      return;
    }

    const eaLeagueId = typeof body["leagueId"] === "string" ? body["leagueId"] : null;
    if (eaLeagueId && !leagues[0].eaLeagueId) {
      await db.update(leaguesTable).set({ eaLeagueId }).where(eq(leaguesTable.id, leagueId));
    }

    switch (leagueType) {
      case "leagueTeams":
        recordsProcessed = await handleLeagueTeams(leagueId, body);
        break;
      case "leagueRosters":
        recordsProcessed = await handleLeagueRosters(leagueId, body);
        break;
      case "leagueStandings":
        recordsProcessed = await handleLeagueStandings(leagueId, body);
        break;
      case "leagueSchedules":
        recordsProcessed = await handleLeagueSchedules(leagueId, body);
        break;
      default:
        req.log.info({ leagueType }, "Unhandled import type — logged only");
    }
  } catch (err) {
    req.log.error({ err, leagueType, leagueId }, "Companion App import error");
    status = "error";
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  await db
    .insert(leagueImportsTable)
    .values({ leagueId, importType: leagueType, status, recordsProcessed, errorMessage })
    .catch(() => {});

  res.status(200).json({ success: status === "success", leagueType, recordsProcessed });
});

router.get("/:leagueId/history", async (req, res) => {
  const leagueId = Number(req.params["leagueId"]);
  if (isNaN(leagueId)) {
    res.status(400).json({ error: "Invalid league ID" });
    return;
  }

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
