import { Link } from "wouter";
import { fmtMoney, fmtHeight, type TeamPlayer } from "./types";

const OFFENSE_POS = ["QB", "HB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "OL"];
const DEFENSE_POS = ["DE", "DT", "DL", "LOLB", "ROLB", "MLB", "MIKE", "WILL", "SAM", "LB", "CB", "SS", "FS", "S"];
const ST_POS = ["K", "P"];

const OFFENSE_SET = new Set(OFFENSE_POS);
const DEFENSE_SET = new Set(DEFENSE_POS);
const ST_SET = new Set(ST_POS);

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

function RosterGroup({
  label,
  players,
  primaryColor,
}: {
  label: string;
  players: TeamPlayer[];
  primaryColor: string;
}) {
  if (players.length === 0) return null;
  return (
    <div>
      <div className="px-4 py-2 border-b border-white/8 bg-[#141414]">
        <span className="text-[11px] font-black uppercase tracking-widest text-white/60">{label}</span>
      </div>
      <table className="w-full text-xs">
        <tbody>
          {players.map((p, i) => (
            <tr
              key={p.id}
              className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.015]"}`}
            >
              {/* Name */}
              <td className="px-4 py-2.5 min-w-[140px]">
                <Link
                  href={`/players/${p.id}`}
                  className="font-semibold hover:underline"
                  style={{ color: primaryColor }}
                >
                  {p.name}
                </Link>
              </td>
              {/* POS */}
              <td className="px-3 py-2.5 w-14 text-center">
                <span className="text-[10px] font-bold text-white/60">{p.position}</span>
              </td>
              {/* AGE */}
              <td className="px-3 py-2.5 w-12 text-center tabular-nums text-white/60">{p.age}</td>
              {/* HT */}
              <td className="px-3 py-2.5 w-16 text-center tabular-nums text-white/60">
                {fmtHeight(p.height)}
              </td>
              {/* WT */}
              <td className="px-3 py-2.5 w-16 text-center tabular-nums text-white/60">
                {p.weight != null ? `${p.weight} lbs` : "—"}
              </td>
              {/* EXP */}
              <td className="px-3 py-2.5 w-12 text-center tabular-nums text-white/60">
                {fmtExp(p.years_pro)}
              </td>
              {/* COLLEGE */}
              <td className="px-3 py-2.5 min-w-[100px] text-white/50">
                {p.college ?? "—"}
              </td>
              {/* SALARY */}
              <td className="px-4 py-2.5 w-24 text-right tabular-nums text-white/70">
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

  const offense = sortRosterGroup(
    players.filter(p => OFFENSE_SET.has(p.position)),
    OFFENSE_POS,
  );
  const defense = sortRosterGroup(
    players.filter(p => DEFENSE_SET.has(p.position)),
    DEFENSE_POS,
  );
  const st = sortRosterGroup(
    players.filter(p => ST_SET.has(p.position)),
    ST_POS,
  );
  const other = players.filter(
    p => !OFFENSE_SET.has(p.position) && !DEFENSE_SET.has(p.position) && !ST_SET.has(p.position),
  );

  return (
    <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/8">
        <h2 className="text-lg font-black text-white tracking-tight">
          {team.city} {team.name} Roster
        </h2>
      </div>

      {/* Column headers */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/8 bg-[#0d0d0d]">
              <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/30 min-w-[140px]">Name</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-14">Pos</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-12">Age</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-16">Ht</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-16">Wt</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-12">Exp</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/30 min-w-[100px]">College</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-white/30 w-24">Salary</th>
            </tr>
          </thead>
        </table>

        {/* Groups rendered as separate tbody blocks inside shared scroll */}
        <table className="w-full text-xs">
          <tbody>
            {offense.length > 0 && (
              <>
                <tr>
                  <td colSpan={8} className="px-4 py-2 bg-[#141414] border-b border-white/8">
                    <span className="text-[11px] font-black uppercase tracking-widest text-white/60">Offense</span>
                  </td>
                </tr>
                {offense.map((p, i) => (
                  <RosterRow key={p.id} player={p} primaryColor={primaryColor} striped={i % 2 !== 0} />
                ))}
              </>
            )}
            {defense.length > 0 && (
              <>
                <tr>
                  <td colSpan={8} className="px-4 py-2 bg-[#141414] border-b border-white/8 border-t border-white/5">
                    <span className="text-[11px] font-black uppercase tracking-widest text-white/60">Defense</span>
                  </td>
                </tr>
                {defense.map((p, i) => (
                  <RosterRow key={p.id} player={p} primaryColor={primaryColor} striped={i % 2 !== 0} />
                ))}
              </>
            )}
            {st.length > 0 && (
              <>
                <tr>
                  <td colSpan={8} className="px-4 py-2 bg-[#141414] border-b border-white/8 border-t border-white/5">
                    <span className="text-[11px] font-black uppercase tracking-widest text-white/60">Special Teams</span>
                  </td>
                </tr>
                {st.map((p, i) => (
                  <RosterRow key={p.id} player={p} primaryColor={primaryColor} striped={i % 2 !== 0} />
                ))}
              </>
            )}
            {other.length > 0 && (
              <>
                <tr>
                  <td colSpan={8} className="px-4 py-2 bg-[#141414] border-b border-white/8 border-t border-white/5">
                    <span className="text-[11px] font-black uppercase tracking-widest text-white/60">Other</span>
                  </td>
                </tr>
                {other.map((p, i) => (
                  <RosterRow key={p.id} player={p} primaryColor={primaryColor} striped={i % 2 !== 0} />
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {players.length === 0 && (
        <div className="py-12 text-center text-white/30 text-sm">No players on roster yet</div>
      )}
    </div>
  );
}

function RosterRow({
  player: p,
  primaryColor,
  striped,
}: {
  player: TeamPlayer;
  primaryColor: string;
  striped: boolean;
}) {
  return (
    <tr className={`border-b border-white/5 hover:bg-white/3 transition-colors ${striped ? "bg-white/[0.015]" : ""}`}>
      <td className="px-4 py-2.5 min-w-[140px]">
        <Link href={`/players/${p.id}`} className="font-semibold hover:underline" style={{ color: primaryColor }}>
          {p.name}
        </Link>
      </td>
      <td className="px-3 py-2.5 w-14 text-center">
        <span className="text-[10px] font-bold text-white/60">{p.position}</span>
      </td>
      <td className="px-3 py-2.5 w-12 text-center tabular-nums text-white/60">{p.age}</td>
      <td className="px-3 py-2.5 w-16 text-center tabular-nums text-white/60">{fmtHeight(p.height)}</td>
      <td className="px-3 py-2.5 w-16 text-center tabular-nums text-white/60">
        {p.weight != null ? `${p.weight} lbs` : "—"}
      </td>
      <td className="px-3 py-2.5 w-12 text-center tabular-nums text-white/60">
        {p.years_pro == null || p.years_pro === 0 ? "R" : String(p.years_pro)}
      </td>
      <td className="px-3 py-2.5 min-w-[100px] text-white/50">{p.college ?? "—"}</td>
      <td className="px-4 py-2.5 w-24 text-right tabular-nums text-white/70">
        {fmtMoney(p.contract_salary) !== "—" ? fmtMoney(p.contract_salary) : fmtMoney(p.cap_hit)}
      </td>
    </tr>
  );
}
