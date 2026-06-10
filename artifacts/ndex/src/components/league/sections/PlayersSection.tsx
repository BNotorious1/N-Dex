import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronUp, ChevronDown } from "lucide-react";

interface LeaguePlayer {
  id: number; name: string; position: string;
  overall: number; age: number | null; speed: number;
  strength: number; awareness: number;
  throwing_power: number | null; catching: number | null; tackling: number | null;
  team_id: number; team_name: string; team_abbreviation: string;
  team_city: string; team_primary_color: string | null;
}

type SortKey = "overall" | "speed" | "strength" | "awareness";

const POSITIONS = ["All", "QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K", "P"];

export default function PlayersSection({ leagueId }: { leagueId: number }) {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("overall");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const { data: players, isLoading } = useQuery<LeaguePlayer[]>({
    queryKey: ["league-players", leagueId],
    queryFn: () => fetch(`/api/leagues/${leagueId}/players`).then((r) => r.json()),
    enabled: !!leagueId,
  });

  const teams = useMemo(() => {
    if (!players) return [];
    const seen = new Set<string>();
    return players.reduce<string[]>((acc, p) => {
      if (!seen.has(p.team_name)) { seen.add(p.team_name); acc.push(p.team_name); }
      return acc;
    }, []);
  }, [players]);

  const [teamFilter, setTeamFilter] = useState("All");

  const filtered = useMemo(() => {
    if (!players) return [];
    return players
      .filter((p) => {
        const matchName = p.name.toLowerCase().includes(search.toLowerCase());
        const matchPos = position === "All" || p.position === position;
        const matchTeam = teamFilter === "All" || p.team_name === teamFilter;
        return matchName && matchPos && matchTeam;
      })
      .sort((a, b) => {
        const av = a[sortKey] ?? 0;
        const bv = b[sortKey] ?? 0;
        return sortDir === "desc" ? bv - av : av - bv;
      });
  }, [players, search, position, teamFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players..."
            className="bg-[#1a1a1a] border border-white/10 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#00C8FF]/40 w-48"
          />
        </div>
        <FilterSelect label="Position" value={position} onChange={setPosition} options={POSITIONS} />
        <FilterSelect label="Team" value={teamFilter} onChange={setTeamFilter} options={["All", ...teams]} />
        <span className="text-[10px] text-white/30 ml-auto">{filtered.length} players</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className="border-b border-white/8 bg-[#0f0f0f]">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Player</th>
              <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Team</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">POS</th>
              <SortTh label="OVR" sortKey="overall" current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">AGE</th>
              <SortTh label="SPD" sortKey="speed" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="STR" sortKey="strength" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="AWR" sortKey="awareness" current={sortKey} dir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  {[...Array(8)].map((__, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-3 bg-white/5 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length > 0 ? filtered.map((p) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-4 py-2.5 font-semibold text-white">{p.name}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-4 w-4 rounded-full flex items-center justify-center text-[7px] font-black text-white shrink-0"
                      style={{ backgroundColor: p.team_primary_color ?? "#333" }}
                    >
                      {p.team_abbreviation.slice(0, 2)}
                    </div>
                    <span className="text-white/60">{p.team_name}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/70 font-semibold">
                    {p.position}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <OvrBar value={p.overall} />
                </td>
                <td className="px-3 py-2.5 text-center text-white/50">{p.age ?? "—"}</td>
                <td className="px-3 py-2.5 text-center"><StatBar value={p.speed} color="#00C8FF" /></td>
                <td className="px-3 py-2.5 text-center"><StatBar value={p.strength} color="#F44336" /></td>
                <td className="px-3 py-2.5 text-center"><StatBar value={p.awareness} color="#a855f7" /></td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="py-10 text-center text-white/30">No players found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortTh({ label, sortKey, current, dir, onSort }: {
  label: string; sortKey: SortKey; current: SortKey; dir: "asc" | "desc";
  onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 cursor-pointer hover:text-white/60 select-none"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {active ? (
          dir === "desc" ? <ChevronDown className="h-2.5 w-2.5 text-[#00C8FF]" /> : <ChevronUp className="h-2.5 w-2.5 text-[#00C8FF]" />
        ) : (
          <ChevronDown className="h-2.5 w-2.5 opacity-20" />
        )}
      </span>
    </th>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#1a1a1a] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 outline-none focus:border-[#00C8FF]/40 cursor-pointer"
    >
      {options.map((o) => (
        <option key={o} value={o} className="bg-[#1a1a1a]">
          {o === "All" ? `All ${label}s` : o}
        </option>
      ))}
    </select>
  );
}

function OvrBar({ value }: { value: number }) {
  const color = value >= 90 ? "#F44336" : value >= 80 ? "#00C8FF" : value >= 70 ? "#22c55e" : "#ffffff66";
  return (
    <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-black" style={{ color, backgroundColor: `${color}18` }}>
      {value}
    </span>
  );
}

function StatBar({ value, color }: { value: number; color: string }) {
  return (
    <span className="text-[11px] font-semibold" style={{ color: value >= 90 ? color : "rgba(255,255,255,0.5)" }}>
      {value}
    </span>
  );
}
