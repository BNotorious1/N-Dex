import { Router } from "express";
import { db, gamesTable, teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateGameParams, UpdateGameBody } from "@workspace/api-zod";

const router = Router();

// PATCH /games/:id
router.patch("/:id", async (req, res) => {
  const paramResult = UpdateGameParams.safeParse({ id: Number(req.params.id) });
  if (!paramResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyResult = UpdateGameBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const data = bodyResult.data;
  const updates: Record<string, unknown> = {};
  if (data.home_score !== undefined) updates.homeScore = data.home_score;
  if (data.away_score !== undefined) updates.awayScore = data.away_score;
  if (data.status !== undefined) updates.status = data.status;

  const [game] = await db.update(gamesTable).set(updates).where(eq(gamesTable.id, paramResult.data.id)).returning();
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  const [homeTeam] = await db.select().from(teamsTable).where(eq(teamsTable.id, game.homeTeamId));
  const [awayTeam] = await db.select().from(teamsTable).where(eq(teamsTable.id, game.awayTeamId));

  res.json({
    id: game.id,
    league_id: game.leagueId,
    home_team_id: game.homeTeamId,
    away_team_id: game.awayTeamId,
    home_team_name: homeTeam?.name ?? null,
    away_team_name: awayTeam?.name ?? null,
    home_score: game.homeScore,
    away_score: game.awayScore,
    week: game.week,
    season: game.season,
    status: game.status,
  });
});

export default router;
