import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import {
  useGetLeagueStatsMeta,
  useGetLeagueStandings,
  getGetLeagueStatsMetaQueryKey,
  getGetLeagueStandingsQueryKey,
} from "@workspace/api-client-react";
import type { PlayerSeasonStats, LeaguePlayerStats, StandingEntry } from "@workspace/api-client-react";
import TeamLogo from "../../TeamLogo";

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

const POSITIONS = [
  "QB", "HB", "WR", "TE",
  "LT", "LG", "C", "RG", "RT",
  "DL", "MIKE", "SAM", "WILL",
  "CB", "FS", "SS",
  "K", "P",
];

const C = {
  passing:  "#00C8FF",
  rushing:  "#22c55e",
  receiving:"#f59e0b",
  defense:  "#F44336",
  kicking:  "#a855f7",
  team:     "#64748b",
};

function n(v?: number | null): number { return v ?? 0; }
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
function rtg(v: number): string { return v > 0 ? v.toFixed(2) : "—"; }
function half(v: number): string { return v > 0 ? v.toFixed(1) : "—"; }

function eaPortraitUrl(portraitId: number): string {
  const direct = `https://ratings-images-prod.pulse.ea.com/madden-nfl-26/portraits/${portraitId}.png`;
  return `/api/proxy/image?url=${encodeURIComponent(direct)}`;
}

function rowGradient(color: string | null | undefined): React.CSSProperties {
  if (!color) return {};
  return {
    background: `linear-gradient(90deg, ${color}66 0%, ${color}28 50%, transparent 100%)`,
  };
}

export default function StatisticsSection({ leagueId }: { leagueId: number }) {
  const [subTab, setSubTab] = useState<SubTab>("leaders");

  const [filterSeason,        setFilterSeason]        = useState<number | null>(null);
  const [filterWeek,          setFilterWeek]          = useState<number | null>(null);
  const [filterTeam,          setFilterTeam]          = useState<string>("");
  const [filterPos,           setFilterPos]           = useState<string>("");
  const [filterRegularSeason, setFilterRegularSeason] = useState<boolean>(true);
  const [filterRookiesOnly,   setFilterRookiesOnly]   = useState<boolean>(false);

  const { data: statsMeta } = useGetLeagueStatsMeta(leagueId, {
    query: { queryKey: getGetLeagueStatsMetaQueryKey(leagueId) },
  });
  const { data: standings } = useGetLeagueStandings(leagueId, {
    query: { queryKey: getGetLeagueStandingsQueryKey(leagueId) },
  });

  const { data: playerStats, isLoading } = useQuery<LeaguePlayerStats>({
    queryKey: ["league-player-stats", leagueId, filterSeason, filterWeek, filterRegularSeason],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterSeason !== null) params.set("season", String(filterSeason));
      if (filterWeek   !== null) params.set("week",   String(filterWeek));
      if (!filterRegularSeason)  params.set("regularSeason", "false");
      const qs = params.toString();
      const res = await fetch(`/api/leagues/${leagueId}/stats/players${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch player stats");
      return res.json() as Promise<LeaguePlayerStats>;
    },
    enabled: true,
  });

  const availableWeeks = useMemo(() => {
    if (!statsMeta || filterSeason === null) return [];
    return statsMeta.weeks_by_season[String(filterSeason)] ?? [];
  }, [statsMeta, filterSeason]);

  const allTeams = useMemo(() => {
    if (!playerStats) return [];
    const seen = new Set<string>();
    const teams: { id: number; name: string }[] = [];
    for (const arr of [playerStats.passing, playerStats.rushing, playerStats.receiving, playerStats.defense, playerStats.kicking, playerStats.punting]) {
      for (const p of arr) {
        if (!seen.has(p.team_name)) {
          seen.add(p.team_name);
          teams.push({ id: p.team_id, name: p.team_name });
        }
      }
    }
    return teams.sort((a, b) => a.name.localeCompare(b.name));
  }, [playerStats]);

  function filterRows(rows: PlayerSeasonStats[]): PlayerSeasonStats[] {
    return rows.filter(p => {
      if (filterTeam      && p.team_name !== filterTeam)       return false;
      if (filterPos       && p.player.position !== filterPos)  return false;
      if (filterRookiesOnly && p.player.years_pro != null && p.player.years_pro !== 0) return false;
      return true;
    });
  }

  function filterAll(data: LeaguePlayerStats): LeaguePlayerStats {
    if (!filterRookiesOnly) return data;
    const f = (rows: PlayerSeasonStats[]) => filterRows(rows);
    return {
      passing:   f(data.passing),
      rushing:   f(data.rushing),
      receiving: f(data.receiving),
      defense:   f(data.defense),
      kicking:   f(data.kicking),
      punting:   f(data.punting),
    };
  }

  const showPlayerFilters = subTab !== "leaders" && subTab !== "team";

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

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={filterSeason === null ? "" : String(filterSeason)}
          onChange={v => {
            const s = v === "" ? null : Number(v);
            setFilterSeason(s);
            setFilterWeek(null);
          }}
          placeholder="All Time"
        >
          {(statsMeta?.seasons ?? []).map(s => (
            <option key={s} value={s}>Season {s}</option>
          ))}
        </FilterSelect>

        <FilterSelect
          value={filterWeek === null ? "" : String(filterWeek)}
          onChange={v => setFilterWeek(v === "" ? null : Number(v))}
          placeholder="All Weeks"
          disabled={filterSeason === null || availableWeeks.length === 0}
        >
          {availableWeeks.map(w => (
            <option key={w} value={w}>Week {w}</option>
          ))}
        </FilterSelect>

        {showPlayerFilters && (
          <>
            <FilterSelect
              value={filterTeam}
              onChange={setFilterTeam}
              placeholder="All Teams"
            >
              {allTeams.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </FilterSelect>

            <FilterSelect
              value={filterPos}
              onChange={setFilterPos}
              placeholder="All Positions"
            >
              {POSITIONS.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </FilterSelect>
          </>
        )}

        {(filterSeason !== null || filterWeek !== null || filterTeam || filterPos) && (
          <button
            onClick={() => { setFilterSeason(null); setFilterWeek(null); setFilterTeam(""); setFilterPos(""); }}
            className="text-[10px] text-white/35 hover:text-[#F44336] transition-colors font-bold px-1"
          >
            Clear
          </button>
        )}

        <div className="h-4 w-px bg-white/10 mx-1" />

        <FilterToggle active={filterRegularSeason} onClick={() => setFilterRegularSeason(v => !v)}>
          Regular Season
        </FilterToggle>
        <FilterToggle active={filterRookiesOnly} onClick={() => setFilterRookiesOnly(v => !v)}>
          Rookies Only
        </FilterToggle>
        <FilterToggle active={false} onClick={() => {}} disabled title="Coming soon">
          Excl. Simmed
        </FilterToggle>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <p className="text-white/30 text-xs">Loading statistics…</p>
        </div>
      )}

      {!isLoading && playerStats && (
        <>
          {subTab === "leaders"   && <LeagueLeadersTab data={filterAll(playerStats)} />}
          {subTab === "passing"   && <PassingTab    players={filterRows(playerStats.passing)} />}
          {subTab === "rushing"   && <RushingTab    players={filterRows(playerStats.rushing)} />}
          {subTab === "receiving" && <ReceivingTab  players={filterRows(playerStats.receiving)} />}
          {subTab === "defense"   && <DefenseTab    players={filterRows(playerStats.defense)} />}
          {subTab === "kicking"   && <KickingPuntingTab kicking={filterRows(playerStats.kicking)} punting={filterRows(playerStats.punting)} />}
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

// ─── Filter Toggle ────────────────────────────────────────────────────────────

function FilterToggle({
  active,
  onClick,
  disabled,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold border transition-colors select-none ${
        disabled
          ? "border-white/8 text-white/20 cursor-not-allowed"
          : active
            ? "border-[#00C8FF]/50 bg-[#00C8FF]/10 text-[#00C8FF]"
            : "border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
      }`}
    >
      <span className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center shrink-0 ${
        disabled ? "border-white/15" : active ? "border-[#00C8FF] bg-[#00C8FF]" : "border-white/30"
      }`}>
        {active && !disabled && <span className="block w-1 h-1 rounded-full bg-black" />}
      </span>
      {children}
    </button>
  );
}

// ─── Filter Select ────────────────────────────────────────────────────────────

function FilterSelect({
  value,
  onChange,
  placeholder,
  disabled,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="bg-[#1a1a1a] border border-white/10 text-white/70 text-[11px] rounded px-2.5 py-1.5 focus:outline-none focus:border-[#00C8FF]/50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}

// ─── League Leaders ──────────────────────────────────────────────────────────

function LeagueLeadersTab({ data }: { data: LeaguePlayerStats }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Offensive Leaders */}
        <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
          <div className="px-4 py-2.5 bg-[#0f0f0f] border-b border-white/8">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Offensive Leaders</p>
          </div>
          <LeaderPanel label="Passing"   unit="YDS" color={C.passing}   pool={data.passing}   scoreOf={p => n(p.pss_yds)}           display={p => d(n(p.pss_yds))} />
          <LeaderPanel label="Rushing"   unit="YDS" color={C.rushing}   pool={data.rushing}   scoreOf={p => n(p.rsh_yds)}           display={p => d(n(p.rsh_yds))} />
          <LeaderPanel label="Receiving" unit="YDS" color={C.receiving} pool={data.receiving} scoreOf={p => n(p.rec_yds)}           display={p => d(n(p.rec_yds))} />
        </div>

        {/* Defensive Leaders */}
        <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
          <div className="px-4 py-2.5 bg-[#0f0f0f] border-b border-white/8">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Defensive Leaders</p>
          </div>
          <LeaderPanel label="Tackles"       unit="TKL" color={C.defense} pool={data.defense} scoreOf={p => n(p.def_total_tackles)} display={p => d(n(p.def_total_tackles))} />
          <LeaderPanel label="Sacks"         unit="SCK" color={C.defense} pool={data.defense} scoreOf={p => n(p.def_sacks)}         display={p => half(n(p.def_sacks))} />
          <LeaderPanel label="Interceptions" unit="INT" color={C.defense} pool={data.defense} scoreOf={p => n(p.def_ints)}           display={p => d(n(p.def_ints))} />
        </div>
      </div>

      {/* Special Teams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
          <div className="px-4 py-2.5 bg-[#0f0f0f] border-b border-white/8">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Special Teams</p>
          </div>
          <LeaderPanel label="Field Goals" unit="FGM/A" color={C.kicking} pool={data.kicking} scoreOf={p => n(p.fg_made)}   display={p => `${n(p.fg_made)}/${n(p.fg_att)}`} />
          <LeaderPanel label="Punting"     unit="AVG"   color={C.kicking} pool={data.punting} scoreOf={p => n(p.punt_avg)} display={p => half(n(p.punt_avg))} />
        </div>
        <div className="hidden lg:block" />
      </div>
    </div>
  );
}

function LeaderPanel({
  label, unit, color, pool, scoreOf, display,
}: {
  label: string;
  unit: string;
  color: string;
  pool: PlayerSeasonStats[];
  scoreOf: (p: PlayerSeasonStats) => number;
  display: (p: PlayerSeasonStats) => string;
}) {
  const top5 = useMemo(() =>
    [...pool].filter(p => scoreOf(p) > 0).sort((a, b) => scoreOf(b) - scoreOf(a)).slice(0, 5),
    [pool]
  );

  return (
    <div className="border-b border-white/5 last:border-0" style={{ fontFamily: "'Lora', Georgia, serif" }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#111111]">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/55">{label}</span>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wider text-white/25">{unit}</span>
      </div>
      {top5.length === 0 ? (
        <div className="px-4 py-4 text-[11px] text-white/20">No data yet</div>
      ) : (
        top5.map((p, i) => (
          <LeaderRow key={p.player.id} rank={i + 1} p={p} value={display(p)} isLast={i === top5.length - 1} />
        ))
      )}
    </div>
  );
}

function LeaderRow({ rank, p, value, isLast }: {
  rank: number;
  p: PlayerSeasonStats;
  value: string;
  isLast: boolean;
}) {
  const [portraitErr, setPortraitErr] = useState(false);
  const hasPortrait = !!p.player.portrait_id && !portraitErr;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors ${!isLast ? "border-b border-white/5" : ""}`}
      style={rowGradient(p.team_color)}
    >
      <span className="w-4 shrink-0 text-center text-[11px] font-black text-white/20 tabular-nums">{rank}</span>

      <div className="w-[42px] h-[42px] rounded-full overflow-hidden shrink-0 bg-white/5 border border-white/10">
        {hasPortrait ? (
          <img
            src={eaPortraitUrl(p.player.portrait_id!)}
            alt={p.player.name}
            className="w-full h-full object-cover object-[center_10%] scale-125 translate-y-0.5"
            loading="lazy"
            onError={() => setPortraitErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[11px] font-black text-white/30">
            {p.player.name.charAt(0)}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <Link
          href={`/players/${p.player.id}`}
          className="block font-bold text-[13px] text-white hover:text-[#00C8FF] transition-colors leading-tight truncate"
        >
          {p.player.name}
        </Link>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[9px] font-bold text-white/30">{p.player.position}</span>
          <span className="text-[9px] text-white/15">·</span>
          <Link href={`/teams/${p.team_id}`} className="text-[9px] text-white/30 hover:text-[#00C8FF] transition-colors">
            {p.team_abbreviation}
          </Link>
        </div>
      </div>

      <span className="shrink-0 font-black text-[15px] text-[#ffffffb3] tabular-nums">{value}</span>
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
  getRowStyle,
}: {
  rows: T[];
  cols: ColDef<T>[];
  defaultKey: string;
  defaultDir?: "asc" | "desc";
  emptyMsg?: string;
  getRowStyle?: (row: T) => React.CSSProperties;
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
                <span className="inline-flex items-center gap-0.5 text-[#ffffff99] border-t-[#ffffff99] border-r-[#ffffff99] border-b-[#ffffff99] border-l-[#ffffff99]">
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
        <tbody style={{ fontFamily: "'Lora', Georgia, serif" }}>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={cols.length + 1} className="py-10 text-center text-white/25 text-[11px]">{emptyMsg}</td>
            </tr>
          ) : pageRows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-white/5 transition-colors last:border-0"
              style={getRowStyle ? getRowStyle(row) : undefined}
            >
              <td className="px-3 py-2 text-[11px] text-[#ffffff99]">{firstRank + i + 1}</td>
              {cols.map(col => (
                <td
                  key={col.key}
                  className={`px-3 py-2 whitespace-nowrap ${col.bold ? "font-bold text-white" : "text-white/70"} ${
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

// ─── Player Cell ─────────────────────────────────────────────────────────────

function PlayerCell({ p }: { p: PlayerSeasonStats }) {
  const [portraitErr, setPortraitErr] = useState(false);
  const hasPortrait = !!p.player.portrait_id && !portraitErr;

  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-white/5 border border-white/10">
        {hasPortrait ? (
          <img
            src={eaPortraitUrl(p.player.portrait_id!)}
            alt={p.player.name}
            className="w-full h-full object-cover object-[center_10%] scale-125 translate-y-0.5"
            loading="lazy"
            onError={() => setPortraitErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-white/30">
            {p.player.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <Link
          href={`/players/${p.player.id}`}
          className="font-bold text-white hover:text-[#00C8FF] transition-colors leading-tight"
        >
          {p.player.name}
        </Link>
        <Link
          href={`/teams/${p.team_id}`}
          className="text-[9px] text-white/35 hover:text-[#00C8FF] transition-colors leading-tight"
        >
          {p.team_name}
        </Link>
      </div>
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
    { key: "player",    label: "Player",  align: "left",   bold: true, sortVal: p => p.player.name,  render: p => <PlayerCell p={p} /> },
    { key: "pos",       label: "Pos",     align: "center", sortVal: p => p.player.position, render: p => <PosBadge pos={p.player.position} /> },
    { key: "gp",        label: "GP",      title: "Games Played",    align: "center", sortVal: p => p.gp,          render: p => p.gp },
    { key: "cmp_att",   label: "CMP/ATT", title: "Completions/Attempts", align: "center", sortVal: p => n(p.pss_att), render: p => <span>{d(n(p.pss_cmp))}<span className="text-white/30">/</span>{d(n(p.pss_att))}</span> },
    { key: "cmp_pct",   label: "PCT",     title: "Completion %",    align: "center", sortVal: p => n(p.pss_cmp) / Math.max(n(p.pss_att), 1), render: p => pct(n(p.pss_cmp), n(p.pss_att)) },
    { key: "pss_yds",   label: "YDS",     title: "Pass Yards",      align: "center", bold: true, sortVal: p => n(p.pss_yds),  render: p => <span className="font-black text-[#ffffffb3]">{d(n(p.pss_yds))}</span> },
    { key: "ypg",       label: "YDS/G",   title: "Yards per Game",  align: "center", sortVal: p => n(p.pss_yds) / Math.max(p.gp, 1), render: p => perG(n(p.pss_yds), p.gp) },
    { key: "pss_tds",   label: "TD",      title: "Passing TDs",     align: "center", sortVal: p => n(p.pss_tds),  render: p => n(p.pss_tds) > 0 ? <span className="font-bold text-[#ffffffb3]">{p.pss_tds}</span> : "—" },
    { key: "pss_ints",  label: "INT",     title: "Interceptions",   align: "center", sortVal: p => n(p.pss_ints), render: p => n(p.pss_ints) > 0 ? <span className="font-bold text-[#ffffffb3]">{p.pss_ints}</span> : "—" },
    { key: "pss_sacks", label: "SCK",     title: "Times Sacked",    align: "center", sortVal: p => n(p.pss_sacks), render: p => d(n(p.pss_sacks)) },
    { key: "pss_lng",   label: "LNG",     title: "Long Pass",       align: "center", sortVal: p => n(p.pss_lng),  render: p => d(n(p.pss_lng)) },
    { key: "pss_rating",label: "RTG",     title: "QB Rating",       align: "center", sortVal: p => n(p.pss_rating), render: p => <span className="font-bold">{rtg(n(p.pss_rating))}</span> },
  ];
  return (
    <SortableTable
      rows={players}
      cols={cols}
      defaultKey="pss_yds"
      emptyMsg="No passing stats yet"
      getRowStyle={p => rowGradient(p.team_color)}
    />
  );
}

// ─── Rushing Tab ──────────────────────────────────────────────────────────────

function RushingTab({ players }: { players: PlayerSeasonStats[] }) {
  const cols: ColDef<PlayerSeasonStats>[] = [
    { key: "player",  label: "Player", align: "left",   bold: true, sortVal: p => p.player.name,   render: p => <PlayerCell p={p} /> },
    { key: "pos",     label: "Pos",   align: "center",  sortVal: p => p.player.position, render: p => <PosBadge pos={p.player.position} /> },
    { key: "gp",      label: "GP",    title: "Games Played", align: "center", sortVal: p => p.gp,         render: p => p.gp },
    { key: "rsh_att", label: "CAR",   title: "Carries",     align: "center", sortVal: p => n(p.rsh_att), render: p => d(n(p.rsh_att)) },
    { key: "rsh_yds", label: "YDS",   title: "Rush Yards",  align: "center", bold: true, sortVal: p => n(p.rsh_yds), render: p => <span className="font-black text-[#ffffffb3]">{d(n(p.rsh_yds))}</span> },
    { key: "ypg",     label: "YDS/G", title: "Yards per Game", align: "center", sortVal: p => n(p.rsh_yds) / Math.max(p.gp, 1), render: p => perG(n(p.rsh_yds), p.gp) },
    { key: "ypc",     label: "AVG",   title: "Yards per Carry", align: "center", sortVal: p => n(p.rsh_yds) / Math.max(n(p.rsh_att), 1), render: p => per(n(p.rsh_yds), n(p.rsh_att)) },
    { key: "rsh_tds", label: "TD",    title: "Rush TDs",    align: "center", sortVal: p => n(p.rsh_tds), render: p => n(p.rsh_tds) > 0 ? <span className="font-bold text-[#ffffffb3]">{p.rsh_tds}</span> : "—" },
    { key: "rsh_lng", label: "LNG",   title: "Long Rush",   align: "center", sortVal: p => n(p.rsh_lng), render: p => d(n(p.rsh_lng)) },
    { key: "rsh_btk", label: "BTK",   title: "Broken Tackles", align: "center", sortVal: p => n(p.rsh_btk), render: p => d(n(p.rsh_btk)) },
    { key: "fmb",     label: "FMB",   title: "Fumbles",     align: "center", sortVal: p => n(p.fmb),     render: p => n(p.fmb) > 0 ? <span className="text-[#ffffffb3]">{p.fmb}</span> : "—" },
  ];
  return (
    <SortableTable
      rows={players}
      cols={cols}
      defaultKey="rsh_yds"
      emptyMsg="No rushing stats yet"
      getRowStyle={p => rowGradient(p.team_color)}
    />
  );
}

// ─── Receiving Tab ────────────────────────────────────────────────────────────

function ReceivingTab({ players }: { players: PlayerSeasonStats[] }) {
  const cols: ColDef<PlayerSeasonStats>[] = [
    { key: "player",     label: "Player", align: "left",   bold: true, sortVal: p => p.player.name,    render: p => <PlayerCell p={p} /> },
    { key: "pos",        label: "Pos",   align: "center",  sortVal: p => p.player.position, render: p => <PosBadge pos={p.player.position} /> },
    { key: "gp",         label: "GP",    title: "Games Played",  align: "center", sortVal: p => p.gp,            render: p => p.gp },
    { key: "rec_catches",label: "REC",   title: "Receptions",    align: "center", sortVal: p => n(p.rec_catches), render: p => d(n(p.rec_catches)) },
    { key: "rec_yds",    label: "YDS",   title: "Rec Yards",     align: "center", bold: true, sortVal: p => n(p.rec_yds), render: p => <span className="font-black text-[#ffffffb3]">{d(n(p.rec_yds))}</span> },
    { key: "ypg",        label: "YDS/G", title: "Yards per Game", align: "center", sortVal: p => n(p.rec_yds) / Math.max(p.gp, 1), render: p => perG(n(p.rec_yds), p.gp) },
    { key: "ypr",        label: "AVG",   title: "Yards per Rec", align: "center", sortVal: p => n(p.rec_yds) / Math.max(n(p.rec_catches), 1), render: p => per(n(p.rec_yds), n(p.rec_catches)) },
    { key: "rec_tds",    label: "TD",    title: "Receiving TDs", align: "center", sortVal: p => n(p.rec_tds),    render: p => n(p.rec_tds) > 0 ? <span className="font-bold text-[#ffffffb3]">{p.rec_tds}</span> : "—" },
    { key: "rec_lng",    label: "LNG",   title: "Long Rec",      align: "center", sortVal: p => n(p.rec_lng),    render: p => d(n(p.rec_lng)) },
    { key: "rec_drops",  label: "DRP",   title: "Drops",         align: "center", sortVal: p => n(p.rec_drops),  render: p => n(p.rec_drops) > 0 ? <span className="text-[#ffffffb3]">{p.rec_drops}</span> : "—" },
    { key: "rec_yac",    label: "YAC",   title: "Yards After Catch", align: "center", sortVal: p => n(p.rec_yac), render: p => d(n(p.rec_yac)) },
  ];
  return (
    <SortableTable
      rows={players}
      cols={cols}
      defaultKey="rec_yds"
      emptyMsg="No receiving stats yet"
      getRowStyle={p => rowGradient(p.team_color)}
    />
  );
}

// ─── Defense Tab ──────────────────────────────────────────────────────────────

function DefenseTab({ players }: { players: PlayerSeasonStats[] }) {
  const cols: ColDef<PlayerSeasonStats>[] = [
    { key: "player",           label: "Player", align: "left",   bold: true, sortVal: p => p.player.name,          render: p => <PlayerCell p={p} /> },
    { key: "pos",              label: "Pos",   align: "center",  sortVal: p => p.player.position, render: p => <PosBadge pos={p.player.position} /> },
    { key: "gp",               label: "GP",    title: "Games Played",    align: "center", sortVal: p => p.gp,                   render: p => p.gp },
    { key: "def_total_tackles",label: "TKL",   title: "Tackles",          align: "center", bold: true, sortVal: p => n(p.def_total_tackles), render: p => <span className="font-black text-[#ffffffb3]">{d(n(p.def_total_tackles))}</span> },
    { key: "def_tfl",          label: "TFL",   title: "Tackles for Loss", align: "center", sortVal: p => n(p.def_tfl),          render: p => half(n(p.def_tfl)) },
    { key: "def_sacks",        label: "SCK",   title: "Sacks",            align: "center", sortVal: p => n(p.def_sacks),        render: p => <span className="font-bold text-[#ffffffb3]">{half(n(p.def_sacks))}</span> },
    { key: "def_ints",         label: "INT",   title: "Interceptions",    align: "center", sortVal: p => n(p.def_ints),         render: p => d(n(p.def_ints)) },
    { key: "def_pd",           label: "PD",    title: "Pass Deflections", align: "center", sortVal: p => n(p.def_pd),           render: p => d(n(p.def_pd)) },
    { key: "def_ff",           label: "FF",    title: "Forced Fumbles",   align: "center", sortVal: p => n(p.def_ff),           render: p => d(n(p.def_ff)) },
    { key: "def_fum_rec",      label: "FR",    title: "Fumble Recoveries",align: "center", sortVal: p => n(p.def_fum_rec),    render: p => d(n(p.def_fum_rec)) },
    { key: "def_tds",          label: "TD",    title: "Defensive TDs",    align: "center", sortVal: p => n(p.def_tds),          render: p => n(p.def_tds) > 0 ? <span className="font-bold text-[#ffffffb3]">{p.def_tds}</span> : "—" },
    { key: "def_safeties",     label: "SAF",   title: "Safeties",         align: "center", sortVal: p => n(p.def_safeties),     render: p => d(n(p.def_safeties)) },
  ];
  return (
    <SortableTable
      rows={players}
      cols={cols}
      defaultKey="def_total_tackles"
      emptyMsg="No defensive stats yet"
      getRowStyle={p => rowGradient(p.team_color)}
    />
  );
}

// ─── Kicking/Punting Tab ──────────────────────────────────────────────────────

function KickingPuntingTab({ kicking, punting }: { kicking: PlayerSeasonStats[]; punting: PlayerSeasonStats[] }) {
  const kickCols: ColDef<PlayerSeasonStats>[] = [
    { key: "player",  label: "Player", align: "left",  bold: true, sortVal: p => p.player.name,  render: p => <PlayerCell p={p} /> },
    { key: "pos",     label: "Pos",   align: "center", sortVal: p => p.player.position, render: p => <PosBadge pos={p.player.position} /> },
    { key: "gp",      label: "GP",    title: "Games Played", align: "center", sortVal: p => p.gp, render: p => p.gp },
    { key: "fg_made", label: "FGM",   title: "FG Made",      align: "center", bold: true, sortVal: p => n(p.fg_made), render: p => <span className="font-black text-[#ffffffb3]">{d(n(p.fg_made))}</span> },
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
    { key: "punt_avg", label: "AVG",   title: "Punt Average",   align: "center", bold: true, sortVal: p => n(p.punt_avg),  render: p => <span className="font-black text-[#ffffffb3]">{d(n(p.punt_avg))}</span> },
    { key: "punt_lng", label: "LNG",   title: "Long Punt",      align: "center", sortVal: p => n(p.punt_lng),  render: p => d(n(p.punt_lng)) },
    { key: "punt_in20",label: "IN20",  title: "Inside 20",      align: "center", sortVal: p => n(p.punt_in20), render: p => d(n(p.punt_in20)) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <SectionHeader color={C.kicking} label="Kicking" />
        <SortableTable
          rows={kicking}
          cols={kickCols}
          defaultKey="fg_made"
          emptyMsg="No kicking stats yet"
          getRowStyle={p => rowGradient(p.team_color)}
        />
      </div>
      <div>
        <SectionHeader color={C.kicking} label="Punting" />
        <SortableTable
          rows={punting}
          cols={puntCols}
          defaultKey="punt_avg"
          emptyMsg="No punting stats yet"
          getRowStyle={p => rowGradient(p.team_color)}
        />
      </div>
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

type TeamAgg = {
  team_id: number;
  team_name: string;
  team_abbreviation: string;
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
        team_id: p.team_id,
        team_name: p.team_name,
        team_abbreviation: p.team_abbreviation,
        team_color: p.team_color ?? null,
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
    { key: "team", label: "Team", align: "left", bold: true, sortVal: r => r.team_name, render: r => (
      <Link href={`/teams/${r.team_id}`} className="flex items-center gap-2 group w-fit">
        <TeamLogo
          size="sm"
          abbreviation={r.team_abbreviation}
          primaryColor={r.team_color}
        />
        <span className="font-bold text-white group-hover:text-[#00C8FF] transition-colors">{r.team_name}</span>
      </Link>
    )},
    { key: "gp",        label: "GP",   title: "Games Played",   align: "center", sortVal: r => r.gp,        render: r => r.gp || "—" },
    { key: "pf",        label: "PF",   title: "Points For",     align: "center", sortVal: r => r.pf,        render: r => <span className="font-bold text-[#ffffffb3]">{d(r.pf)}</span> },
    { key: "ppg",       label: "PPG",  title: "Points per Game",align: "center", sortVal: r => r.gp > 0 ? r.pf / r.gp : 0, render: r => perG(r.pf, r.gp) },
    { key: "pa",        label: "PA",   title: "Points Against", align: "center", sortVal: r => r.pa,        render: r => <span className="font-bold text-[#ffffffb3]">{d(r.pa)}</span> },
    { key: "pass_yds",  label: "PASS", title: "Passing Yards",  align: "center", sortVal: r => r.pass_yds,  render: r => d(r.pass_yds) },
    { key: "rush_yds",  label: "RUSH", title: "Rushing Yards",  align: "center", sortVal: r => r.rush_yds,  render: r => d(r.rush_yds) },
    { key: "off_tds",   label: "TD",   title: "Offensive TDs",  align: "center", sortVal: r => r.pass_tds + r.rush_tds, render: r => d(r.pass_tds + r.rush_tds) },
    { key: "def_sacks", label: "SCK",  title: "Defensive Sacks",align: "center", sortVal: r => r.def_sacks, render: r => half(r.def_sacks) },
    { key: "def_ints",  label: "INT",  title: "Def Interceptions",align:"center", sortVal: r => r.def_ints,  render: r => d(r.def_ints) },
    { key: "def_pd",    label: "PD",   title: "Pass Deflections",align:"center", sortVal: r => r.def_pd,    render: r => d(r.def_pd) },
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
      <SortableTable
        rows={rows}
        cols={cols}
        defaultKey="pf"
        emptyMsg="No team data yet"
        getRowStyle={r => rowGradient(r.team_color)}
      />
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
