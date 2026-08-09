import { useState, useMemo, useCallback } from "react";
import TeamLogo from "@/components/TeamLogo";
import type { StandingEntry } from "@workspace/api-client-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Game {
  id: number;
  week: number;
  season: number;
  status: string;
  home_team_id: number;
  away_team_id: number;
  home_team_name?: string | null;
  away_team_name?: string | null;
  home_team_abbreviation?: string | null;
  away_team_abbreviation?: string | null;
  home_team_color?: string | null;
  away_team_color?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  stage_index?: number | null;
}

interface TeamInfo {
  id: number;
  name: string;
  city: string;
  abbreviation: string;
  conference: string;
  division: string;
  primary_color: string;
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  points_against: number;
}

interface Props {
  games: Game[];
  standings: StandingEntry[];
}

// ─── Simulation logic ─────────────────────────────────────────────────────────

type WinnerOverride = "home" | "away"; // which side won in the override

interface TeamRecord {
  teamId: number;
  wins: number;
  losses: number;
  ties: number;
  confWins: number;
  confLosses: number;
  confTies: number;
  divWins: number;
  divLosses: number;
  divTies: number;
  pf: number;
  pa: number;
}

function computeStandings(
  games: Game[],
  overrides: Map<number, WinnerOverride>,
  teamInfoMap: Map<number, TeamInfo>,
): Map<number, TeamRecord> {
  const records = new Map<number, TeamRecord>();

  // Initialize from teamInfoMap
  for (const [id] of teamInfoMap) {
    records.set(id, {
      teamId: id, wins: 0, losses: 0, ties: 0,
      confWins: 0, confLosses: 0, confTies: 0,
      divWins: 0, divLosses: 0, divTies: 0,
      pf: 0, pa: 0,
    });
  }

  const regGames = games.filter(g => (g.stage_index == null || g.stage_index === 1) && g.week <= 18);

  for (const game of regGames) {
    const homeInfo = teamInfoMap.get(game.home_team_id);
    const awayInfo = teamInfoMap.get(game.away_team_id);
    if (!homeInfo || !awayInfo) continue;

    const override = overrides.get(game.id);
    let homeWon: boolean | null = null;
    let homePf = 0, homePa = 0, awayPf = 0, awayPa = 0;

    if (override) {
      homeWon = override === "home";
      // Use original scores as approximation for points
      homePf = game.home_score ?? 21;
      homePa = game.away_score ?? 21;
      awayPf = game.away_score ?? 21;
      awayPa = game.home_score ?? 21;
      // Flip scores conceptually if override differs
      if (override === "home" && (game.home_score ?? 0) < (game.away_score ?? 0)) {
        // Override says home won but score says away — swap scores for sim
        homePf = game.away_score ?? 21;
        homePa = game.home_score ?? 21;
        awayPf = game.home_score ?? 21;
        awayPa = game.away_score ?? 21;
      } else if (override === "away" && (game.away_score ?? 0) < (game.home_score ?? 0)) {
        homePf = game.away_score ?? 21;
        homePa = game.home_score ?? 21;
        awayPf = game.home_score ?? 21;
        awayPa = game.away_score ?? 21;
      }
    } else if (game.status === "FINAL" && game.home_score != null && game.away_score != null) {
      homeWon = game.home_score > game.away_score ? true : game.home_score < game.away_score ? false : null;
      homePf = game.home_score;
      homePa = game.away_score;
      awayPf = game.away_score;
      awayPa = game.home_score;
    } else {
      continue; // unplayed, no override
    }

    const sameConf = homeInfo.conference === awayInfo.conference;
    const sameDiv  = sameConf && homeInfo.division === awayInfo.division;

    const homeRec = records.get(game.home_team_id)!;
    const awayRec = records.get(game.away_team_id)!;

    homeRec.pf += homePf; homeRec.pa += homePa;
    awayRec.pf += awayPf; awayRec.pa += awayPa;

    if (homeWon === true) {
      homeRec.wins++; awayRec.losses++;
      if (sameConf) { homeRec.confWins++; awayRec.confLosses++; }
      if (sameDiv)  { homeRec.divWins++;  awayRec.divLosses++;  }
    } else if (homeWon === false) {
      homeRec.losses++; awayRec.wins++;
      if (sameConf) { homeRec.confLosses++; awayRec.confWins++; }
      if (sameDiv)  { homeRec.divLosses++;  awayRec.divWins++;  }
    } else {
      homeRec.ties++; awayRec.ties++;
      if (sameConf) { homeRec.confTies++; awayRec.confTies++; }
      if (sameDiv)  { homeRec.divTies++;  awayRec.divTies++;  }
    }
  }
  return records;
}

function winPct(r: TeamRecord) {
  const gp = r.wins + r.losses + r.ties;
  return gp === 0 ? 0 : (r.wins + r.ties * 0.5) / gp;
}

function confWinPct(r: TeamRecord) {
  const gp = r.confWins + r.confLosses + r.confTies;
  return gp === 0 ? 0 : (r.confWins + r.confTies * 0.5) / gp;
}

function divWinPct(r: TeamRecord) {
  const gp = r.divWins + r.divLosses + r.divTies;
  return gp === 0 ? 0 : (r.divWins + r.divTies * 0.5) / gp;
}

function sortTeams(teams: TeamRecord[]): TeamRecord[] {
  return [...teams].sort((a, b) => {
    const pd = winPct(b) - winPct(a);
    if (Math.abs(pd) > 0.001) return pd;
    const cd = confWinPct(b) - confWinPct(a);
    if (Math.abs(cd) > 0.001) return cd;
    const dd = divWinPct(b) - divWinPct(a);
    if (Math.abs(dd) > 0.001) return dd;
    const pfDiff = (b.pf - b.pa) - (a.pf - a.pa);
    if (pfDiff !== 0) return pfDiff;
    return b.pf - a.pf;
  });
}

interface PlayoffSeed {
  seed: number;
  teamId: number;
  isDivWinner: boolean;
}

function computePlayoffSeeds(
  conference: string,
  records: Map<number, TeamRecord>,
  teamInfoMap: Map<number, TeamInfo>,
): PlayoffSeed[] {
  const confTeams = [...records.values()].filter(r => {
    const info = teamInfoMap.get(r.teamId);
    return info?.conference === conference;
  });

  // Group by division
  const divisions = new Map<string, TeamRecord[]>();
  for (const r of confTeams) {
    const div = teamInfoMap.get(r.teamId)?.division ?? "Unknown";
    if (!divisions.has(div)) divisions.set(div, []);
    divisions.get(div)!.push(r);
  }

  // Division winners
  const divWinners: TeamRecord[] = [];
  for (const [, divTeams] of divisions) {
    const sorted = sortTeams(divTeams);
    if (sorted.length > 0) divWinners.push(sorted[0]!);
  }

  // Sort div winners by record
  const sortedDivWinners = sortTeams(divWinners);

  // Wild cards: all conference teams excluding div winners, sorted, top 3
  const divWinnerIds = new Set(divWinners.map(t => t.teamId));
  const wcCandidates = sortTeams(confTeams.filter(r => !divWinnerIds.has(r.teamId)));
  const wildCards = wcCandidates.slice(0, 3);

  const seeds: PlayoffSeed[] = [];
  sortedDivWinners.forEach((t, i) => seeds.push({ seed: i + 1, teamId: t.teamId, isDivWinner: true }));
  wildCards.forEach((t, i) => seeds.push({ seed: divWinners.length + 1 + i, teamId: t.teamId, isDivWinner: false }));
  return seeds;
}

// ─── UI Components ────────────────────────────────────────────────────────────

function RecordStr(r: TeamRecord) {
  return r.ties > 0 ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`;
}

function confRecStr(r: TeamRecord) {
  return r.confTies > 0
    ? `${r.confWins}-${r.confLosses}-${r.confTies}`
    : `${r.confWins}-${r.confLosses}`;
}

function divRecStr(r: TeamRecord) {
  return r.divTies > 0
    ? `${r.divWins}-${r.divLosses}-${r.divTies}`
    : `${r.divWins}-${r.divLosses}`;
}

function pdStr(r: TeamRecord) {
  const d = r.pf - r.pa;
  return `${d >= 0 ? "+" : ""}${d}`;
}

/** Returns the label of the first criterion that separates winner from loser
 *  (assumes they share the same overall win%). */
function tiebreakerLabel(a: TeamRecord, b: TeamRecord): { criterion: string; aVal: string; bVal: string } {
  if (Math.abs(confWinPct(a) - confWinPct(b)) > 0.001)
    return { criterion: "Conf. record", aVal: confRecStr(a), bVal: confRecStr(b) };
  if (Math.abs(divWinPct(a) - divWinPct(b)) > 0.001)
    return { criterion: "Div. record", aVal: divRecStr(a), bVal: divRecStr(b) };
  if ((a.pf - a.pa) !== (b.pf - b.pa))
    return { criterion: "Point diff", aVal: pdStr(a), bVal: pdStr(b) };
  return { criterion: "Points for", aVal: String(a.pf), bVal: String(b.pf) };
}

function tiedBuckets(sorted: TeamRecord[]): TeamRecord[][] {
  const out: TeamRecord[][] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && Math.abs(winPct(last[0]!) - winPct(r)) < 0.001) last.push(r);
    else out.push([r]);
  }
  return out;
}

function TiebreakerGroup({
  label,
  group,
  seededIds,
  teamInfoMap,
}: {
  label: string;
  group: TeamRecord[];
  seededIds: Set<number>;
  teamInfoMap: Map<number, TeamInfo>;
}) {
  const record = RecordStr(group[0]!);
  const count = group.length;
  return (
    <div className="space-y-1.5">
      <p className="font-black uppercase tracking-widest text-white/25 flex items-center gap-1.5 text-[12px]">
        {count > 2 ? `${count}-way tie` : "Tied"}
        <span className="text-white/15">·</span>
        <span className="tabular-nums [font-family:'Lora',serif]">{record}</span>
        <span className="text-white/15">·</span>
        <span className="normal-case tracking-normal font-medium text-white/30">{label}</span>
      </p>
      {group.slice(0, -1).map((a, i) => {
        const b = group[i + 1]!;
        const aInfo = teamInfoMap.get(a.teamId);
        const bInfo = teamInfoMap.get(b.teamId);
        if (!aInfo || !bInfo) return null;
        const lbl = tiebreakerLabel(a, b);
        const aIn = seededIds.has(a.teamId);
        const bIn = seededIds.has(b.teamId);
        return (
          <div key={`${a.teamId}-${b.teamId}`} className="space-y-0.5">
            <div className="flex items-center gap-1">
              <TeamLogo abbreviation={aInfo.abbreviation} primaryColor={aInfo.primary_color} size="xs" shape="circle" />
              <span className="font-bold text-white text-[12px]">{aInfo.abbreviation}</span>
              {!aIn && <span className="text-[7px] text-white/25 uppercase">out</span>}
              <span className="text-[8px] text-white/25 mx-0.5">›</span>
              <TeamLogo abbreviation={bInfo.abbreviation} primaryColor={bInfo.primary_color} size="xs" shape="circle" />
              <span className="font-bold text-white/55 text-[12px]">{bInfo.abbreviation}</span>
              {!bIn && <span className="text-[7px] text-white/25 uppercase">out</span>}
            </div>
            <p className="text-white/35 pl-0.5 text-[12px]">
              <span className="text-white/50 font-semibold">{lbl.criterion}:</span>{" "}
              <span className="text-white/80 tabular-nums [font-family:'Lora',serif]">{lbl.aVal}</span>
              <span className="text-white/25"> vs </span>
              <span className="tabular-nums [font-family:'Lora',serif]">{lbl.bVal}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}

function TiebreakerExplainer({
  conference,
  seeds,
  records,
  teamInfoMap,
}: {
  conference: string;
  seeds: PlayoffSeed[];
  records: Map<number, TeamRecord>;
  teamInfoMap: Map<number, TeamInfo>;
}) {
  const seededIds = new Set(seeds.map(s => s.teamId));
  const divWinnerIds = new Set(seeds.filter(s => s.isDivWinner).map(s => s.teamId));

  // ── 1. Divisional tiebreakers ──────────────────────────────────────────────
  // Per division: if 2+ teams are tied for the top spot, one won by tiebreaker
  const divMap = new Map<string, TeamRecord[]>();
  for (const r of records.values()) {
    const info = teamInfoMap.get(r.teamId);
    if (!info || info.conference !== conference) continue;
    const d = info.division;
    if (!divMap.has(d)) divMap.set(d, []);
    divMap.get(d)!.push(r);
  }
  const divTies: Array<{ divLabel: string; group: TeamRecord[] }> = [];
  for (const [div, teams] of divMap) {
    const sorted = sortTeams(teams);
    if (sorted.length < 2) continue;
    const topPct = winPct(sorted[0]!);
    const tied = sorted.filter(r => Math.abs(winPct(r) - topPct) < 0.001);
    if (tied.length >= 2) {
      // e.g. "AFC South" → "South"
      const short = div.replace(/^(AFC|NFC)\s+/, "");
      divTies.push({ divLabel: `${short} div`, group: tied });
    }
  }

  // ── 2. Div-winner seeding tiebreakers ──────────────────────────────────────
  // Among the 4 div winners, adjacent seeds with same record
  const divWinnerRecords = seeds
    .filter(s => s.isDivWinner)
    .map(s => records.get(s.teamId))
    .filter(Boolean) as TeamRecord[];
  const divWinnerSeedingTies: TeamRecord[][] = tiedBuckets(divWinnerRecords).filter(g => g.length >= 2);

  // ── 3. Wild-card tiebreakers ───────────────────────────────────────────────
  // Among non-div-winner conf teams; only buckets that fall within or span the WC bubble (spots 1–4)
  const wcSorted = sortTeams(
    [...records.values()].filter(r => teamInfoMap.get(r.teamId)?.conference === conference && !divWinnerIds.has(r.teamId))
  );
  const wcAllBuckets = tiedBuckets(wcSorted);
  const wcTies: TeamRecord[][] = [];
  let seen = 0;
  for (const bucket of wcAllBuckets) {
    if (seen >= 4) break; // past the bubble
    if (bucket.length >= 2) wcTies.push(bucket);
    seen += bucket.length;
  }

  const hasAny = divTies.length > 0 || divWinnerSeedingTies.length > 0 || wcTies.length > 0;
  if (!hasAny) return null;

  return (
    <div className="mx-1.5 mb-2 rounded-lg border border-white/6 bg-white/[0.015] p-2.5 space-y-3">
      <p className="font-black uppercase tracking-widest text-white/30 text-center text-[12px]">Tiebreakers</p>
      {divTies.map(({ divLabel, group }) => (
        <TiebreakerGroup key={divLabel} label={divLabel} group={group} seededIds={seededIds} teamInfoMap={teamInfoMap} />
      ))}
      {divWinnerSeedingTies.map((group, i) => (
        <TiebreakerGroup key={`dw-${i}`} label="div winner seeding" group={group} seededIds={seededIds} teamInfoMap={teamInfoMap} />
      ))}
      {wcTies.map((group, i) => {
        const hasBubble = group.some(r => !seededIds.has(r.teamId));
        return (
          <TiebreakerGroup key={`wc-${i}`} label={hasBubble ? "wild card bubble" : "wild card seeding"} group={group} seededIds={seededIds} teamInfoMap={teamInfoMap} />
        );
      })}
    </div>
  );
}

function SeedCard({
  seed, teamId, isDivWinner, records, teamInfoMap, isModified,
}: {
  seed: number;
  teamId: number;
  isDivWinner: boolean;
  records: Map<number, TeamRecord>;
  teamInfoMap: Map<number, TeamInfo>;
  isModified: boolean;
}) {
  const info = teamInfoMap.get(teamId);
  const rec = records.get(teamId);
  if (!info || !rec) return null;
  return (
    <div
      className={`flex items-center gap-2 rounded px-2 py-1.5 border transition-all ${
        isDivWinner ? "border-amber-500/30 bg-amber-500/5" : "border-white/8 bg-white/3"
      } ${isModified ? "ring-1 ring-[#00C8FF]/30" : ""}`}
    >
      <span className="w-4 text-center font-black tabular-nums shrink-0 text-[16px] text-[#ffffff]">{seed}</span>
      <TeamLogo abbreviation={info.abbreviation} primaryColor={info.primary_color ?? "#555"} size="lg" shape="circle" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-bold text-white truncate text-[16px]">{info.name}</span>
          {isDivWinner && (
            <span className="font-black text-amber-400 uppercase tracking-wider shrink-0 text-[10px]">DIV</span>
          )}
        </div>
        <span className="text-white/40 tabular-nums [font-family:'Lora',serif] text-[12px]">{RecordStr(rec)}</span>
      </div>
    </div>
  );
}

function ConferenceBracket({
  conference, seeds, records, teamInfoMap, modifiedTeamIds, color,
}: {
  conference: string;
  seeds: PlayoffSeed[];
  records: Map<number, TeamRecord>;
  teamInfoMap: Map<number, TeamInfo>;
  modifiedTeamIds: Set<number>;
  color: string;
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
      <div className="px-3 py-2" style={{ backgroundColor: color }}>
        <span className="font-black uppercase tracking-widest text-white text-left text-[16px]">{conference}</span>
      </div>
      <div className="p-1.5 space-y-1">
        {seeds.length === 0 ? (
          <p className="py-4 text-center text-xs text-white/25">No data</p>
        ) : (
          seeds.map(s => (
            <SeedCard
              key={s.teamId}
              seed={s.seed}
              teamId={s.teamId}
              isDivWinner={s.isDivWinner}
              records={records}
              teamInfoMap={teamInfoMap}
              isModified={modifiedTeamIds.has(s.teamId)}
            />
          ))
        )}
      </div>
      <div className="px-2 pb-1">
        <div className="border-t border-white/8 pt-1.5 space-y-0.5">
          {(() => {
            const seededIds = new Set(seeds.map(s => s.teamId));
            const confTeams = [...records.values()]
              .filter(r => teamInfoMap.get(r.teamId)?.conference === conference && !seededIds.has(r.teamId));
            return sortTeams(confTeams).slice(0, 3).map(r => {
              const info = teamInfoMap.get(r.teamId);
              if (!info) return null;
              return (
                <div key={r.teamId} className="flex items-center gap-1.5 px-1 py-0.5 opacity-35">
                  <TeamLogo abbreviation={info.abbreviation} primaryColor={info.primary_color} size="sm" shape="circle" />
                  <span className="flex-1 truncate text-[12px] text-[#ffffff]">{info.abbreviation}</span>
                  <span className="tabular-nums [font-family:'Lora',serif] text-[12px] text-[#ffffff]">{RecordStr(r)}</span>
                </div>
              );
            });
          })()}
        </div>
      </div>
      <TiebreakerExplainer
        conference={conference}
        seeds={seeds}
        records={records}
        teamInfoMap={teamInfoMap}
      />
    </div>
  );
}

function GameToggle({
  game,
  override,
  onOverride,
  teamInfoMap,
}: {
  game: Game;
  override: WinnerOverride | undefined;
  onOverride: (gameId: number, side: WinnerOverride | null) => void;
  teamInfoMap: Map<number, TeamInfo>;
}) {
  const homeInfo = teamInfoMap.get(game.home_team_id);
  const awayInfo = teamInfoMap.get(game.away_team_id);

  // Determine "original" winner from score
  let originalWinner: WinnerOverride | null = null;
  if (game.status === "FINAL" && game.home_score != null && game.away_score != null) {
    if (game.home_score > game.away_score) originalWinner = "home";
    else if (game.away_score > game.home_score) originalWinner = "away";
  }

  const effectiveWinner = override ?? originalWinner;
  const isModified = override != null;

  const homeWon = effectiveWinner === "home";
  const awayWon = effectiveWinner === "away";

  function handleClick(side: WinnerOverride) {
    if (override === side) {
      // Clicking the already-overridden side resets to original
      onOverride(game.id, null);
    } else if (originalWinner === side && !override) {
      // Already the original winner — set override to other side
      onOverride(game.id, side === "home" ? "away" : "home");
    } else {
      onOverride(game.id, side);
    }
  }

  return (
    <div className={`rounded border transition-all ${isModified ? "border-[#00C8FF]/30 bg-[#00C8FF]/4" : "border-white/6 bg-white/[0.02]"}`}>
      <div className="flex items-stretch overflow-hidden rounded">
        {/* Away team */}
        <button
          onClick={() => handleClick("away")}
          className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 transition-all text-left hover:bg-white/5 ${awayWon ? "opacity-100" : "opacity-35"}`}
        >
          <TeamLogo
            abbreviation={awayInfo?.abbreviation ?? "?"}
            primaryColor={awayInfo?.primary_color ?? "#555"}
            size="lg"
            shape="circle"
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate text-white/60 text-[14px]">
              {awayInfo?.abbreviation ?? "?"}
            </p>
            {game.status === "FINAL" && game.away_score != null && (
              <p className="tabular-nums [font-family:'Lora',serif] text-white/30 text-[12px]">
                {game.away_score}
              </p>
            )}
          </div>
          {awayWon && <div className="w-1 h-1 rounded-full bg-white/50 shrink-0" />}
        </button>

        {/* Center */}
        <div className="flex flex-col items-center justify-center px-1.5 shrink-0">
          <span className="font-bold text-white/15 uppercase text-[12px]">@</span>
          {isModified && (
            <span className="text-[6px] font-black text-[#00C8FF] uppercase tracking-wider">MOD</span>
          )}
        </div>

        {/* Home team */}
        <button
          onClick={() => handleClick("home")}
          className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 transition-all flex-row-reverse hover:bg-white/5 ${homeWon ? "opacity-100" : "opacity-35"}`}
        >
          <TeamLogo
            abbreviation={homeInfo?.abbreviation ?? "?"}
            primaryColor={homeInfo?.primary_color ?? "#555"}
            size="lg"
            shape="circle"
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate text-right text-white text-[14px]">
              {homeInfo?.abbreviation ?? "?"}
            </p>
            {game.status === "FINAL" && game.home_score != null && (
              <p className="tabular-nums [font-family:'Lora',serif] text-right text-white/80 text-[12px]">
                {game.home_score}
              </p>
            )}
          </div>
          {homeWon && <div className="w-1 h-1 rounded-full bg-white/50 shrink-0" />}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PlayoffMachineSection({ games, standings }: Props) {
  const [overrides, setOverrides] = useState<Map<number, WinnerOverride>>(new Map());
  const [selectedWeek, setSelectedWeek] = useState<number>(11);

  // Build teamInfoMap from standings
  const teamInfoMap = useMemo(() => {
    const m = new Map<number, TeamInfo>();
    for (const s of standings) {
      m.set(s.team.id, {
        id: s.team.id,
        name: s.team.name,
        city: s.team.city ?? "",
        abbreviation: s.team.abbreviation ?? "",
        conference: s.conference,
        division: s.division,
        primary_color: s.team.primary_color ?? "#555",
        wins: s.wins,
        losses: s.losses,
        ties: s.ties,
        points_for: s.points_for ?? 0,
        points_against: s.points_against ?? 0,
      });
    }
    return m;
  }, [standings]);

  // Only regular season games
  const regularGames = useMemo(() =>
    games.filter(g => (g.stage_index == null || g.stage_index === 1) && g.week <= 18)
      .sort((a, b) => a.week - b.week || a.id - b.id),
    [games]
  );

  const weeks = useMemo(() =>
    [...new Set(regularGames.map(g => g.week))].filter(w => w >= 11).sort((a, b) => a - b),
    [regularGames]
  );

  const displayedGames = useMemo(() =>
    regularGames.filter(g => g.week === selectedWeek),
    [regularGames, selectedWeek]
  );

  const handleOverride = useCallback((gameId: number, side: WinnerOverride | null) => {
    setOverrides(prev => {
      const next = new Map(prev);
      if (side === null) next.delete(gameId);
      else next.set(gameId, side);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => setOverrides(new Map()), []);

  // Compute simulated standings
  const simRecords = useMemo(() =>
    computeStandings(regularGames, overrides, teamInfoMap),
    [regularGames, overrides, teamInfoMap]
  );

  // Compute playoff seeds
  const afcSeeds = useMemo(() => computePlayoffSeeds("AFC", simRecords, teamInfoMap), [simRecords, teamInfoMap]);
  const nfcSeeds = useMemo(() => computePlayoffSeeds("NFC", simRecords, teamInfoMap), [simRecords, teamInfoMap]);

  // Track which teams have changed positions due to overrides
  const modifiedTeamIds = useMemo(() => {
    if (overrides.size === 0) return new Set<number>();
    const modified = new Set<number>();
    for (const gameId of overrides.keys()) {
      const game = games.find(g => g.id === gameId);
      if (game) { modified.add(game.home_team_id); modified.add(game.away_team_id); }
    }
    return modified;
  }, [overrides, games]);

  // Group displayed games by week for rendering
  const groupedGames = useMemo(() => {
    const m = new Map<number, Game[]>();
    for (const g of displayedGames) {
      if (!m.has(g.week)) m.set(g.week, []);
      m.get(g.week)!.push(g);
    }
    return [...m.entries()].sort(([a], [b]) => a - b);
  }, [displayedGames]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black text-white tracking-tight">Playoff Machine</h2>
          <p className="text-[11px] text-white/35 mt-0.5">
            Click any team to flip the result — the playoff picture updates live.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {overrides.size > 0 && (
            <span className="text-[11px] font-bold text-[#00C8FF] bg-[#00C8FF]/10 border border-[#00C8FF]/20 rounded-full px-2.5 py-0.5">
              {overrides.size} change{overrides.size !== 1 ? "s" : ""}
            </span>
          )}
          <button
            onClick={resetAll}
            disabled={overrides.size === 0}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-white/12 text-white/50 hover:text-white hover:border-white/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Reset All
          </button>
        </div>
      </div>

      {/* Week selector */}
      <div className="flex gap-1 flex-wrap">
        {weeks.map(w => {
          const hasChanges = regularGames.filter(g => g.week === w).some(g => overrides.has(g.id));
          return (
            <button
              key={w}
              onClick={() => setSelectedWeek(w)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors border relative ${
                selectedWeek === w
                  ? "bg-[#00C8FF] text-[#0a0a0a] border-transparent"
                  : "border-white/10 text-white/40 hover:text-white/70"
              }`}
            >
              {w <= 18 ? `WK ${w}` : w === 19 ? "WC" : w === 20 ? "DIV" : w === 21 ? "CONF" : "SB"}
              {hasChanges && selectedWeek !== w && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#00C8FF]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Three-column layout: AFC | Games | NFC */}
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 items-start">
        {/* AFC */}
        <ConferenceBracket
          conference="AFC"
          seeds={afcSeeds}
          records={simRecords}
          teamInfoMap={teamInfoMap}
          modifiedTeamIds={modifiedTeamIds}
          color="#C8102E"
        />

        {/* Games */}
        <div className="space-y-1">
          {groupedGames.length === 0 ? (
            <div className="rounded border border-white/8 py-10 text-center text-white/25 text-xs">
              No games to display.
            </div>
          ) : (
            groupedGames.flatMap(([, wGames]) =>
              wGames.map(g => (
                <GameToggle
                  key={g.id}
                  game={g}
                  override={overrides.get(g.id)}
                  onOverride={handleOverride}
                  teamInfoMap={teamInfoMap}
                />
              ))
            )
          )}
        </div>

        {/* NFC */}
        <ConferenceBracket
          conference="NFC"
          seeds={nfcSeeds}
          records={simRecords}
          teamInfoMap={teamInfoMap}
          modifiedTeamIds={modifiedTeamIds}
          color="#013369"
        />
      </div>
    </div>
  );
}
