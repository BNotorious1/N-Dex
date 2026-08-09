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

interface Props { standings: StandingEntry[] }

export default function RankingsSection({ standings }: Props) {
  const ranked = [...standings].sort((a, b) => {
    const aWinPct = a.wins / Math.max(1, a.wins + a.losses + a.ties);
    const bWinPct = b.wins / Math.max(1, b.wins + b.losses + b.ties);
    if (bWinPct !== aWinPct) return bWinPct - aWinPct;
    const aDiff = a.points_for - a.points_against;
    const bDiff = b.points_for - b.points_against;
    return bDiff - aDiff;
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Power Rankings</p>
        <p className="text-[10px] text-white/25">— sorted by win % then points differential</p>
      </div>

      <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className="border-b border-white/8 bg-[#0f0f0f]">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30 w-16">Rank</th>
              <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Team</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">Conf</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">W</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">L</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">T</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">Win%</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">PF</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">PA</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">DIFF</th>
            </tr>
          </thead>
          <tbody>
            {ranked.length > 0 ? ranked.map((e, i) => {
              const gp = e.wins + e.losses + e.ties;
              const pct = gp > 0 ? ((e.wins + e.ties * 0.5) / gp).toFixed(3) : ".000";
              const diff = e.points_for - e.points_against;
              const rankColor = i === 0 ? "text-[#FFD700]" : i === 1 ? "text-[#C0C0C0]" : i === 2 ? "text-[#CD7F32]" : "text-white/25";

              return (
                <tr key={e.team.id} className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i < 3 ? "bg-white/[0.01]" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-black w-6 ${rankColor}`}>
                        {i + 1}
                      </span>
                      <span className="text-[10px] text-white/20">—</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/teams/${e.team.id}`} className="flex items-center gap-2 hover:text-[#00C8FF] transition-colors">
                      <TeamLogo
                        abbreviation={e.team.abbreviation}
                        primaryColor={e.team.primary_color}
                        size="md"
                        shape="rounded"
                      />
                      <span className="font-bold text-white">{e.team.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-center text-white/45">{e.conference}</td>
                  <td className="px-3 py-3 text-center font-bold text-white">{e.wins}</td>
                  <td className="px-3 py-3 text-center text-white/45">{e.losses}</td>
                  <td className="px-3 py-3 text-center text-white/45">{e.ties}</td>
                  <td className="px-3 py-3 text-center text-white/60 font-semibold">{pct}</td>
                  <td className="px-3 py-3 text-center text-[#00C8FF] font-semibold">{e.points_for}</td>
                  <td className="px-3 py-3 text-center text-white/45">{e.points_against}</td>
                  <td className={`px-3 py-3 text-center font-bold ${diff > 0 ? "text-green-400" : diff < 0 ? "text-[#F44336]" : "text-white/40"}`}>
                    {diff > 0 ? `+${diff}` : diff}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={10} className="py-12 text-center text-white/30">No ranking data yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
