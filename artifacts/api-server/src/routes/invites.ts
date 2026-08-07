import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db, leagueInvitesTable, leaguesTable, membersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// ── League join-link (generic, per-league) ────────────────────────────────────

// GET /leagues/:id/join-link — return (or lazily create) the league's join token
router.get("/leagues/:id/join-link", async (req, res) => {
  if (!req.session.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const leagueId = Number(req.params["id"]);
  if (!leagueId || isNaN(leagueId)) { res.status(400).json({ error: "Invalid league id" }); return; }

  let [league] = await db.select({ id: leaguesTable.id, name: leaguesTable.name, joinToken: leaguesTable.joinToken })
    .from(leaguesTable).where(eq(leaguesTable.id, leagueId)).limit(1);
  if (!league) { res.status(404).json({ error: "League not found" }); return; }

  if (!league.joinToken) {
    const token = randomUUID();
    [league] = await db.update(leaguesTable).set({ joinToken: token }).where(eq(leaguesTable.id, leagueId)).returning({
      id: leaguesTable.id, name: leaguesTable.name, joinToken: leaguesTable.joinToken,
    });
  }

  res.json({ token: league!.joinToken, league_id: league!.id, league_name: league!.name });
});

// POST /leagues/:id/join-link/regenerate — rotate the join token
router.post("/leagues/:id/join-link/regenerate", async (req, res) => {
  if (!req.session.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const leagueId = Number(req.params["id"]);
  if (!leagueId || isNaN(leagueId)) { res.status(400).json({ error: "Invalid league id" }); return; }

  const token = randomUUID();
  const [league] = await db.update(leaguesTable).set({ joinToken: token }).where(eq(leaguesTable.id, leagueId))
    .returning({ id: leaguesTable.id, name: leaguesTable.name, joinToken: leaguesTable.joinToken });
  if (!league) { res.status(404).json({ error: "League not found" }); return; }

  res.json({ token: league.joinToken, league_id: league.id, league_name: league.name });
});

// GET /join/:token — public: get league info via join token
router.get("/join/:token", async (req, res) => {
  const token = req.params["token"];
  if (!token) { res.status(400).json({ error: "Invalid token" }); return; }

  const [league] = await db.select({ id: leaguesTable.id, name: leaguesTable.name, commissionerName: leaguesTable.commissionerName, platform: leaguesTable.platform, memberCount: leaguesTable.memberCount, maxMembers: leaguesTable.maxMembers })
    .from(leaguesTable).where(eq(leaguesTable.joinToken, token)).limit(1);
  if (!league) { res.status(404).json({ error: "League not found" }); return; }

  res.json({ token, league_id: league.id, league_name: league.name, commissioner: league.commissionerName, platform: league.platform, member_count: league.memberCount, max_members: league.maxMembers });
});

// POST /join/:token/accept — join a league via the generic join link
router.post("/join/:token/accept", async (req, res) => {
  if (!req.session.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const token = req.params["token"];
  if (!token) { res.status(400).json({ error: "Invalid token" }); return; }

  const [league] = await db.select({ id: leaguesTable.id, name: leaguesTable.name, maxMembers: leaguesTable.maxMembers, memberCount: leaguesTable.memberCount })
    .from(leaguesTable).where(eq(leaguesTable.joinToken, token)).limit(1);
  if (!league) { res.status(404).json({ error: "League not found" }); return; }

  const { user } = req.session;

  // Check already a member
  const [existing] = await db.select({ id: membersTable.id }).from(membersTable)
    .where(and(eq(membersTable.leagueId, league.id), eq(membersTable.discordName, user.username))).limit(1);
  if (existing) { res.status(409).json({ error: "Already a member of this league" }); return; }

  await db.insert(membersTable).values({ leagueId: league.id, discordName: user.username, discordAvatarUrl: user.avatar ?? null, permissions: 0 });
  res.json({ ok: true, league_id: league.id });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function inviteStatus(invite: { acceptedAt: Date | null; expiresAt: Date }): "pending" | "accepted" | "expired" {
  if (invite.acceptedAt) return "accepted";
  if (new Date() > invite.expiresAt) return "expired";
  return "pending";
}

function formatInvite(
  invite: typeof leagueInvitesTable.$inferSelect,
  leagueName?: string,
) {
  return {
    id: invite.id,
    token: invite.token,
    discord_name: invite.discordName,
    created_by: invite.createdBy,
    league_id: invite.leagueId,
    league_name: leagueName ?? null,
    created_at: invite.createdAt.toISOString(),
    expires_at: invite.expiresAt.toISOString(),
    accepted_at: invite.acceptedAt?.toISOString() ?? null,
    accepted_by_discord_name: invite.acceptedByDiscordName ?? null,
    status: inviteStatus(invite),
  };
}

// ── League-scoped admin routes ────────────────────────────────────────────────

// GET /leagues/:id/invites — list all invites for a league
router.get("/leagues/:id/invites", async (req, res) => {
  const leagueId = Number(req.params["id"]);
  if (!leagueId || isNaN(leagueId)) {
    res.status(400).json({ error: "Invalid league id" });
    return;
  }

  const invites = await db
    .select()
    .from(leagueInvitesTable)
    .where(eq(leagueInvitesTable.leagueId, leagueId))
    .orderBy(leagueInvitesTable.createdAt);

  res.json(invites.map((inv) => formatInvite(inv)));
});

// POST /leagues/:id/invites — create an invite
router.post("/leagues/:id/invites", async (req, res) => {
  if (!req.session.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const leagueId = Number(req.params["id"]);
  if (!leagueId || isNaN(leagueId)) {
    res.status(400).json({ error: "Invalid league id" });
    return;
  }

  const discordName = (req.body?.discord_name ?? "").trim();
  if (!discordName) {
    res.status(400).json({ error: "discord_name is required" });
    return;
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const [invite] = await db
    .insert(leagueInvitesTable)
    .values({
      leagueId,
      token,
      discordName,
      createdBy: req.session.user.username,
      expiresAt,
    })
    .returning();

  res.status(201).json(formatInvite(invite!));
});

// DELETE /leagues/:id/invites/:token — revoke an invite
router.delete("/leagues/:id/invites/:token", async (req, res) => {
  if (!req.session.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const leagueId = Number(req.params["id"]);
  const token = req.params["token"];

  if (!leagueId || isNaN(leagueId) || !token) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  await db
    .delete(leagueInvitesTable)
    .where(
      and(
        eq(leagueInvitesTable.leagueId, leagueId),
        eq(leagueInvitesTable.token, token),
      ),
    );

  res.status(204).send();
});

// ── Public token routes ───────────────────────────────────────────────────────

// GET /invites/:token — fetch invite info (public)
router.get("/invites/:token", async (req, res) => {
  const token = req.params["token"];
  if (!token) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }

  const rows = await db
    .select({
      invite: leagueInvitesTable,
      leagueName: leaguesTable.name,
    })
    .from(leagueInvitesTable)
    .leftJoin(leaguesTable, eq(leaguesTable.id, leagueInvitesTable.leagueId))
    .where(eq(leagueInvitesTable.token, token))
    .limit(1);

  if (!rows[0]) {
    res.status(404).json({ error: "Invite not found" });
    return;
  }

  const { invite, leagueName } = rows[0];
  res.json(formatInvite(invite, leagueName ?? undefined));
});

// POST /invites/:token/accept — accept an invite (must be logged in)
router.post("/invites/:token/accept", async (req, res) => {
  if (!req.session.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const token = req.params["token"];
  if (!token) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }

  const [invite] = await db
    .select()
    .from(leagueInvitesTable)
    .where(eq(leagueInvitesTable.token, token))
    .limit(1);

  if (!invite) {
    res.status(404).json({ error: "Invite not found" });
    return;
  }

  if (invite.acceptedAt) {
    res.status(409).json({ error: "Invite already used" });
    return;
  }

  if (new Date() > invite.expiresAt) {
    res.status(410).json({ error: "Invite has expired" });
    return;
  }

  const { user } = req.session;

  // Check if already a member
  const existing = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(
      and(
        eq(membersTable.leagueId, invite.leagueId),
        eq(membersTable.discordName, user.username),
      ),
    )
    .limit(1);

  if (existing[0]) {
    res.status(409).json({ error: "Already a member of this league" });
    return;
  }

  // Create the member record
  await db.insert(membersTable).values({
    leagueId: invite.leagueId,
    discordName: user.username,
    discordAvatarUrl: user.avatar ?? null,
    permissions: 0,
  });

  // Mark invite as accepted
  await db
    .update(leagueInvitesTable)
    .set({
      acceptedAt: new Date(),
      acceptedByDiscordId: user.id,
      acceptedByDiscordName: user.username,
    })
    .where(eq(leagueInvitesTable.token, token));

  res.json({ ok: true, league_id: invite.leagueId });
});

export default router;
