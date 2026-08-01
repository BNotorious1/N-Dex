import { useState } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import { getWeekLabel } from "@/lib/weekLabel";
import type { GameOfWeek, StatLeaders, StandingEntry, LeagueSummary, PlayerStatLine } from "@workspace/api-client-react";

interface Props {
  summary?: LeagueSummary;
  statLeaders?: StatLeaders;
  standings?: StandingEntry[];
  gotw?: GameOfWeek | null;
  onNavigate?: (section: string) => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function eaPortraitUrl(portraitId: number): string {
  return `/api/proxy/image?url=${encodeURIComponent(
    `https://ratings-images-prod.pulse.ea.com/madden-nfl-26/portraits/${portraitId}.png`
  )}`;
}

function rowGradient(color?: string | null): React.CSSProperties {
  if (!color) return {};
  return { background: `linear-gradient(90deg, ${color}40 0%, ${color}18 50%, transparent 100%)` };
}

function fmtStat(value: number, label: string): string {
  if (label.includes("YDS")) return value.toLocaleString();
  if (label === "Sacks") return value % 1 === 0 ? String(value) : value.toFixed(1);
  return String(Math.round(value));
}

type SeedEntry = StandingEntry & { seed: number; inPlayoffs: boolean };

function computeSeeds(entries: StandingEntry[]): SeedEntry[] {
  const sortByRecord = (a: StandingEntry, b: StandingEntry) =>
    b.wins - a.wins || a.losses - b.losses || b.points_for - a.points_for;

  // Group by division
  const byDiv: Record<string, StandingEntry[]> = {};
  for (const e of entries) {
    const k = e.division;
    if (!byDiv[k]) byDiv[k] = [];
    byDiv[k].push(e);
  }

  const divWinners: StandingEntry[] = [];
  const wildcards: StandingEntry[] = [];
  for (const teams of Object.values(byDiv)) {
    const sorted = [...teams].sort(sortByRecord);
    divWinners.push(sorted[0]);
    wildcards.push(...sorted.slice(1));
  }
  divWinners.sort(sortByRecord);
  wildcards.sort(sortByRecord);

  const seeded: SeedEntry[] = [
    ...divWinners.slice(0, 4).map((e, i) => ({ ...e, seed: i + 1, inPlayoffs: true })),
    ...wildcards.slice(0, 6).map((e, i) => ({ ...e, seed: i + 5, inPlayoffs: i < 3 })),
  ];
  return seeded;
}

// ── Root ─────────────────────────────────────────────────────────────────────

export default function HomeSection({ summary, statLeaders, standings, gotw, onNavigate }: Props) {
  const afcEntries = standings?.filter(s => s.conference === "AFC") ?? [];
  const nfcEntries = standings?.filter(s => s.conference === "NFC") ?? [];
  const afcSeeds = computeSeeds(afcEntries);
  const nfcSeeds = computeSeeds(nfcEntries);

  const sortedAll = standings
    ? [...standings].sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.points_for - a.points_for)
    : [];
  const top10 = sortedAll.slice(0, 10);

  return (
    <div className="grid grid-cols-[1fr_2fr_1fr] gap-5 min-h-0">

      {/* ── LEFT ── */}
      <div className="flex flex-col gap-4">
        <PlayoffRace conf="AFC" seeds={afcSeeds} />
        <RankingsSidebar entries={top10} onViewAll={() => onNavigate?.("rankings")} />
      </div>

      {/* ── CENTER ── */}
      <div className="flex flex-col gap-5">
        {gotw ? (
          <GameOfWeekHero gotw={gotw} />
        ) : (
          <GotwPlaceholder />
        )}
        <LatestResults games={summary?.recent_games ?? []} onNavigate={onNavigate} />
      </div>

      {/* ── RIGHT ── */}
      <div className="flex flex-col gap-4">
        <PlayoffRace conf="NFC" seeds={nfcSeeds} />
        <OffenseLeaders leaders={statLeaders} onNavigate={onNavigate} />
        <DefenseLeaders leaders={statLeaders} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

// ── Playoff Race ─────────────────────────────────────────────────────────────

function PlayoffRace({ conf, seeds }: { conf: "AFC" | "NFC"; seeds: SeedEntry[] }) {
  const PLAYOFF_SPOTS = 7;
  const show = seeds.slice(0, 10);

  return (
    <div className="rounded-xl border border-white/8 bg-[#111] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/8 bg-[#0d0d0d] flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{conf} Playoff Race</span>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="text-[9px] text-white/25">LIVE</span>
        </div>
      </div>

      {show.length === 0 ? (
        <p className="py-5 text-center text-white/20 text-[10px]">No standings data yet</p>
      ) : show.map((e, idx) => {
        const isPlayoffLine = e.seed === PLAYOFF_SPOTS + 1;
        return (
          <div key={e.team.id}>
            {isPlayoffLine && (
              <div className="flex items-center gap-2 px-3 py-0.5 bg-[#F44336]/5 border-y border-[#F44336]/20">
                <div className="flex-1 h-px bg-[#F44336]/25" />
                <span className="text-[8px] font-black uppercase tracking-widest text-[#F44336]/60 shrink-0">Playoff Line</span>
                <div className="flex-1 h-px bg-[#F44336]/25" />
              </div>
            )}
            <Link
              href={`/teams/${e.team.id}`}
              className={`flex items-center gap-2 px-3 py-1.5 border-b border-white/5 hover:bg-white/3 transition-colors group ${e.inPlayoffs ? "" : "opacity-60"}`}
            >
              <span
                className={`text-[10px] font-black w-4 shrink-0 text-right tabular-nums ${
                  e.seed <= 4 ? "text-[#00C8FF]" : e.seed <= 7 ? "text-green-400" : "text-white/25"
                }`}
              >
                {e.seed}
              </span>
              <TeamLogo abbreviation={e.team.abbreviation} primaryColor={e.team.primary_color} size="xs" shape="circle" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-white truncate group-hover:text-[#00C8FF] transition-colors leading-tight">
                  {e.team.city} {e.team.name}
                </p>
              </div>
              <span className="text-[10px] font-black text-white/60 tabular-nums shrink-0">
                {e.wins}–{e.losses}{e.ties > 0 ? `–${e.ties}` : ""}
              </span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}

// ── Power Rankings sidebar ────────────────────────────────────────────────────

function RankingsSidebar({ entries, onViewAll }: { entries: StandingEntry[]; onViewAll: () => void }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#111] overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-white/8 bg-[#0d0d0d] flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Power Rankings</span>
        <span className="text-[9px] text-white/25">TOP 10</span>
      </div>
      {entries.length === 0 ? (
        <p className="py-8 text-center text-white/20 text-[10px]">No standings data yet</p>
      ) : entries.map((e, i) => (
        <Link
          key={e.team.id}
          href={`/teams/${e.team.id}`}
          className={`flex items-center gap-2 px-3 py-2 border-b border-white/5 hover:bg-white/3 transition-colors group ${i < 3 ? "bg-white/[0.015]" : ""}`}
        >
          <span className={`text-[11px] font-black w-4 shrink-0 text-right tabular-nums ${i < 3 ? "text-[#00C8FF]" : "text-white/25"}`}>{i + 1}</span>
          <TeamLogo abbreviation={e.team.abbreviation} primaryColor={e.team.primary_color} size="xs" shape="circle" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-white truncate group-hover:text-[#00C8FF] transition-colors">{e.team.city} {e.team.name}</p>
            <p className="text-[9px] text-white/30">{e.conference} · {e.division}</p>
          </div>
          <span className="text-[10px] font-black text-white/60 tabular-nums shrink-0">{e.wins}–{e.losses}</span>
        </Link>
      ))}
      <button
        onClick={onViewAll}
        className="flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold text-[#00C8FF]/60 hover:text-[#00C8FF] bg-[#0d0d0d] border-t border-white/8 transition-colors w-full"
      >
        VIEW FULL RANKINGS <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── Game of the Week ──────────────────────────────────────────────────────────

function GameOfWeekHero({ gotw }: { gotw: GameOfWeek }) {
  const homeTeam = gotw.home_team;
  const awayTeam = gotw.away_team;
  const homeColor = homeTeam?.primary_color ?? "#00C8FF";
  const awayColor = awayTeam?.primary_color ?? "#F44336";

  return (
    <div className="rounded-xl overflow-hidden border border-white/10 relative" style={{ background: "#0e0e0e" }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-y-0 left-0 w-1/2 opacity-10" style={{ background: `radial-gradient(ellipse at 0% 50%, ${awayColor}, transparent 70%)` }} />
        <div className="absolute inset-y-0 right-0 w-1/2 opacity-10" style={{ background: `radial-gradient(ellipse at 100% 50%, ${homeColor}, transparent 70%)` }} />
      </div>
      <div className="relative flex items-center justify-between px-4 py-2 border-b border-white/8">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[#00C8FF] animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-[#00C8FF]">Game of the Week</span>
        </div>
        <span className="text-[9px] text-white/30">{getWeekLabel(gotw.week).toUpperCase()} · SEASON {gotw.season}</span>
      </div>
      <div className="relative px-4 py-5">
        {(homeTeam || awayTeam) ? (
          <div className="flex items-center gap-4">
            <div className="flex-1 flex flex-col items-center gap-2 text-center">
              <TeamLogo abbreviation={awayTeam?.abbreviation ?? "???"} primaryColor={awayColor} size="lg" shape="circle" />
              <div>
                <p className="text-sm font-black text-white leading-tight">{awayTeam ? `${awayTeam.city} ${awayTeam.name}` : "TBD"}</p>
                {awayTeam && <p className="text-[10px] text-white/40">{awayTeam.wins}–{awayTeam.losses} · {awayTeam.conference}</p>}
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-center gap-1">
              {gotw.headline && <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 text-center mb-1 max-w-[120px]">{gotw.headline}</p>}
              <span className="text-2xl font-black text-white/20">VS</span>
              {gotw.kickoff && <p className="text-[9px] text-white/40 text-center mt-1">{gotw.kickoff}</p>}
            </div>
            <div className="flex-1 flex flex-col items-center gap-2 text-center">
              <TeamLogo abbreviation={homeTeam?.abbreviation ?? "???"} primaryColor={homeColor} size="lg" shape="circle" />
              <div>
                <p className="text-sm font-black text-white leading-tight">{homeTeam ? `${homeTeam.city} ${homeTeam.name}` : "TBD"}</p>
                {homeTeam && <p className="text-[10px] text-white/40">{homeTeam.wins}–{homeTeam.losses} · {homeTeam.conference}</p>}
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
      <p className="text-[10px] text-white/20">Admins can spotlight a matchup under Games → Game of Week</p>
    </div>
  );
}

// ── Latest Results ────────────────────────────────────────────────────────────

function LatestResults({ games, onNavigate }: {
  games: NonNullable<LeagueSummary["recent_games"]>;
  onNavigate?: (s: string) => void;
}) {
  const completed = games
    .filter(g => g.status === "COMPLETED" || g.status === "FINAL")
    .slice(0, 6);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Latest Results</span>
        <button
          onClick={() => onNavigate?.("games")}
          className="text-[9px] font-bold text-white/25 hover:text-[#00C8FF] transition-colors flex items-center gap-0.5"
        >
          ALL GAMES <ChevronRight className="h-2.5 w-2.5" />
        </button>
      </div>
      {completed.length === 0 ? (
        <div className="rounded-xl border border-white/6 bg-[#111] px-4 py-6 text-center">
          <p className="text-xs text-white/25">No completed games yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {completed.map((game) => (
            <Link key={game.id} href={`/games/${game.id}`} className="block">
              <ScoreCard game={game} />
            </Link>
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
    <div className="rounded-lg border border-white/8 bg-[#111] px-3 py-2.5 hover:border-[#00C8FF]/25 hover:bg-[#00C8FF]/3 transition-all">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-bold text-white/25 uppercase tracking-wider">{getWeekLabel(game.week)}</span>
        <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/6 text-white/30 font-bold uppercase">Final</span>
      </div>
      <div className="space-y-0.5">
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

// ── Stat Leader Panels ────────────────────────────────────────────────────────

type OffenseTab = "passing" | "rushing" | "receiving";
type DefenseTab = "tackles" | "sacks" | "interceptions";

function OffenseLeaders({ leaders, onNavigate }: { leaders?: StatLeaders; onNavigate?: (s: string) => void }) {
  const [tab, setTab] = useState<OffenseTab>("passing");
  const tabs: { key: OffenseTab; label: string }[] = [
    { key: "passing", label: "Passing" },
    { key: "rushing", label: "Rushing" },
    { key: "receiving", label: "Receiving" },
  ];
  return (
    <LeaderPanel
      title="Offense Leaders"
      tabs={tabs}
      activeTab={tab}
      onTab={(k) => setTab(k as OffenseTab)}
      entries={leaders?.[tab] ?? []}
      accentColor="#00C8FF"
      onNavigate={onNavigate}
    />
  );
}

function DefenseLeaders({ leaders, onNavigate }: { leaders?: StatLeaders; onNavigate?: (s: string) => void }) {
  const [tab, setTab] = useState<DefenseTab>("tackles");
  const tabs: { key: DefenseTab; label: string }[] = [
    { key: "tackles", label: "Tackles" },
    { key: "sacks", label: "Sacks" },
    { key: "interceptions", label: "INT" },
  ];
  return (
    <LeaderPanel
      title="Defense Leaders"
      tabs={tabs}
      activeTab={tab}
      onTab={(k) => setTab(k as DefenseTab)}
      entries={leaders?.[tab] ?? []}
      accentColor="#F44336"
      onNavigate={onNavigate}
    />
  );
}

function LeaderPanel({
  title, tabs, activeTab, onTab, entries, accentColor, onNavigate,
}: {
  title: string;
  tabs: { key: string; label: string }[];
  activeTab: string;
  onTab: (k: string) => void;
  entries: PlayerStatLine[];
  accentColor: string;
  onNavigate?: (s: string) => void;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#111] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/8 bg-[#0d0d0d] flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{title}</span>
        <span className="text-[9px] text-white/20">SEASON</span>
      </div>
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

      {entries.length === 0 ? (
        <p className="py-5 text-center text-white/20 text-[10px]">No stats yet — import games to see leaders</p>
      ) : entries.map((e, i) => (
        <LeaderRow key={`${e.player.id}-${i}`} entry={e} rank={i + 1} accentColor={accentColor} isLast={i === entries.length - 1} />
      ))}

      <button
        onClick={() => onNavigate?.("statistics")}
        className="flex items-center justify-center gap-1 py-2 w-full text-[9px] font-bold text-white/25 hover:text-[#00C8FF] bg-[#0d0d0d] border-t border-white/8 transition-colors"
      >
        VIEW FULL STATISTICS <ChevronRight className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

function LeaderRow({ entry: e, rank, accentColor, isLast }: {
  entry: PlayerStatLine;
  rank: number;
  accentColor: string;
  isLast: boolean;
}) {
  const [portraitErr, setPortraitErr] = useState(false);
  const hasPortrait = !!e.player.portrait_id && !portraitErr;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 transition-colors hover:brightness-110 ${!isLast ? "border-b border-white/5" : ""}`}
      style={rowGradient(e.team_color)}
    >
      {/* Rank */}
      <span
        className="text-[10px] font-black h-4 w-4 rounded-full flex items-center justify-center shrink-0"
        style={{
          backgroundColor: rank === 1 ? `${accentColor}30` : "transparent",
          color: rank === 1 ? accentColor : "rgba(255,255,255,0.2)",
        }}
      >
        {rank}
      </span>

      {/* Portrait */}
      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-white/5 border border-white/10">
        {hasPortrait ? (
          <img
            src={eaPortraitUrl(e.player.portrait_id!)}
            alt={e.player.name}
            className="w-full h-full object-cover object-[center_10%] scale-125"
            loading="lazy"
            onError={() => setPortraitErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-white/30">
            {e.player.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Name + team */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/players/${e.player.id}`}
          className="block text-[11px] font-bold text-white hover:text-[#00C8FF] transition-colors truncate leading-tight"
        >
          {e.player.name}
        </Link>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[8px] font-bold text-white/30">{e.player.position}</span>
          <span className="text-[8px] text-white/15">·</span>
          <Link
            href={e.team_id ? `/teams/${e.team_id}` : "#"}
            className="text-[8px] text-white/30 hover:text-[#00C8FF] transition-colors"
          >
            {e.team_abbreviation ?? e.team_name}
          </Link>
        </div>
      </div>

      {/* Stat */}
      <div className="text-right shrink-0">
        <p className="text-sm font-black tabular-nums leading-tight" style={{ color: accentColor }}>
          {fmtStat(e.stat_value, e.stat_label)}
        </p>
        <p className="text-[8px] text-white/25 uppercase leading-tight">{e.stat_label}</p>
      </div>
    </div>
  );
}
