import { useState, useMemo } from "react";
import { ArrowLeftRight, ChevronDown, ChevronUp, Filter, X } from "lucide-react";
import {
  useGetLeagueTrades,
  getGetLeagueTradesQueryKey,
  useGetLeagueTeams,
  getGetLeagueTeamsQueryKey,
} from "@workspace/api-client-react";
import type { LeagueTrade } from "@workspace/api-client-react";

interface Props {
  leagueId: number;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  APPROVED:  { bg: "bg-green-500/15",  text: "text-green-400",  label: "Approved" },
  DENIED:    { bg: "bg-[#F44336]/15",  text: "text-[#F44336]",  label: "Denied" },
  PENDING:   { bg: "bg-yellow-500/15", text: "text-yellow-400", label: "Pending" },
  CANCELLED: { bg: "bg-white/8",       text: "text-white/35",   label: "Cancelled" },
};

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

const PORTRAIT_BASE = "https://madden-assets-cdn.pulse.ea.com/madden26/portraits/75/";

function TradeRow({ trade }: { trade: LeagueTrade }) {
  const [expanded, setExpanded] = useState(false);
  const style = STATUS_STYLES[trade.status] ?? STATUS_STYLES["PENDING"];

  const hasPlayers = trade.players_from_a.length > 0 || trade.players_from_b.length > 0;

  return (
    <div className="border border-white/8 rounded-xl overflow-hidden">
      <button
        onClick={() => hasPlayers && setExpanded(v => !v)}
        className={`w-full grid grid-cols-[120px_70px_1fr_1fr_32px] gap-4 items-center px-5 py-4 text-left transition-colors ${
          hasPlayers ? "hover:bg-white/3" : "cursor-default"
        }`}
      >
        {/* Status */}
        <div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${style.bg} ${style.text}`}>
            {style.label}
          </span>
        </div>

        {/* Season */}
        <div className="text-sm font-semibold text-white/70">{trade.season}</div>

        {/* Team A */}
        <div className="flex items-center gap-2.5 min-w-0">
          <TeamLogo abbreviation={trade.team_a.abbreviation} size={26} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{trade.team_a.name}</p>
            <p className="text-[10px] text-white/35">
              {trade.players_from_a.length} player{trade.players_from_a.length !== 1 ? "s" : ""} outgoing
            </p>
          </div>
        </div>

        {/* Team B */}
        <div className="flex items-center gap-2.5 min-w-0">
          <TeamLogo abbreviation={trade.team_b.abbreviation} size={26} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{trade.team_b.name}</p>
            <p className="text-[10px] text-white/35">
              {trade.players_from_b.length} player{trade.players_from_b.length !== 1 ? "s" : ""} outgoing
            </p>
          </div>
        </div>

        {/* Chevron */}
        <div className="flex justify-end">
          {hasPlayers && (
            expanded
              ? <ChevronUp className="h-4 w-4 text-white/25" />
              : <ChevronDown className="h-4 w-4 text-white/25" />
          )}
        </div>
      </button>

      {/* Expanded players */}
      {expanded && hasPlayers && (
        <div className="border-t border-white/8 bg-white/2 px-5 py-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Players from A */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-white/30 mb-2">
                {trade.team_a.name} sends
              </p>
              <div className="space-y-1.5">
                {trade.players_from_a.length === 0
                  ? <p className="text-xs text-white/25 italic">No players</p>
                  : trade.players_from_a.map(p => (
                    <div key={p.id} className="flex items-center gap-2.5">
                      {p.portrait_id ? (
                        <img
                          src={`${PORTRAIT_BASE}${p.portrait_id}.png`}
                          alt={p.name}
                          className="w-7 h-7 rounded-full object-cover bg-white/5 shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-white/8 shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-white">{p.name}</span>
                      <span className="text-[10px] text-white/40">{p.position}</span>
                      <span className="ml-auto text-xs font-black text-[#00C8FF]">{p.overall}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Players from B */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-white/30 mb-2">
                {trade.team_b.name} sends
              </p>
              <div className="space-y-1.5">
                {trade.players_from_b.length === 0
                  ? <p className="text-xs text-white/25 italic">No players</p>
                  : trade.players_from_b.map(p => (
                    <div key={p.id} className="flex items-center gap-2.5">
                      {p.portrait_id ? (
                        <img
                          src={`${PORTRAIT_BASE}${p.portrait_id}.png`}
                          alt={p.name}
                          className="w-7 h-7 rounded-full object-cover bg-white/5 shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-white/8 shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-white">{p.name}</span>
                      <span className="text-[10px] text-white/40">{p.position}</span>
                      <span className="ml-auto text-xs font-black text-[#00C8FF]">{p.overall}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          {trade.notes && (
            <div className="mt-3 pt-3 border-t border-white/8">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/25 mb-1">Notes</p>
              <p className="text-xs text-white/50">{trade.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LeagueTradesSection({ leagueId }: Props) {
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSeason, setFilterSeason] = useState("");
  const [filterTeamA, setFilterTeamA] = useState("");
  const [filterTeamB, setFilterTeamB] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: trades, isLoading } = useGetLeagueTrades(leagueId, {
    query: { queryKey: getGetLeagueTradesQueryKey(leagueId) },
  });

  const { data: teams } = useGetLeagueTeams(leagueId, {
    query: { queryKey: getGetLeagueTeamsQueryKey(leagueId) },
  });

  const seasons = useMemo(() => {
    if (!trades) return [];
    return Array.from(new Set(trades.map(t => t.season))).sort((a, b) => b - a);
  }, [trades]);

  const filtered = useMemo(() => {
    if (!trades) return [];
    return trades.filter(t => {
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterSeason && String(t.season) !== filterSeason) return false;
      if (filterTeamA && t.team_a.id !== Number(filterTeamA) && t.team_b.id !== Number(filterTeamA)) return false;
      if (filterTeamB && t.team_b.id !== Number(filterTeamB) && t.team_a.id !== Number(filterTeamB)) return false;
      return true;
    });
  }, [trades, filterStatus, filterSeason, filterTeamA, filterTeamB]);

  const hasFilters = filterStatus || filterSeason || filterTeamA || filterTeamB;

  const clearFilters = () => {
    setFilterStatus(""); setFilterSeason("");
    setFilterTeamA(""); setFilterTeamB("");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#00C8FF]/10 border border-[#00C8FF]/20">
            <ArrowLeftRight className="h-5 w-5 text-[#00C8FF]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">League Trades</h2>
            <p className="text-xs text-white/40">
              {trades ? `${filtered.length} trade${filtered.length !== 1 ? "s" : ""}` : "Loading..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              showFilters || hasFilters
                ? "bg-[#00C8FF]/10 border-[#00C8FF]/30 text-[#00C8FF]"
                : "bg-white/4 border-white/10 text-white/60 hover:text-white"
            }`}
          >
            <Filter className="h-3.5 w-3.5" /> Filters
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white/3 border border-white/8 rounded-xl p-4 grid grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1.5">Status</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/25"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="DENIED">Denied</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1.5">Season</label>
            <select
              value={filterSeason}
              onChange={e => setFilterSeason(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/25"
            >
              <option value="">All Seasons</option>
              {seasons.map(s => <option key={s} value={s}>Season {s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1.5">Team A</label>
            <select
              value={filterTeamA}
              onChange={e => setFilterTeamA(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/25"
            >
              <option value="">All Teams</option>
              {(teams ?? []).sort((a, b) => a.name.localeCompare(b.name)).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1.5">Team B</label>
            <select
              value={filterTeamB}
              onChange={e => setFilterTeamB(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/25"
            >
              <option value="">All Teams</option>
              {(teams ?? []).sort((a, b) => a.name.localeCompare(b.name)).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Table header */}
      <div>
        <div className="rounded-t-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "#111" }}>
                <th className="text-left px-5 py-3 text-white font-black uppercase tracking-wider text-[10px] w-[130px]">Status</th>
                <th className="text-left px-4 py-3 text-white font-black uppercase tracking-wider text-[10px] w-[80px]">Season</th>
                <th className="text-left px-4 py-3 text-white font-black uppercase tracking-wider text-[10px]">Team A</th>
                <th className="text-left px-4 py-3 text-white font-black uppercase tracking-wider text-[10px]">Team B</th>
                <th className="w-8" />
              </tr>
            </thead>
          </table>
        </div>

        {/* Rows */}
        {isLoading && (
          <div className="space-y-2 mt-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-white/3 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="p-4 rounded-full bg-white/3 border border-white/8">
              <ArrowLeftRight className="h-8 w-8 text-white/20" />
            </div>
            <p className="text-sm font-semibold text-white/30">No trades found</p>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-[#00C8FF] hover:text-[#00C8FF]/80">
                Clear filters
              </button>
            )}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2 mt-2">
            {filtered.map(trade => (
              <TradeRow key={trade.id} trade={trade} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
