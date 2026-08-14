---
name: EA import architecture
description: How Blaze pull imports and Companion App push imports share the same core upsert functions
---

## Key insight
The Blaze export API (`/wal/mca/FranchiseMode_Get*Export`) and the Madden Companion App push both deliver data in the **same JSON shape**. This means one set of upsert functions covers both paths.

## Core functions (exported from `artifacts/api-server/src/routes/import.ts`)
- `upsertLeagueTeams(leagueId, teams[])` — upserts from `leagueTeamInfoList.leagueTeamInfo[]`
- `upsertTeamRoster(leagueId, eaTeamId, players[])` — upserts from `rosterInfoList.playerInfoList.playerInfo[]`
- `upsertStandings(leagueId, standings[])` — upserts from `teamStandingInfoList.teamStandingInfo[]`
- `upsertWeekSchedule(leagueId, games[], season, weekIndex?, stageIndex?)` — upserts from `scheduleInfoList.scheduleInfo[]`

## Blaze pull (ea.ts)
Each `import-*` route calls `blazeExport(...)`, extracts the array from the nested response, then calls the exported upsert function.

## Companion App push (import.ts)
Routes at `POST /api/import/:leagueId/:platform/:eaLeagueId/leagueTeams` etc. receive push body, extract arrays, call same upsert functions.

## Data format (Blaze and Companion App identical)
- Teams: `{ leagueTeamInfoList: { leagueTeamInfo: [...] } }`
  - Fields: `teamId`, `cityName`, `nickName`/`teamName`, `abbrName`, `conference` (0=AFC,1=NFC), `division` (0=East,1=West,2=North,3=South), `wins`, `losses`, `ties`, `ovrRating`, `primaryColor`, `secondaryColor`
- Rosters (per team): `{ rosterInfoList: { playerInfoList: { playerInfo: [...] } } }`
  - Fields: `rosterId`, `firstName`, `lastName`, `position`, `playerBestOvr`, `age`, `speedRating`, `strengthRating`, `awareRating`, `devTrait`, `throwPowerRating`, `catchRating`, `tackleRating`, `presentationId`, `birthYear`, `birthMonth`, `birthDay`, `accelRating`, `agilityRating`
- Schedules: `{ scheduleInfoList: { scheduleInfo: [...] } }`
  - Fields: `homeTeamId`, `visitorTeamId`, `homeScore`, `visitorScore`, `resultType` (1=NOT_PLAYED, 2=AWAY_WIN, 3=HOME_WIN, 4=TIE), `weekIndex`, `stageIndex`
- Standings: `{ teamStandingInfoList: { teamStandingInfo: [...] } }`
  - Fields: `teamId`, `wins`, `losses`, `ties`

## Schema additions (migration applied)
- `players`: added `devTrait`, `eaPlayerId`, `presentationId`, `birthYear`, `birthMonth`, `birthDay`, `acceleration`, `agility`
- `games`: added `weekIndex`, `stageIndex`, `eaGameId`

**Why:** Rebuild libs with `pnpm run typecheck:libs` after schema changes or new DB fields won't appear in types.
