import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Ban, SlidersHorizontal } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";

interface LeaguePlayer {
  id: number; name: string; position: string;
  overall: number; age: number | null; speed: number;
  strength: number; awareness: number;
  throwing_power: number | null; catching: number | null; tackling: number | null;
  team_id: number; team_name: string; team_abbreviation: string;
  team_city: string; team_primary_color: string | null;
}

type SortKey = "overall" | "speed" | "strength" | "awareness" | "throwing_power" | "catching" | "tackling" | "age";
type Tab = "search" | "suspensions";

const PAGE_SIZE = 50;

const POSITION_GROUPS = [
  { label: "All", positions: null },
  { label: "QB", positions: ["QB"] },
  { label: "RB", positions: ["HB", "RB", "FB"] },
  { label: "WR", positions: ["WR"] },
  { label: "TE", positions: ["TE"] },
  { label: "OL", positions: ["LT", "LG", "C", "RG", "RT", "OT", "G"] },
  { label: "DL", positions: ["DE", "DT", "NT"] },
  { label: "LB", positions: ["MLB", "LOLB", "ROLB", "LB"] },
  { label: "CB", positions: ["CB"] },
  { label: "S", positions: ["FS", "SS", "S"] },
  { label: "K/P", positions: ["K", "P"] },
];

function getPositionStat(p: LeaguePlayer): { label: string; value: number | null } {
  if (["QB"].includes(p.position)) return { label: "THP", value: p.throwing_power };
  if (["WR", "TE", "HB", "RB", "FB"].includes(p.position)) return { label: "CTH", value: p.catching };
  if (["MLB", "LOLB", "ROLB", "LB", "CB", "FS", "SS", "S", "DE", "DT", "NT"].includes(p.position))
    return { label: "TAC", value: p.tackling };
  return { label: "AWR", value: p.awareness };
}

function ovrColor(v: number) {
  if (v >= 99) return "#FFD700";
  if (v >= 90) return "#F44336";
  if (v >= 80) return "#00C8FF";
  if (v >= 70) return "#22c55e";
  return "rgba(255,255,255,0.4)";
}

function StatChip({ value, color }: { value: number | null; color: string }) {
  if (value == null) return <span className="text-white/20 text-xs">—</span>;
  const bright = value >= 90;
  return (
    <span className="text-xs font-semibold tabular-nums" style={{ color: bright ? color : "rgba(255,255,255,0.45)" }}>
      {value}
    </span>
  );
}

function OvrBadge({ value }: { value: number }) {
  const c = ovrColor(value);
  return (
    <span
      className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[11px] font-black tabular-nums min-w-[28px]"
      style={{ color: c, backgroundColor: `${c}1a` }}
    >
      {value}
    </span>
  );
}

function SortTh({
  label, col, current, dir, onSort, className = "",
}: {
  label: string; col: SortKey; current: SortKey; dir: "asc" | "desc";
  onSort: (k: SortKey) => void; className?: string;
}) {
  const active = current === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-3 py-3 text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none transition-colors ${
        active ? "text-[#00C8FF]" : "text-white/30 hover:text-white/55"
      } ${className}`}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {active
          ? dir === "desc"
            ? <ChevronDown className="h-2.5 w-2.5" />
            : <ChevronUp className="h-2.5 w-2.5" />
          : <ChevronDown className="h-2.5 w-2.5 opacity-20" />}
      </span>
    </th>
  );
}

function PlayerSearchTab({ leagueId }: { leagueId: number }) {
  const [search, setSearch] = useState("");
  const [posGroup, setPosGroup] = useState("All");
  const [teamFilter, setTeamFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("overall");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);

  const { data: players, isLoading } = useQuery<LeaguePlayer[]>({
    queryKey: ["league-players", leagueId],
    queryFn: () => fetch(`/api/leagues/${leagueId}/players`).then((r) => r.json()),
    enabled: !!leagueId,
  });

  const teams = useMemo(() => {
    if (!players) return [];
    const seen = new Set<string>();
    return players.reduce<string[]>((acc, p) => {
      if (!seen.has(p.team_abbreviation)) { seen.add(p.team_abbreviation); acc.push(p.team_abbreviation); }
      return acc;
    }, []).sort();
  }, [players]);

  const selectedGroup = POSITION_GROUPS.find(g => g.label === posGroup) ?? POSITION_GROUPS[0];

  const filtered = useMemo(() => {
    if (!players) return [];
    return players
      .filter((p) => {
        const matchName = p.name.toLowerCase().includes(search.toLowerCase());
        const matchPos = !selectedGroup.positions || selectedGroup.positions.includes(p.position);
        const matchTeam = teamFilter === "All" || p.team_abbreviation === teamFilter;
        return matchName && matchPos && matchTeam;
      })
      .sort((a, b) => {
        const av = (a[sortKey] as number | null) ?? -1;
        const bv = (b[sortKey] as number | null) ?? -1;
        return sortDir === "desc" ? bv - av : av - bv;
      });
  }, [players, search, selectedGroup, teamFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
    setPage(1);
  };

  const resetPage = () => setPage(1);

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Name search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            placeholder="Search players..."
            className="bg-[#141414] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#00C8FF]/40 w-48 transition-colors"
          />
        </div>

        {/* Team dropdown */}
        <select
          value={teamFilter}
          onChange={(e) => { setTeamFilter(e.target.value); resetPage(); }}
          className="bg-[#141414] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 outline-none focus:border-[#00C8FF]/40 cursor-pointer"
        >
          <option value="All" className="bg-[#141414]">All Teams</option>
          {teams.map((t) => (
            <option key={t} value={t} className="bg-[#141414]">{t}</option>
          ))}
        </select>

        {/* Result count */}
        <span className="text-[10px] text-white/30 ml-auto tabular-nums">
          {filtered.length.toLocaleString()} players
        </span>
      </div>

      {/* Position group pills */}
      <div className="flex flex-wrap gap-1">
        {POSITION_GROUPS.map((g) => (
          <button
            key={g.label}
            onClick={() => { setPosGroup(g.label); resetPage(); }}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
              posGroup === g.label
                ? "bg-[#00C8FF] text-black"
                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className="border-b border-white/8 bg-[#0f0f0f]">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30 min-w-[180px]">Player</th>
              <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Team</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">POS</th>
              <SortTh label="OVR" col="overall"   current={sortKey} dir={sortDir} onSort={handleSort} className="text-center" />
              <SortTh label="AGE" col="age"        current={sortKey} dir={sortDir} onSort={handleSort} className="text-center" />
              <SortTh label="SPD" col="speed"      current={sortKey} dir={sortDir} onSort={handleSort} className="text-center" />
              <SortTh label="STR" col="strength"   current={sortKey} dir={sortDir} onSort={handleSort} className="text-center" />
              <SortTh label="AWR" col="awareness"  current={sortKey} dir={sortDir} onSort={handleSort} className="text-center" />
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">KEY</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(12)].map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  {[...Array(9)].map((__, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-3 bg-white/5 rounded animate-pulse" style={{ width: j === 0 ? 120 : 40 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length > 0 ? paginated.map((p) => {
              const { label: keyLabel, value: keyVal } = getPositionStat(p);
              return (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
                  {/* Player name */}
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/players/${p.id}`}
                      className="font-semibold text-white hover:text-[#00C8FF] transition-colors hover:underline underline-offset-2"
                    >
                      {p.name}
                    </Link>
                  </td>
                  {/* Team */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <TeamLogo
                        abbreviation={p.team_abbreviation}
                        primaryColor={p.team_primary_color}
                        size="xs"
                        shape="circle"
                      />
                      <span className="text-white/55 text-[11px]">{p.team_abbreviation}</span>
                    </div>
                  </td>
                  {/* Position */}
                  <td className="px-3 py-2.5 text-center">
                    <span className="rounded border border-white/12 bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-white/60">
                      {p.position}
                    </span>
                  </td>
                  {/* OVR */}
                  <td className="px-3 py-2.5 text-center">
                    <OvrBadge value={p.overall} />
                  </td>
                  {/* Age */}
                  <td className="px-3 py-2.5 text-center text-white/45 tabular-nums">{p.age ?? "—"}</td>
                  {/* SPD */}
                  <td className="px-3 py-2.5 text-center">
                    <StatChip value={p.speed} color="#00C8FF" />
                  </td>
                  {/* STR */}
                  <td className="px-3 py-2.5 text-center">
                    <StatChip value={p.strength} color="#F44336" />
                  </td>
                  {/* AWR */}
                  <td className="px-3 py-2.5 text-center">
                    <StatChip value={p.awareness} color="#a855f7" />
                  </td>
                  {/* Position-specific KEY stat */}
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-flex flex-col items-center gap-0">
                      <StatChip value={keyVal} color="#f59e0b" />
                      <span className="text-[8px] text-white/20 uppercase tracking-wider">{keyLabel}</span>
                    </span>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={9} className="py-12 text-center text-white/30">
                  No players match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-white/30 tabular-nums">
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/5 text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {/* Page number pills — show up to 7 */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
              .reduce<(number | "…")[]>((acc, n, idx, arr) => {
                if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) =>
                n === "…" ? (
                  <span key={`ellipsis-${i}`} className="text-white/20 text-xs px-1">…</span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n as number)}
                    className={`h-7 min-w-[28px] px-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                      page === n
                        ? "bg-[#00C8FF] text-black"
                        : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {n}
                  </button>
                )
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/5 text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SuspensionsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div className="h-12 w-12 rounded-full bg-[#F44336]/10 border border-[#F44336]/20 flex items-center justify-center">
        <Ban className="h-5 w-5 text-[#F44336]/60" />
      </div>
      <p className="text-sm font-semibold text-white/40">No Active Suspensions</p>
      <p className="text-xs text-white/25 max-w-xs">
        Player suspensions issued by the commissioner will appear here.
      </p>
    </div>
  );
}

export default function PlayersSection({ leagueId }: { leagueId: number }) {
  const [tab, setTab] = useState<Tab>("search");

  return (
    <div>
      {/* Sub-tab bar */}
      <div className="flex items-center gap-1 mb-5 border-b border-white/8">
        {(["search", "suspensions"] as Tab[]).map((t) => {
          const labels: Record<Tab, string> = { search: "Player Search", suspensions: "Suspensions" };
          const icons: Record<Tab, React.ReactNode> = {
            search: <SlidersHorizontal className="h-3 w-3" />,
            suspensions: <Ban className="h-3 w-3" />,
          };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                tab === t
                  ? "border-[#00C8FF] text-[#00C8FF]"
                  : "border-transparent text-white/40 hover:text-white/60"
              }`}
            >
              {icons[t]}
              {labels[t]}
            </button>
          );
        })}
      </div>

      {tab === "search" ? <PlayerSearchTab leagueId={leagueId} /> : <SuspensionsTab />}
    </div>
  );
}
