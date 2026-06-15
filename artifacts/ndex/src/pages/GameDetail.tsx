import { useState } from "react";
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function espnLogoUrl(abbr: string | null | undefined): string {
  if (!abbr) return "";
  return `https://a.espncdn.com/combiner/i?img=/i/teamlogos/nfl/500/${abbr.toLowerCase()}.png&w=96&h=96&scale=crop&cquality=40`;
}

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Final",
  IN_PROGRESS: "Live",
  SCHEDULED: "Scheduled",
};

type StatTab = "passing" | "rushing" | "receiving" | "defense" | "special";

// ─── Stat Filters ────────────────────────────────────────────────────────────

function hasPassingStats(p: GamePlayerStat): boolean {
  return (p.pss_att ?? 0) > 0 || (p.pss_yds ?? 0) > 0;
}
function hasRushingStats(p: GamePlayerStat): boolean {
  return (p.rsh_att ?? 0) > 0 || (p.rsh_yds ?? 0) > 0;
}
function hasReceivingStats(p: GamePlayerStat): boolean {
  return (p.rec_catches ?? 0) > 0 || (p.rec_tgts ?? 0) > 0;
}
function hasDefenseStats(p: GamePlayerStat): boolean {
  return (
    (p.def_total_tackles ?? 0) > 0 ||
    (p.def_sacks ?? 0) > 0 ||
    (p.def_ints ?? 0) > 0 ||
    (p.def_pd ?? 0) > 0
  );
}
function hasSpecialStats(p: GamePlayerStat): boolean {
  return (p.fg_att ?? 0) > 0 || (p.punt_att ?? 0) > 0 || (p.xp_att ?? 0) > 0;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function TeamIndicator({ color, abbr }: { color: string; abbr: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-1.5 h-4 rounded-sm shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{abbr}</span>
    </div>
  );
}

interface StatTableProps {
  players: GamePlayerStat[];
  homeColor: string;
  awayColor: string;
  homeAbbr: string;
  awayAbbr: string;
  columns: { label: string; key: keyof GamePlayerStat; primary?: boolean }[];
  sortKey: keyof GamePlayerStat;
}

function StatTable({ players, homeColor, awayColor, homeAbbr, awayAbbr, columns, sortKey }: StatTableProps) {
  const sorted = [...players].sort((a, b) => ((b[sortKey] as number) ?? 0) - ((a[sortKey] as number) ?? 0));
  if (sorted.length === 0) {
    return <p className="text-center text-white/25 text-xs py-8">No stats recorded</p>;
  }

  const headerColor = "#1a1a1a";

  return (
    <div className="overflow-x-auto rounded-xl border border-white/8">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ backgroundColor: headerColor }}>
            <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-white/50 w-[90px]">Team</th>
            <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-white/50">Player</th>
            <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-white/50 w-12">Pos</th>
            {columns.map((col) => (
              <th
                key={col.key as string}
                className={`px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wider w-14 ${
                  col.key === sortKey ? "text-[#00C8FF]" : "text-white/50"
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => {
            const teamColor = p.is_home_team ? homeColor : awayColor;
            const teamAbbr = p.is_home_team ? homeAbbr : awayAbbr;
            return (
              <tr
                key={`${p.player_id}-${i}`}
                className="border-t border-white/5 hover:bg-white/3 transition-colors"
              >
                <td className="px-4 py-2.5">
                  <TeamIndicator color={teamColor} abbr={teamAbbr} />
                </td>
                <td className="px-4 py-2.5 font-semibold text-white">
                  <Link
                    href={`/players/${p.player_id}`}
                    className="hover:text-[#00C8FF] transition-colors"
                  >
                    {p.player_name}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-white/8 text-white/60">
                    {p.position}
                  </span>
                </td>
                {columns.map((col) => {
                  const val = p[col.key] as number | null | undefined;
                  const isPrimary = col.key === sortKey;
                  return (
                    <td
                      key={col.key as string}
                      className={`px-3 py-2.5 text-center tabular-nums ${
                        isPrimary ? "font-bold text-white" : "text-white/55"
                      }`}
                    >
                      {val ?? "—"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function GameDetail() {
  const params = useParams<{ id: string }>();
  const gameId = Number(params.id);

  const [tab, setTab] = useState<StatTab>("passing");
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

  const isCompleted = game?.status === "COMPLETED";
  const homeWon = isCompleted && (game?.home_score ?? 0) > (game?.away_score ?? 0);
  const awayWon = isCompleted && (game?.away_score ?? 0) > (game?.home_score ?? 0);

  const stats = game?.player_stats ?? [];

  const tabs: { key: StatTab; label: string }[] = [
    { key: "passing", label: "Passing" },
    { key: "rushing", label: "Rushing" },
    { key: "receiving", label: "Receiving" },
    { key: "defense", label: "Defense" },
    { key: "special", label: "Special Teams" },
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
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <p className="text-white/40">Game not found</p>
            </div>
          ) : (
            <>
              {/* ─── Scoreboard Hero ─── */}
              <div className="relative border-b border-white/8 overflow-hidden">
                {/* Background gradients split by team colors */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to right, ${awayColor}22 0%, ${awayColor}08 40%, ${homeColor}08 60%, ${homeColor}22 100%)`,
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
                      {game.away_team_name ?? awayAbbr} vs {game.home_team_name ?? homeAbbr}
                    </span>
                  </div>

                  {/* Main scoreboard */}
                  <div className="flex items-center gap-6">

                    {/* Away team */}
                    <div className="flex-1 flex items-center gap-5">
                      <div style={{ filter: `drop-shadow(0 0 12px ${awayColor}50)` }}>
                        <TeamLogo abbreviation={awayAbbr} className="h-[72px] w-[72px]" shape="rounded" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-0.5">Away</p>
                        <p className={`text-2xl font-black tracking-tight leading-none ${awayWon ? "text-white" : "text-white/55"}`}>
                          {game.away_team_name ?? awayAbbr}
                        </p>
                        <p className="text-xs text-white/30 mt-0.5">{awayAbbr}</p>
                      </div>
                    </div>

                    {/* Score center */}
                    <div className="text-center shrink-0 px-8">
                      {isCompleted ? (
                        <div className="flex items-center gap-3">
                          <span className={`text-5xl font-black tabular-nums tracking-tight ${awayWon ? "text-white" : "text-white/40"}`}>
                            {game.away_score ?? 0}
                          </span>
                          <span className="text-2xl text-white/15 font-black">–</span>
                          <span className={`text-5xl font-black tabular-nums tracking-tight ${homeWon ? "text-[#00C8FF]" : "text-white/40"}`}>
                            {game.home_score ?? 0}
                          </span>
                        </div>
                      ) : (
                        <span className="text-3xl font-black text-white/20">VS</span>
                      )}
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mt-2">
                        {STATUS_LABELS[game.status] ?? game.status}
                      </p>
                      <p className="text-[10px] text-white/25 mt-1">
                        S{game.season} · Week {game.week}
                      </p>
                    </div>

                    {/* Home team */}
                    <div className="flex-1 flex items-center gap-5 justify-end flex-row-reverse">
                      <div style={{ filter: `drop-shadow(0 0 12px ${homeColor}50)` }}>
                        <TeamLogo abbreviation={homeAbbr} className="h-[72px] w-[72px]" shape="rounded" />
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-0.5">Home</p>
                        <p className={`text-2xl font-black tracking-tight leading-none ${homeWon ? "text-[#00C8FF]" : "text-white/55"}`}>
                          {game.home_team_name ?? homeAbbr}
                        </p>
                        <p className="text-xs text-white/30 mt-0.5">{homeAbbr}</p>
                      </div>
                    </div>

                  </div>

                  {/* Team color bars */}
                  <div className="flex gap-2 mt-6">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-lg px-3 py-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: awayColor }} />
                      <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{awayAbbr} Away</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-lg px-3 py-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: homeColor }} />
                      <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{homeAbbr} Home</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Stats ─── */}
              <div className="px-6 py-6">
                {/* Tabs */}
                <div className="flex items-center gap-1 border-b border-white/8 mb-6">
                  {tabs.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                        tab === key
                          ? "text-[#00C8FF] border-[#00C8FF]"
                          : "text-white/40 border-transparent hover:text-white/70"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Passing */}
                {tab === "passing" && (
                  <StatTable
                    players={stats.filter(hasPassingStats)}
                    homeColor={homeColor}
                    awayColor={awayColor}
                    homeAbbr={homeAbbr}
                    awayAbbr={awayAbbr}
                    sortKey="pss_yds"
                    columns={[
                      { label: "C/ATT", key: "pss_att" },
                      { label: "CMP", key: "pss_cmp" },
                      { label: "YDS", key: "pss_yds", primary: true },
                      { label: "TD", key: "pss_tds" },
                      { label: "INT", key: "pss_ints" },
                      { label: "SCK", key: "pss_sacks" },
                      { label: "LNG", key: "pss_lng" },
                      { label: "RTG", key: "pss_rating" },
                    ]}
                  />
                )}

                {/* Rushing */}
                {tab === "rushing" && (
                  <StatTable
                    players={stats.filter(hasRushingStats)}
                    homeColor={homeColor}
                    awayColor={awayColor}
                    homeAbbr={homeAbbr}
                    awayAbbr={awayAbbr}
                    sortKey="rsh_yds"
                    columns={[
                      { label: "ATT", key: "rsh_att" },
                      { label: "YDS", key: "rsh_yds", primary: true },
                      { label: "TD", key: "rsh_tds" },
                      { label: "LNG", key: "rsh_lng" },
                      { label: "FMB", key: "fmb" },
                    ]}
                  />
                )}

                {/* Receiving */}
                {tab === "receiving" && (
                  <StatTable
                    players={stats.filter(hasReceivingStats)}
                    homeColor={homeColor}
                    awayColor={awayColor}
                    homeAbbr={homeAbbr}
                    awayAbbr={awayAbbr}
                    sortKey="rec_yds"
                    columns={[
                      { label: "REC", key: "rec_catches", primary: true },
                      { label: "TGT", key: "rec_tgts" },
                      { label: "YDS", key: "rec_yds" },
                      { label: "TD", key: "rec_tds" },
                      { label: "YAC", key: "rec_yac" },
                      { label: "LNG", key: "rec_lng" },
                      { label: "DRP", key: "rec_drops" },
                    ]}
                  />
                )}

                {/* Defense */}
                {tab === "defense" && (
                  <StatTable
                    players={stats.filter(hasDefenseStats)}
                    homeColor={homeColor}
                    awayColor={awayColor}
                    homeAbbr={homeAbbr}
                    awayAbbr={awayAbbr}
                    sortKey="def_total_tackles"
                    columns={[
                      { label: "TKL", key: "def_total_tackles", primary: true },
                      { label: "SCK", key: "def_sacks" },
                      { label: "TFL", key: "def_tfl" },
                      { label: "INT", key: "def_ints" },
                      { label: "PD", key: "def_pd" },
                      { label: "FF", key: "def_ff" },
                      { label: "FR", key: "def_fum_rec" },
                      { label: "TD", key: "def_tds" },
                    ]}
                  />
                )}

                {/* Special Teams */}
                {tab === "special" && (
                  <div className="space-y-6">
                    {/* Kicking */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Kicking</p>
                      <StatTable
                        players={stats.filter((p) => (p.fg_att ?? 0) > 0 || (p.xp_att ?? 0) > 0)}
                        homeColor={homeColor}
                        awayColor={awayColor}
                        homeAbbr={homeAbbr}
                        awayAbbr={awayAbbr}
                        sortKey="fg_made"
                        columns={[
                          { label: "FG", key: "fg_made", primary: true },
                          { label: "FGA", key: "fg_att" },
                          { label: "LNG", key: "fg_lng" },
                          { label: "XP", key: "xp_made" },
                          { label: "XPA", key: "xp_att" },
                        ]}
                      />
                    </div>
                    {/* Punting */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Punting</p>
                      <StatTable
                        players={stats.filter((p) => (p.punt_att ?? 0) > 0)}
                        homeColor={homeColor}
                        awayColor={awayColor}
                        homeAbbr={homeAbbr}
                        awayAbbr={awayAbbr}
                        sortKey="punt_yds"
                        columns={[
                          { label: "PUNT", key: "punt_att", primary: true },
                          { label: "YDS", key: "punt_yds" },
                          { label: "AVG", key: "punt_avg" },
                          { label: "LNG", key: "punt_lng" },
                          { label: "IN20", key: "punt_in20" },
                          { label: "TB", key: "punt_tbs" },
                        ]}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
