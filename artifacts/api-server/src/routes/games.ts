import { Router } from "express";
import { db, gamesTable, teamsTable, playerGameStatsTable, playersTable, membersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateGameParams, UpdateGameBody } from "@workspace/api-zod";

const router = Router();

// GET /games/:id — full game detail with player stats
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, id));
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  const [homeTeam] = await db.select().from(teamsTable).where(eq(teamsTable.id, game.homeTeamId));
  const [awayTeam] = await db.select().from(teamsTable).where(eq(teamsTable.id, game.awayTeamId));
  const [homeMember] = await db.select().from(membersTable).where(eq(membersTable.teamId, game.homeTeamId));
  const [awayMember] = await db.select().from(membersTable).where(eq(membersTable.teamId, game.awayTeamId));

  const stats = await db
    .select({
      playerId: playersTable.id,
      playerName: playersTable.name,
      position: playersTable.position,
      portraitId: playersTable.portraitId,
      customPortraitUrl: playersTable.customPortraitUrl,
      playerTeamId: playersTable.teamId,
      pssAtt: playerGameStatsTable.pssAtt,
      pssCmp: playerGameStatsTable.pssCmp,
      pssYds: playerGameStatsTable.pssYds,
      pssTds: playerGameStatsTable.pssTds,
      pssInts: playerGameStatsTable.pssInts,
      pssSacks: playerGameStatsTable.pssSacks,
      pssLng: playerGameStatsTable.pssLng,
      pssRating: playerGameStatsTable.pssRating,
      rshAtt: playerGameStatsTable.rshAtt,
      rshYds: playerGameStatsTable.rshYds,
      rshTds: playerGameStatsTable.rshTds,
      rshLng: playerGameStatsTable.rshLng,
      rshBtk: playerGameStatsTable.rshBtk,
      fmb: playerGameStatsTable.fmb,
      fmbLost: playerGameStatsTable.fmbLost,
      recCatches: playerGameStatsTable.recCatches,
      recTgts: playerGameStatsTable.recTgts,
      recYds: playerGameStatsTable.recYds,
      recTds: playerGameStatsTable.recTds,
      recDrops: playerGameStatsTable.recDrops,
      recLng: playerGameStatsTable.recLng,
      recYac: playerGameStatsTable.recYac,
      defTotalTackles: playerGameStatsTable.defTotalTackles,
      defTfl: playerGameStatsTable.defTfl,
      defSacks: playerGameStatsTable.defSacks,
      defInts: playerGameStatsTable.defInts,
      defFf: playerGameStatsTable.defFf,
      defPd: playerGameStatsTable.defPd,
      defTds: playerGameStatsTable.defTds,
      defFumRec: playerGameStatsTable.defFumRec,
      defCatchesAllowed: playerGameStatsTable.defCatchesAllowed,
      defSafeties: playerGameStatsTable.defSafeties,
      fgAtt: playerGameStatsTable.fgAtt,
      fgMade: playerGameStatsTable.fgMade,
      fgLng: playerGameStatsTable.fgLng,
      xpAtt: playerGameStatsTable.xpAtt,
      xpMade: playerGameStatsTable.xpMade,
      puntAtt: playerGameStatsTable.puntAtt,
      puntYds: playerGameStatsTable.puntYds,
      puntAvg: playerGameStatsTable.puntAvg,
      puntLng: playerGameStatsTable.puntLng,
      puntIn20: playerGameStatsTable.puntIn20,
      puntTbs: playerGameStatsTable.puntTbs,
    })
    .from(playerGameStatsTable)
    .innerJoin(playersTable, eq(playerGameStatsTable.playerId, playersTable.id))
    .where(eq(playerGameStatsTable.gameId, id));

  const playerStats = stats.map((s) => ({
    player_id: s.playerId,
    player_name: s.playerName,
    position: s.position,
    portrait_id: s.portraitId,
    custom_portrait_url: s.customPortraitUrl ?? null,
    team_id: s.playerTeamId,
    is_home_team: s.playerTeamId === game.homeTeamId,
    pss_att: s.pssAtt,
    pss_cmp: s.pssCmp,
    pss_yds: s.pssYds,
    pss_tds: s.pssTds,
    pss_ints: s.pssInts,
    pss_sacks: s.pssSacks,
    pss_lng: s.pssLng,
    pss_rating: s.pssRating,
    rsh_att: s.rshAtt,
    rsh_yds: s.rshYds,
    rsh_tds: s.rshTds,
    rsh_lng: s.rshLng,
    rsh_btk: s.rshBtk,
    fmb: s.fmb,
    fmb_lost: s.fmbLost,
    rec_catches: s.recCatches,
    rec_tgts: s.recTgts,
    rec_yds: s.recYds,
    rec_tds: s.recTds,
    rec_drops: s.recDrops,
    rec_lng: s.recLng,
    rec_yac: s.recYac,
    def_total_tackles: s.defTotalTackles,
    def_tfl: s.defTfl,
    def_sacks: s.defSacks,
    def_ints: s.defInts,
    def_ff: s.defFf,
    def_pd: s.defPd,
    def_tds: s.defTds,
    def_fum_rec: s.defFumRec,
    def_catches_allowed: s.defCatchesAllowed,
    def_safeties: s.defSafeties,
    fg_att: s.fgAtt,
    fg_made: s.fgMade,
    fg_lng: s.fgLng,
    xp_att: s.xpAtt,
    xp_made: s.xpMade,
    punt_att: s.puntAtt,
    punt_yds: s.puntYds,
    punt_avg: s.puntAvg,
    punt_lng: s.puntLng,
    punt_in20: s.puntIn20,
    punt_tbs: s.puntTbs,
  }));

  res.json({
    id: game.id,
    league_id: game.leagueId,
    home_team_id: game.homeTeamId,
    away_team_id: game.awayTeamId,
    home_team_name: homeTeam?.name ?? null,
    away_team_name: awayTeam?.name ?? null,
    home_team_abbreviation: homeTeam?.abbreviation ?? null,
    away_team_abbreviation: awayTeam?.abbreviation ?? null,
    home_team_color: homeTeam?.primaryColor ?? null,
    away_team_color: awayTeam?.primaryColor ?? null,
    home_team_city: homeTeam?.city ?? null,
    away_team_city: awayTeam?.city ?? null,
    home_team_wins: homeTeam?.wins ?? null,
    away_team_wins: awayTeam?.wins ?? null,
    home_team_losses: homeTeam?.losses ?? null,
    away_team_losses: awayTeam?.losses ?? null,
    home_member_discord: homeMember?.discordName ?? null,
    away_member_discord: awayMember?.discordName ?? null,
    home_score: game.homeScore,
    away_score: game.awayScore,
    week: game.week,
    season: game.season,
    status: game.status,
    player_stats: playerStats,
  });
});

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
