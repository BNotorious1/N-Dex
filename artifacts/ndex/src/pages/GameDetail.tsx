import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "wouter";
import {
  useGetGame,
  useGetLeagueSummary,
  getGetGameQueryKey,
  getGetLeagueSummaryQueryKey,
} from "@workspace/api-client-react";
import type { GamePlayerStat } from "@workspace/api-client-react";
import Navbar from "@/components/Navbar";
import LeagueSidebar from "@/components/league/LeagueSidebar";
import TeamLogo from "@/components/TeamLogo";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatTab = "recap" | "team" | "passing" | "rushing" | "receiving" | "defense" | "special";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Final",
  FINAL: "Final",
  IN_PROGRESS: "Live",
  SCHEDULED: "Scheduled",
};

function isGameCompleted(status: string): boolean {
  return status === "COMPLETED" || status === "FINAL";
}

function hasPassingStats(p: GamePlayerStat): boolean {
  return (
    (p.pss_att ?? 0) > 0 || (p.pss_yds ?? 0) > 0 ||
    (p.pss_tds ?? 0) > 0 || (p.pss_ints ?? 0) > 0 ||
    (p.pss_rating ?? 0) > 0
  );
}
function hasRushingStats(p: GamePlayerStat): boolean {
  return (p.rsh_att ?? 0) > 0 || (p.rsh_yds ?? 0) > 0 || (p.rsh_tds ?? 0) > 0;
}
function hasReceivingStats(p: GamePlayerStat): boolean {
  return (p.rec_catches ?? 0) > 0 || (p.rec_tgts ?? 0) > 0 || (p.rec_yds ?? 0) > 0;
}
function hasDefenseStats(p: GamePlayerStat): boolean {
  return (
    (p.def_total_tackles ?? 0) > 0 ||
    (p.def_sacks ?? 0) > 0 ||
    (p.def_ints ?? 0) > 0 ||
    (p.def_pd ?? 0) > 0 ||
    (p.def_ff ?? 0) > 0 ||
    (p.def_tds ?? 0) > 0
  );
}

interface TeamStats {
  passYds: number;
  passCmp: number;
  passAtt: number;
  passTds: number;
  passInts: number;
  sacks: number;
  rushYds: number;
  rushAtt: number;
  rushTds: number;
  totalYds: number;
  turnovers: number;
  fmbLost: number;
  defSacks: number;
  defInts: number;
  fgMade: number;
  fgAtt: number;
}

function computeTeamStats(players: GamePlayerStat[]): TeamStats {
  return {
    passYds:   players.reduce((s, p) => s + (p.pss_yds ?? 0), 0),
    passCmp:   players.reduce((s, p) => s + (p.pss_cmp ?? 0), 0),
    passAtt:   players.reduce((s, p) => s + (p.pss_att ?? 0), 0),
    passTds:   players.reduce((s, p) => s + (p.pss_tds ?? 0), 0),
    passInts:  players.reduce((s, p) => s + (p.pss_ints ?? 0), 0),
    sacks:     players.reduce((s, p) => s + (p.pss_sacks ?? 0), 0),
    rushYds:   players.reduce((s, p) => s + (p.rsh_yds ?? 0), 0),
    rushAtt:   players.reduce((s, p) => s + (p.rsh_att ?? 0), 0),
    rushTds:   players.reduce((s, p) => s + (p.rsh_tds ?? 0), 0),
    totalYds:  players.reduce((s, p) => s + (p.pss_yds ?? 0) + (p.rsh_yds ?? 0), 0),
    fmbLost:   players.reduce((s, p) => s + (p.fmb_lost ?? 0), 0),
    turnovers: players.reduce((s, p) => s + (p.pss_ints ?? 0) + (p.fmb_lost ?? 0), 0),
    defSacks:  players.reduce((s, p) => s + (p.def_sacks ?? 0), 0),
    defInts:   players.reduce((s, p) => s + (p.def_ints ?? 0), 0),
    fgMade:    players.reduce((s, p) => s + (p.fg_made ?? 0), 0),
    fgAtt:     players.reduce((s, p) => s + (p.fg_att ?? 0), 0),
  };
}

// ─── Team Stats Tab ──────────────────────────────────────────────────────────

interface CompareRowProps {
  label: string;
  awayVal: string;
  homeVal: string;
  awayRaw: number;
  homeRaw: number;
  awayColor: string;
  homeColor: string;
  lowerIsBetter?: boolean;
}

function CompareRow({ label, awayVal, homeVal, awayRaw, homeRaw, lowerIsBetter }: CompareRowProps) {
  const awayWins = lowerIsBetter ? awayRaw < homeRaw : awayRaw > homeRaw;
  const homeWins = lowerIsBetter ? homeRaw < awayRaw : homeRaw > awayRaw;

  return (
    <div className="flex items-center py-3 border-b border-white/5 last:border-0">
      <div className="flex-1 flex justify-end pr-4">
        <span className={`[font-family:'Lora',serif] text-[15px] tabular-nums ${awayWins ? "text-white font-bold" : "text-white/45"}`}>
          {awayVal}
        </span>
      </div>
      <div className="w-36 text-center shrink-0">
        <p className="text-[10px] font-black uppercase tracking-wider text-white/35">{label}</p>
      </div>
      <div className="flex-1 flex justify-start pl-4">
        <span className={`[font-family:'Lora',serif] text-[15px] tabular-nums ${homeWins ? "text-white font-bold" : "text-white/45"}`}>
          {homeVal}
        </span>
      </div>
    </div>
  );
}

interface TeamStatsTabProps {
  awayStats: TeamStats;
  homeStats: TeamStats;
  awayColor: string;
  homeColor: string;
  awayAbbr: string;
  homeAbbr: string;
  awayName: string;
  homeName: string;
}

function TeamStatsTab({ awayStats, homeStats, awayColor, homeColor, awayAbbr, homeAbbr, awayName, homeName }: TeamStatsTabProps) {
  const noStats =
    awayStats.passAtt + homeStats.passAtt +
    awayStats.passTds + homeStats.passTds +
    awayStats.rushAtt + homeStats.rushAtt +
    awayStats.rushTds + homeStats.rushTds +
    awayStats.fgAtt + homeStats.fgAtt === 0;

  if (noStats) {
    return <p className="text-center text-white/25 text-xs py-12">No team stats recorded</p>;
  }

  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      {/* Header */}
      <div className="flex items-center border-b border-white/8">
        <div
          className="flex-1 flex items-center gap-2 px-5 py-3 justify-end"
          style={{ backgroundColor: `${awayColor}18` }}
        >
          <span className="text-[11px] font-black uppercase tracking-wider text-white/70">{awayName}</span>
          <TeamLogo abbreviation={awayAbbr} size="sm" shape="rounded" />
        </div>
        <div className="w-px h-full bg-white/8 self-stretch" />
        <div
          className="flex-1 flex items-center gap-2 px-5 py-3"
          style={{ backgroundColor: `${homeColor}18` }}
        >
          <TeamLogo abbreviation={homeAbbr} size="sm" shape="rounded" />
          <span className="text-[11px] font-black uppercase tracking-wider text-white/70">{homeName}</span>
        </div>
      </div>

      {/* Rows */}
      <div className="px-6 py-2">
        <CompareRow
          label="Total Yards"
          awayVal={awayStats.totalYds.toString()}
          homeVal={homeStats.totalYds.toString()}
          awayRaw={awayStats.totalYds}
          homeRaw={homeStats.totalYds}
          awayColor={awayColor}
          homeColor={homeColor}
        />
        <CompareRow
          label="Comp / Att"
          awayVal={`${awayStats.passCmp}/${awayStats.passAtt}`}
          homeVal={`${homeStats.passCmp}/${homeStats.passAtt}`}
          awayRaw={awayStats.passCmp}
          homeRaw={homeStats.passCmp}
          awayColor={awayColor}
          homeColor={homeColor}
        />
        <CompareRow
          label="Passing Yards"
          awayVal={awayStats.passYds.toString()}
          homeVal={homeStats.passYds.toString()}
          awayRaw={awayStats.passYds}
          homeRaw={homeStats.passYds}
          awayColor={awayColor}
          homeColor={homeColor}
        />
        <CompareRow
          label="Passing TDs"
          awayVal={awayStats.passTds.toString()}
          homeVal={homeStats.passTds.toString()}
          awayRaw={awayStats.passTds}
          homeRaw={homeStats.passTds}
          awayColor={awayColor}
          homeColor={homeColor}
        />
        <CompareRow
          label="Rush Attempts"
          awayVal={awayStats.rushAtt.toString()}
          homeVal={homeStats.rushAtt.toString()}
          awayRaw={awayStats.rushAtt}
          homeRaw={homeStats.rushAtt}
          awayColor={awayColor}
          homeColor={homeColor}
        />
        <CompareRow
          label="Rushing Yards"
          awayVal={awayStats.rushYds.toString()}
          homeVal={homeStats.rushYds.toString()}
          awayRaw={awayStats.rushYds}
          homeRaw={homeStats.rushYds}
          awayColor={awayColor}
          homeColor={homeColor}
        />
        <CompareRow
          label="Rushing TDs"
          awayVal={awayStats.rushTds.toString()}
          homeVal={homeStats.rushTds.toString()}
          awayRaw={awayStats.rushTds}
          homeRaw={homeStats.rushTds}
          awayColor={awayColor}
          homeColor={homeColor}
        />
        <CompareRow
          label="Turnovers"
          awayVal={awayStats.turnovers.toString()}
          homeVal={homeStats.turnovers.toString()}
          awayRaw={awayStats.turnovers}
          homeRaw={homeStats.turnovers}
          awayColor={awayColor}
          homeColor={homeColor}
          lowerIsBetter
        />
        <CompareRow
          label="Interceptions"
          awayVal={awayStats.passInts.toString()}
          homeVal={homeStats.passInts.toString()}
          awayRaw={awayStats.passInts}
          homeRaw={homeStats.passInts}
          awayColor={awayColor}
          homeColor={homeColor}
          lowerIsBetter
        />
        <CompareRow
          label="Fumbles Lost"
          awayVal={awayStats.fmbLost.toString()}
          homeVal={homeStats.fmbLost.toString()}
          awayRaw={awayStats.fmbLost}
          homeRaw={homeStats.fmbLost}
          awayColor={awayColor}
          homeColor={homeColor}
          lowerIsBetter
        />
        <CompareRow
          label="Sacks Allowed"
          awayVal={awayStats.sacks.toString()}
          homeVal={homeStats.sacks.toString()}
          awayRaw={awayStats.sacks}
          homeRaw={homeStats.sacks}
          awayColor={awayColor}
          homeColor={homeColor}
          lowerIsBetter
        />
        <CompareRow
          label="FG Made / Att"
          awayVal={`${awayStats.fgMade}/${awayStats.fgAtt}`}
          homeVal={`${homeStats.fgMade}/${homeStats.fgAtt}`}
          awayRaw={awayStats.fgMade}
          homeRaw={homeStats.fgMade}
          awayColor={awayColor}
          homeColor={homeColor}
        />
      </div>
    </div>
  );
}

// ─── Split Stat Table ─────────────────────────────────────────────────────────

interface SplitCol {
  label: string;
  key: keyof GamePlayerStat;
  render?: (p: GamePlayerStat) => ReactNode;
}

interface HalfTableProps {
  players: GamePlayerStat[];
  teamColor: string;
  teamName: string;
  columns: SplitCol[];
  activeSortKey: keyof GamePlayerStat;
  onSortChange: (key: keyof GamePlayerStat) => void;
}

function HalfTable({ players, teamColor, teamName, columns, activeSortKey, onSortChange }: HalfTableProps) {
  const sorted = [...players].sort((a, b) => ((b[activeSortKey] as number) ?? 0) - ((a[activeSortKey] as number) ?? 0));

  return (
    <div className="flex-1 min-w-0 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ backgroundColor: teamColor }}>
            <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-white">
              {teamName}
            </th>
            <th className="px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-white w-10">Pos</th>
            {columns.map((col) => (
              <th
                key={col.key as string}
                onClick={() => onSortChange(col.key)}
                className="px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-white w-12 cursor-pointer select-none hover:opacity-70 transition-opacity"
              >
                <span className="inline-flex items-center justify-center gap-0.5">
                  {col.label}
                  <span className={activeSortKey === col.key ? "opacity-90" : "opacity-25"}>↓</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 2} className="px-4 py-6 text-center text-white/25">—</td>
            </tr>
          ) : (
            sorted.map((p, i) => (
              <tr key={`${p.player_id}-${i}`} className="border-t border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-4 py-2 font-semibold text-white [font-family:'Lora',serif] text-[14px]">
                  <Link href={`/players/${p.player_id}`} className="hover:text-[#00C8FF] transition-colors whitespace-nowrap">
                    {p.player_name}
                  </Link>
                </td>
                <td className="px-2 py-2 text-center">
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-white/8 text-white/55">
                    {p.position}
                  </span>
                </td>
                {columns.map((col) => {
                  const isActive = col.key === activeSortKey;
                  const display = col.render
                    ? col.render(p)
                    : ((p[col.key] as number | null | undefined) ?? "—");
                  return (
                    <td
                      key={col.key as string}
                      className={`px-2 py-2 text-center tabular-nums [font-family:'Lora',serif] text-[14px] ${isActive ? "font-bold text-white" : "text-white/60"}`}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

interface SplitStatTableProps {
  allPlayers: GamePlayerStat[];
  filter: (p: GamePlayerStat) => boolean;
  homeColor: string;
  awayColor: string;
  homeAbbr: string;
  awayAbbr: string;
  homeName: string;
  awayName: string;
  columns: SplitCol[];
  sortKey: keyof GamePlayerStat;
}

function SplitStatTable({
  allPlayers, filter,
  homeColor, awayColor,
  homeAbbr, awayAbbr,
  homeName, awayName,
  columns, sortKey,
}: SplitStatTableProps) {
  const [activeSortKey, setActiveSortKey] = useState<keyof GamePlayerStat>(sortKey);
  const awayPlayers = allPlayers.filter((p) => !p.is_home_team && filter(p));
  const homePlayers = allPlayers.filter((p) => p.is_home_team && filter(p));
  const noData = awayPlayers.length === 0 && homePlayers.length === 0;

  if (noData) {
    return <p className="text-center text-white/25 text-xs py-8">No stats recorded</p>;
  }

  return (
    <div className="flex rounded-xl border border-white/8 overflow-hidden">
      <HalfTable
        players={awayPlayers}
        teamColor={awayColor}
        teamName={awayName}
        columns={columns}
        activeSortKey={activeSortKey}
        onSortChange={setActiveSortKey}
      />
      <div className="w-px bg-white/8 shrink-0" />
      <HalfTable
        players={homePlayers}
        teamColor={homeColor}
        teamName={homeName}
        columns={columns}
        activeSortKey={activeSortKey}
        onSortChange={setActiveSortKey}
      />
    </div>
  );
}

// ─── Special Teams (split per sub-category) ──────────────────────────────────

interface SplitSpecialTeamsProps {
  allPlayers: GamePlayerStat[];
  homeColor: string;
  awayColor: string;
  homeAbbr: string;
  awayAbbr: string;
  homeName: string;
  awayName: string;
}

function SplitSpecialTeams({ allPlayers, homeColor, awayColor, homeAbbr, awayAbbr, homeName, awayName }: SplitSpecialTeamsProps) {
  const shared = { allPlayers, homeColor, awayColor, homeAbbr, awayAbbr, homeName, awayName };
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Kicking</p>
        <SplitStatTable
          {...shared}
          filter={(p) => (p.fg_att ?? 0) > 0 || (p.xp_att ?? 0) > 0}
          sortKey="fg_made"
          columns={[
            { label: "FG", key: "fg_made" },
            { label: "FGA", key: "fg_att" },
            { label: "LNG", key: "fg_lng" },
            { label: "XP", key: "xp_made" },
            { label: "XPA", key: "xp_att" },
          ]}
        />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Punting</p>
        <SplitStatTable
          {...shared}
          filter={(p) => (p.punt_att ?? 0) > 0}
          sortKey="punt_yds"
          columns={[
            { label: "PUNT", key: "punt_att" },
            { label: "YDS", key: "punt_yds" },
            { label: "AVG", key: "punt_avg" },
            { label: "LNG", key: "punt_lng" },
            { label: "IN20", key: "punt_in20" },
            { label: "TB", key: "punt_tbs" },
          ]}
        />
      </div>
    </div>
  );
}

// ─── Recap Tab ───────────────────────────────────────────────────────────────

function RecapTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 rounded-2xl border border-white/8 bg-white/3 flex items-center justify-center">
        <svg className="w-7 h-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-white/40">Recap coming soon</p>
        <p className="text-xs text-white/20 mt-1">Game recap image will appear here</p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GameDetail() {
  const params = useParams<{ id: string }>();
  const gameId = Number(params.id);

  const [tab, setTab] = useState<StatTab>("recap");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: game, isLoading } = useGetGame(gameId, {
    query: { enabled: !!gameId, queryKey: getGetGameQueryKey(gameId) },
  });

  const { data: leagueSummary } = useGetLeagueSummary(game?.league_id ?? 0, {
    query: {
      enabled: !!game?.league_id,
      queryKey: getGetLeagueSummaryQueryKey(game?.league_id ?? 0),
    },
  });

  const leagueSidebarLeague = leagueSummary?.league ?? {
    id: game?.league_id ?? 0,
    name: "…",
    platform: "—",
    season: 0,
    week: 0,
    phase: "—",
  };

  const homeColor = game?.home_team_color ?? "#333333";
  const awayColor = game?.away_team_color ?? "#555555";
  const homeAbbr = game?.home_team_abbreviation ?? "HME";
  const awayAbbr = game?.away_team_abbreviation ?? "AWY";
  const homeName = game?.home_team_name ?? homeAbbr;
  const awayName = game?.away_team_name ?? awayAbbr;

  const isCompleted = isGameCompleted(game?.status ?? "");
  const homeWon = isCompleted && (game?.home_score ?? 0) > (game?.away_score ?? 0);
  const awayWon = isCompleted && (game?.away_score ?? 0) > (game?.home_score ?? 0);

  const stats = game?.player_stats ?? [];
  const awayStats = computeTeamStats(stats.filter((p) => !p.is_home_team));
  const homeStats = computeTeamStats(stats.filter((p) => p.is_home_team));

  const splitProps = { allPlayers: stats, homeColor, awayColor, homeAbbr, awayAbbr, homeName, awayName };

  const tabs: { key: StatTab; label: string }[] = [
    { key: "recap",     label: "Recap" },
    { key: "team",      label: "Team Stats" },
    { key: "passing",   label: "Passing" },
    { key: "rushing",   label: "Rushing" },
    { key: "receiving", label: "Receiving" },
    { key: "defense",   label: "Defense" },
    { key: "special",   label: "Special Teams" },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-white overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <LeagueSidebar
          league={leagueSidebarLeague}
          section="games"
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
          navLeagueId={game?.league_id ?? 0}
        />
        <main className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="h-8 w-8 rounded-full border-2 border-[#00C8FF]/30 border-t-[#00C8FF] animate-spin" />
            </div>
          ) : !game ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-white/40">Game not found</p>
            </div>
          ) : (
            <>
              {/* ─── Scoreboard Hero ─── */}
              <div className="relative border-b border-white/8 overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to right, ${awayColor}28 0%, ${awayColor}08 42%, transparent 50%, ${homeColor}08 58%, ${homeColor}28 100%)`,
                  }}
                />

                <div className="relative px-8 py-8">
                  {/* Breadcrumb */}
                  <div className="flex items-center gap-1.5 text-[11px] text-white/30 mb-6">
                    <Link
                      href={`/leagues/${game.league_id}?section=games`}
                      className="hover:text-[#00C8FF] transition-colors"
                    >
                      {leagueSummary?.league?.name ?? "League"}
                    </Link>
                    <span>/</span>
                    <span className="text-white/50">
                      {awayName} vs {homeName}
                    </span>
                  </div>

                  {/* Scoreboard row */}
                  <div className="flex items-center gap-4">

                    {/* ── Away (left) ── */}
                    <div className="flex-1 flex items-center gap-5">
                      <div style={{ filter: `drop-shadow(0 0 14px ${awayColor}60)` }}>
                        <TeamLogo abbreviation={awayAbbr} className="h-[80px] w-[80px]" noBg />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-1">Away</p>
                        <Link
                          href={`/teams/${game.away_team_id}`}
                          className={`text-3xl font-black tracking-tight leading-none hover:opacity-80 transition-opacity ${awayWon ? "text-white" : "text-white/50"}`}
                        >
                          {awayName}
                        </Link>
                        <p className="text-xs font-bold text-white/30 mt-1 uppercase tracking-wider">{awayAbbr}</p>
                      </div>
                    </div>

                    {/* ── Score Center ── */}
                    <div className="text-center shrink-0 px-6">
                      {isCompleted && (
                        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25 mb-2">Final Score</p>
                      )}
                      {isCompleted ? (
                        <div className="flex items-center gap-4">
                          <span className={`text-6xl font-black tabular-nums leading-none ${awayWon ? "text-white" : "text-white/35"}`}>
                            {game.away_score ?? 0}
                          </span>
                          <span className="text-3xl text-white/12 font-black">–</span>
                          <span className={`text-6xl font-black tabular-nums leading-none ${homeWon ? "text-[#00C8FF]" : "text-white/35"}`}>
                            {game.home_score ?? 0}
                          </span>
                        </div>
                      ) : (
                        <span className="text-4xl font-black text-white/20">VS</span>
                      )}
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mt-2.5">
                        {STATUS_LABELS[game.status] ?? game.status}
                      </p>
                      <p className="text-[10px] text-white/22 mt-1">
                        Season {game.season} · Week {game.week}
                      </p>
                    </div>

                    {/* ── Home (right) ── */}
                    <div className="flex-1 flex items-center gap-5 justify-end">
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-1">Home</p>
                        <Link
                          href={`/teams/${game.home_team_id}`}
                          className={`text-3xl font-black tracking-tight leading-none hover:opacity-80 transition-opacity ${homeWon ? "text-[#00C8FF]" : "text-white/50"}`}
                        >
                          {homeName}
                        </Link>
                        <p className="text-xs font-bold text-white/30 mt-1 uppercase tracking-wider">{homeAbbr}</p>
                      </div>
                      <div style={{ filter: `drop-shadow(0 0 14px ${homeColor}60)` }}>
                        <TeamLogo abbreviation={homeAbbr} className="h-[80px] w-[80px]" noBg />
                      </div>
                    </div>

                  </div>

                </div>
              </div>

              {/* ─── Stats ─── */}
              <div className="px-6 py-6">
                {/* Tabs */}
                <div className="flex items-center gap-0.5 border-b border-white/8 mb-6 overflow-x-auto">
                  {tabs.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px whitespace-nowrap ${
                        tab === key
                          ? "text-[#00C8FF] border-[#00C8FF]"
                          : "text-white/40 border-transparent hover:text-white/70"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                {tab === "recap" && <RecapTab />}

                {tab === "team" && (
                  <TeamStatsTab
                    awayStats={awayStats}
                    homeStats={homeStats}
                    awayColor={awayColor}
                    homeColor={homeColor}
                    awayAbbr={awayAbbr}
                    homeAbbr={homeAbbr}
                    awayName={awayName}
                    homeName={homeName}
                  />
                )}

                {tab === "passing" && (
                  <SplitStatTable
                    {...splitProps}
                    filter={hasPassingStats}
                    sortKey="pss_yds"
                    columns={[
                      { label: "CMP/ATT", key: "pss_cmp", render: (p) => `${p.pss_cmp ?? 0}/${p.pss_att ?? 0}` },
                      { label: "YDS", key: "pss_yds" },
                      { label: "TD",  key: "pss_tds" },
                      { label: "INT", key: "pss_ints" },
                      { label: "RTG", key: "pss_rating" },
                    ]}
                  />
                )}

                {tab === "rushing" && (
                  <SplitStatTable
                    {...splitProps}
                    filter={hasRushingStats}
                    sortKey="rsh_yds"
                    columns={[
                      { label: "ATT", key: "rsh_att" },
                      { label: "YDS", key: "rsh_yds" },
                      { label: "TD",  key: "rsh_tds" },
                      { label: "LNG", key: "rsh_lng" },
                      { label: "FMB", key: "fmb" },
                    ]}
                  />
                )}

                {tab === "receiving" && (
                  <SplitStatTable
                    {...splitProps}
                    filter={hasReceivingStats}
                    sortKey="rec_yds"
                    columns={[
                      { label: "REC", key: "rec_catches" },
                      { label: "TGT", key: "rec_tgts" },
                      { label: "YDS", key: "rec_yds" },
                      { label: "TD",  key: "rec_tds" },
                      { label: "YAC", key: "rec_yac" },
                      { label: "LNG", key: "rec_lng" },
                    ]}
                  />
                )}

                {tab === "defense" && (
                  <SplitStatTable
                    {...splitProps}
                    filter={hasDefenseStats}
                    sortKey="def_total_tackles"
                    columns={[
                      { label: "TKL", key: "def_total_tackles" },
                      { label: "SCK", key: "def_sacks" },
                      { label: "TFL", key: "def_tfl" },
                      { label: "INT", key: "def_ints" },
                      { label: "PD",  key: "def_pd" },
                      { label: "FF",  key: "def_ff" },
                    ]}
                  />
                )}

                {tab === "special" && (
                  <SplitSpecialTeams {...splitProps} />
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
