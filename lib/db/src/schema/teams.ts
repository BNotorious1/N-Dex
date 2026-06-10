import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { leaguesTable } from "./leagues";

export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  city: text("city").notNull(),
  abbreviation: text("abbreviation").notNull(),
  conference: text("conference").notNull().default("AFC"),
  division: text("division").notNull().default("North"),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  ties: integer("ties").notNull().default(0),
  overallRating: integer("overall_rating").notNull().default(75),
  isUserTeam: boolean("is_user_team").notNull().default(false),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  eaTeamId: integer("ea_team_id"),
});

export const insertTeamSchema = createInsertSchema(teamsTable).omit({ id: true });
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teamsTable.$inferSelect;
