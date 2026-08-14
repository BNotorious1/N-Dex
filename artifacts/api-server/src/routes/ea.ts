import { Router } from "express";
import { db, leaguesTable, gamesTable } from "@workspace/db";
import { eq, and, max } from "drizzle-orm";
import { upsertLeagueTeams, upsertTeamRoster, upsertWeekSchedule, processStatBlob } from "./import";
import crypto from "node:crypto";
import https from "node:https";
import { logger } from "../lib/logger";

const router = Router({ mergeParams: true });

// ─── EA Constants ───────────────────────────────────────────────────────────
// Auth/entitlement keys stay at M26 values (CLIENT_ID, AUTH_SOURCE, VALID_ENTITLEMENTS).
// Blaze product/service IDs use the M27 year ("2027") as confirmed by the M27 companion app.

const AUTH_SOURCE = "317239";
const CLIENT_SECRET =
  "teJpJ9cSXFqZAuKNW8IuHpy8D4dwWPoVrPoek38iCnrGbrUSfjqnHMBAv8iCVjeSm_20250910175618";
const REDIRECT_URL = "http://127.0.0.1/success";
const CLIENT_ID = "MCA_26_COMP_APP";
const MACHINE_KEY = "444d362e8e067fe2";
const ANDROID_UA =
  "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)";
const BLAZE_HOST = "wal2.tools.gos.bio-iad.ea.com";

const VALID_ENTITLEMENTS: Record<string, { platform: string; namespace: string }> = {
  MADDEN_26XONE: { platform: "xone", namespace: "xbox" },
  MADDEN_26PS4: { platform: "ps4", namespace: "ps3" },
  MADDEN_26PC: { platform: "pc", namespace: "cem_ea_id" },
  MADDEN_26PS5: { platform: "ps5", namespace: "ps3" },
  MADDEN_26XBSX: { platform: "xbsx", namespace: "xbox" },
  MADDEN_26SDA: { platform: "stadia", namespace: "stadia" },
};

const BLAZE_PRODUCT: Record<string, string> = {
  xone: "madden-2027-xone-mca",
  ps4: "madden-2027-ps4-mca",
  pc: "madden-2027-pc-mca",
  ps5: "madden-2027-ps5-mca",
  xbsx: "madden-2027-xbsx-mca",
  stadia: "madden-2027-stadia-mca",
};

const BLAZE_SERVICE_ID: Record<string, string> = {
  xone: "madden-2027-xone",
  ps4: "madden-2027-ps4",
  pc: "madden-2027-pc",
  ps5: "madden-2027-ps5",
  xbsx: "madden-2027-xbsx",
  stadia: "madden-2027-stadia",
};

const STATS_COOLDOWN_MS = 30 * 60 * 1000;
const statCooldowns = new Map<number, number>();

// ─── HTTP Helper ────────────────────────────────────────────────────────────

interface SimpleResponse {
  status: number;
  ok: boolean;
  location: string | undefined;
  text(): string;
  json<T = unknown>(): T;
}

function doRequest(
  method: string,
  url: string,
  body?: string,
  extraHeaders?: Record<string, string>,
): Promise<SimpleResponse> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const defaultHeaders: Record<string, string> = {
      "Accept-Charset": "UTF-8",
      "User-Agent": ANDROID_UA,
      "Accept-Encoding": "identity",
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" } : {}),
      ...extraHeaders,
    };
    if (body) defaultHeaders["Content-Length"] = String(Buffer.byteLength(body));

    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method,
        rejectUnauthorized: false,
        headers: defaultHeaders,
      },
      (res) => {
        const loc = res.headers.location as string | undefined;
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf-8");
          const cleaned = raw.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ").trim();
          const status = res.statusCode ?? 0;
          resolve({
            status,
            ok: status >= 200 && status < 300,
            location: loc,
            text: () => cleaned,
            json: <T>() => JSON.parse(cleaned) as T,
          });
        });
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

const get = (url: string, headers?: Record<string, string>) =>
  doRequest("GET", url, undefined, headers);
const post = (url: string, body: string, headers?: Record<string, string>) =>
  doRequest("POST", url, body, headers);

// ─── DB Helpers ─────────────────────────────────────────────────────────────

function getLeagueId(req: { params: Record<string, string> }): number {
  return Number(req.params["id"]);
}

async function getLeague(leagueId: number) {
  const rows = await db.select().from(leaguesTable).where(eq(leaguesTable.id, leagueId)).limit(1);
  return rows[0] ?? null;
}

async function getConnectedLeague(leagueId: number) {
  const league = await getLeague(leagueId);
  if (!league) throw Object.assign(new Error("League not found"), { status: 404 });
  if (!league.isEaConnected || !league.eaAccessToken)
    throw Object.assign(new Error("EA account not connected"), { status: 400 });
  return league;
}

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

async function updateExportInfo(
  leagueId: number,
  updater: (info: Record<string, unknown>) => Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const league = await getLeague(leagueId);
  const current = (league?.exportInfo as Record<string, unknown> | null) ?? buildDefaultExportInfo();
  const updated = updater(current);
  await db.update(leaguesTable).set({ exportInfo: updated }).where(eq(leaguesTable.id, leagueId));
  return updated;
}

// ─── Token Refresh ──────────────────────────────────────────────────────────

async function getValidAccessToken(
  league: typeof leaguesTable.$inferSelect,
): Promise<{ accessToken: string; platform: string }> {
  const now = Math.floor(Date.now() / 1000);
  const platform = league.eaConsole ?? "ps5";

  // Refresh if expired (or within 60s of expiry)
  if (league.eaTokenExpiry && now < league.eaTokenExpiry - 60) {
    return { accessToken: league.eaAccessToken!, platform };
  }

  if (!league.eaRefreshToken) throw new Error("No refresh token stored — please reconnect EA.");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    release_type: "prod",
    refresh_token: league.eaRefreshToken,
    authentication_source: AUTH_SOURCE,
    token_format: "JWS",
  }).toString();

  const res = await post("https://accounts.ea.com/connect/token", body);
  if (!res.ok) throw new Error(`Token refresh failed (${res.status})`);

  type TokenResp = { access_token: string; refresh_token: string; expires_in: number };
  const data = res.json<TokenResp>();

  const newExpiry = now + data.expires_in;
  await db.update(leaguesTable).set({
    eaAccessToken: data.access_token,
    eaRefreshToken: data.refresh_token,
    eaTokenExpiry: newExpiry,
  }).where(eq(leaguesTable.id, league.id));

  return { accessToken: data.access_token, platform };
}

// ─── Blaze Session ──────────────────────────────────────────────────────────

interface BlazeSession {
  sessionKey: string;
  blazeId: string;
}

async function blazeLogin(
  accessToken: string,
  platform: string,
  logger?: { info: (obj: unknown, msg: string) => void },
): Promise<BlazeSession> {
  const productName = BLAZE_PRODUCT[platform] ?? BLAZE_PRODUCT["ps5"];
  const serviceId = BLAZE_SERVICE_ID[platform] ?? BLAZE_SERVICE_ID["ps5"];
  const body = JSON.stringify({ accessToken, productName });

  const res = await doRequest(
    "POST",
    `https://${BLAZE_HOST}/wal/authentication/login`,
    body,
    {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-BLAZE-ID": serviceId,
      "X-BLAZE-VOID-RESP": "XML",
      "X-Application-Key": "MADDEN-MCA",
    },
  );

  const rawText = res.text();
  if (!res.ok) throw new Error(`Blaze login failed (${res.status}): ${rawText.slice(0, 200)}`);

  type BlazeLoginResp = Record<string, unknown>;
  const data = res.json<BlazeLoginResp>();
  logger?.info({ blazeLoginRaw: data, rawText: rawText.slice(0, 600) }, "Blaze login raw response");

  // Try multiple known paths for sessionKey and blazeId
  const info = (data["userLoginInfo"] ?? data["loginInfo"] ?? data) as Record<string, unknown>;
  const sessionKey =
    (info["sessionKey"] as string | undefined) ??
    (data["sessionKey"] as string | undefined);
  const personaDetails =
    (info["personaDetails"] as Record<string, unknown> | undefined) ??
    (info["personaDetail"] as Record<string, unknown> | undefined) ??
    (info as Record<string, unknown>);
  const blazeId = String(
    personaDetails?.["personaId"] ?? personaDetails?.["blazeId"] ?? info["blazeId"] ?? "",
  );

  if (!sessionKey) throw new Error(`Blaze login did not return a sessionKey. Raw: ${rawText.slice(0, 200)}`);
  return { sessionKey, blazeId };
}

// ─── Blaze Message Auth ─────────────────────────────────────────────────────

function buildRequestInfo(
  commandName: string,
  commandId: number,
  payload: unknown,
  blazeId: string,
): { apiVersion: number; clientDevice: number; requestInfo: string } {
  const requestId = Math.floor(Math.random() * 1_000_000);
  const expiry = Math.floor(Date.now() / 1000);

  const rand4 = crypto.randomBytes(4);
  const staticBytes = Buffer.from("634203362017bf72f70ba900c0aa4e6b", "hex");
  const staticAuthCode = Buffer.from("3a53413521464c3b6531326530705b70203a2900", "hex");

  const authJson = JSON.stringify({
    staticData: "05e6a7ead5584ab4",
    requestId,
    blazeId: Number(blazeId),
  });
  const authJsonBytes = Buffer.from(authJson, "utf-8");
  const hashKey = crypto.createHash("md5").update(Buffer.concat([rand4, staticBytes])).digest();
  const xorBytes = Buffer.allocUnsafe(authJsonBytes.length);
  for (let i = 0; i < authJsonBytes.length; i++) {
    xorBytes[i] = authJsonBytes[i]! ^ hashKey[i % 16]!;
  }
  const authDataBytes = Buffer.concat([rand4, xorBytes]);
  const authData = authDataBytes.toString("base64");
  const authCode = crypto
    .createHash("md5")
    .update(Buffer.concat([staticAuthCode, authDataBytes]))
    .digest("base64");
  const authType = 17039361;

  // messageAuthData is the full auth object embedded as a JSON value (not a packed blob)
  // This matches the Snallabot/EA reference implementation exactly.
  const messageAuthData = { authData, authCode, authType };

  // requestInfo must be a pre-stringified JSON string; requestPayload too
  const requestInfo = JSON.stringify({
    commandName,
    componentId: 2060,
    commandId,
    componentName: "franchisemode",
    messageAuthData,
    messageExpirationTime: expiry,
    deviceId: MACHINE_KEY,
    ipAddress: "127.0.0.1",
    requestPayload: JSON.stringify(payload),
  });

  return { apiVersion: 2, clientDevice: 3, requestInfo };
}

// ─── Blaze RPC ───────────────────────────────────────────────────────────────

async function blazeRpc<T>(
  sessionKey: string,
  platform: string,
  commandName: string,
  commandId: number,
  payload: unknown,
  blazeId: string,
  log?: { debug: (obj: unknown, msg: string) => void; info: (obj: unknown, msg: string) => void },
): Promise<{ data: T; rawText: string }> {
  const serviceId = BLAZE_SERVICE_ID[platform] ?? BLAZE_SERVICE_ID["ps5"];
  const reqBody = buildRequestInfo(commandName, commandId, payload, blazeId);
  const body = JSON.stringify(reqBody);

  // Log the full outgoing request for debugging
  const debugLog = log ?? logger;
  debugLog.info({
    blazeRpc: commandName,
    commandId,
    platform,
    serviceId,
    requestInfoParsed: JSON.parse(reqBody.requestInfo),
  }, "blazeRpc outgoing request");

  const res = await doRequest(
    "POST",
    `https://${BLAZE_HOST}/wal/mca/Process/${sessionKey}`,
    body,
    {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-BLAZE-ID": serviceId,
      "X-BLAZE-VOID-RESP": "XML",
      "X-Application-Key": "MADDEN-MCA",
    },
  );
  const rawText = res.text();

  debugLog.info({
    blazeRpc: commandName,
    httpStatus: res.status,
    rawText: rawText.slice(0, 500),
  }, "blazeRpc response");

  if (!res.ok) throw new Error(`Blaze RPC ${commandName} failed (${res.status}): ${rawText.slice(0, 300)}`);
  return { data: res.json<T>(), rawText };
}

// ─── Blaze Export ────────────────────────────────────────────────────────────

async function blazeExport<T>(
  exportType: string,
  sessionKey: string,
  platform: string,
  params: Record<string, unknown>,
  attempt = 0,
): Promise<T> {
  const serviceId = BLAZE_SERVICE_ID[platform] ?? BLAZE_SERVICE_ID["ps5"];
  const body = JSON.stringify(params);
  const res = await doRequest(
    "POST",
    `https://${BLAZE_HOST}/wal/mca/${exportType}/${sessionKey}`,
    body,
    {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-BLAZE-ID": serviceId,
      "X-BLAZE-VOID-RESP": "XML",
      "X-Application-Key": "MADDEN-MCA",
    },
  );

  const text = res.text();
  if (text.includes("ERR_TIMEOUT") && attempt < 4) {
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    return blazeExport<T>(exportType, sessionKey, platform, params, attempt + 1);
  }

  if (!res.ok) throw new Error(`Export ${exportType} failed (${res.status}): ${text.slice(0, 300)}`);
  return res.json<T>();
}

// ─── Blaze Session ────────────────────────────────────────────────────────────
// Session TTL: 8 min cache (Blaze sessions last ~10 min in practice)
// Sessions are persisted to DB so they survive server restarts

const BLAZE_SESSION_TTL_S = 8 * 60;

async function blazeLoginWithRetry(
  accessToken: string,
  platform: string,
  maxAttempts = 3,
): Promise<BlazeSession> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const delay = 4000 * attempt; // 4s, 8s
      logger.info({ attempt, delay }, "blazeLogin: retrying after delay");
      await new Promise((r) => setTimeout(r, delay));
    }
    try {
      return await blazeLogin(accessToken, platform);
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      // ERR_SYSTEM is a transient Blaze error; retry. Other errors abort immediately.
      if (!msg.includes("ERR_SYSTEM")) throw err;
      logger.warn({ attempt, msg }, "blazeLogin: got ERR_SYSTEM, will retry");
    }
  }
  throw lastErr;
}

async function getBlazeSession(
  leagueId: number,
): Promise<{ sessionKey: string; blazeId: string; eaLeagueId: string; platform: string; league: typeof leaguesTable.$inferSelect }> {
  const league = await getConnectedLeague(leagueId);
  const { accessToken, platform } = await getValidAccessToken(league);

  const nowSecs = Math.floor(Date.now() / 1000);

  // 1. Try DB-persisted session (survives server restarts)
  if (
    league.eaBlazeSessionKey &&
    league.eaBlazeSessionExpiry &&
    nowSecs < league.eaBlazeSessionExpiry - 30
  ) {
    return {
      sessionKey: league.eaBlazeSessionKey,
      blazeId: league.eaBlazeId ?? "",
      eaLeagueId: league.eaSelectedLeague ?? "",
      platform,
      league,
    };
  }

  // 2. Create a new Blaze session (retry up to 3x on ERR_SYSTEM)
  const { sessionKey, blazeId } = await blazeLoginWithRetry(accessToken, platform);

  // 3. Persist in DB so the next import reuses it without a new login
  const newExpiry = nowSecs + BLAZE_SESSION_TTL_S;
  await db.update(leaguesTable).set({
    eaBlazeSessionKey: sessionKey,
    eaBlazeSessionExpiry: newExpiry,
    eaBlazeId: blazeId ? blazeId : league.eaBlazeId,
  }).where(eq(leaguesTable.id, leagueId));

  return { sessionKey, blazeId: blazeId ? blazeId : (league.eaBlazeId ?? ""), eaLeagueId: league.eaSelectedLeague ?? "", platform, league };
}

// ─── Week detection ───────────────────────────────────────────────────────────
// Returns the 1-indexed current week based on the highest weekIndex that has
// at least one FINAL game. Returns null if no schedule data exists yet.
async function detectLeagueWeek(leagueId: number): Promise<number | null> {
  const [row] = await db
    .select({ maxIdx: max(gamesTable.weekIndex) })
    .from(gamesTable)
    .where(and(eq(gamesTable.leagueId, leagueId), eq(gamesTable.status, "FINAL")));
  if (row?.maxIdx == null) return null;
  return row.maxIdx + 1; // weekIndex is 0-based; league.week is 1-based
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /login-url  (Step 1)
router.get("/login-url", (_req, res) => {
  const url = new URL("https://accounts.ea.com/connect/auth");
  url.searchParams.set("hide_create", "true");
  url.searchParams.set("release_type", "prod");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", REDIRECT_URL);
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("machineProfileKey", MACHINE_KEY);
  url.searchParams.set("authentication_source", AUTH_SOURCE);
  res.json({ url: url.toString() });
});

// POST /retrieve-personas  (Steps 2–5)
router.post("/retrieve-personas", async (req, res) => {
  const { code } = req.body as { code: string };
  if (!code) { res.status(400).json({ message: "Authorization code is required" }); return; }

  try {
    // Step 2: Exchange code for initial access token
    const tokenBody = new URLSearchParams({
      authentication_source: AUTH_SOURCE,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URL,
      release_type: "prod",
      client_id: CLIENT_ID,
    }).toString();

    const tokenRes = await post("https://accounts.ea.com/connect/token", tokenBody);
    if (!tokenRes.ok) {
      req.log.warn({ status: tokenRes.status, body: tokenRes.text() }, "EA token exchange failed");
      res.status(400).json({ message: `EA login failed (${tokenRes.status}). Try logging in again.` });
      return;
    }
    type TokenResp = { access_token: string; refresh_token: string; expires_in: number };
    const { access_token } = tokenRes.json<TokenResp>();

    // Step 3: Get PID
    const pidRes = await get(`https://accounts.ea.com/connect/tokeninfo?access_token=${access_token}`);
    if (!pidRes.ok) { res.status(400).json({ message: "Failed to retrieve EA account info" }); return; }
    type PidResp = { pid_id?: string };
    const { pid_id } = pidRes.json<PidResp>();
    if (!pid_id) { res.status(400).json({ message: "Could not retrieve PID from EA" }); return; }

    // Step 4: Entitlements
    const entRes = await get(
      `https://gateway.ea.com/proxy/identity/pids/${pid_id}/entitlements/?status=ACTIVE`,
      { Authorization: `Bearer ${access_token}`, "X-Expand-Results": "true" },
    );
    if (!entRes.ok) { res.status(400).json({ message: "Failed to retrieve EA entitlements" }); return; }

    type Entitlement = { entitlementTag?: string; groupName?: string; pidUri?: string };
    type EntRes = { entitlements?: { entitlement?: Entitlement | Entitlement[] } };
    const entData = entRes.json<EntRes>();
    const rawEntitlements = entData.entitlements?.entitlement ?? [];
    const entArray = Array.isArray(rawEntitlements) ? rawEntitlements : [rawEntitlements];

    const validEntitlements = entArray.filter(
      (e) => e.entitlementTag === "ONLINE_ACCESS" && e.groupName && VALID_ENTITLEMENTS[e.groupName],
    );

    if (validEntitlements.length === 0) {
      res.status(400).json({ message: "No Madden 26 entitlements found on this account." });
      return;
    }

    // Step 5: Get personas for each entitlement
    const personaMap = new Map<string, { personaId: string; displayName: string; platform: string; namespaceName: string; maddenEntitlement: string }>();

    for (const ent of validEntitlements) {
      if (!ent.pidUri || !ent.groupName) continue;
      const entInfo = VALID_ENTITLEMENTS[ent.groupName]!;

      const pRes = await get(
        `https://gateway.ea.com/proxy/identity${ent.pidUri}/personas?status=ACTIVE&access_token=${access_token}`,
        { "X-Expand-Results": "true" },
      );
      if (!pRes.ok) continue;

      type PersonaEntry = { personaId?: string | number; displayName?: string; namespaceName?: string };
      type PersonaRes = { personas?: { persona?: PersonaEntry | PersonaEntry[] } };
      const pData = pRes.json<PersonaRes>();
      const raw = pData.personas?.persona ?? [];
      const pArray = Array.isArray(raw) ? raw : [raw];

      for (const p of pArray) {
        if (!p.namespaceName || p.namespaceName !== entInfo.namespace) continue;
        const personaId = String(p.personaId ?? "");
        if (!personaId || personaMap.has(personaId)) continue;
        personaMap.set(personaId, {
          personaId,
          displayName: p.displayName ?? personaId,
          platform: entInfo.platform,
          namespaceName: entInfo.namespace,
          maddenEntitlement: ent.groupName,
        });
      }
    }

    const personas = Array.from(personaMap.values());
    if (personas.length === 0) {
      res.status(400).json({ message: "No valid personas found. Ensure Madden 26 is installed on your console." });
      return;
    }

    res.json({ access_token, personas });
  } catch (err) {
    req.log.error({ err }, "retrieve-personas error");
    res.status(500).json({ message: "Failed to connect to EA. Please try again." });
  }
});

// POST /select-league  (Steps 6 + 8 + 9)
router.post("/select-league", async (req, res) => {
  const { selected_persona, access_token } = req.body as {
    selected_persona: string;
    access_token: string;
  };
  if (!selected_persona || !access_token) {
    res.status(400).json({ message: "Missing persona or access token" });
    return;
  }

  try {
    type PersonaObj = { personaId: string; platform: string; namespaceName: string };
    const persona = JSON.parse(selected_persona) as PersonaObj;
    const { personaId, platform, namespaceName } = persona;

    // Step 6a: Get persona-scoped auth code (manual redirect)
    const scopedAuthUrl = new URL("https://accounts.ea.com/connect/auth");
    scopedAuthUrl.searchParams.set("hide_create", "true");
    scopedAuthUrl.searchParams.set("release_type", "prod");
    scopedAuthUrl.searchParams.set("response_type", "code");
    scopedAuthUrl.searchParams.set("redirect_uri", REDIRECT_URL);
    scopedAuthUrl.searchParams.set("client_id", CLIENT_ID);
    scopedAuthUrl.searchParams.set("machineProfileKey", MACHINE_KEY);
    scopedAuthUrl.searchParams.set("authentication_source", AUTH_SOURCE);
    scopedAuthUrl.searchParams.set("access_token", access_token);
    scopedAuthUrl.searchParams.set("persona_id", personaId);
    scopedAuthUrl.searchParams.set("persona_namespace", namespaceName);

    const redirectRes = await get(scopedAuthUrl.toString());
    const location = redirectRes.location ?? "";
    if (!location) {
      res.status(400).json({ message: "EA did not return a persona redirect. Please try connecting again." });
      return;
    }

    let eaCode: string | null = null;
    try {
      eaCode = new URL(location).searchParams.get("code");
    } catch {
      const idx = location.indexOf("code=");
      if (idx >= 0) eaCode = location.slice(idx + 5).split("&")[0];
    }
    if (!eaCode) {
      res.status(400).json({ message: "Could not extract persona code from EA redirect." });
      return;
    }

    // Step 6b: Exchange persona code for JWS token
    const jwsBody = new URLSearchParams({
      authentication_source: AUTH_SOURCE,
      code: eaCode,
      grant_type: "authorization_code",
      token_format: "JWS",
      release_type: "prod",
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URL,
      client_id: CLIENT_ID,
    }).toString();

    const jwsRes = await post("https://accounts.ea.com/connect/token", jwsBody);
    if (!jwsRes.ok) {
      res.status(400).json({ message: `Persona token exchange failed (${jwsRes.status})` });
      return;
    }

    type JWSResp = { access_token: string; refresh_token: string; expires_in: number };
    const { access_token: personaAccessToken, refresh_token, expires_in } = jwsRes.json<JWSResp>();
    const expiry = Math.floor(Date.now() / 1000) + expires_in;

    // Step 8: Blaze login
    const { sessionKey, blazeId } = await blazeLogin(personaAccessToken, platform, req.log);

    // Step 9: Get My Leagues
    type RawLeague = Record<string, unknown>;

    const { data: leaguesRaw, rawText: leaguesText } = await blazeRpc<Record<string, unknown>>(
      sessionKey,
      platform,
      "Mobile_GetMyLeagues",
      801,
      {},
      blazeId,
      req.log,
    );

    req.log.info({ leaguesRaw, leaguesText: leaguesText.slice(0, 1000) }, "GetMyLeagues raw response");

    // Surface Blaze-level errors from the response body
    if (leaguesRaw["error"]) {
      const blazeErr = leaguesRaw["error"] as Record<string, unknown>;
      const errTdf = blazeErr["errortdf"] as Record<string, unknown> | undefined;
      const msg = (errTdf?.["errorString"] as string | undefined)
        ?? String(blazeErr["errorname"] ?? "Blaze error");
      res.status(502).json({ message: `EA Blaze: ${msg} (code ${blazeErr["errorcode"] ?? "?"})` });
      return;
    }

    // Blaze GetMyLeagues response: responseInfo.value.leagues
    // Walk up to 3 levels deep looking for the first non-empty array.
    function extractLeagueArray(obj: Record<string, unknown>): RawLeague[] {
      function walkObj(o: Record<string, unknown>, depth: number): RawLeague[] | null {
        for (const key of Object.keys(o)) {
          const v = o[key];
          if (Array.isArray(v) && v.length > 0) return v as RawLeague[];
          if (depth > 0 && v && typeof v === "object" && !Array.isArray(v)) {
            const found = walkObj(v as Record<string, unknown>, depth - 1);
            if (found) return found;
          }
        }
        return null;
      }
      return walkObj(obj, 3) ?? [];
    }

    const leagueArray = extractLeagueArray(leaguesRaw);

    const leagues = leagueArray.map((l) => ({
      leagueId: String(l["leagueId"] ?? l["id"] ?? ""),
      leagueName: String(l["leagueName"] ?? l["name"] ?? `League ${l["leagueId"] ?? "?"}`),
      userTeamName: String(l["userTeamName"] ?? l["teamName"] ?? "Unknown Team"),
    })).filter((l) => l.leagueId);

    res.json({
      access_token: personaAccessToken,
      refresh_token,
      expiry,
      systemConsole: platform,
      blazeId,
      leagues,
    });
  } catch (err) {
    req.log.error({ err }, "select-league error");
    const msg = err instanceof Error ? err.message : "Failed to load leagues";
    res.status(500).json({ message: msg });
  }
});

// POST /connect
router.post("/connect", async (req, res) => {
  const leagueId = getLeagueId(req);
  const league = await getLeague(leagueId);
  if (!league) { res.status(404).json({ error: "League not found" }); return; }

  const { access_token, refresh_token, expiry, console: eaConsole, selected_league, blaze_id } =
    req.body as {
      access_token: string; refresh_token: string; expiry: number;
      console: string; selected_league: string; blaze_id: string;
    };

  if (!access_token || !selected_league) {
    res.status(400).json({ message: "Missing required EA connection fields" });
    return;
  }

  const exportInfo = (league.exportInfo as Record<string, unknown> | null) ?? buildDefaultExportInfo();

  await db.update(leaguesTable).set({
    isEaConnected: true,
    eaAccessToken: access_token,
    eaRefreshToken: refresh_token,
    eaTokenExpiry: expiry,
    eaConsole,
    eaSelectedLeague: selected_league,
    eaBlazeId: blaze_id,
    eaLeagueId: selected_league,
    exportInfo,
  }).where(eq(leaguesTable.id, leagueId));

  res.json({ success: true });
});

// POST /unlink
router.post("/unlink", async (req, res) => {
  const leagueId = getLeagueId(req);
  await db.update(leaguesTable).set({
    isEaConnected: false, eaAccessToken: null, eaRefreshToken: null,
    eaTokenExpiry: null, eaConsole: null, eaSelectedLeague: null, eaBlazeId: null,
  }).where(eq(leaguesTable.id, leagueId));
  res.json({ success: true });
});

// ─── Import Endpoints ─────────────────────────────────────────────────────────

// POST /import-league-info
router.post("/import-league-info", async (req, res) => {
  const leagueId = getLeagueId(req);
  try {
    const { sessionKey, eaLeagueId, platform } = await getBlazeSession(leagueId);

    // Blaze returns { leagueTeamInfoList: [...] } — a flat array, NOT nested under .leagueTeamInfo
    type TeamsExport = { leagueTeamInfoList?: unknown };
    const teamsData = await blazeExport<TeamsExport>(
      "CareerMode_GetLeagueTeamsExport",
      sessionKey,
      platform,
      { leagueId: Number(eaLeagueId) },
    );

    req.log.info({ leagueTeamInfoList: teamsData.leagueTeamInfoList }, "import-league-info: raw response");

    const rawList = teamsData.leagueTeamInfoList;
    const teamArray: Record<string, unknown>[] = Array.isArray(rawList)
      ? rawList as Record<string, unknown>[]
      : rawList && typeof rawList === "object"
        ? [rawList as Record<string, unknown>]
        : [];

    const teamCount = await upsertLeagueTeams(leagueId, teamArray);
    req.log.info({ teamCount, eaLeagueId }, "import-league-info: teams upserted");

    // Detect current week from existing schedule data and persist
    const detectedWeek = await detectLeagueWeek(leagueId);
    if (detectedWeek !== null) {
      await db.update(leaguesTable).set({ week: detectedWeek }).where(eq(leaguesTable.id, leagueId));
      req.log.info({ detectedWeek }, "import-league-info: updated league.week");
    }

    const exportInfo = await updateExportInfo(leagueId, (info) => ({
      ...info,
      league: new Date().toISOString(),
    }));
    res.json({ success: true, export_info: exportInfo, teams_imported: teamCount, week: detectedWeek ?? undefined });
  } catch (err) {
    req.log.error({ err }, "import-league-info: error");
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ message: e.message });
  }
});

// POST /import-rosters
router.post("/import-rosters", async (req, res) => {
  const leagueId = getLeagueId(req);
  try {
    const { sessionKey, eaLeagueId, platform } = await getBlazeSession(leagueId);

    // Blaze returns { leagueTeamInfoList: [...] } — flat array
    type TeamEntry = { teamId?: number; rosterId?: number };
    type TeamsExport = { leagueTeamInfoList?: unknown };
    const teamsData = await blazeExport<TeamsExport>(
      "CareerMode_GetLeagueTeamsExport",
      sessionKey,
      platform,
      { leagueId: Number(eaLeagueId) },
    );

    const rawTeamList = teamsData.leagueTeamInfoList;
    const teams: TeamEntry[] = Array.isArray(rawTeamList)
      ? rawTeamList as TeamEntry[]
      : rawTeamList && typeof rawTeamList === "object"
        ? [rawTeamList as TeamEntry]
        : [];

    let totalPlayers = 0;

    for (const team of teams) {
      if (team.teamId == null) continue;

      try {
        // Blaze roster export returns { rosterInfoList: [...] } — flat array of players
        type RosterExport = { rosterInfoList?: unknown; playerInfoList?: unknown };
        const rosterData = await blazeExport<RosterExport>(
          "CareerMode_GetTeamRostersExport",
          sessionKey,
          platform,
          {
            leagueId: Number(eaLeagueId),
            listIndex: team.rosterId ?? 0,
            returnFreeAgents: false,
            teamId: team.teamId,
          },
        );

        // Support flat array ( { rosterInfoList: [...] } ) and legacy nested formats
        const rosterRaw = rosterData.rosterInfoList;
        let playerArray: Record<string, unknown>[];
        if (Array.isArray(rosterRaw)) {
          playerArray = rosterRaw as Record<string, unknown>[];
        } else if (rosterRaw && typeof rosterRaw === "object") {
          const nested = rosterRaw as Record<string, unknown>;
          const pList = nested["playerInfoList"];
          if (Array.isArray(pList)) {
            playerArray = pList as Record<string, unknown>[];
          } else if (pList && typeof pList === "object") {
            const pInfo = (pList as Record<string, unknown>)["playerInfo"];
            playerArray = Array.isArray(pInfo) ? pInfo as Record<string, unknown>[] : pInfo ? [pInfo as Record<string, unknown>] : [];
          } else {
            playerArray = [];
          }
        } else {
          const pListFallback = rosterData.playerInfoList;
          playerArray = Array.isArray(pListFallback) ? pListFallback as Record<string, unknown>[] : [];
        }

        // DEV: log all field keys from first player of first team for M27 attribute comparison
        if (totalPlayers === 0 && playerArray.length > 0) {
          req.log.info(
            { m27_player_keys: Object.keys(playerArray[0]!).sort() },
            "import-rosters: raw field keys from first player",
          );
        }

        const count = await upsertTeamRoster(leagueId, team.teamId, playerArray);
        totalPlayers += count;
      } catch (err) {
        req.log.warn({ err, teamId: team.teamId }, "import-rosters: skipping team due to error");
      }
    }

    req.log.info({ totalPlayers, teamCount: teams.length }, "import-rosters: complete");

    const exportInfo = await updateExportInfo(leagueId, (info) => ({
      ...info,
      rosters: new Date().toISOString(),
    }));
    res.json({ success: true, export_info: exportInfo, players_imported: totalPlayers });
  } catch (err) {
    req.log.error({ err }, "import-rosters: error");
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ message: e.message });
  }
});

// POST /import-schedules
router.post("/import-schedules", async (req, res) => {
  const leagueId = getLeagueId(req);
  try {
    const { sessionKey, eaLeagueId, platform, league } = await getBlazeSession(leagueId);
    const currentWeek = league.week ?? 1;
    const season = league.season ?? 2025;
    let totalGames = 0;

    // Import all regular season + playoff weeks — both played (FINAL) and unplayed (SCHEDULED)
    // weekIdx 0–17: Regular season (Weeks 1–18)
    // weekIdx 18: Wildcard Round (Week 19)
    // weekIdx 19: Divisional Round (Week 20)
    // weekIdx 20: Conference Championship (Week 21)
    // weekIdx 21: Pro Bowl — no games, skip
    // weekIdx 22: Super Bowl (Week 23)
    // Blaze returns { scheduleInfoList: [...] } — flat array, NOT nested under .scheduleInfo
    for (let weekIdx = 0; weekIdx < 23; weekIdx++) {
      if (weekIdx === 21) continue; // Pro Bowl — no scheduled games
      try {
        const serviceId = BLAZE_SERVICE_ID[platform] ?? BLAZE_SERVICE_ID["ps5"];
        const schedParams = { leagueId: Number(eaLeagueId), stageIndex: 1, weekIndex: weekIdx };
        const schedRes = await doRequest(
          "POST",
          `https://${BLAZE_HOST}/wal/mca/CareerMode_GetWeeklySchedulesExport/${sessionKey}`,
          JSON.stringify(schedParams),
          {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-BLAZE-ID": serviceId,
            "X-BLAZE-VOID-RESP": "XML",
            "X-Application-Key": "MADDEN-MCA",
          },
        );

        const rawText = schedRes.text();
        if (weekIdx === 0) {
          req.log.info({ weekIdx, httpStatus: schedRes.status, rawText: rawText.slice(0, 400) }, "import-schedules: week0 raw");
        }

        // Blaze uses "gameScheduleInfoList" (not "scheduleInfoList")
        type ScheduleExport = { gameScheduleInfoList?: unknown; scheduleInfoList?: unknown };
        const data = schedRes.ok ? schedRes.json<ScheduleExport>() : {} as ScheduleExport;

        const rawSched = data.gameScheduleInfoList ?? data.scheduleInfoList;
        const gameArray: Record<string, unknown>[] = Array.isArray(rawSched)
          ? rawSched as Record<string, unknown>[]
          : rawSched && typeof rawSched === "object"
            ? [rawSched as Record<string, unknown>]
            : [];

        req.log.info({ weekIdx, gameCount: gameArray.length }, "import-schedules: week parsed");

        const count = await upsertWeekSchedule(leagueId, gameArray, season, weekIdx, 1);
        totalGames += count;
      } catch (err) {
        req.log.warn({ err, weekIdx }, "import-schedules: skipping week due to error");
      }
    }

    req.log.info({ totalGames }, "import-schedules: complete");

    // Detect current week from FINAL games and persist
    const detectedWeek = await detectLeagueWeek(leagueId);
    if (detectedWeek !== null) {
      await db.update(leaguesTable).set({ week: detectedWeek }).where(eq(leaguesTable.id, leagueId));
      req.log.info({ detectedWeek }, "import-schedules: updated league.week");
    }

    const exportInfo = await updateExportInfo(leagueId, (info) => ({
      ...info,
      schedules: new Date().toISOString(),
    }));
    res.json({ success: true, export_info: exportInfo, games_imported: totalGames, week: detectedWeek ?? undefined });
  } catch (err) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ message: e.message });
  }
});

// Blaze export type → stat type name (used by processStatBlob)
const PLAYER_STAT_EXPORT_MAP: Record<string, string> = {
  "CareerMode_GetWeeklyPassingStatsExport":   "passing",
  "CareerMode_GetWeeklyRushingStatsExport":   "rushing",
  "CareerMode_GetWeeklyReceivingStatsExport": "receiving",
  "CareerMode_GetWeeklyKickingStatsExport":   "kicking",
  "CareerMode_GetWeeklyPuntingStatsExport":   "punting",
  "CareerMode_GetWeeklyDefensiveStatsExport": "defense",
};

const PLAYER_STAT_EXPORTS = Object.keys(PLAYER_STAT_EXPORT_MAP);

// Fetch the schedule for week 0 and extract seasonIndex to compute the actual franchise year.
// seasonIndex is 0-indexed (year 1 = 0, year 5 = 4). Actual year = leagueSeason + seasonIndex.
async function detectActualSeason(
  sessionKey: string,
  platform: string,
  eaLeagueId: string,
  baseSeason: number,
): Promise<number> {
  try {
    type SchedExport = { gameScheduleInfoList?: Array<Record<string, unknown>> };
    const data = await blazeExport<SchedExport>(
      "CareerMode_GetWeeklySchedulesExport",
      sessionKey, platform,
      { leagueId: Number(eaLeagueId), stageIndex: 1, weekIndex: 0 },
    );
    const first = data.gameScheduleInfoList?.[0];
    const seasonIndex = typeof first?.["seasonIndex"] === "number" ? first["seasonIndex"] : 0;
    return baseSeason + seasonIndex;
  } catch {
    return baseSeason;
  }
}

// POST /import-all-stats
router.post("/import-all-stats", async (req, res) => {
  const leagueId = getLeagueId(req);
  try {
    const { sessionKey, eaLeagueId, platform, league } = await getBlazeSession(leagueId);
    const currentWeek = league.week ?? 1;
    const baseSeason = league.season ?? 2025;
    const now = new Date().toISOString();

    const exportInfo = await updateExportInfo(leagueId, (info) => {
      const stats = (info["statistics"] as Record<string, Record<string, unknown>> | null) ?? {};
      for (let i = 0; i < currentWeek; i++) {
        if (i === 21) continue; // Pro Bowl — no player stat data
        stats[String(i)] = { games: now, team: now, passing: now, rushing: now, receiving: now, kicking: now, punting: now, defense: now };
      }
      return { ...info, statistics: stats };
    });

    // Process stats in background — detect the real franchise year first, then save each week
    void (async () => {
      const actualSeason = await detectActualSeason(sessionKey, platform, eaLeagueId, baseSeason);
      req.log.info({ baseSeason, actualSeason }, "import-all-stats: detected season");

      for (let weekIdx = 0; weekIdx < currentWeek; weekIdx++) {
        if (weekIdx === 21) continue; // Pro Bowl — no player stat data
        for (const exportType of PLAYER_STAT_EXPORTS) {
          try {
            const data = await blazeExport<Record<string, unknown>>(
              exportType, sessionKey, platform,
              { leagueId: Number(eaLeagueId), stageIndex: 1, weekIndex: weekIdx },
            );
            const statType = PLAYER_STAT_EXPORT_MAP[exportType]!;
            const n = await processStatBlob(leagueId, weekIdx, 1, actualSeason, statType, data);
            if (n > 0) {
              req.log.info({ weekIdx, statType, n }, "import-all-stats: saved stat rows");
            } else {
              req.log.warn({ weekIdx, statType, exportType, bodyKeys: Object.keys(data) }, "import-all-stats: 0 rows for stat type — check export type and response key");
            }
          } catch (err) {
            req.log.warn({ weekIdx, exportType, err }, "import-all-stats: skipping export due to error");
          }
        }
      }
      req.log.info({ leagueId, weeks: currentWeek }, "import-all-stats: background complete");
    })();

    res.json({ success: true, export_info: exportInfo });
  } catch (err) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ message: e.message });
  }
});

// POST /import-week-stats/:weekIndex
router.post("/import-week-stats/:weekIndex", async (req, res) => {
  const leagueId = getLeagueId(req);
  const weekIndex = parseInt(req.params["weekIndex"] ?? "0", 10);
  try {
    const { sessionKey, eaLeagueId, platform, league } = await getBlazeSession(leagueId);
    const baseSeason = league.season ?? 2025;
    const actualSeason = await detectActualSeason(sessionKey, platform, eaLeagueId, baseSeason);
    const now = new Date().toISOString();

    for (const exportType of PLAYER_STAT_EXPORTS) {
      try {
        const data = await blazeExport<Record<string, unknown>>(
          exportType, sessionKey, platform,
          { leagueId: Number(eaLeagueId), stageIndex: 1, weekIndex },
        );
        const statType = PLAYER_STAT_EXPORT_MAP[exportType]!;
        await processStatBlob(leagueId, weekIndex, 1, actualSeason, statType, data);
      } catch (err) {
        req.log.warn({ weekIndex, exportType, err }, "import-week-stats: skipping export");
      }
    }

    const exportInfo = await updateExportInfo(leagueId, (info) => {
      const stats = (info["statistics"] as Record<string, Record<string, unknown>> | null) ?? {};
      stats[String(weekIndex)] = { games: now, team: now, passing: now, rushing: now, receiving: now, kicking: now, punting: now, defense: now };
      return { ...info, statistics: stats };
    });

    res.json({ success: true, export_info: exportInfo });
  } catch (err) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ message: e.message });
  }
});

// POST /reset-export-status
router.post("/reset-export-status", async (req, res) => {
  const leagueId = getLeagueId(req);
  const exportInfo = buildDefaultExportInfo();
  await db.update(leaguesTable).set({ exportInfo }).where(eq(leaguesTable.id, leagueId));
  res.json({ success: true, export_info: exportInfo });
});

// GET /export-info
router.get("/export-info", async (req, res) => {
  const leagueId = getLeagueId(req);
  const league = await getLeague(leagueId);
  if (!league) { res.status(404).json({ error: "League not found" }); return; }

  const exportInfo = (league.exportInfo as Record<string, unknown> | null) ?? buildDefaultExportInfo();
  const cooldownRemainingMs = 0;

  res.json({
    is_ea_connected: league.isEaConnected,
    export_info: exportInfo,
    stats_cooldown_remaining_s: Math.max(0, Math.ceil(cooldownRemainingMs / 1000)),
    week: league.week,
  });
});

export default router;
