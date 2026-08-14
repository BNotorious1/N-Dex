---
name: Blaze Export API Response Format
description: Exact field names and data structure returned by Blaze FranchiseMode export endpoints for Madden 26
---

## Key Findings

All Blaze FranchiseMode_Get*Export endpoints return **flat arrays**, NOT nested objects.

### Teams: FranchiseMode_GetLeagueTeamsExport
- Response key: `leagueTeamInfoList` → flat array `[{...}, ...]`
- NOT `leagueTeamInfoList.leagueTeamInfo`
- Conference/division: `divName: "AFC North"` string (parse to extract conf/div)
- NO numeric `conference` or `division` fields in Blaze format

### Rosters: FranchiseMode_GetTeamRostersExport
- Response key: `rosterInfoList` → flat array of player objects
- NOT `rosterInfoList.playerInfoList.playerInfo`

### Schedules: FranchiseMode_GetWeeklySchedulesExport
- Response key: **`gameScheduleInfoList`** (NOT `scheduleInfoList`)
- Flat array of game objects
- Game status field: **`status`** (NOT `resultType`)
  - `status: 1` = NOT_PLAYED (SCHEDULED)
  - `status: 2` = AWAY_WIN (FINAL)
  - `status: 3` = HOME_WIN (FINAL)
  - `status: 4` = TIE (FINAL)
- Score fields: `homeScore`, `awayScore` (NOT `visitorScore`)
- Team ID fields: `homeTeamId`, `awayTeamId` (awayTeamId already handled as fallback)

### Stats (player/team stat exports)
- Pattern: `player{Type}StatInfoList` → flat array
  - e.g. `playerPassingStatInfoList`, `playerRushingStatInfoList`, `teamStatInfoList`
- **Blaze uses `pass*`/`rush*` field names, NOT `pss*`/`rsh*` abbreviations**
  - Passing: `passAtt`, `passCmp`, `passYds`, `passTDs`, `passInts`, `passSacks`, `passLng`, `passRating`
  - Rushing: `rushAtt`, `rushYds`, `rushTDs`, `rushLng`
  - TDs use capital letters: `passTDs`, `rushTDs`, `recTDs`
  - `buildStatSet` in import.ts now has `pss*`-first fallbacks to `pass*` for Blaze compatibility

**Why:** Blaze API uses flat array keyed under a single property (e.g. `gameScheduleInfoList`) 
rather than the Companion App's nested `scheduleInfoList.scheduleInfo` pattern. Code must 
handle both formats for compatibility.

**How to apply:** When adding new Blaze export types, always log the raw response first 
(first request) to confirm the actual key name before assuming a convention.
