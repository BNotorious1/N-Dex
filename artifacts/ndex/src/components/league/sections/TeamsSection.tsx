import { useState } from "react";
import { Link } from "wouter";
import { Search, SlidersHorizontal } from "lucide-react";

interface Team {
  id: number; name: string; city: string; abbreviation: string;
  conference: string; division: string;
  wins: number; losses: number; ties: number;
  overall_rating: number; primary_color?: string | null; secondary_color?: string | null;
  is_user_team: boolean;
}

interface Props {
  teams: Team[];
  leagueId: number;
}

const CONFERENCES = ["All", "AFC", "NFC"];

export default function TeamsSection({ teams }: Props) {
  const [search, setSearch] = useState("");
  const [conference, setConference] = useState("All");

  const filtered = teams.filter((t) => {
    const matchName =
      `${t.city} ${t.name}`.toLowerCase().includes(search.toLowerCase()) ||
      t.abbreviation.toLowerCase().includes(search.toLowerCase());
    const matchConf = conference === "All" || t.conference === conference;
    return matchName && matchConf;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2 text-white/40">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="text-xs font-bold uppercase tracking-wider">Teams</span>
          <span className="text-[10px] text-white/25">({filtered.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {CONFERENCES.map((c) => (
            <button
              key={c}
              onClick={() => setConference(c)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                conference === c
                  ? "bg-[#00C8FF] text-black"
                  : "bg-white/5 text-white/40 hover:bg-white/10"
              }`}
            >
              {c}
            </button>
          ))}
          <div className="relative ml-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams..."
              className="bg-[#1a1a1a] border border-white/10 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#00C8FF]/40 w-44"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/8 bg-[#0f0f0f]">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Team</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">Division</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">Record</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">Win %</th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">OVR</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? filtered.map((team) => {
              const gp = team.wins + team.losses + team.ties;
              const pct = gp > 0 ? ((team.wins + team.ties * 0.5) / gp).toFixed(3) : "—";
              return (
                <tr key={team.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/teams/${team.id}`} className="flex items-center gap-3 hover:text-[#00C8FF] transition-colors group">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0"
                        style={{ backgroundColor: team.primary_color ?? "#333" }}
                      >
                        {team.abbreviation}
                      </div>
                      <div>
                        <p className="font-bold text-white group-hover:text-[#00C8FF] transition-colors">
                          {team.city} {team.name}
                        </p>
                        {team.is_user_team && (
                          <p className="text-[10px] text-[#00C8FF]">Your Team</p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-center text-white/50">
                    {team.conference} {team.division}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-white">
                    {team.wins}-{team.losses}{team.ties > 0 ? `-${team.ties}` : ""}
                  </td>
                  <td className="px-3 py-3 text-center text-white/50">{pct}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="rounded bg-[#00C8FF]/10 border border-[#00C8FF]/20 px-2 py-0.5 text-[10px] font-bold text-[#00C8FF]">
                      {team.overall_rating}
                    </span>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={5} className="py-10 text-center text-white/30 text-xs">
                  No teams found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
