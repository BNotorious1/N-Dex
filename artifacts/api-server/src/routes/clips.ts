import { Router } from "express";
import { db, gameplayClipsTable, membersTable, leaguesTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";

const router = Router({ mergeParams: true });

function serializeClip(clip: typeof gameplayClipsTable.$inferSelect) {
  return {
    id: clip.id,
    league_id: clip.leagueId,
    team_id: clip.teamId,
    uploaded_by: clip.uploadedByDiscordName,
    title: clip.title,
    description: clip.description,
    object_path: clip.objectPath,
    created_at: clip.createdAt,
  };
}

// GET /leagues/:id/clips — list gameplay clips for a league (visible to all viewers)
router.get("/", async (req, res) => {
  const leagueId = Number(req.params.id);
  if (!leagueId) {
    res.status(400).json({ error: "Invalid league id" });
    return;
  }

  try {
    const clips = await db
      .select()
      .from(gameplayClipsTable)
      .where(eq(gameplayClipsTable.leagueId, leagueId))
      .orderBy(desc(gameplayClipsTable.createdAt));

    res.json(clips.map(serializeClip));
  } catch (error) {
    req.log.error({ err: error }, "Error listing gameplay clips");
    res.status(500).json({ error: "Failed to load clips", detail: error instanceof Error ? error.message : String(error) });
  }
});

// POST /leagues/:id/clips — upload a clip record (league members only)
router.post("/", async (req, res) => {
  const leagueId = Number(req.params.id);
  if (!leagueId) {
    res.status(400).json({ error: "Invalid league id" });
    return;
  }

  if (!req.session?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const username = req.session.user.username;

  try {
    const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.id, leagueId));
    if (!league) {
      res.status(404).json({ error: "League not found" });
      return;
    }

    const [member] = await db
      .select()
      .from(membersTable)
      .where(and(eq(membersTable.leagueId, leagueId), eq(membersTable.discordName, username)));

    const isCommissioner = league.commissionerName === username;
    if (!member && !isCommissioner) {
      res.status(403).json({ error: "Only league members can upload clips" });
      return;
    }

    const { title, description, object_path } = req.body ?? {};
    if (!title || typeof title !== "string" || !object_path || typeof object_path !== "string") {
      res.status(400).json({ error: "title and object_path are required" });
      return;
    }

    const [clip] = await db
      .insert(gameplayClipsTable)
      .values({
        leagueId,
        teamId: member?.teamId ?? null,
        uploadedByDiscordName: username,
        title,
        description: typeof description === "string" ? description : null,
        objectPath: object_path,
      })
      .returning();

    res.status(201).json(serializeClip(clip));
  } catch (error) {
    req.log.error({ err: error }, "Error saving gameplay clip");
    res.status(500).json({ error: "Failed to save clip", detail: error instanceof Error ? error.message : String(error) });
  }
});

// DELETE /leagues/:id/clips/:clipId — remove a clip (uploader or commissioner only)
router.delete("/:clipId", async (req, res) => {
  const leagueId = Number(req.params.id);
  const clipId = Number(req.params.clipId);
  if (!leagueId || !clipId) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (!req.session?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const username = req.session.user.username;

  try {
    const [clip] = await db.select().from(gameplayClipsTable).where(eq(gameplayClipsTable.id, clipId));
    if (!clip || clip.leagueId !== leagueId) {
      res.status(404).json({ error: "Clip not found" });
      return;
    }

    const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.id, leagueId));
    const isCommissioner = league?.commissionerName === username;
    if (clip.uploadedByDiscordName !== username && !isCommissioner) {
      res.status(403).json({ error: "Not allowed to delete this clip" });
      return;
    }

    await db.delete(gameplayClipsTable).where(eq(gameplayClipsTable.id, clipId));
    res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, "Error deleting gameplay clip");
    res.status(500).json({ error: "Failed to delete clip", detail: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
