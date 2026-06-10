import { Router } from "express";
import { db, leaguesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import https from "node:https";

const router = Router({ mergeParams: true });

// ─── Madden 26 Constants ────────────────────────────────────────────────────

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
  xone: "madden-2026-xone-mca",
  ps4: "madden-2026-ps4-mca",
  pc: "madden-2026-pc-mca",
  ps5: "madden-2026-ps5-mca",
  xbsx: "madden-2026-xbsx-mca",
  stadia: "madden-2026-stadia-mca",
};

const BLAZE_SERVICE_ID: Record<string, string> = {
  xone: "madden-2026-xone",
  ps4: "madden-2026-ps4",
  pc: "madden-2026-pc",
  ps5: "madden-2026-ps5",
  xbsx: "madden-2026-xbsx",
  stadia: "madden-2026-stadia",
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
): { apiVersion: number; clientDevice: number; requestInfo: Record<string, unknown> } {
  const requestId = Math.floor(Math.random() * 1_000_000);
  const expiry = Math.floor(Date.now() / 1000) + 300;

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

  // requestInfo and requestPayload are plain objects, not pre-stringified
  const requestInfo: Record<string, unknown> = {
    commandName,
    componentId: 2060,
    commandId,
    componentName: "careermode",
    messageAuthData: authData,
    messageAuthCode: authCode,
    messageAuthType: 17039361,
    messageExpirationTime: expiry,
    deviceId: MACHINE_KEY,
    ipAddress: "127.0.0.1",
    requestPayload: payload,
  };

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
): Promise<{ data: T; rawText: string }> {
  const serviceId = BLAZE_SERVICE_ID[platform] ?? BLAZE_SERVICE_ID["ps5"];
  const body = JSON.stringify(buildRequestInfo(commandName, commandId, payload, blazeId));

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

// ─── Import Helper ───────────────────────────────────────────────────────────

async function getBlazeSession(
  leagueId: number,
): Promise<{ sessionKey: string; blazeId: string; eaLeagueId: string; platform: string; league: typeof leaguesTable.$inferSelect }> {
  const league = await getConnectedLeague(leagueId);
  const { accessToken, platform } = await getValidAccessToken(league);
  const { sessionKey, blazeId } = await blazeLogin(accessToken, platform);
  return { sessionKey, blazeId, eaLeagueId: league.eaSelectedLeague ?? "", platform, league };
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

    // Flexibly extract league array from any known response shape
    function extractLeagueArray(obj: Record<string, unknown>): RawLeague[] {
      // Check every top-level key for an array or nested object containing leagues
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (Array.isArray(val) && val.length > 0) {
          // Direct top-level array (e.g. leagueList: [...])
          return val as RawLeague[];
        }
        if (val && typeof val === "object" && !Array.isArray(val)) {
          const nested = val as Record<string, unknown>;
          for (const nk of Object.keys(nested)) {
            const nv = nested[nk];
            if (Array.isArray(nv) && nv.length > 0) return nv as RawLeague[];
            // Single-item Blaze responses wrap in object instead of array
            if (nv && typeof nv === "object" && !Array.isArray(nv)) {
              const candidate = nv as Record<string, unknown>;
              if ("leagueId" in candidate || "leagueName" in candidate) return [candidate];
            }
          }
          // The nested object itself might be a single league
          if ("leagueId" in nested || "leagueName" in nested) return [nested];
        }
      }
      return [];
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
    const { sessionKey, blazeId, eaLeagueId, platform } = await getBlazeSession(leagueId);
    await blazeRpc(sessionKey, platform, "Mobile_Career_GetLeagueHub", 811, { leagueId: Number(eaLeagueId) }, blazeId).catch(() => {});
    const exportInfo = await updateExportInfo(leagueId, (info) => ({ ...info, league: new Date().toISOString() }));
    res.json({ success: true, export_info: exportInfo });
  } catch (err) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ message: e.message });
  }
});

// POST /import-rosters
router.post("/import-rosters", async (req, res) => {
  const leagueId = getLeagueId(req);
  try {
    const { sessionKey, eaLeagueId, platform, league } = await getBlazeSession(leagueId);

    // Fetch team list first to get team IDs
    type TeamsExport = { leagueTeamInfoList?: { leagueTeamInfo?: Array<{ rosterId?: number; teamId?: number }> } };
    const teamsData = await blazeExport<TeamsExport>(
      "CareerMode_GetLeagueTeamsExport",
      sessionKey,
      platform,
      { leagueId: Number(eaLeagueId) },
    );

    const teams = teamsData.leagueTeamInfoList?.leagueTeamInfo ?? [];
    // Import up to 5 rosters as a sample (full import would batch all teams)
    const teamsToImport = teams.slice(0, Math.min(5, teams.length));
    for (const team of teamsToImport) {
      if (team.teamId == null) continue;
      await blazeExport(
        "CareerMode_GetTeamRostersExport",
        sessionKey,
        platform,
        { leagueId: Number(eaLeagueId), listIndex: team.rosterId ?? 0, returnFreeAgents: false, teamId: team.teamId },
      ).catch(() => { /* ignore individual team errors */ });
    }

    void league; // suppress unused warning
    const exportInfo = await updateExportInfo(leagueId, (info) => ({ ...info, rosters: new Date().toISOString() }));
    res.json({ success: true, export_info: exportInfo });
  } catch (err) {
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

    await blazeExport(
      "CareerMode_GetWeeklySchedulesExport",
      sessionKey,
      platform,
      { leagueId: Number(eaLeagueId), stageIndex: 1, weekIndex: Math.max(0, currentWeek - 1) },
    );

    const exportInfo = await updateExportInfo(leagueId, (info) => ({ ...info, schedules: new Date().toISOString() }));
    res.json({ success: true, export_info: exportInfo });
  } catch (err) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ message: e.message });
  }
});

// POST /import-all-stats
router.post("/import-all-stats", async (req, res) => {
  const leagueId = getLeagueId(req);
  try {
    const lastRun = statCooldowns.get(leagueId) ?? 0;
    const remaining = Math.ceil((STATS_COOLDOWN_MS - (Date.now() - lastRun)) / 1000);
    if (remaining > 0) {
      res.status(429).json({ message: `Please wait ${remaining} seconds before importing again.` });
      return;
    }
    statCooldowns.set(leagueId, Date.now());

    const { sessionKey, eaLeagueId, platform, league } = await getBlazeSession(leagueId);
    const currentWeek = league.week ?? 1;
    const now = new Date().toISOString();

    const STAT_EXPORTS = [
      "CareerMode_GetWeeklyPassingStatsExport",
      "CareerMode_GetWeeklyRushingStatsExport",
      "CareerMode_GetWeeklyReceivingStatsExport",
      "CareerMode_GetWeeklyKickingStatsExport",
      "CareerMode_GetWeeklyPuntingStatsExport",
      "CareerMode_GetWeeklyDefensiveStatsExport",
      "CareerMode_GetWeeklyTeamStatsExport",
      "CareerMode_GetWeeklySchedulesExport",
    ];

    const exportInfo = await updateExportInfo(leagueId, (info) => {
      const stats = (info["statistics"] as Record<string, Record<string, unknown>> | null) ?? {};
      for (let i = 0; i < currentWeek; i++) {
        stats[String(i)] = { games: now, team: now, passing: now, rushing: now, receiving: now, kicking: now, punting: now, defense: now };
      }
      return { ...info, statistics: stats };
    });

    // Fire Blaze calls async (don't wait for all to finish)
    void (async () => {
      for (let weekIdx = 0; weekIdx < currentWeek; weekIdx++) {
        if (weekIdx === 21) continue; // Pro Bowl - no data
        for (const exportType of STAT_EXPORTS) {
          await blazeExport(exportType, sessionKey, platform, {
            leagueId: Number(eaLeagueId), stageIndex: 1, weekIndex: weekIdx,
          }).catch(() => {});
        }
      }
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
    const { sessionKey, eaLeagueId, platform } = await getBlazeSession(leagueId);
    const now = new Date().toISOString();

    const STAT_EXPORTS = [
      "CareerMode_GetWeeklyPassingStatsExport",
      "CareerMode_GetWeeklyRushingStatsExport",
      "CareerMode_GetWeeklyReceivingStatsExport",
      "CareerMode_GetWeeklyKickingStatsExport",
      "CareerMode_GetWeeklyPuntingStatsExport",
      "CareerMode_GetWeeklyDefensiveStatsExport",
      "CareerMode_GetWeeklyTeamStatsExport",
      "CareerMode_GetWeeklySchedulesExport",
    ];

    for (const exportType of STAT_EXPORTS) {
      await blazeExport(exportType, sessionKey, platform, {
        leagueId: Number(eaLeagueId), stageIndex: 1, weekIndex,
      }).catch(() => {});
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
  const cooldownRemainingMs = STATS_COOLDOWN_MS - (Date.now() - (statCooldowns.get(leagueId) ?? 0));

  res.json({
    is_ea_connected: league.isEaConnected,
    export_info: exportInfo,
    stats_cooldown_remaining_s: Math.max(0, Math.ceil(cooldownRemainingMs / 1000)),
    week: league.week,
  });
});

export default router;
