import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { leaguesTable } from "./leagues";
import { teamsTable } from "./teams";

export const membersTable = pgTable("members", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id, { onDelete: "cascade" }),
  teamId: integer("team_id").references(() => teamsTable.id, { onDelete: "set null" }),
  discordName: text("discord_name").notNull(),
  gamerTag: text("gamer_tag"),
  permissions: integer("permissions").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Member = typeof membersTable.$inferSelect;
