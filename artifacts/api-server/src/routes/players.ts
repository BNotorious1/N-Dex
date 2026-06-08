import { Router } from "express";
import { db, playersTable } from "@workspace/db";
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

// GET /players/:id
router.get("/:id", async (req, res) => {
  const parseResult = GetPlayerParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [player] = await db.select().from(playersTable).where(eq(playersTable.id, parseResult.data.id));
  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }
  res.json(formatPlayer(player));
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
