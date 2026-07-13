import { useState, useMemo } from "react";
import { useGetLeagueTransactions, getGetLeagueTransactionsQueryKey, LeagueTransaction } from "@workspace/api-client-react";
import TeamLogo from "../../TeamLogo";
import { Link } from "wouter";
import { ArrowLeftRight } from "lucide-react";

function eaPortraitUrl(portraitId: number): string {
  return `/api/proxy/image?url=${encodeURIComponent(
    `https://ratings-images-prod.pulse.ea.com/madden-nfl-26/portraits/${portraitId}.png`
  )}`;
}

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  SIGNED:         { label: "SIGNED",         color: "#22c55e", bg: "#22c55e18" },
  RELEASED:       { label: "RELEASED",       color: "#f44336", bg: "#f4433618" },
  TRADED:         { label: "TRADED",         color: "#00C8FF", bg: "#00C8FF18" },
  DRAFTED:        { label: "DRAFTED",        color: "#a78bfa", bg: "#a78bfa18" },
  WAIVER:         { label: "WAIVER",         color: "#fb923c", bg: "#fb923c18" },
  PRACTICE_SQUAD: { label: "PRACTICE SQUAD", color: "#94a3b8", bg: "#94a3b818" },
  RETIRED:        { label: "RETIRED",        color: "#6b7280", bg: "#6b728018" },
  RESTRUCTURED:   { label: "RESTRUCTURED",   color: "#facc15", bg: "#facc1518" },
};

function TypeBadge({ type }: { type: string }) {
  const m = TYPE_META[type] ?? { label: type, color: "#94a3b8", bg: "#94a3b818" };
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-[10px] font-black tracking-wider uppercase"
      style={{ color: m.color, backgroundColor: m.bg }}
    >
      {m.label}
    </span>
  );
}

function PortraitCircle({ portraitId, name }: { portraitId: number | null | undefined; name: string }) {
  const [err, setErr] = useState(false);
  const has = !!portraitId && !err;
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-white/5 border border-white/10">
      {has ? (
        <img
          src={eaPortraitUrl(portraitId!)}
          alt={name}
          className="w-full h-full object-cover object-[center_10%] scale-125 translate-y-0.5"
          loading="lazy"
          onError={() => setErr(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[11px] font-black text-white/30">
          {name.charAt(0)}
        </div>
      )}
    </div>
  );
}

const ALL_TYPES = Object.keys(TYPE_META);

export default function TransactionsSection({ leagueId }: { leagueId: number }) {
  const { data: transactions = [], isLoading } = useGetLeagueTransactions(leagueId, {
    query: { queryKey: getGetLeagueTransactionsQueryKey(leagueId) },
  });

  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [teamFilter, setTeamFilter] = useState<string>("ALL");
  const [posFilter, setPosFilter] = useState<string>("ALL");

  const teams = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of transactions) seen.set(t.team.abbreviation, t.team.name);
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [transactions]);

  const positions = useMemo(() => {
    const s = new Set<string>();
    for (const t of transactions) s.add(t.player.position);
    return Array.from(s).sort();
  }, [transactions]);

  const usedTypes = useMemo(() => {
    const s = new Set<string>();
    for (const t of transactions) s.add(t.transaction_type);
    return ALL_TYPES.filter(tp => s.has(tp));
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (typeFilter !== "ALL" && tx.transaction_type !== typeFilter) return false;
      if (teamFilter !== "ALL" && tx.team.abbreviation !== teamFilter) return false;
      if (posFilter !== "ALL" && tx.player.position !== posFilter) return false;
      return true;
    });
  }, [transactions, typeFilter, teamFilter, posFilter]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ArrowLeftRight className="w-5 h-5 text-[#00C8FF]" />
        <h2 className="text-xl font-black text-white tracking-tight">Transactions</h2>
        {filtered.length !== transactions.length && (
          <span className="text-[11px] text-white/30 font-bold">{filtered.length} of {transactions.length}</span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Type filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider mr-0.5">Type</span>
          {["ALL", ...usedTypes].map(tp => {
            const m = TYPE_META[tp];
            const active = typeFilter === tp;
            return (
              <button
                key={tp}
                onClick={() => setTypeFilter(tp)}
                className="px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-colors"
                style={active && m
                  ? { backgroundColor: m.bg, color: m.color, borderWidth: 1, borderStyle: "solid", borderColor: m.color + "40" }
                  : active
                  ? { backgroundColor: "#00C8FF18", color: "#00C8FF" }
                  : { color: "rgba(255,255,255,0.35)" }
                }
              >
                {tp === "ALL" ? "All" : (TYPE_META[tp]?.label ?? tp)}
              </button>
            );
          })}
        </div>

        {/* Team filter */}
        {teams.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider mr-0.5">Team</span>
            <select
              value={teamFilter}
              onChange={e => setTeamFilter(e.target.value)}
              className="bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-[11px] text-white/70 focus:outline-none focus:border-white/25"
            >
              <option value="ALL">All Teams</option>
              {teams.map(([abbr, name]) => (
                <option key={abbr} value={abbr}>{name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Position filter */}
        {positions.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider mr-0.5">Pos</span>
            <select
              value={posFilter}
              onChange={e => setPosFilter(e.target.value)}
              className="bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-[11px] text-white/70 focus:outline-none focus:border-white/25"
            >
              <option value="ALL">All Positions</option>
              {positions.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>
        )}

        {(typeFilter !== "ALL" || teamFilter !== "ALL" || posFilter !== "ALL") && (
          <button
            onClick={() => { setTypeFilter("ALL"); setTeamFilter("ALL"); setPosFilter("ALL"); }}
            className="px-2.5 py-1 rounded text-[10px] font-bold text-white/30 hover:text-white transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState hasFilters={typeFilter !== "ALL" || teamFilter !== "ALL" || posFilter !== "ALL"} />
      ) : (
        <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: "#0f0f0f" }} className="border-b border-white/8">
                  <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-white/30">Team</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-white/30">Player</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-white/30">Pos</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-white/30">OVR</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-white/30">Action</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-white/30">Season</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-white/30">Wk</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx, i) => (
                  <TxRow key={tx.id} tx={tx} odd={i % 2 === 1} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TxRow({ tx, odd }: { tx: LeagueTransaction; odd: boolean }) {
  return (
    <tr
      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
      style={odd ? { backgroundColor: "rgba(255,255,255,0.012)" } : undefined}
    >
      {/* Team */}
      <td className="px-4 py-2.5">
        <Link href={`/teams/${tx.team.id}`} className="flex items-center gap-2 group w-fit">
          <TeamLogo size="sm" abbreviation={tx.team.abbreviation} primaryColor={tx.team.primary_color} />
          <span className="text-[12px] font-bold text-white/80 group-hover:text-[#00C8FF] transition-colors whitespace-nowrap">
            {tx.team.name}
          </span>
        </Link>
      </td>

      {/* Player */}
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <PortraitCircle portraitId={tx.player.portrait_id} name={tx.player.name} />
          <Link href={`/players/${tx.player.id}`} className="font-bold text-[13px] text-white hover:text-[#00C8FF] transition-colors whitespace-nowrap">
            {tx.player.name}
          </Link>
        </div>
      </td>

      {/* Pos */}
      <td className="px-4 py-2.5 text-center">
        <span className="rounded border border-white/12 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-white/55">
          {tx.player.position}
        </span>
      </td>

      {/* OVR */}
      <td className="px-4 py-2.5 text-center">
        <span className="font-black text-[13px] text-white/80 tabular-nums">{tx.player.overall}</span>
      </td>

      {/* Action */}
      <td className="px-4 py-2.5">
        <div className="flex flex-col gap-0.5">
          <TypeBadge type={tx.transaction_type} />
          {(tx.from_team || tx.to_team) && (tx.from_team !== tx.to_team) && (
            <span className="text-[9px] text-white/25">
              {tx.from_team && tx.to_team
                ? `${tx.from_team} → ${tx.to_team}`
                : tx.from_team ? `from ${tx.from_team}` : `to ${tx.to_team}`}
            </span>
          )}
        </div>
      </td>

      {/* Season */}
      <td className="px-4 py-2.5 text-center">
        <span className="text-[11px] text-white/40 tabular-nums">S{tx.season}</span>
      </td>

      {/* Week */}
      <td className="px-4 py-2.5 text-center">
        <span className="text-[11px] text-white/40 tabular-nums">
          {tx.week != null ? `W${tx.week}` : "—"}
        </span>
      </td>
    </tr>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#141414] py-20 flex flex-col items-center gap-3">
      <ArrowLeftRight className="w-8 h-8 text-white/10" />
      <p className="text-white/30 text-sm font-bold">
        {hasFilters ? "No transactions match your filters" : "No transactions recorded yet"}
      </p>
      {!hasFilters && (
        <p className="text-white/20 text-xs text-center max-w-xs">
          Transactions will appear here once player signings, releases, and trades are imported from EA.
        </p>
      )}
    </div>
  );
}
