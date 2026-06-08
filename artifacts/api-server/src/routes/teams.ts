import { Router } from "express";
import { db, teamsTable, playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetTeamParams,
  UpdateTeamParams,
  UpdateTeamBody,
  GetTeamPlayersParams,
  AddPlayerParams,
  AddPlayerBody,
} from "@workspace/api-zod";

const router = Router();

function formatTeam(team: typeof teamsTable.$inferSelect) {
  return {
    id: team.id,
    league_id: team.leagueId,
    name: team.name,
    city: team.city,
    abbreviation: team.abbreviation,
    conference: team.conference,
    division: team.division,
    wins: team.wins,
    losses: team.losses,
    ties: team.ties,
    overall_rating: team.overallRating,
    is_user_team: team.isUserTeam,
    primary_color: team.primaryColor,
    secondary_color: team.secondaryColor,
  };
}

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

// GET /teams/:id
router.get("/:id", async (req, res) => {
  const parseResult = GetTeamParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, parseResult.data.id));
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  res.json(formatTeam(team));
});

// PATCH /teams/:id
router.patch("/:id", async (req, res) => {
  const paramResult = UpdateTeamParams.safeParse({ id: Number(req.params.id) });
  if (!paramResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyResult = UpdateTeamBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const data = bodyResult.data;
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.wins !== undefined) updates.wins = data.wins;
  if (data.losses !== undefined) updates.losses = data.losses;
  if (data.ties !== undefined) updates.ties = data.ties;
  if (data.overall_rating !== undefined) updates.overallRating = data.overall_rating;
  if (data.is_user_team !== undefined) updates.isUserTeam = data.is_user_team;
  if (data.primary_color !== undefined) updates.primaryColor = data.primary_color;
  if (data.secondary_color !== undefined) updates.secondaryColor = data.secondary_color;

  const [team] = await db.update(teamsTable).set(updates).where(eq(teamsTable.id, paramResult.data.id)).returning();
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  res.json(formatTeam(team));
});

// GET /teams/:id/players
router.get("/:id/players", async (req, res) => {
  const parseResult = GetTeamPlayersParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const players = await db.select().from(playersTable).where(eq(playersTable.teamId, parseResult.data.id));
  res.json(players.map(formatPlayer));
});

// POST /teams/:id/players
router.post("/:id/players", async (req, res) => {
  const paramResult = AddPlayerParams.safeParse({ id: Number(req.params.id) });
  if (!paramResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyResult = AddPlayerBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const data = bodyResult.data;
  const [player] = await db.insert(playersTable).values({
    teamId: paramResult.data.id,
    name: data.name,
    position: data.position,
    overall: data.overall,
    age: data.age,
    speed: data.speed ?? 75,
    strength: data.strength ?? 70,
    awareness: data.awareness ?? 72,
    throwingPower: data.throwing_power,
    catching: data.catching,
    tackling: data.tackling,
  }).returning();
  res.status(201).json(formatPlayer(player));
});

export default router;
