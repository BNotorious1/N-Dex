import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import {
  useGetLeaguePlayerStats,
  useGetLeagueStandings,
  getGetLeaguePlayerStatsQueryKey,
  getGetLeagueStandingsQueryKey,
} from "@workspace/api-client-react";
import type { PlayerSeasonStats, LeaguePlayerStats, StandingEntry } from "@workspace/api-client-react";

type SubTab = "leaders" | "passing" | "rushing" | "receiving" | "defense" | "kicking" | "team";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "leaders",   label: "League Leaders" },
  { key: "passing",   label: "Passing" },
  { key: "rushing",   label: "Rushing" },
  { key: "receiving", label: "Receiving" },
  { key: "defense",   label: "Defense" },
  { key: "kicking",   label: "Kicking/Punting" },
  { key: "team",      label: "Team" },
];

const C = {
  passing:  "#00C8FF",
  rushing:  "#22c55e",
  receiving:"#f59e0b",
  defense:  "#F44336",
  kicking:  "#a855f7",
  team:     "#64748b",
};

function n(v?: number): number { return v ?? 0; }
function pct(made: number, att: number): string {
  return att > 0 ? ((made / att) * 100).toFixed(1) : "—";
}
function perG(total: number, gp: number): string {
  return gp > 0 ? (total / gp).toFixed(1) : "—";
}
function per(yds: number, att: number): string {
  return att > 0 ? (yds / att).toFixed(1) : "—";
}
function d(v: number): string { return v > 0 ? String(v) : "—"; }

export default function StatisticsSection({ leagueId }: { leagueId: number }) {
  const [subTab, setSubTab] = useState<SubTab>("leaders");

  const { data: playerStats, isLoading } = useGetLeaguePlayerStats(leagueId, {
    query: { queryKey: getGetLeaguePlayerStatsQueryKey(leagueId) },
  });
  const { data: standings } = useGetLeagueStandings(leagueId, {
    query: { queryKey: getGetLeagueStandingsQueryKey(leagueId) },
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap border-b border-white/8 pb-3">
        {SUB_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
              subTab === tab.key
                ? "bg-[#00C8FF] text-black"
                : "text-white/50 hover:text-white hover:bg-white/8"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <p className="text-white/30 text-xs">Loading statistics…</p>
        </div>
      )}

      {!isLoading && playerStats && (
        <>
          {subTab === "leaders"   && <LeagueLeadersTab data={playerStats} />}
          {subTab === "passing"   && <PassingTab    players={playerStats.passing} />}
          {subTab === "rushing"   && <RushingTab    players={playerStats.rushing} />}
          {subTab === "receiving" && <ReceivingTab  players={playerStats.receiving} />}
          {subTab === "defense"   && <DefenseTab    players={playerStats.defense} />}
          {subTab === "kicking"   && <KickingPuntingTab kicking={playerStats.kicking} punting={playerStats.punting} />}
          {subTab === "team"      && <TeamTab data={playerStats} standings={standings ?? []} />}
        </>
      )}

      {!isLoading && !playerStats && (
        <div className="flex items-center justify-center py-20">
          <p className="text-white/30 text-xs">No statistics available yet. Stats populate after games are imported.</p>
        </div>
      )}
    </div>
  );
}

// ─── League Leaders ──────────────────────────────────────────────────────────

type LeaderDef = {
  label: string;
  color: string;
  pool: (d: LeaguePlayerStats) => PlayerSeasonStats[];
  scoreOf: (p: PlayerSeasonStats) => number;
  display: (p: PlayerSeasonStats) => string;
  unit: string;
};

const LEADER_DEFS: LeaderDef[] = [
  { label: "Pass Yards",   color: C.passing,   pool: d => d.passing,   scoreOf: p => n(p.pss_yds),   display: p => String(n(p.pss_yds)),  unit: "YDS" },
  { label: "Pass TDs",     color: C.passing,   pool: d => d.passing,   scoreOf: p => n(p.pss_tds),   display: p => String(n(p.pss_tds)),  unit: "TD" },
  { label: "Comp %",       color: C.passing,   pool: d => d.passing,   scoreOf: p => n(p.pss_cmp) / Math.max(n(p.pss_att), 1), display: p => pct(n(p.pss_cmp), n(p.pss_att)), unit: "PCT" },
  { label: "QB Rating",    color: C.passing,   pool: d => d.passing,   scoreOf: p => n(p.pss_rating), display: p => String(n(p.pss_rating)), unit: "RTG" },
  { label: "Rush Yards",   color: C.rushing,   pool: d => d.rushing,   scoreOf: p => n(p.rsh_yds),   display: p => String(n(p.rsh_yds)),  unit: "YDS" },
  { label: "Rush TDs",     color: C.rushing,   pool: d => d.rushing,   scoreOf: p => n(p.rsh_tds),   display: p => String(n(p.rsh_tds)),  unit: "TD" },
  { label: "Rush YPC",     color: C.rushing,   pool: d => d.rushing,   scoreOf: p => n(p.rsh_yds) / Math.max(n(p.rsh_att), 1), display: p => per(n(p.rsh_yds), n(p.rsh_att)), unit: "YPC" },
  { label: "Rec Yards",    color: C.receiving, pool: d => d.receiving, scoreOf: p => n(p.rec_yds),   display: p => String(n(p.rec_yds)),  unit: "YDS" },
  { label: "Rec TDs",      color: C.receiving, pool: d => d.receiving, scoreOf: p => n(p.rec_tds),   display: p => String(n(p.rec_tds)),  unit: "TD" },
  { label: "Receptions",   color: C.receiving, pool: d => d.receiving, scoreOf: p => n(p.rec_catches), display: p => String(n(p.rec_catches)), unit: "REC" },
  { label: "Tackles",      color: C.defense,   pool: d => d.defense,   scoreOf: p => n(p.def_total_tackles), display: p => String(n(p.def_total_tackles)), unit: "TKL" },
  { label: "Sacks",        color: C.defense,   pool: d => d.defense,   scoreOf: p => n(p.def_sacks), display: p => String(n(p.def_sacks)), unit: "SCK" },
  { label: "Interceptions",color: C.defense,   pool: d => d.defense,   scoreOf: p => n(p.def_ints),  display: p => String(n(p.def_ints)),  unit: "INT" },
  { label: "Pass Deflect", color: C.defense,   pool: d => d.defense,   scoreOf: p => n(p.def_pd),    display: p => String(n(p.def_pd)),    unit: "PD" },
  { label: "Forced Fmb",   color: C.defense,   pool: d => d.defense,   scoreOf: p => n(p.def_ff),    display: p => String(n(p.def_ff)),    unit: "FF" },
  { label: "FG Made",      color: C.kicking,   pool: d => d.kicking,   scoreOf: p => n(p.fg_made),   display: p => `${n(p.fg_made)}/${n(p.fg_att)}`, unit: "FGM/A" },
  { label: "FG %",         color: C.kicking,   pool: d => d.kicking,   scoreOf: p => n(p.fg_made) / Math.max(n(p.fg_att), 1), display: p => pct(n(p.fg_made), n(p.fg_att)), unit: "FG%" },
  { label: "Punt Avg",     color: C.kicking,   pool: d => d.punting,   scoreOf: p => n(p.punt_avg),  display: p => String(n(p.punt_avg)),  unit: "AVG" },
];

function LeaderCard({ def, data }: { def: LeaderDef; data: LeaguePlayerStats }) {
  const pool = def.pool(data).filter(p => def.scoreOf(p) > 0);
  const top = pool.reduce<PlayerSeasonStats | null>((best, p) =>
    !best || def.scoreOf(p) > def.scoreOf(best) ? p : best, null);

  return (
    <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden flex flex-col">
      <div className="h-1" style={{ backgroundColor: def.color }} />
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: def.color }}>{def.label}</p>
        {top ? (
          <>
            <Link href={`/players/${top.player.id}`} className="text-sm font-bold text-white hover:underline leading-tight truncate">
              {top.player.name}
            </Link>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded border border-white/12 bg-white/5 font-bold text-white/60">{top.player.position}</span>
              <span className="text-[10px] text-white/40 truncate">{top.team_name}</span>
            </div>
            <div className="mt-auto pt-1 flex items-baseline gap-1">
              <span className="text-2xl font-black" style={{ color: def.color }}>{def.display(top)}</span>
              <span className="text-[9px] text-white/30 font-bold">{def.unit}</span>
            </div>
          </>
        ) : (
          <p className="text-[11px] text-white/20 mt-2">No data</p>
        )}
      </div>
    </div>
  );
}

function LeagueLeadersTab({ data }: { data: LeaguePlayerStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {LEADER_DEFS.map(def => (
        <LeaderCard key={def.label} def={def} data={data} />
      ))}
    </div>
  );
}

// ─── Sortable Table ───────────────────────────────────────────────────────────

type ColDef<T> = {
  key: string;
  label: string;
  title?: string;
  sortVal: (row: T) => number | string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  bold?: boolean;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
type PageSize = typeof PAGE_SIZE_OPTIONS[number];

function SortableTable<T>({
  rows,
  cols,
  defaultKey,
  defaultDir = "desc",
  emptyMsg = "No data",
}: {
  rows: T[];
  cols: ColDef<T>[];
  defaultKey: string;
  defaultDir?: "asc" | "desc";
  emptyMsg?: string;
}) {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultDir);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>(10);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
    setPage(0);
  }

  const sorted = useMemo(() => {
    const col = cols.find(c => c.key === sortKey);
    if (!col) return rows;
    return [...rows].sort((a, b) => {
      const av = col.sortVal(a);
      const bv = col.sortVal(b);
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, cols, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const firstRank = safePage * pageSize;

  return (
    <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/8" style={{ backgroundColor: "#0f0f0f" }}>
            <th className="px-3 py-2.5 text-left w-8 text-[10px] font-black uppercase tracking-wider text-white/30">#</th>
            {cols.map(col => (
              <th
                key={col.key}
                onClick={() => toggleSort(col.key)}
                title={col.title}
                className={`px-3 py-2.5 text-[10px] font-black uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors ${
                  sortKey === col.key ? "text-[#00C8FF]" : "text-white/30 hover:text-white/60"
                } ${col.align === "left" ? "text-left" : col.align === "right" ? "text-right" : "text-center"}`}
              >
                <span className="inline-flex items-center gap-0.5">
                  {col.label}
                  {sortKey === col.key
                    ? sortDir === "desc"
                      ? <ChevronDown className="w-2.5 h-2.5" />
                      : <ChevronUp className="w-2.5 h-2.5" />
                    : <ChevronsUpDown className="w-2.5 h-2.5 opacity-30" />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={cols.length + 1} className="py-10 text-center text-white/25 text-[11px]">{emptyMsg}</td>
            </tr>
          ) : pageRows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors last:border-0">
              <td className="px-3 py-2.5 text-white/20 text-[11px]">{firstRank + i + 1}</td>
              {cols.map(col => (
                <td
                  key={col.key}
                  className={`px-3 py-2.5 whitespace-nowrap ${col.bold ? "font-bold text-white" : "text-white/70"} ${
                    col.align === "left" ? "text-left" : col.align === "right" ? "text-right" : "text-center"
                  }`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {sorted.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-white/8 bg-[#0f0f0f]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/30 whitespace-nowrap">Rows per page:</span>
            <div className="flex gap-1">
              {PAGE_SIZE_OPTIONS.map(sz => (
                <button
                  key={sz}
                  onClick={() => { setPageSize(sz); setPage(0); }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    pageSize === sz
                      ? "bg-[#00C8FF] text-black"
                      : "text-white/40 hover:text-white hover:bg-white/8"
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/30 whitespace-nowrap">
              {firstRank + 1}–{Math.min(firstRank + pageSize, sorted.length)} of {sorted.length}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="px-2.5 py-1 rounded text-[10px] font-bold text-white/40 hover:text-white hover:bg-white/8 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                ‹ Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
                className="px-2.5 py-1 rounded text-[10px] font-bold text-white/40 hover:text-white hover:bg-white/8 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                Next ›
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerCell({ p }: { p: PlayerSeasonStats }) {
  return (
    <div className="flex flex-col gap-0.5">
      <Link href={`/players/${p.player.id}`} className="font-bold text-white hover:text-[#00C8FF] transition-colors">
        {p.player.name}
      </Link>
      <span className="text-[9px] text-white/35">{p.team_name}</span>
    </div>
  );
}

function PosBadge({ pos }: { pos: string }) {
  return (
    <span className="rounded border border-white/12 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-white/55">
      {pos}
    </span>
  );
}

// ─── Passing Tab ─────────────────────────────────────────────────────────────

function PassingTab({ players }: { players: PlayerSeasonStats[] }) {
  const cols: ColDef<PlayerSeasonStats>[] = [
    { key: "player",     label: "Player",  align: "left", bold: true, sortVal: p => p.player.name,  render: p => <PlayerCell p={p} /> },
    { key: "pos",        label: "Pos",     align: "center", sortVal: p => p.player.position, render: p => <PosBadge pos={p.player.position} /> },
    { key: "gp",         label: "GP",      title: "Games Played",  align: "center", sortVal: p => p.gp,          render: p => p.gp },
    { key: "pss_att",    label: "ATT",     title: "Attempts",      align: "center", sortVal: p => n(p.pss_att),  render: p => d(n(p.pss_att)) },
    { key: "pss_cmp",    label: "CMP",     title: "Completions",   align: "center", sortVal: p => n(p.pss_cmp),  render: p => d(n(p.pss_cmp)) },
    { key: "cmp_pct",    label: "PCT",     title: "Completion %",  align: "center", sortVal: p => n(p.pss_cmp) / Math.max(n(p.pss_att), 1), render: p => pct(n(p.pss_cmp), n(p.pss_att)) },
    { key: "pss_yds",    label: "YDS",     title: "Pass Yards",    align: "center", bold: true, sortVal: p => n(p.pss_yds),  render: p => <span className="font-black text-[#00C8FF]">{d(n(p.pss_yds))}</span> },
    { key: "ypg",        label: "YDS/G",   title: "Yards per Game", align: "center", sortVal: p => n(p.pss_yds) / Math.max(p.gp, 1), render: p => perG(n(p.pss_yds), p.gp) },
    { key: "pss_tds",    label: "TD",      title: "Passing TDs",   align: "center", sortVal: p => n(p.pss_tds),  render: p => n(p.pss_tds) > 0 ? <span className="text-green-400 font-bold">{p.pss_tds}</span> : "—" },
    { key: "pss_ints",   label: "INT",     title: "Interceptions", align: "center", sortVal: p => n(p.pss_ints), render: p => n(p.pss_ints) > 0 ? <span className="text-red-400">{p.pss_ints}</span> : "—" },
    { key: "pss_sacks",  label: "SCK",     title: "Times Sacked",  align: "center", sortVal: p => n(p.pss_sacks), render: p => d(n(p.pss_sacks)) },
    { key: "pss_lng",    label: "LNG",     title: "Long Pass",     align: "center", sortVal: p => n(p.pss_lng),  render: p => d(n(p.pss_lng)) },
    { key: "pss_rating", label: "RTG",     title: "QB Rating",     align: "center", sortVal: p => n(p.pss_rating), render: p => d(n(p.pss_rating)) },
  ];
  return <SortableTable rows={players} cols={cols} defaultKey="pss_yds" emptyMsg="No passing stats yet" />;
}

// ─── Rushing Tab ──────────────────────────────────────────────────────────────

function RushingTab({ players }: { players: PlayerSeasonStats[] }) {
  const cols: ColDef<PlayerSeasonStats>[] = [
    { key: "player",  label: "Player", align: "left",   bold: true, sortVal: p => p.player.name,   render: p => <PlayerCell p={p} /> },
    { key: "pos",     label: "Pos",   align: "center",  sortVal: p => p.player.position, render: p => <PosBadge pos={p.player.position} /> },
    { key: "gp",      label: "GP",    title: "Games Played", align: "center", sortVal: p => p.gp,         render: p => p.gp },
    { key: "rsh_att", label: "CAR",   title: "Carries",     align: "center", sortVal: p => n(p.rsh_att), render: p => d(n(p.rsh_att)) },
    { key: "rsh_yds", label: "YDS",   title: "Rush Yards",  align: "center", bold: true, sortVal: p => n(p.rsh_yds), render: p => <span className="font-black text-[#22c55e]">{d(n(p.rsh_yds))}</span> },
    { key: "ypg",     label: "YDS/G", title: "Yards per Game", align: "center", sortVal: p => n(p.rsh_yds) / Math.max(p.gp, 1), render: p => perG(n(p.rsh_yds), p.gp) },
    { key: "ypc",     label: "AVG",   title: "Yards per Carry", align: "center", sortVal: p => n(p.rsh_yds) / Math.max(n(p.rsh_att), 1), render: p => per(n(p.rsh_yds), n(p.rsh_att)) },
    { key: "rsh_tds", label: "TD",    title: "Rush TDs",    align: "center", sortVal: p => n(p.rsh_tds), render: p => n(p.rsh_tds) > 0 ? <span className="text-green-400 font-bold">{p.rsh_tds}</span> : "—" },
    { key: "rsh_lng", label: "LNG",   title: "Long Rush",   align: "center", sortVal: p => n(p.rsh_lng), render: p => d(n(p.rsh_lng)) },
    { key: "rsh_btk", label: "BTK",   title: "Broken Tackles", align: "center", sortVal: p => n(p.rsh_btk), render: p => d(n(p.rsh_btk)) },
    { key: "fmb",     label: "FMB",   title: "Fumbles",     align: "center", sortVal: p => n(p.fmb),     render: p => n(p.fmb) > 0 ? <span className="text-red-400">{p.fmb}</span> : "—" },
  ];
  return <SortableTable rows={players} cols={cols} defaultKey="rsh_yds" emptyMsg="No rushing stats yet" />;
}

// ─── Receiving Tab ────────────────────────────────────────────────────────────

function ReceivingTab({ players }: { players: PlayerSeasonStats[] }) {
  const cols: ColDef<PlayerSeasonStats>[] = [
    { key: "player",     label: "Player", align: "left",   bold: true, sortVal: p => p.player.name,    render: p => <PlayerCell p={p} /> },
    { key: "pos",        label: "Pos",   align: "center",  sortVal: p => p.player.position, render: p => <PosBadge pos={p.player.position} /> },
    { key: "gp",         label: "GP",    title: "Games Played",  align: "center", sortVal: p => p.gp,            render: p => p.gp },
    { key: "rec_catches",label: "REC",   title: "Receptions",    align: "center", sortVal: p => n(p.rec_catches), render: p => d(n(p.rec_catches)) },
    { key: "rec_tgts",   label: "TGTS",  title: "Targets",       align: "center", sortVal: p => n(p.rec_tgts),   render: p => d(n(p.rec_tgts)) },
    { key: "rec_yds",    label: "YDS",   title: "Rec Yards",     align: "center", bold: true, sortVal: p => n(p.rec_yds), render: p => <span className="font-black text-[#f59e0b]">{d(n(p.rec_yds))}</span> },
    { key: "ypg",        label: "YDS/G", title: "Yards per Game", align: "center", sortVal: p => n(p.rec_yds) / Math.max(p.gp, 1), render: p => perG(n(p.rec_yds), p.gp) },
    { key: "ypr",        label: "AVG",   title: "Yards per Rec", align: "center", sortVal: p => n(p.rec_yds) / Math.max(n(p.rec_catches), 1), render: p => per(n(p.rec_yds), n(p.rec_catches)) },
    { key: "rec_tds",    label: "TD",    title: "Receiving TDs", align: "center", sortVal: p => n(p.rec_tds),    render: p => n(p.rec_tds) > 0 ? <span className="text-green-400 font-bold">{p.rec_tds}</span> : "—" },
    { key: "rec_lng",    label: "LNG",   title: "Long Rec",      align: "center", sortVal: p => n(p.rec_lng),    render: p => d(n(p.rec_lng)) },
    { key: "rec_drops",  label: "DRP",   title: "Drops",         align: "center", sortVal: p => n(p.rec_drops),  render: p => n(p.rec_drops) > 0 ? <span className="text-red-400">{p.rec_drops}</span> : "—" },
    { key: "rec_yac",    label: "YAC",   title: "Yards After Catch", align: "center", sortVal: p => n(p.rec_yac), render: p => d(n(p.rec_yac)) },
  ];
  return <SortableTable rows={players} cols={cols} defaultKey="rec_yds" emptyMsg="No receiving stats yet" />;
}

// ─── Defense Tab ──────────────────────────────────────────────────────────────

function DefenseTab({ players }: { players: PlayerSeasonStats[] }) {
  const cols: ColDef<PlayerSeasonStats>[] = [
    { key: "player",           label: "Player", align: "left",   bold: true, sortVal: p => p.player.name,          render: p => <PlayerCell p={p} /> },
    { key: "pos",              label: "Pos",   align: "center",  sortVal: p => p.player.position, render: p => <PosBadge pos={p.player.position} /> },
    { key: "gp",               label: "GP",    title: "Games Played",   align: "center", sortVal: p => p.gp,                   render: p => p.gp },
    { key: "def_total_tackles",label: "TKL",   title: "Tackles",         align: "center", bold: true, sortVal: p => n(p.def_total_tackles), render: p => <span className="font-black text-[#F44336]">{d(n(p.def_total_tackles))}</span> },
    { key: "def_tfl",          label: "TFL",   title: "Tackles for Loss",align: "center", sortVal: p => n(p.def_tfl),          render: p => d(n(p.def_tfl)) },
    { key: "def_sacks",        label: "SCK",   title: "Sacks",           align: "center", sortVal: p => n(p.def_sacks),        render: p => d(n(p.def_sacks)) },
    { key: "def_ints",         label: "INT",   title: "Interceptions",   align: "center", sortVal: p => n(p.def_ints),         render: p => d(n(p.def_ints)) },
    { key: "def_pd",           label: "PD",    title: "Pass Deflections",align: "center", sortVal: p => n(p.def_pd),           render: p => d(n(p.def_pd)) },
    { key: "def_ff",           label: "FF",    title: "Forced Fumbles",  align: "center", sortVal: p => n(p.def_ff),           render: p => d(n(p.def_ff)) },
    { key: "def_fum_rec",      label: "FR",    title: "Fumble Recoveries",align: "center", sortVal: p => n(p.def_fum_rec),    render: p => d(n(p.def_fum_rec)) },
    { key: "def_tds",          label: "TD",    title: "Defensive TDs",   align: "center", sortVal: p => n(p.def_tds),          render: p => n(p.def_tds) > 0 ? <span className="text-green-400 font-bold">{p.def_tds}</span> : "—" },
    { key: "def_safeties",     label: "SAF",   title: "Safeties",        align: "center", sortVal: p => n(p.def_safeties),     render: p => d(n(p.def_safeties)) },
  ];
  return <SortableTable rows={players} cols={cols} defaultKey="def_total_tackles" emptyMsg="No defensive stats yet" />;
}

// ─── Kicking/Punting Tab ──────────────────────────────────────────────────────

function KickingPuntingTab({ kicking, punting }: { kicking: PlayerSeasonStats[]; punting: PlayerSeasonStats[] }) {
  const kickCols: ColDef<PlayerSeasonStats>[] = [
    { key: "player",  label: "Player", align: "left",  bold: true, sortVal: p => p.player.name,  render: p => <PlayerCell p={p} /> },
    { key: "pos",     label: "Pos",   align: "center", sortVal: p => p.player.position, render: p => <PosBadge pos={p.player.position} /> },
    { key: "gp",      label: "GP",    title: "Games Played", align: "center", sortVal: p => p.gp, render: p => p.gp },
    { key: "fg_made", label: "FGM",   title: "FG Made",      align: "center", bold: true, sortVal: p => n(p.fg_made), render: p => <span className="font-black text-[#a855f7]">{d(n(p.fg_made))}</span> },
    { key: "fg_att",  label: "FGA",   title: "FG Attempts",  align: "center", sortVal: p => n(p.fg_att),  render: p => d(n(p.fg_att)) },
    { key: "fg_pct",  label: "FG%",   title: "FG %",         align: "center", sortVal: p => n(p.fg_made) / Math.max(n(p.fg_att), 1), render: p => pct(n(p.fg_made), n(p.fg_att)) },
    { key: "xp_made", label: "XPM",   title: "XP Made",      align: "center", sortVal: p => n(p.xp_made), render: p => d(n(p.xp_made)) },
    { key: "xp_att",  label: "XPA",   title: "XP Attempts",  align: "center", sortVal: p => n(p.xp_att),  render: p => d(n(p.xp_att)) },
    { key: "xp_pct",  label: "XP%",   title: "XP %",         align: "center", sortVal: p => n(p.xp_made) / Math.max(n(p.xp_att), 1), render: p => pct(n(p.xp_made), n(p.xp_att)) },
    { key: "fg_lng",  label: "LNG",   title: "Long FG",      align: "center", sortVal: p => n(p.fg_lng),  render: p => d(n(p.fg_lng)) },
  ];

  const puntCols: ColDef<PlayerSeasonStats>[] = [
    { key: "player",   label: "Player", align: "left",  bold: true, sortVal: p => p.player.name,   render: p => <PlayerCell p={p} /> },
    { key: "pos",      label: "Pos",   align: "center", sortVal: p => p.player.position, render: p => <PosBadge pos={p.player.position} /> },
    { key: "gp",       label: "GP",    title: "Games Played",  align: "center", sortVal: p => p.gp,           render: p => p.gp },
    { key: "punt_att", label: "PUNT",  title: "Punts",          align: "center", bold: true, sortVal: p => n(p.punt_att),  render: p => d(n(p.punt_att)) },
    { key: "punt_yds", label: "YDS",   title: "Punt Yards",     align: "center", sortVal: p => n(p.punt_yds),  render: p => d(n(p.punt_yds)) },
    { key: "punt_avg", label: "AVG",   title: "Punt Average",   align: "center", bold: true, sortVal: p => n(p.punt_avg),  render: p => <span className="font-black text-[#a855f7]">{d(n(p.punt_avg))}</span> },
    { key: "punt_lng", label: "LNG",   title: "Long Punt",      align: "center", sortVal: p => n(p.punt_lng),  render: p => d(n(p.punt_lng)) },
    { key: "punt_in20",label: "IN20",  title: "Inside 20",      align: "center", sortVal: p => n(p.punt_in20), render: p => d(n(p.punt_in20)) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <SectionHeader color={C.kicking} label="Kicking" />
        <SortableTable rows={kicking} cols={kickCols} defaultKey="fg_made" emptyMsg="No kicking stats yet" />
      </div>
      <div>
        <SectionHeader color={C.kicking} label="Punting" />
        <SortableTable rows={punting} cols={puntCols} defaultKey="punt_avg" emptyMsg="No punting stats yet" />
      </div>
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

type TeamAgg = {
  team_name: string;
  team_color: string | null;
  gp: number;
  pf: number;
  pa: number;
  pass_yds: number;
  pass_tds: number;
  rush_yds: number;
  rush_tds: number;
  rec_yds: number;
  def_tackles: number;
  def_sacks: number;
  def_ints: number;
  def_pd: number;
  def_ff: number;
};

function TeamTab({ data, standings }: { data: LeaguePlayerStats; standings: StandingEntry[] }) {
  const teamMap = useMemo(() => {
    const seen = new Set<number>();
    const all: PlayerSeasonStats[] = [];
    for (const arr of [data.passing, data.rushing, data.receiving, data.defense, data.kicking, data.punting]) {
      for (const p of arr) {
        if (!seen.has(p.player.id)) { seen.add(p.player.id); all.push(p); }
      }
    }

    const map = new Map<string, TeamAgg>();
    for (const p of all) {
      const key = p.team_name;
      const e = map.get(key) ?? {
        team_name: p.team_name, team_color: p.team_color ?? null,
        gp: 0, pf: 0, pa: 0,
        pass_yds: 0, pass_tds: 0,
        rush_yds: 0, rush_tds: 0,
        rec_yds: 0,
        def_tackles: 0, def_sacks: 0, def_ints: 0, def_pd: 0, def_ff: 0,
      };
      e.pass_yds  += n(p.pss_yds);
      e.pass_tds  += n(p.pss_tds);
      e.rush_yds  += n(p.rsh_yds);
      e.rush_tds  += n(p.rsh_tds);
      e.rec_yds   += n(p.rec_yds);
      e.def_tackles += n(p.def_total_tackles);
      e.def_sacks += n(p.def_sacks);
      e.def_ints  += n(p.def_ints);
      e.def_pd    += n(p.def_pd);
      e.def_ff    += n(p.def_ff);
      map.set(key, e);
    }

    for (const s of standings) {
      const e = map.get(s.team.name);
      if (e) {
        e.gp = s.wins + s.losses + s.ties;
        e.pf = s.points_for;
        e.pa = s.points_against;
      }
    }

    return map;
  }, [data, standings]);

  const rows = Array.from(teamMap.values());

  const cols: ColDef<TeamAgg>[] = [
    { key: "team",      label: "Team",    align: "left",  bold: true, sortVal: r => r.team_name,  render: r => (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.team_color ?? "#888" }} />
        <span className="font-bold text-white">{r.team_name}</span>
      </div>
    )},
    { key: "gp",        label: "GP",      title: "Games Played",   align: "center", sortVal: r => r.gp,        render: r => r.gp || "—" },
    { key: "pf",        label: "PF",      title: "Points For",     align: "center", sortVal: r => r.pf,        render: r => <span className="font-bold text-green-400">{d(r.pf)}</span> },
    { key: "ppg",       label: "PPG",     title: "Points per Game",align: "center", sortVal: r => r.gp > 0 ? r.pf / r.gp : 0, render: r => perG(r.pf, r.gp) },
    { key: "pa",        label: "PA",      title: "Points Against", align: "center", sortVal: r => r.pa,        render: r => <span className="font-bold text-red-400">{d(r.pa)}</span> },
    { key: "pass_yds",  label: "PASS",    title: "Passing Yards",  align: "center", sortVal: r => r.pass_yds,  render: r => d(r.pass_yds) },
    { key: "rush_yds",  label: "RUSH",    title: "Rushing Yards",  align: "center", sortVal: r => r.rush_yds,  render: r => d(r.rush_yds) },
    { key: "off_tds",   label: "TD",      title: "Offensive TDs",  align: "center", sortVal: r => r.pass_tds + r.rush_tds, render: r => d(r.pass_tds + r.rush_tds) },
    { key: "def_sacks", label: "SCK",     title: "Defensive Sacks",align: "center", sortVal: r => r.def_sacks, render: r => d(r.def_sacks) },
    { key: "def_ints",  label: "INT",     title: "Def Interceptions",align:"center", sortVal: r => r.def_ints,  render: r => d(r.def_ints) },
    { key: "def_pd",    label: "PD",      title: "Pass Deflections",align:"center", sortVal: r => r.def_pd,    render: r => d(r.def_pd) },
  ];

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/30 text-xs">No team stats available yet.</p>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader color={C.team} label="Team Statistics" />
      <SortableTable rows={rows} cols={cols} defaultKey="pf" emptyMsg="No team data yet" />
    </div>
  );
}

// ─── Shared Utilities ─────────────────────────────────────────────────────────

function SectionHeader({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-1 w-5 rounded-full" style={{ backgroundColor: color }} />
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</p>
    </div>
  );
}
