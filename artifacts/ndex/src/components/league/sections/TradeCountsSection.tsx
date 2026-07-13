import { useState, useMemo } from "react";
import { BarChart3, Search, X } from "lucide-react";
import {
  useGetLeagueTradeCounts,
  getGetLeagueTradeCountsQueryKey,
  useGetLeagueTeams,
  getGetLeagueTeamsQueryKey,
} from "@workspace/api-client-react";
import type { LeagueTradeCount } from "@workspace/api-client-react";

interface Props {
  leagueId: number;
}

function TeamLogo({ abbreviation, size = 28 }: { abbreviation: string; size?: number }) {
  return (
    <img
      src={`https://a.espncdn.com/combiner/i?img=/i/teamlogos/nfl/500/${abbreviation.toLowerCase()}.png&h=${size * 2}&w=${size * 2}`}
      alt={abbreviation}
      style={{ width: size, height: size }}
      className="object-contain"
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

function CountBadge({ value, color }: { value: number; color: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[32px] h-6 px-2 rounded-full text-[11px] font-black ${
        value === 0 ? "text-white/25 bg-white/5" : ""
      }`}
      style={value > 0 ? { color, backgroundColor: `${color}20` } : undefined}
    >
      {value}
    </span>
  );
}

export default function TradeCountsSection({ leagueId }: Props) {
  const [search, setSearch] = useState("");
  const [filterConference, setFilterConference] = useState("");

  const { data: counts, isLoading } = useGetLeagueTradeCounts(leagueId, {
    query: { queryKey: getGetLeagueTradeCountsQueryKey(leagueId) },
  });

  const { data: teams } = useGetLeagueTeams(leagueId, {
    query: { queryKey: getGetLeagueTeamsQueryKey(leagueId) },
  });

  const conferences = useMemo(() => {
    if (!teams) return [];
    const divs = Array.from(new Set(
      teams.map(t => t.conference).filter(Boolean)
    )).sort();
    return divs as string[];
  }, [teams]);

  const teamConfMap = useMemo(() => {
    if (!teams) return new Map<number, string>();
    return new Map(teams.map(t => [t.id, t.conference ?? ""]));
  }, [teams]);

  const filtered = useMemo(() => {
    if (!counts) return [];
    return counts
      .filter(c => {
        if (search && !c.team_name.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterConference && teamConfMap.get(c.team_id) !== filterConference) return false;
        return true;
      })
      .sort((a, b) => b.total - a.total || a.team_name.localeCompare(b.team_name));
  }, [counts, search, filterConference, teamConfMap]);

  const totals = useMemo(() => {
    if (!filtered) return { pending: 0, approved: 0, denied: 0, cancelled: 0, total: 0 };
    return filtered.reduce((acc, c) => ({
      pending: acc.pending + c.pending,
      approved: acc.approved + c.approved,
      denied: acc.denied + c.denied,
      cancelled: acc.cancelled + c.cancelled,
      total: acc.total + c.total,
    }), { pending: 0, approved: 0, denied: 0, cancelled: 0, total: 0 });
  }, [filtered]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[#00C8FF]/10 border border-[#00C8FF]/20">
          <BarChart3 className="h-5 w-5 text-[#00C8FF]" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Trade Counts</h2>
          <p className="text-xs text-white/40">Trade activity by team</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search teams..."
            className="w-full bg-white/4 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/25"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {conferences.length > 0 && (
          <select
            value={filterConference}
            onChange={e => setFilterConference(e.target.value)}
            className="bg-white/4 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
          >
            <option value="">All Conferences</option>
            {conferences.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden border border-white/8">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: "#111" }}>
              <th className="text-left px-5 py-3.5 text-white font-black uppercase tracking-wider text-[10px]">Team</th>
              <th className="text-center px-4 py-3.5 text-white font-black uppercase tracking-wider text-[10px] w-28">Approved</th>
              <th className="text-center px-4 py-3.5 text-white font-black uppercase tracking-wider text-[10px] w-28">Denied</th>
              <th className="text-center px-4 py-3.5 text-white font-black uppercase tracking-wider text-[10px] w-28">Pending</th>
              <th className="text-center px-4 py-3.5 text-white font-black uppercase tracking-wider text-[10px] w-28">Total</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              [...Array(10)].map((_, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-white/8 animate-pulse" />
                      <div className="h-3.5 w-32 bg-white/8 rounded animate-pulse" />
                    </div>
                  </td>
                  {[...Array(4)].map((_, j) => (
                    <td key={j} className="px-4 py-3.5 text-center">
                      <div className="h-5 w-8 bg-white/8 rounded mx-auto animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            )}

            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-white/30 text-sm">
                  {search || filterConference ? "No teams match your filters." : "No trade data available."}
                </td>
              </tr>
            )}

            {!isLoading && filtered.map((c, idx) => (
              <TradeCountRow key={c.team_id} count={c} idx={idx} />
            ))}

            {/* Totals footer */}
            {!isLoading && filtered.length > 1 && (
              <tr className="border-t border-white/12 bg-white/3">
                <td className="px-5 py-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/40">
                    Totals ({filtered.length} teams)
                  </span>
                </td>
                <td className="text-center px-4 py-3">
                  <span className="text-sm font-black text-green-400">{totals.approved}</span>
                </td>
                <td className="text-center px-4 py-3">
                  <span className="text-sm font-black text-[#F44336]">{totals.denied}</span>
                </td>
                <td className="text-center px-4 py-3">
                  <span className="text-sm font-black text-yellow-400">{totals.pending}</span>
                </td>
                <td className="text-center px-4 py-3">
                  <span className="text-sm font-black text-white/60">{totals.total}</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TradeCountRow({ count, idx }: { count: LeagueTradeCount; idx: number }) {
  return (
    <tr className={`border-t border-white/5 transition-colors hover:bg-white/3 ${idx % 2 === 0 ? "" : "bg-white/1"}`}>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <TeamLogo abbreviation={count.team_abbreviation} size={26} />
          <div>
            <p className="text-sm font-bold text-white">{count.team_name}</p>
            <p className="text-[10px] text-white/35">{count.team_abbreviation}</p>
          </div>
        </div>
      </td>
      <td className="text-center px-4 py-3.5">
        <CountBadge value={count.approved} color="#4ade80" />
      </td>
      <td className="text-center px-4 py-3.5">
        <CountBadge value={count.denied} color="#F44336" />
      </td>
      <td className="text-center px-4 py-3.5">
        <CountBadge value={count.pending} color="#facc15" />
      </td>
      <td className="text-center px-4 py-3.5">
        <CountBadge value={count.total} color="#00C8FF" />
      </td>
    </tr>
  );
}
