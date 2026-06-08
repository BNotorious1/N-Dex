import { Link, useParams } from "wouter";
import {
  useGetTeam,
  useGetTeamPlayers,
  getGetTeamQueryKey,
  getGetTeamPlayersQueryKey,
} from "@workspace/api-client-react";
import Navbar from "@/components/Navbar";

const positionColors: Record<string, string> = {
  QB: "bg-[#00C8FF]/15 text-[#00C8FF]",
  RB: "bg-green-900/30 text-green-400",
  FB: "bg-green-900/30 text-green-400",
  WR: "bg-purple-900/30 text-purple-400",
  TE: "bg-yellow-900/30 text-yellow-400",
  OL: "bg-orange-900/30 text-orange-400",
  DL: "bg-[#F44336]/15 text-[#F44336]",
  LB: "bg-[#F44336]/15 text-[#F44336]",
  CB: "bg-blue-900/30 text-blue-400",
  S: "bg-blue-900/30 text-blue-400",
  K: "bg-white/10 text-white/60",
  P: "bg-white/10 text-white/60",
};

function RatingBar({ value, max = 99 }: { value: number | null | undefined; max?: number }) {
  if (value == null) return <span className="text-white/20 text-xs">-</span>;
  const pct = Math.round((value / max) * 100);
  const color = value >= 90 ? "#00C8FF" : value >= 80 ? "#4ade80" : value >= 70 ? "#facc15" : "#F44336";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 flex-1 max-w-[48px] rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

export default function TeamDetail() {
  const params = useParams<{ id: string }>();
  const teamId = Number(params.id);

  const { data: team, isLoading: teamLoading } = useGetTeam(teamId, {
    query: { enabled: !!teamId, queryKey: getGetTeamQueryKey(teamId) },
  });
  const { data: players, isLoading: playersLoading } = useGetTeamPlayers(teamId, {
    query: { enabled: !!teamId, queryKey: getGetTeamPlayersQueryKey(teamId) },
  });

  if (teamLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="h-8 w-64 bg-white/5 rounded animate-pulse mb-4" />
          <div className="h-40 rounded-xl bg-[#141414] border border-white/8 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <p className="text-white/30">Team not found.</p>
        </div>
      </div>
    );
  }

  const sortedPlayers = players
    ? [...players].sort((a, b) => b.overall - a.overall)
    : [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />

      {/* Team header */}
      <div className="border-b border-white/8 bg-[#0d0d0d]">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <Link href={`/leagues/${team.league_id}`} className="text-xs text-white/30 hover:text-[#00C8FF] transition-colors mb-4 inline-block">
            &larr; Back to League
          </Link>

          <div className="flex items-start gap-4">
            <div
              className="h-16 w-16 shrink-0 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-lg"
              style={{ backgroundColor: team.primary_color ?? "#1a1a1a", border: `2px solid ${team.primary_color ?? "#333"}80` }}
              data-testid="img-team-logo"
            >
              {team.abbreviation}
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight" data-testid="text-team-name">
                {team.city} {team.name}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-white/50">{team.conference} {team.division}</span>
                <span className="rounded bg-[#00C8FF]/10 border border-[#00C8FF]/20 px-2 py-0.5 text-xs font-bold text-[#00C8FF]">
                  OVR {team.overall_rating}
                </span>
                {team.is_user_team && (
                  <span className="rounded bg-[#00C8FF]/10 border border-[#00C8FF]/20 px-2 py-0.5 text-xs font-bold text-[#00C8FF]">
                    Your Team
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6 max-w-xs">
            <div className="rounded-lg border border-white/8 bg-[#141414] p-3 text-center">
              <p className="text-xl font-black text-white">{team.wins}</p>
              <p className="text-[10px] uppercase text-white/30">Wins</p>
            </div>
            <div className="rounded-lg border border-white/8 bg-[#141414] p-3 text-center">
              <p className="text-xl font-black text-white/50">{team.losses}</p>
              <p className="text-[10px] uppercase text-white/30">Losses</p>
            </div>
            <div className="rounded-lg border border-white/8 bg-[#141414] p-3 text-center">
              <p className="text-xl font-black text-white/50">{team.ties}</p>
              <p className="text-[10px] uppercase text-white/30">Ties</p>
            </div>
          </div>
        </div>
      </div>

      {/* Roster */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">
          Roster ({sortedPlayers.length} players)
        </h2>

        {playersLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-[#141414] border border-white/8 animate-pulse" />
            ))}
          </div>
        ) : sortedPlayers.length > 0 ? (
          <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-white/30">Player</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold uppercase text-white/30">Pos</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold uppercase text-white/30">Age</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold uppercase text-white/30">OVR</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold uppercase text-white/30 hidden md:table-cell">SPD</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold uppercase text-white/30 hidden md:table-cell">STR</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold uppercase text-white/30 hidden lg:table-cell">AWR</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold uppercase text-white/30 hidden lg:table-cell">Spec.</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player) => {
                  const specAttr =
                    player.position === "QB"
                      ? { label: "THP", value: player.throwing_power }
                      : ["WR", "TE"].includes(player.position)
                      ? { label: "CTH", value: player.catching }
                      : ["DL", "LB", "CB", "S"].includes(player.position)
                      ? { label: "TAK", value: player.tackling }
                      : null;

                  return (
                    <tr key={player.id} className="border-b border-white/5 hover:bg-white/3 transition-colors" data-testid={`row-player-${player.id}`}>
                      <td className="px-4 py-3 font-semibold text-white">{player.name}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${positionColors[player.position] ?? "bg-white/10 text-white/60"}`}>
                          {player.position}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-white/50">{player.age}</td>
                      <td className="px-3 py-3 text-center">
                        <RatingBar value={player.overall} />
                      </td>
                      <td className="px-3 py-3 text-center hidden md:table-cell">
                        <RatingBar value={player.speed} />
                      </td>
                      <td className="px-3 py-3 text-center hidden md:table-cell">
                        <RatingBar value={player.strength} />
                      </td>
                      <td className="px-3 py-3 text-center hidden lg:table-cell">
                        <RatingBar value={player.awareness} />
                      </td>
                      <td className="px-3 py-3 text-center hidden lg:table-cell">
                        {specAttr ? (
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] text-white/30">{specAttr.label}</span>
                            <RatingBar value={specAttr.value} />
                          </div>
                        ) : (
                          <span className="text-white/20">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-white/30">
            <p className="text-sm">No players on roster yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
