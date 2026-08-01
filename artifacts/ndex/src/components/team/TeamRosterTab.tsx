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

const COLS = ["Name", "Pos", "Age", "Ht", "Wt", "Exp", "College", "Salary"];

function RosterGroup({ label, players, primaryColor }: { label: string; players: TeamPlayer[]; primaryColor: string }) {
  if (players.length === 0) return null;
  return (
    <div>
      <div className="px-4 py-2 border-b border-white/8 bg-[#141414]">
        <span className="text-[11px] font-black uppercase tracking-widest text-white/60">{label}</span>
      </div>
      <table className="w-full text-xs">
        <tbody>
          {players.map((p, i) => (
            <tr key={p.id} className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.015]"}`}>
              <td className="px-4 py-2.5 min-w-[140px]">
                <Link href={`/players/${p.id}`} className="font-semibold hover:underline [font-family:'Lora',serif]" style={{ color: primaryColor }}>
                  {p.name}
                </Link>
              </td>
              <td className="px-3 py-2.5 w-14 text-center">
                <span className="text-[10px] font-bold text-white/60">{p.position}</span>
              </td>
              <td className="px-3 py-2.5 w-12 text-center tabular-nums text-white/60 [font-family:'Lora',serif]">{p.age}</td>
              <td className="px-3 py-2.5 w-16 text-center tabular-nums text-white/60 [font-family:'Lora',serif]">{fmtHeight(p.height)}</td>
              <td className="px-3 py-2.5 w-16 text-center tabular-nums text-white/60 [font-family:'Lora',serif]">{p.weight != null ? `${p.weight}` : "—"}</td>
              <td className="px-3 py-2.5 w-12 text-center tabular-nums text-white/60 [font-family:'Lora',serif]">{fmtExp(p.years_pro)}</td>
              <td className="px-3 py-2.5 min-w-[100px] text-white/50 [font-family:'Lora',serif]">{p.college ?? "—"}</td>
              <td className="px-4 py-2.5 w-24 text-right tabular-nums text-white/70 [font-family:'Lora',serif]">
                {fmtMoney(p.contract_salary) !== "—" ? fmtMoney(p.contract_salary) : fmtMoney(p.cap_hit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
  const other   = players.filter(p => !OFFENSE_POS.includes(p.position) && !DEFENSE_POS.includes(p.position) && !ST_POS.includes(p.position));

  const HEADER_COLS = ["Name", "Pos", "Age", "Ht", "Wt", "Exp", "College", "Salary"];

  return (
    <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
      {/* Table-wide header */}
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/10" style={{ backgroundColor: `${primaryColor}30` }}>
            {HEADER_COLS.map((h, i) => (
              <th
                key={h}
                className={`py-2.5 text-[10px] font-bold uppercase tracking-wider text-white/60 ${
                  i === 0 ? "px-4 text-left min-w-[140px]" :
                  i === HEADER_COLS.length - 1 ? "px-4 text-right w-24" :
                  "px-3 text-center"
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
      </table>
      {offense.length > 0 && <RosterGroup label="Offense" players={offense} primaryColor={primaryColor} />}
      {defense.length > 0 && <RosterGroup label="Defense" players={defense} primaryColor={primaryColor} />}
      {special.length > 0 && <RosterGroup label="Special Teams" players={special} primaryColor={primaryColor} />}
      {other.length > 0 && <RosterGroup label="Other" players={other} primaryColor={primaryColor} />}
      {players.length === 0 && (
        <div className="py-16 text-center text-white/30 text-sm">No roster data yet.</div>
      )}
    </div>
  );
}
