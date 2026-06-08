import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { leaguesTable } from "./leagues";
import { teamsTable } from "./teams";

export const gamesTable = pgTable("games", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id, { onDelete: "cascade" }),
  homeTeamId: integer("home_team_id").notNull().references(() => teamsTable.id),
  awayTeamId: integer("away_team_id").notNull().references(() => teamsTable.id),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  week: integer("week").notNull().default(1),
  season: integer("season").notNull().default(2025),
  status: text("status").notNull().default("SCHEDULED"),
});

export const insertGameSchema = createInsertSchema(gamesTable).omit({ id: true });
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof gamesTable.$inferSelect;
