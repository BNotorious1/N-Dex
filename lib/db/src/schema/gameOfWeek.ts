import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { leaguesTable } from "./leagues";
import { teamsTable } from "./teams";

export const gameOfWeekTable = pgTable("game_of_week", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id, { onDelete: "cascade" }),
  week: integer("week").notNull(),
  season: integer("season").notNull(),
  homeTeamId: integer("home_team_id").references(() => teamsTable.id),
  awayTeamId: integer("away_team_id").references(() => teamsTable.id),
  headline: text("headline"),
  description: text("description"),
  kickoff: text("kickoff"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GameOfWeek = typeof gameOfWeekTable.$inferSelect;
