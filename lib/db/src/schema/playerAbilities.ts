import { pgTable, serial, integer, text, boolean } from "drizzle-orm/pg-core";
import { playersTable } from "./players";

export const playerAbilitiesTable = pgTable("player_abilities", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  slotIndex: integer("slot_index").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  activationDescription: text("activation_description"),
  deactivationDescription: text("deactivation_description"),
  isPassive: boolean("is_passive").notNull().default(false),
  logoId: integer("logo_id"),
  ovrThreshold: integer("ovr_threshold"),
});

export type PlayerAbility = typeof playerAbilitiesTable.$inferSelect;
