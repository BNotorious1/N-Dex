---
name: Fractional stats in integer columns
description: Blaze API returns fractional values for sacks/TFLs; Drizzle/pg rejects them for integer columns; fix is Math.round() in num() helper.
---

## Rule
Always round stat values to integers before inserting into the `player_game_stats` table. Use `Math.round()` in the `num()` helper in `import.ts`.

**Why:** The Blaze API returns fractional values for defensive sacks and tackles-for-loss (e.g., `defSacks: 0.5`, `defTfl: 1.5`) because NFL stats track half-sacks. Drizzle ORM serializes JavaScript floats as the string `"0.5"` when binding parameters for `integer()` columns, and PostgreSQL rejects the cast with `invalid input syntax for type integer: "0.5"`. This causes the ENTIRE batch INSERT to fail silently — the error is swallowed by the try-catch in the per-stat-type loop, which logs via `req.log.warn` but that log message gets buried inside the serialized error object (thousands of lines of SQL params), making it look like the import succeeded when it didn't.

**How to apply:** The `num()` helper in `artifacts/api-server/src/routes/import.ts` is the central point where all stat values are coerced — adding `Math.round()` there fixes all current and future fractional stat fields. Any future `real`/`doublePrecision` stat columns would need a different coercion path.

**Detection pattern:** If defense or punting stats show 0 rows in DB after a successful import, look for `invalid input syntax for type integer` errors buried in the pino-http request log (they appear as a giant multi-thousand-line log entry with SQL params).
