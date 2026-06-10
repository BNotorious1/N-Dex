import { Router } from "express";
import { db, leaguesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router({ mergeParams: true });

const EA_CLIENT_ID = process.env.EA_CLIENT_ID ?? "MADDEN-26-COMPANION";
const EA_REDIRECT_URI = "http://127.0.0.1/success";
const EA_TOKEN_URL = "https://accounts.ea.com/connect/token";
const EA_PERSONAS_URL =
  "https://gateway.ea.com/proxy/identity/proxyIdentityService/personas?masterTitleId=&tags=ON";

const STATS_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const statCooldowns = new Map<number, number>(); // leagueId → lastImportTime (ms)

// ─── Helpers ────────────────────────────────────────────────────────────────

function getLeagueId(req: { params: Record<string, string> }): number {
  return Number(req.params["id"]);
}

function buildDefaultExportInfo(): Record<string, unknown> {
  const statistics: Record<string, Record<string, null>> = {};
  for (let i = 0; i < 18; i++) {
    statistics[String(i)] = {
      games: null,
      team: null,
      passing: null,
      rushing: null,
      receiving: null,
      kicking: null,
      punting: null,
      defense: null,
    };
  }
  return { league: null, rosters: null, statistics };
}

async function getLeague(leagueId: number) {
  const rows = await db
    .select()
    .from(leaguesTable)
    .where(eq(leaguesTable.id, leagueId))
    .limit(1);
  return rows[0] ?? null;
}

async function getConnectedLeague(leagueId: number) {
  const league = await getLeague(leagueId);
  if (!league) throw Object.assign(new Error("League not found"), { status: 404 });
  if (!league.isEaConnected || !league.eaAccessToken) {
    throw Object.assign(new Error("EA account not connected"), { status: 400 });
  }
  return league;
}

async function updateExportInfo(
  leagueId: number,
  updater: (info: Record<string, unknown>) => Record<string, unknown>,
) {
  const league = await getLeague(leagueId);
  if (!league) return;
  const current = (league.exportInfo as Record<string, unknown> | null) ?? buildDefaultExportInfo();
  const updated = updater(current);
  await db
    .update(leaguesTable)
    .set({ exportInfo: updated })
    .where(eq(leaguesTable.id, leagueId));
  return updated;
}

// Error response helper
function sendError(res: Parameters<typeof router.get>[1] extends (req: never, res: infer R) => void ? R : never, err: unknown) {
  const e = err as Error & { status?: number };
  const status = e.status ?? 500;
  res.status(status).json({ error: e.message ?? "Internal server error" });
}

// ─── EA Auth ──────────────────────────────────────────────────────────────

// GET /login-url
router.get("/login-url", (req, res) => {
  const url = new URL("https://accounts.ea.com/connect/auth");
  url.searchParams.set("client_id", EA_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("display", "web2/login");
  url.searchParams.set("locale", "en_US");
  url.searchParams.set("redirect_uri", EA_REDIRECT_URI);
  url.searchParams.set("prompt", "login");
  res.json({ url: url.toString() });
});

// POST /retrieve-personas  { code }
router.post("/retrieve-personas", async (req, res) => {
  const leagueId = getLeagueId(req);
  const league = await getLeague(leagueId);
  if (!league) { res.status(404).json({ error: "League not found" }); return; }

  const { code } = req.body as { code: string };
  if (!code) { res.status(400).json({ error: "Authorization code is required" }); return; }

  try {
    // Exchange authorization code for access token
    const tokenRes = await fetch(EA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: EA_CLIENT_ID,
        grant_type: "authorization_code",
        code,
        redirect_uri: EA_REDIRECT_URI,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => tokenRes.statusText);
      req.log.error({ status: tokenRes.status, body: text }, "EA token exchange failed");
      res.status(400).json({ message: `EA login failed (${tokenRes.status}). Please try again.` });
      return;
    }

    const tokenData = (await tokenRes.json()) as { access_token: string; refresh_token: string; expires_in: number };
    const accessToken = tokenData.access_token;

    // Get personas
    const personasRes = await fetch(EA_PERSONAS_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-EXPAND-JSON": "true",
      },
    });

    let personas: { personaId: string; displayName: string }[] = [];
    if (personasRes.ok) {
      const personasData = (await personasRes.json()) as {
        personas?: { persona: { personaId: string; displayName: string } | { personaId: string; displayName: string }[] };
      };
      const raw = personasData.personas?.persona ?? [];
      const arr = Array.isArray(raw) ? raw : [raw];
      personas = arr.map((p) => ({ personaId: p.personaId, displayName: p.displayName }));
    }

    res.json({ access_token: accessToken, personas });
  } catch (err) {
    req.log.error({ err }, "retrieve-personas error");
    res.status(500).json({ message: "Failed to connect to EA. Please try again." });
  }
});

// POST /select-league  { selected_persona, access_token }
router.post("/select-league", async (req, res) => {
  const leagueId = getLeagueId(req);
  const league = await getLeague(leagueId);
  if (!league) { res.status(404).json({ error: "League not found" }); return; }

  const { selected_persona, access_token } = req.body as {
    selected_persona: string;
    access_token: string;
  };
  if (!selected_persona || !access_token) {
    res.status(400).json({ message: "Missing persona or access token" });
    return;
  }

  try {
    const persona = JSON.parse(selected_persona) as { personaId: string; displayName: string };

    // Get nucleus user to obtain blazeId
    const nucleusRes = await fetch(
      `https://gateway.ea.com/proxy/identity/proxyIdentityService/pidUsers/nucleus:${persona.personaId}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "X-EXPAND-JSON": "true",
        },
      },
    );

    let blazeId = "";
    let systemConsole = "ps5";
    if (nucleusRes.ok) {
      const nucleusData = (await nucleusRes.json()) as {
        pidUsers?: { pidUser?: { blazeId?: string; eaId?: string }[] };
      };
      const user = nucleusData?.pidUsers?.pidUser?.[0];
      blazeId = user?.blazeId ?? "";
    }

    // Refresh token exchange to get game-specific token (Madden franchise API requires it)
    const tokenRes = await fetch(EA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: EA_CLIENT_ID,
        grant_type: "refresh_token",
        release_type: "prod",
        authentication_source: "369230",
        access_token,
      }).toString(),
    });

    let refreshedToken = access_token;
    let refreshToken = "";
    let expiry = Math.floor(Date.now() / 1000) + 3600;

    if (tokenRes.ok) {
      const tokenData = (await tokenRes.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };
      refreshedToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token ?? "";
      expiry = Math.floor(Date.now() / 1000) + (tokenData.expires_in ?? 3600);
    }

    // Fetch Madden leagues for this user
    const leaguesRes = await fetch(
      `https://www.easports.com/franchise/v3/user/members?filterCurrentLeague=true&platform=${systemConsole}&view=completed`,
      {
        headers: {
          Authorization: `Bearer ${refreshedToken}`,
          "Nucleus-access-token": access_token,
          "X-EA-Game-Edition": "MADDEN-NFL-26",
        },
      },
    );

    let leagues: { leagueId: string; leagueName: string; userTeamName: string }[] = [];
    if (leaguesRes.ok) {
      const data = (await leaguesRes.json()) as {
        members?: { member?: { leagueId?: string; leagueName?: string; userTeamName?: string }[] };
      };
      leagues = (data?.members?.member ?? []).map((m) => ({
        leagueId: m.leagueId ?? "",
        leagueName: m.leagueName ?? "Unknown League",
        userTeamName: m.userTeamName ?? "Unknown Team",
      }));
    }

    res.json({
      access_token: refreshedToken,
      refresh_token: refreshToken,
      expiry,
      systemConsole,
      blazeId,
      leagues,
    });
  } catch (err) {
    req.log.error({ err }, "select-league error");
    res.status(500).json({ message: "Failed to load leagues from EA. Please try again." });
  }
});

// POST /connect  { access_token, refresh_token, expiry, console, selected_league, blaze_id }
router.post("/connect", async (req, res) => {
  const leagueId = getLeagueId(req);
  const league = await getLeague(leagueId);
  if (!league) { res.status(404).json({ error: "League not found" }); return; }

  const {
    access_token,
    refresh_token,
    expiry,
    console: eaConsole,
    selected_league,
    blaze_id,
  } = req.body as {
    access_token: string;
    refresh_token: string;
    expiry: number;
    console: string;
    selected_league: string;
    blaze_id: string;
  };

  if (!access_token || !selected_league) {
    res.status(400).json({ message: "Missing required EA connection fields" });
    return;
  }

  const exportInfo = (league.exportInfo as Record<string, unknown> | null) ?? buildDefaultExportInfo();

  await db
    .update(leaguesTable)
    .set({
      isEaConnected: true,
      eaAccessToken: access_token,
      eaRefreshToken: refresh_token,
      eaTokenExpiry: expiry,
      eaConsole: eaConsole,
      eaSelectedLeague: selected_league,
      eaBlazeId: blaze_id,
      eaLeagueId: selected_league,
      exportInfo,
    })
    .where(eq(leaguesTable.id, leagueId));

  res.json({ success: true });
});

// POST /unlink
router.post("/unlink", async (req, res) => {
  const leagueId = getLeagueId(req);
  await db
    .update(leaguesTable)
    .set({
      isEaConnected: false,
      eaAccessToken: null,
      eaRefreshToken: null,
      eaTokenExpiry: null,
      eaConsole: null,
      eaSelectedLeague: null,
      eaBlazeId: null,
    })
    .where(eq(leaguesTable.id, leagueId));

  res.json({ success: true });
});

// ─── Import Triggers ─────────────────────────────────────────────────────────

// POST /import-league-info
router.post("/import-league-info", async (req, res) => {
  const leagueId = getLeagueId(req);
  try {
    await getConnectedLeague(leagueId);
    const exportInfo = await updateExportInfo(leagueId, (info) => ({
      ...info,
      league: new Date().toISOString(),
    }));
    res.json({ success: true, export_info: exportInfo });
  } catch (err) {
    sendError(res as never, err);
  }
});

// POST /import-rosters
router.post("/import-rosters", async (req, res) => {
  const leagueId = getLeagueId(req);
  try {
    await getConnectedLeague(leagueId);
    const exportInfo = await updateExportInfo(leagueId, (info) => ({
      ...info,
      rosters: new Date().toISOString(),
    }));
    res.json({ success: true, export_info: exportInfo });
  } catch (err) {
    sendError(res as never, err);
  }
});

// POST /import-schedules
router.post("/import-schedules", async (req, res) => {
  const leagueId = getLeagueId(req);
  try {
    await getConnectedLeague(leagueId);
    const exportInfo = await updateExportInfo(leagueId, (info) => ({
      ...info,
      schedules: new Date().toISOString(),
    }));
    res.json({ success: true, export_info: exportInfo });
  } catch (err) {
    sendError(res as never, err);
  }
});

// POST /import-all-stats
router.post("/import-all-stats", async (req, res) => {
  const leagueId = getLeagueId(req);
  try {
    await getConnectedLeague(leagueId);

    const lastRun = statCooldowns.get(leagueId) ?? 0;
    const remaining = Math.ceil((STATS_COOLDOWN_MS - (Date.now() - lastRun)) / 1000);
    if (remaining > 0) {
      res.status(429).json({ message: `Please wait ${remaining} seconds before importing again.` });
      return;
    }

    statCooldowns.set(leagueId, Date.now());

    const league = await getLeague(leagueId);
    const currentWeek = league?.week ?? 1;

    const exportInfo = await updateExportInfo(leagueId, (info) => {
      const stats = (info["statistics"] as Record<string, Record<string, unknown>> | null) ?? {};
      const now = new Date().toISOString();
      for (let i = 0; i < currentWeek; i++) {
        stats[String(i)] = {
          games: now,
          team: now,
          passing: now,
          rushing: now,
          receiving: now,
          kicking: now,
          punting: now,
          defense: now,
        };
      }
      return { ...info, statistics: stats };
    });

    res.json({ success: true, export_info: exportInfo });
  } catch (err) {
    sendError(res as never, err);
  }
});

// POST /import-week-stats/:weekIndex
router.post("/import-week-stats/:weekIndex", async (req, res) => {
  const leagueId = getLeagueId(req);
  const weekIndex = parseInt(req.params["weekIndex"] ?? "0", 10);
  try {
    await getConnectedLeague(leagueId);
    const now = new Date().toISOString();
    const exportInfo = await updateExportInfo(leagueId, (info) => {
      const stats = (info["statistics"] as Record<string, Record<string, unknown>> | null) ?? {};
      stats[String(weekIndex)] = {
        games: now,
        team: now,
        passing: now,
        rushing: now,
        receiving: now,
        kicking: now,
        punting: now,
        defense: now,
      };
      return { ...info, statistics: stats };
    });
    res.json({ success: true, export_info: exportInfo });
  } catch (err) {
    sendError(res as never, err);
  }
});

// POST /reset-export-status
router.post("/reset-export-status", async (req, res) => {
  const leagueId = getLeagueId(req);
  const exportInfo = buildDefaultExportInfo();
  await db
    .update(leaguesTable)
    .set({ exportInfo })
    .where(eq(leaguesTable.id, leagueId));
  res.json({ success: true, export_info: exportInfo });
});

// GET /export-info
router.get("/export-info", async (req, res) => {
  const leagueId = getLeagueId(req);
  const league = await getLeague(leagueId);
  if (!league) { res.status(404).json({ error: "League not found" }); return; }

  const exportInfo = (league.exportInfo as Record<string, unknown> | null) ?? buildDefaultExportInfo();
  const cooldownRemainingMs = STATS_COOLDOWN_MS - (Date.now() - (statCooldowns.get(leagueId) ?? 0));

  res.json({
    is_ea_connected: league.isEaConnected,
    export_info: exportInfo,
    stats_cooldown_remaining_s: Math.max(0, Math.ceil(cooldownRemainingMs / 1000)),
    week: league.week,
  });
});

export default router;
