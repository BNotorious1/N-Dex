import { Link } from "wouter";
import { fmtMoney, fmtHeight, type TeamPlayer } from "./types";

const OFFENSE_POS = ["QB", "HB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "OL"];
const DEFENSE_POS = ["DE", "DT", "DL", "LOLB", "ROLB", "MLB", "MIKE", "WILL", "SAM", "LB", "CB", "SS", "FS", "S"];
const ST_POS = ["K", "P"];

function posOrder(pos: string, order: string[]): number {
  const i = order.indexOf(pos);
  return i === -1 ? 999 : i;
}

function sortRosterGroup(players: TeamPlayer[], order: string[]): TeamPlayer[] {
  return [...players].sort((a, b) => {
    const po = posOrder(a.position, order) - posOrder(b.position, order);
    if (po !== 0) return po;
    return b.overall - a.overall;
  });
}

function fmtExp(yearsPro: number | null | undefined): string {
  if (yearsPro == null || yearsPro === 0) return "R";
  return String(yearsPro);
}

interface Props {
  team: { id: number; name: string; city: string; primary_color?: string | null };
  players: TeamPlayer[];
}

export default function TeamRosterTab({ team, players }: Props) {
  const primaryColor = team.primary_color ?? "#555";

  const offense = sortRosterGroup(players.filter(p => OFFENSE_POS.includes(p.position)), OFFENSE_POS);
  const defense = sortRosterGroup(players.filter(p => DEFENSE_POS.includes(p.position)), DEFENSE_POS);
  const special = sortRosterGroup(players.filter(p => ST_POS.includes(p.position)), ST_POS);
  const other   = players.filter(p =>
    !OFFENSE_POS.includes(p.position) &&
    !DEFENSE_POS.includes(p.position) &&
    !ST_POS.includes(p.position)
  );

  const groups = [
    { label: "Offense",       players: offense },
    { label: "Defense",       players: defense },
    { label: "Special Teams", players: special },
    { label: "Other",         players: other   },
  ].filter(g => g.players.length > 0);

  if (players.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-[#111] py-16 text-center text-white/30 text-sm">
        No roster data yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
      <table className="w-full text-xs border-collapse">
        {/* Fixed column widths — single source of truth */}
        <colgroup>
          <col className="w-auto min-w-[160px]" />  {/* Name */}
          <col style={{ width: "52px" }} />           {/* Pos */}
          <col style={{ width: "44px" }} />           {/* Age */}
          <col style={{ width: "56px" }} />           {/* Ht */}
          <col style={{ width: "52px" }} />           {/* Wt */}
          <col style={{ width: "44px" }} />           {/* Exp */}
          <col className="min-w-[96px]" />            {/* College */}
          <col style={{ width: "96px" }} />           {/* Salary */}
        </colgroup>

        <thead>
          <tr className="border-b border-white/10" style={{ backgroundColor: `${primaryColor}30` }}>
            {(["Name", "Pos", "Age", "Ht", "Wt", "Exp", "College", "Salary"] as const).map((h, i, arr) => (
              <th
                key={h}
                className={h === "Name" ? "py-2.5 font-bold uppercase tracking-wider text-white/60 px-4 text-left text-[14px]" : "py-2.5 font-bold uppercase tracking-wider text-white/60 px-2 text-center text-[12px]"}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {groups.map(({ label, players: gPlayers }) => (
            <>
              {/* Group label row */}
              <tr key={`lbl-${label}`} className="border-b border-white/8 bg-[#141414]">
                <td colSpan={8} className="px-4 py-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-white/60">{label}</span>
                </td>
              </tr>

              {/* Player rows */}
              {gPlayers.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i % 2 !== 0 ? "bg-white/[0.015]" : ""}`}
                >
                  {/* Name */}
                  <td className="px-4 py-2.5 text-left pl-[10px] pr-[10px]">
                    <Link
                      href={`/players/${p.id}`}
                      className="font-semibold hover:underline [font-family:'Lora',serif] text-[16px]"
                      style={{ color: primaryColor }}
                    >
                      {p.name}
                    </Link>
                  </td>
                  {/* Pos */}
                  <td className="px-2 py-2.5 text-center text-[14px]">
                    <span className="font-bold text-white/60 text-[14px]">{p.position}</span>
                  </td>
                  {/* Age */}
                  <td className="px-2 py-2.5 text-center tabular-nums text-white/60 [font-family:'Lora',serif] text-[14px]">
                    {p.age}
                  </td>
                  {/* Ht */}
                  <td className="px-2 py-2.5 text-center tabular-nums text-white/60 [font-family:'Lora',serif] text-[14px]">
                    {fmtHeight(p.height)}
                  </td>
                  {/* Wt */}
                  <td className="px-2 py-2.5 text-center tabular-nums text-white/60 [font-family:'Lora',serif] text-[14px]">
                    {p.weight != null ? `${p.weight}` : "—"}
                  </td>
                  {/* Exp */}
                  <td className="px-2 py-2.5 text-center tabular-nums text-white/60 [font-family:'Lora',serif] text-[14px]">
                    {fmtExp(p.years_pro)}
                  </td>
                  {/* College */}
                  <td className="px-2 py-2.5 text-white/50 [font-family:'Lora',serif] truncate max-w-0 text-[14px] text-left pl-[8px] pr-[8px]">
                    {p.college ?? "—"}
                  </td>
                  {/* Salary */}
                  <td className="px-4 py-2.5 text-right tabular-nums text-white/70 [font-family:'Lora',serif] text-[14px]">
                    {fmtMoney(p.contract_salary) !== "—" ? fmtMoney(p.contract_salary) : fmtMoney(p.cap_hit)}
                  </td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
