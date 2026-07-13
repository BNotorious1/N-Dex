import { useState } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import type { GameOfWeek, StatLeaders, StandingEntry, LeagueSummary } from "@workspace/api-client-react";

interface Props {
  summary?: LeagueSummary;
  statLeaders?: StatLeaders;
  standings?: StandingEntry[];
  gotw?: GameOfWeek | null;
  onNavigate?: (section: string) => void;
}

export default function HomeSection({ summary, statLeaders, standings, gotw, onNavigate }: Props) {
  const top10 = standings
    ? [...standings].sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.points_for - a.points_for).slice(0, 10)
    : [];

  return (
    <div className="grid grid-cols-[1fr_2fr_1fr] gap-5 min-h-0">
      {/* ── LEFT: Top 10 Rankings ── */}
      <div className="flex flex-col gap-4">
        <RankingsSidebar entries={top10} onViewAll={() => onNavigate?.("rankings")} />
      </div>

      {/* ── CENTER: GOTW + Recent Results ── */}
      <div className="flex flex-col gap-5">
        {gotw ? (
          <GameOfWeekHero gotw={gotw} currentWeek={summary?.current_week} />
        ) : (
          <GotwPlaceholder />
        )}
        <LatestResults games={summary?.recent_games ?? []} />
      </div>

      {/* ── RIGHT: Stat Leaders ── */}
      <div className="flex flex-col gap-4">
        <OffenseLeaders leaders={statLeaders} />
        <DefenseLeaders leaders={statLeaders} />
      </div>
    </div>
  );
}

function RankingsSidebar({ entries, onViewAll }: { entries: StandingEntry[]; onViewAll: () => void }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#111] overflow-hidden flex flex-col">
      <div className="px-3 py-2.5 border-b border-white/8 flex items-center justify-between bg-[#0d0d0d]">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Power Rankings</span>
        <span className="text-[9px] text-white/25">SEASON</span>
      </div>
      <div className="flex-1">
        {entries.length === 0 ? (
          <p className="py-8 text-center text-white/25 text-[11px]">No standings data yet</p>
        ) : entries.map((e, i) => {
          const isTop3 = i < 3;
          const color = e.team.primary_color;
          return (
            <Link
              key={e.team.id}
              href={`/teams/${e.team.id}`}
              className={`flex items-center gap-2.5 px-3 py-2 border-b border-white/5 hover:bg-white/3 transition-colors group ${isTop3 ? "bg-white/[0.02]" : ""}`}
            >
              <span className={`text-[11px] font-black w-4 shrink-0 text-right ${isTop3 ? "text-[#00C8FF]" : "text-white/25"}`}>{i + 1}</span>
              <TeamLogo abbreviation={e.team.abbreviation} primaryColor={color} size="xs" shape="circle" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white truncate group-hover:text-[#00C8FF] transition-colors">
                  {e.team.city} {e.team.name}
                </p>
                <p className="text-[9px] text-white/30">{e.team.conference} · {e.team.division}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] font-black text-white">{e.wins}–{e.losses}{e.ties > 0 ? `–${e.ties}` : ""}</p>
              </div>
            </Link>
          );
        })}
      </div>
      <button
        onClick={onViewAll}
        className="flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold text-[#00C8FF]/70 hover:text-[#00C8FF] bg-[#0d0d0d] border-t border-white/8 transition-colors w-full"
      >
        VIEW FULL RANKINGS <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}

function GameOfWeekHero({ gotw, currentWeek }: { gotw: GameOfWeek; currentWeek?: number }) {
  const homeTeam = gotw.home_team;
  const awayTeam = gotw.away_team;
  const homeColor = homeTeam?.primary_color ?? "#00C8FF";
  const awayColor = awayTeam?.primary_color ?? "#F44336";

  return (
    <div className="rounded-xl overflow-hidden border border-white/10 relative" style={{ background: "#0e0e0e" }}>
      {/* Gradient accents from team colors */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-y-0 left-0 w-1/2 opacity-10" style={{ background: `radial-gradient(ellipse at 0% 50%, ${awayColor}, transparent 70%)` }} />
        <div className="absolute inset-y-0 right-0 w-1/2 opacity-10" style={{ background: `radial-gradient(ellipse at 100% 50%, ${homeColor}, transparent 70%)` }} />
      </div>

      {/* Header bar */}
      <div className="relative flex items-center justify-between px-4 py-2 border-b border-white/8">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[#00C8FF] animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-[#00C8FF]">Game of the Week</span>
        </div>
        <span className="text-[9px] text-white/30">WEEK {gotw.week} · SEASON {gotw.season}</span>
      </div>

      {/* Matchup */}
      <div className="relative px-4 py-5">
        {(homeTeam || awayTeam) ? (
          <div className="flex items-center gap-4">
            {/* Away team */}
            <div className="flex-1 flex flex-col items-center gap-2 text-center">
              <TeamLogo abbreviation={awayTeam?.abbreviation ?? "???"} primaryColor={awayColor} size="lg" shape="circle" />
              <div>
                <p className="text-sm font-black text-white leading-tight">
                  {awayTeam ? `${awayTeam.city} ${awayTeam.name}` : "TBD"}
                </p>
                {awayTeam && (
                  <p className="text-[10px] text-white/40">{awayTeam.wins}–{awayTeam.losses} · {awayTeam.conference}</p>
                )}
              </div>
            </div>

            {/* Center VS */}
            <div className="shrink-0 flex flex-col items-center gap-1">
              {gotw.headline ? (
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 text-center mb-1 max-w-[120px]">{gotw.headline}</p>
              ) : null}
              <span className="text-2xl font-black text-white/20">VS</span>
              {gotw.kickoff && (
                <p className="text-[9px] text-white/40 text-center mt-1">{gotw.kickoff}</p>
              )}
            </div>

            {/* Home team */}
            <div className="flex-1 flex flex-col items-center gap-2 text-center">
              <TeamLogo abbreviation={homeTeam?.abbreviation ?? "???"} primaryColor={homeColor} size="lg" shape="circle" />
              <div>
                <p className="text-sm font-black text-white leading-tight">
                  {homeTeam ? `${homeTeam.city} ${homeTeam.name}` : "TBD"}
                </p>
                {homeTeam && (
                  <p className="text-[10px] text-white/40">{homeTeam.wins}–{homeTeam.losses} · {homeTeam.conference}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            {gotw.headline && <p className="text-base font-black text-white mb-1">{gotw.headline}</p>}
            {gotw.description && <p className="text-xs text-white/50">{gotw.description}</p>}
            {gotw.kickoff && <p className="text-[10px] text-white/30 mt-2">{gotw.kickoff}</p>}
          </div>
        )}

        {gotw.description && (homeTeam || awayTeam) && (
          <p className="text-[10px] text-white/40 text-center mt-3 leading-relaxed">{gotw.description}</p>
        )}
      </div>
    </div>
  );
}

function GotwPlaceholder() {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-[#0e0e0e] p-6 flex flex-col items-center justify-center gap-2 text-center min-h-[140px]">
      <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center mb-1">
        <span className="text-base">🏈</span>
      </div>
      <p className="text-sm font-bold text-white/30">No Game of the Week</p>
      <p className="text-[10px] text-white/20">Admins can spotlight a matchup from the Games tab</p>
    </div>
  );
}

function LatestResults({ games }: { games: NonNullable<LeagueSummary["recent_games"]> }) {
  const completed = games.filter(g => g.status === "COMPLETED" || g.status === "FINAL").slice(0, 6);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Latest Results</span>
        <span className="text-[9px] text-white/20">RECENT GAMES</span>
      </div>
      {completed.length === 0 ? (
        <div className="rounded-xl border border-white/6 bg-[#111] px-4 py-6 text-center">
          <p className="text-xs text-white/25">No completed games yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {completed.map((game) => (
            <ScoreCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreCard({ game }: { game: NonNullable<LeagueSummary["recent_games"]>[number] }) {
  const homeWon = (game.home_score ?? 0) > (game.away_score ?? 0);
  const awayWon = (game.away_score ?? 0) > (game.home_score ?? 0);

  return (
    <div className="rounded-lg border border-white/8 bg-[#111] px-3 py-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Week {game.week}</span>
        <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/6 text-white/30 font-bold uppercase">Final</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold truncate max-w-[90px] ${awayWon ? "text-white" : "text-white/40"}`}>{game.away_team_name ?? "Away"}</span>
          <span className={`text-sm font-black tabular-nums ${awayWon ? "text-[#00C8FF]" : "text-white/40"}`}>{game.away_score ?? 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold truncate max-w-[90px] ${homeWon ? "text-white" : "text-white/40"}`}>{game.home_team_name ?? "Home"}</span>
          <span className={`text-sm font-black tabular-nums ${homeWon ? "text-[#00C8FF]" : "text-white/40"}`}>{game.home_score ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

type OffenseTab = "passing" | "rushing" | "receiving";
type DefenseTab = "tackles" | "sacks" | "interceptions";

function OffenseLeaders({ leaders }: { leaders?: StatLeaders }) {
  const [tab, setTab] = useState<OffenseTab>("passing");
  const tabs: { key: OffenseTab; label: string }[] = [
    { key: "passing", label: "Passing" },
    { key: "rushing", label: "Rushing" },
    { key: "receiving", label: "Receiving" },
  ];
  const entries = leaders?.[tab] ?? [];

  return (
    <LeaderPanel
      title="Offense Leaders"
      tabs={tabs}
      activeTab={tab}
      onTab={(k) => setTab(k as OffenseTab)}
      entries={entries}
      accentColor="#00C8FF"
    />
  );
}

function DefenseLeaders({ leaders }: { leaders?: StatLeaders }) {
  const [tab, setTab] = useState<DefenseTab>("tackles");
  const tabs: { key: DefenseTab; label: string }[] = [
    { key: "tackles", label: "Tackles" },
    { key: "sacks", label: "Sacks" },
    { key: "interceptions", label: "INT" },
  ];
  const entries = leaders?.[tab] ?? [];

  return (
    <LeaderPanel
      title="Defense Leaders"
      tabs={tabs}
      activeTab={tab}
      onTab={(k) => setTab(k as DefenseTab)}
      entries={entries}
      accentColor="#F44336"
    />
  );
}

interface StatLine {
  player: { id: number; name: string; position: string };
  team_name: string;
  stat_label: string;
  stat_value: number;
}

function LeaderPanel({
  title, tabs, activeTab, onTab, entries, accentColor,
}: {
  title: string;
  tabs: { key: string; label: string }[];
  activeTab: string;
  onTab: (k: string) => void;
  entries: StatLine[];
  accentColor: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#111] overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/8 bg-[#0d0d0d] flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{title}</span>
        <span className="text-[9px] text-white/20">SEASON</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/8">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onTab(t.key)}
            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all relative ${
              activeTab === t.key ? "text-white" : "text-white/30 hover:text-white/60"
            }`}
          >
            {t.label}
            {activeTab === t.key && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t" style={{ backgroundColor: accentColor }} />
            )}
          </button>
        ))}
      </div>

      {/* Rows */}
      {entries.length === 0 ? (
        <p className="py-5 text-center text-white/20 text-[10px]">No data yet</p>
      ) : entries.map((e, i) => (
        <div key={e.player.id} className={`flex items-center gap-2.5 px-3 py-2 ${i < entries.length - 1 ? "border-b border-white/5" : ""}`}>
          <span
            className="text-[10px] font-black h-4 w-4 rounded-full flex items-center justify-center shrink-0 text-white"
            style={{ backgroundColor: i === 0 ? accentColor + "30" : "transparent", color: i === 0 ? accentColor : "rgba(255,255,255,0.2)" }}
          >
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-white truncate">{e.player.name}</p>
            <p className="text-[9px] text-white/30 truncate">{e.team_name} · {e.player.position}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-black tabular-nums" style={{ color: accentColor }}>{e.stat_value}</p>
            <p className="text-[8px] text-white/25 uppercase">{e.stat_label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
