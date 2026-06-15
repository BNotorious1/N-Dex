import { useState, useRef, useEffect } from "react";
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

type StatTab = "recap" | "team" | "boxscore";

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

function getTopPerformer(
  players: GamePlayerStat[],
  filter: (p: GamePlayerStat) => boolean,
  score: (p: GamePlayerStat) => number,
): GamePlayerStat | undefined {
  return [...players].filter(filter).sort((a, b) => score(b) - score(a))[0];
}

function getTopFour(players: GamePlayerStat[]): GamePlayerStat[] {
  const out: GamePlayerStat[] = [];
  const qb = getTopPerformer(players, (p) => (p.pss_att ?? 0) > 0, (p) => p.pss_yds ?? 0);
  const rb = getTopPerformer(players, (p) => (p.rsh_att ?? 0) > 0, (p) => p.rsh_yds ?? 0);
  const wr = getTopPerformer(players, (p) => (p.rec_catches ?? 0) > 0, (p) => p.rec_yds ?? 0);
  const def = getTopPerformer(players, hasDefenseStats, (p) =>
    (p.def_total_tackles ?? 0) + (p.def_sacks ?? 0) * 3 + (p.def_ints ?? 0) * 4,
  );
  if (qb) out.push(qb);
  if (rb) out.push(rb);
  if (wr) out.push(wr);
  if (def) out.push(def);
  return out;
}

function buildStatLine(p: GamePlayerStat): string {
  if ((p.pss_att ?? 0) > 0) {
    const parts = [`${p.pss_cmp ?? 0}/${p.pss_att ?? 0}`, `${p.pss_yds ?? 0} YDS`];
    if (p.pss_tds) parts.push(`${p.pss_tds} TD`);
    if (p.pss_ints) parts.push(`${p.pss_ints} INT`);
    return parts.join(", ");
  }
  if ((p.rsh_att ?? 0) > 0) {
    const parts = [`${p.rsh_att} CAR`, `${p.rsh_yds ?? 0} YDS`];
    if (p.rsh_tds) parts.push(`${p.rsh_tds} TD`);
    return parts.join(", ");
  }
  if ((p.rec_catches ?? 0) > 0) {
    const parts = [`${p.rec_catches} REC`, `${p.rec_yds ?? 0} YDS`];
    if (p.rec_tds) parts.push(`${p.rec_tds} TD`);
    return parts.join(", ");
  }
  if (hasDefenseStats(p)) {
    const parts = [`${p.def_total_tackles ?? 0} TKL`];
    if (p.def_sacks) parts.push(`${p.def_sacks} SCK`);
    if (p.def_pd) parts.push(`${p.def_pd} PD`);
    return parts.join(", ");
  }
  return "—";
}

function PlayerStatRow({ player }: { player: GamePlayerStat }) {
  const initials = player.player_name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.35)",
          border: "2px solid rgba(255,255,255,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 900,
          color: "white",
          flexShrink: 0,
          letterSpacing: "-0.01em",
        }}
      >
        {initials}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 900,
            color: "white",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            lineHeight: 1.15,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {player.player_name}
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: "rgba(255,255,255,0.72)",
            marginTop: 2,
            lineHeight: 1.3,
            fontWeight: 500,
          }}
        >
          {buildStatLine(player)}
        </div>
      </div>
    </div>
  );
}

interface RecapTabProps {
  leagueName: string;
  week: number;
  awayScore: number;
  homeScore: number;
  awayStats: TeamStats;
  homeStats: TeamStats;
  awayColor: string;
  homeColor: string;
  awayAbbr: string;
  homeAbbr: string;
  awayName: string;
  homeName: string;
  awayPlayers: GamePlayerStat[];
  homePlayers: GamePlayerStat[];
}

function RecapTab({
  leagueName,
  week,
  awayScore,
  homeScore,
  awayStats,
  homeStats,
  awayColor,
  homeColor,
  awayAbbr,
  homeAbbr,
  awayName,
  homeName,
  awayPlayers,
  homePlayers,
}: RecapTabProps) {
  const CARD_W = 1200;
  const CARD_H = 630;

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setScale(Math.min(1, el.clientWidth / CARD_W));
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const awayTop = getTopFour(awayPlayers);
  const homeTop = getTopFour(homePlayers);
  const awayWon = awayScore > homeScore;
  const homeWon = homeScore > awayScore;
  const noStats =
    awayPlayers.length === 0 && homePlayers.length === 0;

  const teamStats = [
    { label: "TOTAL YARDS",   away: awayStats.totalYds,  home: homeStats.totalYds  },
    { label: "PASSING YARDS", away: awayStats.passYds,   home: homeStats.passYds   },
    { label: "RUSHING YARDS", away: awayStats.rushYds,   home: homeStats.rushYds   },
    { label: "TURNOVERS",     away: awayStats.turnovers, home: homeStats.turnovers, lowerBetter: true },
  ];

  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#0b1520",
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `${awayAbbr}-vs-${homeAbbr}-week${week}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Recap export failed", err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Download button */}
      <div className="flex justify-end">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#00C8FF]/10 text-[#00C8FF] border border-[#00C8FF]/20 hover:bg-[#00C8FF]/20 transition-colors disabled:opacity-40"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {downloading ? "Exporting…" : "Download PNG"}
        </button>
      </div>

      {/* Scaled card wrapper */}
      <div ref={containerRef} className="w-full" style={{ position: "relative", height: CARD_H * scale }}>
        <div
          ref={cardRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: CARD_W,
            height: CARD_H,
            transformOrigin: "top left",
            transform: `scale(${scale})`,
            backgroundColor: "#0b1520",
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
            overflow: "hidden",
            borderRadius: 10,
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              textAlign: "center",
              padding: "18px 40px 14px",
              background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 100%)",
            }}
          >
            <div
              style={{
                fontSize: 34,
                fontWeight: 900,
                color: "white",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                lineHeight: 1,
              }}
            >
              [{leagueName}] – WEEK {week}
            </div>
          </div>

          {/* ── Scoreboard ── */}
          <div style={{ display: "flex", height: 126 }}>
            {/* Away team panel */}
            <div
              style={{
                flex: 1,
                background: awayColor,
                display: "flex",
                alignItems: "center",
                padding: "0 28px",
                gap: 18,
              }}
            >
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.25)",
                  border: "2.5px solid rgba(255,255,255,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 900,
                  color: "white",
                  flexShrink: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                {awayAbbr}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 3 }}>AWAY</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "white", lineHeight: 1, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                  {awayName}
                </div>
              </div>
              <div
                style={{
                  fontSize: 76,
                  fontWeight: 900,
                  color: awayWon ? "white" : "rgba(255,255,255,0.5)",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.02em",
                }}
              >
                {awayScore}
              </div>
            </div>

            {/* FINAL center box */}
            <div
              style={{
                width: 110,
                background: "#070d16",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: "white",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                FINAL
              </div>
            </div>

            {/* Home team panel */}
            <div
              style={{
                flex: 1,
                background: homeColor,
                display: "flex",
                alignItems: "center",
                padding: "0 28px",
                gap: 18,
                flexDirection: "row-reverse",
              }}
            >
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.25)",
                  border: "2.5px solid rgba(255,255,255,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 900,
                  color: "white",
                  flexShrink: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                {homeAbbr}
              </div>
              <div style={{ flex: 1, textAlign: "right" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 3 }}>HOME</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "white", lineHeight: 1, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                  {homeName}
                </div>
              </div>
              <div
                style={{
                  fontSize: 76,
                  fontWeight: 900,
                  color: homeWon ? "white" : "rgba(255,255,255,0.5)",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.02em",
                }}
              >
                {homeScore}
              </div>
            </div>
          </div>

          {/* ── Stats section ── */}
          <div style={{ display: "flex", height: CARD_H - 66 - 126, overflow: "hidden" }}>

            {/* Away player stats */}
            <div
              style={{
                flex: 1,
                background: `linear-gradient(135deg, ${awayColor}e8 0%, ${awayColor}b8 100%)`,
                padding: "20px 26px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: "white",
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  marginBottom: 16,
                  textAlign: "center",
                  borderBottom: "1px solid rgba(255,255,255,0.2)",
                  paddingBottom: 10,
                }}
              >
                PLAYER STATS
              </div>
              {noStats ? (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 40 }}>No stats recorded</div>
              ) : (
                awayTop.map((p, i) => <PlayerStatRow key={i} player={p} />)
              )}
            </div>

            {/* Team stats center */}
            <div
              style={{
                width: 272,
                background: "#070d16",
                padding: "20px 0",
                flexShrink: 0,
                borderLeft: "1px solid rgba(255,255,255,0.06)",
                borderRight: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: "white",
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  marginBottom: 14,
                  textAlign: "center",
                  fontStyle: "italic",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  paddingBottom: 10,
                  margin: "0 20px 14px",
                }}
              >
                TEAM STATS
              </div>
              {teamStats.map(({ label, away, home, lowerBetter }) => {
                const awayW = lowerBetter ? away < home : away > home;
                const homeW = lowerBetter ? home < away : home > away;
                return (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "11px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div
                      style={{
                        width: 60,
                        fontSize: 26,
                        fontWeight: 900,
                        color: awayW ? "white" : "rgba(255,255,255,0.35)",
                        textAlign: "center",
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {away}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        fontSize: 8.5,
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.38)",
                        textTransform: "uppercase",
                        letterSpacing: "0.09em",
                        textAlign: "center",
                        lineHeight: 1.3,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        width: 60,
                        fontSize: 26,
                        fontWeight: 900,
                        color: homeW ? "white" : "rgba(255,255,255,0.35)",
                        textAlign: "center",
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {home}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Home player stats */}
            <div
              style={{
                flex: 1,
                background: `linear-gradient(135deg, ${homeColor}b8 0%, ${homeColor}e8 100%)`,
                padding: "20px 26px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: "white",
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  marginBottom: 16,
                  textAlign: "center",
                  borderBottom: "1px solid rgba(255,255,255,0.2)",
                  paddingBottom: 10,
                }}
              >
                PLAYER STATS
              </div>
              {noStats ? (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 40 }}>No stats recorded</div>
              ) : (
                homeTop.map((p, i) => <PlayerStatRow key={i} player={p} />)
              )}
            </div>
          </div>

          {/* ── Branding watermark ── */}
          <div
            style={{
              position: "absolute",
              bottom: 9,
              right: 16,
              fontSize: 10,
              fontWeight: 900,
              color: "rgba(255,255,255,0.18)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
            }}
          >
            N-DEX
          </div>
        </div>
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
    { key: "boxscore",  label: "Box Score" },
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
                {tab === "recap" && (
                  <RecapTab
                    leagueName={leagueSummary?.league?.name ?? ""}
                    week={game.week ?? 0}
                    awayScore={game.away_score ?? 0}
                    homeScore={game.home_score ?? 0}
                    awayStats={awayStats}
                    homeStats={homeStats}
                    awayColor={awayColor}
                    homeColor={homeColor}
                    awayAbbr={awayAbbr}
                    homeAbbr={homeAbbr}
                    awayName={awayName}
                    homeName={homeName}
                    awayPlayers={stats.filter((p) => !p.is_home_team)}
                    homePlayers={stats.filter((p) => p.is_home_team)}
                  />
                )}

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

                {tab === "boxscore" && (
                  <div className="space-y-8">
                    {/* Passing */}
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/30 mb-3">Passing</p>
                      <SplitStatTable
                        {...splitProps}
                        filter={hasPassingStats}
                        sortKey="pss_yds"
                        columns={[
                          { label: "CMP/ATT", key: "pss_cmp", render: (p) => `${p.pss_cmp ?? 0}/${p.pss_att ?? 0}` },
                          { label: "YDS",     key: "pss_yds" },
                          { label: "CMP%",    key: "pss_cmp", render: (p) => {
                            const att = p.pss_att ?? 0;
                            return att > 0 ? `${Math.round(((p.pss_cmp ?? 0) / att) * 100)}%` : "—";
                          }},
                          { label: "AVG",     key: "pss_yds", render: (p) => {
                            const att = p.pss_att ?? 0;
                            return att > 0 ? ((p.pss_yds ?? 0) / att).toFixed(1) : "—";
                          }},
                          { label: "TD",      key: "pss_tds" },
                          { label: "INT",     key: "pss_ints" },
                          { label: "SCK",     key: "pss_sacks" },
                          { label: "RTG",     key: "pss_rating" },
                        ]}
                      />
                    </div>

                    {/* Rushing */}
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/30 mb-3">Rushing</p>
                      <SplitStatTable
                        {...splitProps}
                        filter={hasRushingStats}
                        sortKey="rsh_yds"
                        columns={[
                          { label: "ATT", key: "rsh_att" },
                          { label: "YDS", key: "rsh_yds" },
                          { label: "AVG", key: "rsh_yds", render: (p) => {
                            const att = p.rsh_att ?? 0;
                            return att > 0 ? ((p.rsh_yds ?? 0) / att).toFixed(1) : "—";
                          }},
                          { label: "TD",  key: "rsh_tds" },
                          { label: "BTK", key: "rsh_btk" },
                          { label: "LNG", key: "rsh_lng" },
                          { label: "FMB", key: "fmb" },
                        ]}
                      />
                    </div>

                    {/* Receiving */}
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/30 mb-3">Receiving</p>
                      <SplitStatTable
                        {...splitProps}
                        filter={hasReceivingStats}
                        sortKey="rec_yds"
                        columns={[
                          { label: "REC", key: "rec_catches" },
                          { label: "YDS", key: "rec_yds" },
                          { label: "AVG", key: "rec_yds", render: (p) => {
                            const rec = p.rec_catches ?? 0;
                            return rec > 0 ? ((p.rec_yds ?? 0) / rec).toFixed(1) : "—";
                          }},
                          { label: "TD",  key: "rec_tds" },
                          { label: "YAC", key: "rec_yac" },
                          { label: "LNG", key: "rec_lng" },
                        ]}
                      />
                    </div>

                    {/* Defense */}
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/30 mb-3">Defense</p>
                      <SplitStatTable
                        {...splitProps}
                        filter={hasDefenseStats}
                        sortKey="def_total_tackles"
                        columns={[
                          { label: "TKL",  key: "def_total_tackles" },
                          { label: "SCK",  key: "def_sacks" },
                          { label: "INT",  key: "def_ints" },
                          { label: "PD",   key: "def_pd" },
                          { label: "FF",   key: "def_ff" },
                          { label: "TD",   key: "def_tds" },
                          { label: "CA",   key: "def_catches_allowed" },
                          { label: "FR",   key: "def_fum_rec" },
                          { label: "SFTY", key: "def_safeties" },
                        ]}
                      />
                    </div>

                    {/* Special Teams */}
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/30 mb-3">Special Teams</p>
                      <SplitSpecialTeams {...splitProps} />
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
