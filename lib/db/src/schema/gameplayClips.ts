import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { leaguesTable } from "./leagues";
import { teamsTable } from "./teams";

export const gameplayClipsTable = pgTable("gameplay_clips", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id, { onDelete: "cascade" }),
  teamId: integer("team_id").references(() => teamsTable.id, { onDelete: "set null" }),
  uploadedByDiscordName: text("uploaded_by_discord_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  objectPath: text("object_path").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGameplayClipSchema = createInsertSchema(gameplayClipsTable).omit({ id: true, createdAt: true });
export type InsertGameplayClip = z.infer<typeof insertGameplayClipSchema>;
export type GameplayClip = typeof gameplayClipsTable.$inferSelect;
