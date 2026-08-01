import { Link } from "wouter";
import { fmtMoney, ovrColor, DEV_LABEL, DEV_COLOR, type TeamPlayer } from "./types";

interface Props {
  team: { id: number; name: string; city: string; primary_color?: string | null };
  players: TeamPlayer[];
}

export default function TeamContractsTab({ team, players }: Props) {
  const primaryColor = team.primary_color ?? "#555";

  const sorted = [...players]
    .filter(p => p.cap_hit != null || p.contract_salary != null || p.contract_years_left != null)
    .sort((a, b) => (b.cap_hit ?? 0) - (a.cap_hit ?? 0));

  const noData = sorted.length === 0;

  return (
    <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/8">
        <h2 className="text-lg font-black text-white tracking-tight">
          {team.city} {team.name} Contracts
        </h2>
        {!noData && (
          <p className="text-[11px] text-white/30 mt-0.5">
            {sorted.length} player{sorted.length !== 1 ? "s" : ""} · sorted by cap hit
          </p>
        )}
      </div>

      {noData ? (
        <div className="py-16 text-center text-white/30 text-sm">
          No contract data yet — re-import rosters to populate contract details.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8 bg-[#0d0d0d] sticky top-0">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30 min-w-[150px]">Player</th>
                <th className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-14">POS</th>
                <th className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-20">DEV</th>
                <th className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-10">OVR</th>
                <th className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-10">AGE</th>
                <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white/30">Cap Hit ↓</th>
                <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white/30">Salary</th>
                <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white/30">Bonus</th>
                <th className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-16">Yrs Left</th>
                <th className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-12">Len</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const devLabel = p.dev_trait != null ? (DEV_LABEL[p.dev_trait] ?? "Normal") : null;
                const devColor = p.dev_trait != null ? (DEV_COLOR[p.dev_trait] ?? "text-white/35") : "text-white/35";
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i % 2 !== 0 ? "bg-white/[0.015]" : ""}`}
                  >
                    <td className="px-4 py-2.5 min-w-[150px]">
                      <Link
                        href={`/players/${p.id}`}
                        className="font-semibold hover:underline"
                        style={{ color: primaryColor }}
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5 text-center w-14">
                      <span className="text-[10px] font-bold text-white/60">{p.position}</span>
                    </td>
                    <td className={`px-2 py-2.5 text-center w-20 text-[10px] font-bold ${devColor}`}>
                      {devLabel ?? "—"}
                    </td>
                    <td className={`px-2 py-2.5 text-center w-10 text-[11px] font-black tabular-nums ${ovrColor(p.overall)}`}>
                      {p.overall}
                    </td>
                    <td className="px-2 py-2.5 text-center w-10 tabular-nums text-white/50">{p.age}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-white">
                      {fmtMoney(p.cap_hit)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-white/60">
                      {fmtMoney(p.contract_salary)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-white/50">
                      {fmtMoney(p.contract_bonus)}
                    </td>
                    <td className="px-2 py-2.5 text-center w-16 tabular-nums text-white/70">
                      {p.contract_years_left ?? "—"}
                    </td>
                    <td className="px-2 py-2.5 text-center w-12 tabular-nums text-white/40">
                      {p.contract_length ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
