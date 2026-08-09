import { useState } from "react";
import { Link } from "wouter";
import TeamLogo from "@/components/TeamLogo";

interface Team {
  id: number; name: string; city: string; abbreviation: string;
  primary_color?: string | null;
}
interface StandingEntry {
  team: Team; wins: number; losses: number; ties: number;
  points_for: number; points_against: number; conference: string; division: string;
}

type View = "league" | "conference" | "division";

interface Props { standings: StandingEntry[] }

export default function StandingsSection({ standings }: Props) {
  const [view, setView] = useState<View>("league");

  return (
    <div>
      <div className="flex items-center gap-1 mb-5 border-b border-white/8">
        {(["league", "conference", "division"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
              view === v
                ? "border-[#00C8FF] text-[#00C8FF]"
                : "border-transparent text-white/35 hover:text-white/60"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "league" && <StandingsTable entries={standings} />}
      {view === "conference" && <ConferenceStandings entries={standings} />}
      {view === "division" && <DivisionStandings entries={standings} />}
    </div>
  );
}

function StandingsTable({ entries, title }: { entries: StandingEntry[]; title?: string }) {
  const sorted = [...entries].sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  return (
    <div className="mb-6">
      {title && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#00C8FF] mb-3 px-1">{title}</p>
      )}
      <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/8 bg-[#0f0f0f]">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30 w-8">#</th>
              <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Team</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">W</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">L</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">T</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">%</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">PF</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">PA</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">DIFF</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length > 0 ? sorted.map((e, i) => {
              const gp = e.wins + e.losses + e.ties;
              const pct = gp > 0 ? ((e.wins + e.ties * 0.5) / gp).toFixed(3) : ".000";
              const diff = e.points_for - e.points_against;
              return (
                <tr key={e.team.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-2.5 text-white/25 text-[10px]">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/teams/${e.team.id}`} className="flex items-center gap-2 hover:text-[#00C8FF] transition-colors">
                      <TeamLogo
                        abbreviation={e.team.abbreviation}
                        primaryColor={e.team.primary_color}
                        size="sm"
                        shape="circle"
                      />
                      <span className="font-semibold text-white">{e.team.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold text-white">{e.wins}</td>
                  <td className="px-3 py-2.5 text-center text-white/45">{e.losses}</td>
                  <td className="px-3 py-2.5 text-center text-white/45">{e.ties}</td>
                  <td className="px-3 py-2.5 text-center text-white/60">{pct}</td>
                  <td className="px-3 py-2.5 text-center text-[#00C8FF] font-semibold">{e.points_for}</td>
                  <td className="px-3 py-2.5 text-center text-white/45">{e.points_against}</td>
                  <td className={`px-3 py-2.5 text-center font-semibold ${diff > 0 ? "text-green-400" : diff < 0 ? "text-[#F44336]" : "text-white/40"}`}>
                    {diff > 0 ? `+${diff}` : diff}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={9} className="py-10 text-center text-white/30">No standings data yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConferenceStandings({ entries }: { entries: StandingEntry[] }) {
  const afc = entries.filter((e) => e.conference === "AFC");
  const nfc = entries.filter((e) => e.conference === "NFC");
  const other = entries.filter((e) => e.conference !== "AFC" && e.conference !== "NFC");
  return (
    <div className="space-y-6">
      {afc.length > 0 && <StandingsTable entries={afc} title="AFC" />}
      {nfc.length > 0 && <StandingsTable entries={nfc} title="NFC" />}
      {other.length > 0 && <StandingsTable entries={other} title="Other" />}
      {entries.length === 0 && <p className="text-center text-white/30 text-xs py-10">No standings data yet</p>}
    </div>
  );
}

function DivisionStandings({ entries }: { entries: StandingEntry[] }) {
  const divMap = entries.reduce<Record<string, StandingEntry[]>>((acc, e) => {
    const key = `${e.conference} ${e.division}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});
  const divKeys = Object.keys(divMap).sort();
  if (divKeys.length === 0) return <p className="text-center text-white/30 text-xs py-10">No standings data yet</p>;
  return (
    <div className="grid sm:grid-cols-2 gap-6">
      {divKeys.map((key) => (
        <StandingsTable key={key} entries={divMap[key]} title={key} />
      ))}
    </div>
  );
}
