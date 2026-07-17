import { useState } from "react";
import { Link } from "wouter";
import { Search, SlidersHorizontal } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";

interface Team {
  id: number; name: string; city: string; abbreviation: string;
  conference: string; division: string;
  wins: number; losses: number; ties: number;
  overall_rating: number; primary_color?: string | null; secondary_color?: string | null;
  is_user_team: boolean;
  member_discord?: string | null;
  member_gamertag?: string | null;
  roster_count?: number | null;
  offense_dev_count?: number | null;
  defense_dev_count?: number | null;
}

interface Props {
  teams: Team[];
  leagueId: number;
}

const CONFERENCES = ["All", "AFC", "NFC"];

function DevBadge({ count, color }: { count: number; color: string }) {
  if (count === 0) return <span className="text-white/20">—</span>;
  return (
    <span
      className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {count}
    </span>
  );
}

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

      <div className="rounded-xl border border-white/8 bg-[#141414] overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/8 bg-[#0f0f0f]">
              <th className="px-4 py-3 text-left   text-[10px] font-black uppercase tracking-wider text-white/30 whitespace-nowrap">Team</th>
              <th className="px-3 py-3 text-left   text-[10px] font-black uppercase tracking-wider text-white/30 whitespace-nowrap">Member</th>
              <th className="px-3 py-3 text-left   text-[10px] font-black uppercase tracking-wider text-white/30 whitespace-nowrap">In Game</th>
              <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-white/30 whitespace-nowrap">Division</th>
              <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-white/30 whitespace-nowrap">Record</th>
              <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-white/30 whitespace-nowrap">OVR</th>
              <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-white/30 whitespace-nowrap">Roster</th>
              <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-white/30 whitespace-nowrap">Off Devs</th>
              <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-white/30 whitespace-nowrap">Def Devs</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? filtered.map((team) => {
              const color = team.primary_color ?? "#00C8FF";
              return (
                <tr key={team.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">

                  {/* Team name + logo */}
                  <td className="px-4 py-2.5">
                    <Link href={`/teams/${team.id}`} className="flex items-center gap-3 hover:text-[#00C8FF] transition-colors group">
                      <TeamLogo
                        abbreviation={team.abbreviation}
                        primaryColor={team.primary_color}
                        size="lg"
                        shape="rounded"
                      />
                      <div>
                        <p className="font-bold text-white group-hover:text-[#00C8FF] transition-colors whitespace-nowrap">
                          {team.city} {team.name}
                        </p>
                        {team.is_user_team && (
                          <p className="text-[10px] text-[#00C8FF]">Your Team</p>
                        )}
                      </div>
                    </Link>
                  </td>

                  {/* Member (Discord) */}
                  <td className="px-3 py-2.5">
                    {team.member_discord
                      ? (
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#5865F2] shrink-0" />
                          <span className="text-white/80 font-medium whitespace-nowrap">{team.member_discord}</span>
                        </span>
                      )
                      : <span className="text-white/20">—</span>
                    }
                  </td>

                  {/* In Game (gamertag) */}
                  <td className="px-3 py-2.5">
                    {team.member_gamertag
                      ? <span className="text-white/70 font-mono text-[11px] whitespace-nowrap">{team.member_gamertag}</span>
                      : <span className="text-white/20">—</span>
                    }
                  </td>

                  {/* Division */}
                  <td className="px-3 py-2.5 text-center text-white/50 whitespace-nowrap">
                    {team.conference} {team.division}
                  </td>

                  {/* Record */}
                  <td className="px-3 py-2.5 text-center font-semibold text-white tabular-nums whitespace-nowrap">
                    {team.wins}-{team.losses}{team.ties > 0 ? `-${team.ties}` : ""}
                  </td>

                  {/* OVR */}
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
                    >
                      {team.overall_rating}
                    </span>
                  </td>

                  {/* Roster count */}
                  <td className="px-3 py-2.5 text-center text-white/60 tabular-nums">
                    {team.roster_count ?? 0}
                  </td>

                  {/* Off Devs */}
                  <td className="px-3 py-2.5 text-center">
                    <DevBadge count={team.offense_dev_count ?? 0} color="#00C8FF" />
                  </td>

                  {/* Def Devs */}
                  <td className="px-3 py-2.5 text-center">
                    <DevBadge count={team.defense_dev_count ?? 0} color="#F44336" />
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={9} className="py-10 text-center text-white/30 text-xs">
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
