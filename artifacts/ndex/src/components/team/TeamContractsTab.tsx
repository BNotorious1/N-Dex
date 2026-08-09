import { useState } from "react";
import { Link } from "wouter";
import { fmtMoney, ovrColor, DEV_LABEL, DEV_COLOR, type TeamPlayer } from "./types";

interface Props {
  team: { id: number; name: string; city: string; primary_color?: string | null };
  players: TeamPlayer[];
}

type SortKey = "cap_hit" | "contract_salary" | "contract_bonus" | "contract_years_left" | "contract_length" | "overall" | "age";
type SortDir = "asc" | "desc";

const COLS: { key: SortKey; label: string; align: "left" | "right" | "center" }[] = [
  { key: "cap_hit",             label: "Cap Hit",  align: "right" },
  { key: "contract_salary",     label: "Salary",   align: "right" },
  { key: "contract_bonus",      label: "Bonus",    align: "right" },
  { key: "contract_years_left", label: "Yrs Left", align: "center" },
  { key: "contract_length",     label: "Len",      align: "center" },
];

export default function TeamContractsTab({ team, players }: Props) {
  const primaryColor = team.primary_color ?? "#555";
  const [sortKey, setSortKey] = useState<SortKey>("cap_hit");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const withContracts = players.filter(p =>
    p.cap_hit != null || p.contract_salary != null || p.contract_years_left != null
  );

  const sorted = [...withContracts].sort((a, b) => {
    const av = (a[sortKey] as number | null) ?? -999;
    const bv = (b[sortKey] as number | null) ?? -999;
    return sortDir === "desc" ? bv - av : av - bv;
  });

  const noData = sorted.length === 0;

  function SortTh({ k, label, align }: { k: SortKey; label: string; align: "left" | "right" | "center" }) {
    const active = sortKey === k;
    return (
      <th
        onClick={() => handleSort(k)}
        className={`px-3 py-3 text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none hover:text-white transition-colors ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"}`}
        style={{ color: active ? "white" : "rgba(255,255,255,0.45)" }}
      >
        {label}{active ? (sortDir === "desc" ? "↓" : "↑") : ""}
      </th>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
      <div className="px-6 py-4 border-b border-white/8">
        <h2 className="text-lg font-black text-white tracking-tight">{team.name} Contracts</h2>
        {!noData && (
          <p className="text-[11px] text-white/30 mt-0.5">
            {sorted.length} player{sorted.length !== 1 ? "s" : ""}
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
              <tr className="border-b border-white/8" style={{ backgroundColor: `${primaryColor}25` }}>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/50 min-w-[150px]">Player</th>
                <th className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/50 w-14">POS</th>
                <th className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/50 w-20">DEV</th>
                <SortTh k="cap_hit"             label="Cap Hit"  align="right" />
                <SortTh k="contract_salary"     label="Salary"   align="right" />
                <SortTh k="contract_bonus"      label="Bonus"    align="right" />
                <SortTh k="contract_years_left" label="Yrs Left" align="center" />
                <SortTh k="contract_length"     label="Len"      align="center" />
                <SortTh k="overall"             label="OVR"      align="center" />
                <SortTh k="age"                 label="AGE"      align="center" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const devLabel = p.dev_trait != null ? (DEV_LABEL[p.dev_trait] ?? "Normal") : null;
                const devColor = p.dev_trait != null ? (DEV_COLOR[p.dev_trait] ?? "text-white/35") : "text-white/35";
                return (
                  <tr key={p.id} className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i % 2 !== 0 ? "bg-white/[0.015]" : ""}`}>
                    <td className="px-4 py-2.5 min-w-[150px]">
                      <Link href={`/players/${p.id}`} className="font-semibold hover:underline [font-family:'Lora',serif]" style={{ color: primaryColor }}>
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5 text-center text-[10px] font-bold text-white/50">{p.position}</td>
                    <td className={`px-2 py-2.5 text-center text-[10px] font-bold ${devColor}`}>{devLabel ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-white/80 [font-family:'Lora',serif]">{fmtMoney(p.cap_hit)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-white/50 [font-family:'Lora',serif]">{fmtMoney(p.contract_salary)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-white/50 [font-family:'Lora',serif]">{fmtMoney(p.contract_bonus)}</td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-white/70 [font-family:'Lora',serif]">{p.contract_years_left ?? "—"}</td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-white/40 [font-family:'Lora',serif]">{p.contract_length ?? "—"}</td>
                    <td className={`px-2 py-2.5 text-center text-[11px] font-black tabular-nums [font-family:'Lora',serif] ${ovrColor(p.overall)}`}>{p.overall}</td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-white/50 [font-family:'Lora',serif]">{p.age}</td>
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
