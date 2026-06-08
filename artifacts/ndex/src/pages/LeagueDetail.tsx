import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetLeagueSummary,
  useGetLeagueStandings,
  useGetLeagueGames,
  useGetLeagueStatLeaders,
  useGetLeagueTeams,
  getGetLeagueSummaryQueryKey,
  getGetLeagueStandingsQueryKey,
  getGetLeagueGamesQueryKey,
  getGetLeagueStatLeadersQueryKey,
  getGetLeagueTeamsQueryKey,
} from "@workspace/api-client-react";
import Navbar from "@/components/Navbar";

type Tab = "summary" | "standings" | "schedule" | "stats" | "teams";

const phaseLabels: Record<string, string> = {
  PRE_SEASON: "Pre Season",
  REGULAR_SEASON: "Regular Season",
  POST_SEASON: "Post Season",
  SUPER_BOWL: "Super Bowl",
};

const platformColors: Record<string, string> = {
  PS5: "bg-[#00439c]/30 text-[#6fa3ef] border-[#00439c]/50",
  Xbox: "bg-[#107c10]/30 text-[#6fcf6f] border-[#107c10]/50",
  PC: "bg-white/10 text-white/60 border-white/20",
};

export default function LeagueDetail() {
  const params = useParams<{ id: string }>();
  const leagueId = Number(params.id);
  const [tab, setTab] = useState<Tab>("summary");

  const { data: summary, isLoading: summaryLoading } = useGetLeagueSummary(leagueId, {
    query: { enabled: !!leagueId, queryKey: getGetLeagueSummaryQueryKey(leagueId) },
  });
  const { data: standings } = useGetLeagueStandings(leagueId, {
    query: { enabled: !!leagueId && tab === "standings", queryKey: getGetLeagueStandingsQueryKey(leagueId) },
  });
  const { data: games } = useGetLeagueGames(leagueId, {
    query: { enabled: !!leagueId && tab === "schedule", queryKey: getGetLeagueGamesQueryKey(leagueId) },
  });
  const { data: statLeaders } = useGetLeagueStatLeaders(leagueId, {
    query: { enabled: !!leagueId && tab === "stats", queryKey: getGetLeagueStatLeadersQueryKey(leagueId) },
  });
  const { data: teams } = useGetLeagueTeams(leagueId, {
    query: { enabled: !!leagueId && tab === "teams", queryKey: getGetLeagueTeamsQueryKey(leagueId) },
  });

  if (summaryLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="h-8 w-64 bg-white/5 rounded animate-pulse mb-4" />
          <div className="h-4 w-48 bg-white/5 rounded animate-pulse mb-8" />
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-[#141414] border border-white/8 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const league = summary?.league;
  if (!league) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <Navbar />
        <p className="text-white/40">League not found.</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "summary", label: "Summary" },
    { key: "standings", label: "Standings" },
    { key: "schedule", label: "Schedule" },
    { key: "stats", label: "Stat Leaders" },
    { key: "teams", label: "Teams" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />

      {/* League header */}
      <div className="border-b border-white/8 bg-[#0d0d0d]">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#00C8FF]/10 border border-[#00C8FF]/20">
              <span className="text-sm font-black text-[#00C8FF]">NS</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-black uppercase tracking-tight truncate" data-testid="text-league-name">
                  {league.name}
                </h1>
                {league.is_money_league && (
                  <span className="rounded-full bg-[#F44336]/20 border border-[#F44336]/30 px-2 py-0.5 text-[10px] font-bold text-[#F44336] uppercase">
                    Money League
                  </span>
                )}
              </div>
              <p className="text-xs text-white/40 mb-2">@{league.commissioner_name}</p>
              <div className="flex flex-wrap gap-1.5">
                <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${platformColors[league.platform] ?? "bg-white/10 text-white/60 border-white/20"}`}>
                  {league.platform}
                </span>
                {league.is_cross_play && (
                  <span className="rounded border border-white/15 bg-white/8 px-2 py-0.5 text-[10px] font-semibold text-white/60">
                    Crossplay
                  </span>
                )}
                <span className="rounded border border-[#00C8FF]/30 bg-[#00C8FF]/10 px-2 py-0.5 text-[10px] font-bold text-[#00C8FF]">
                  {league.difficulty.replace("_", " ")}
                </span>
                <span className="rounded border border-white/15 bg-white/8 px-2 py-0.5 text-[10px] text-white/50">
                  {phaseLabels[league.phase] ?? league.phase} &bull; Week {league.week} &bull; {league.season}
                </span>
                <span className="rounded border border-white/15 bg-white/8 px-2 py-0.5 text-[10px] text-white/50">
                  {league.member_count}/{league.max_members} Members
                </span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <StatPill label="Total Teams" value={String(summary?.total_teams ?? 0)} />
            <StatPill label="Games Played" value={String(summary?.total_games_played ?? 0)} />
            <StatPill label="Current Week" value={String(summary?.current_week ?? league.week)} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/8 bg-[#0d0d0d] sticky top-14 z-40">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.key
                    ? "border-[#00C8FF] text-[#00C8FF]"
                    : "border-transparent text-white/40 hover:text-white/70"
                }`}
                data-testid={`tab-${t.key}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {tab === "summary" && summary && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Top teams */}
            <div className="lg:col-span-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">Top Teams</h2>
              <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-white/30">Team</th>
                      <th className="px-3 py-3 text-center text-[10px] font-bold uppercase text-white/30">W</th>
                      <th className="px-3 py-3 text-center text-[10px] font-bold uppercase text-white/30">L</th>
                      <th className="px-3 py-3 text-center text-[10px] font-bold uppercase text-white/30">T</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-white/30">OVR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.top_teams.map((team, i) => (
                      <tr key={team.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/teams/${team.id}`} className="flex items-center gap-2 hover:text-[#00C8FF] transition-colors">
                            <span className="text-[10px] text-white/20 w-4">{i + 1}</span>
                            <div
                              className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black"
                              style={{ backgroundColor: team.primary_color ?? "#00C8FF", color: "#fff" }}
                            >
                              {team.abbreviation.slice(0, 2)}
                            </div>
                            <span className="font-semibold text-white">{team.city} {team.name}</span>
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-white">{team.wins}</td>
                        <td className="px-3 py-3 text-center text-white/50">{team.losses}</td>
                        <td className="px-3 py-3 text-center text-white/50">{team.ties}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="rounded-md bg-[#00C8FF]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#00C8FF]">
                            {team.overall_rating}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent games */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">Recent Games</h2>
              <div className="space-y-2">
                {summary.recent_games.length > 0 ? (
                  summary.recent_games.map((game) => (
                    <div key={game.id} className="rounded-xl border border-white/8 bg-[#141414] p-3" data-testid={`card-game-${game.id}`}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-white/30 text-[10px]">Week {game.week} &bull; {game.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex-1 text-xs font-semibold text-white truncate">{game.home_team_name}</span>
                        <span className="text-sm font-black text-[#00C8FF]">{game.home_score}</span>
                        <span className="text-white/20 text-xs">-</span>
                        <span className="text-sm font-black text-white/70">{game.away_score}</span>
                        <span className="flex-1 text-xs font-semibold text-white/50 truncate text-right">{game.away_team_name}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-white/30 text-center py-8">No completed games yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "standings" && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">League Standings</h2>
            {standings && standings.length > 0 ? (
              <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-white/30">#</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-white/30">Team</th>
                      <th className="px-3 py-3 text-center text-[10px] font-bold uppercase text-white/30">Conf</th>
                      <th className="px-3 py-3 text-center text-[10px] font-bold uppercase text-white/30">W</th>
                      <th className="px-3 py-3 text-center text-[10px] font-bold uppercase text-white/30">L</th>
                      <th className="px-3 py-3 text-center text-[10px] font-bold uppercase text-white/30">T</th>
                      <th className="px-3 py-3 text-center text-[10px] font-bold uppercase text-white/30">PF</th>
                      <th className="px-3 py-3 text-center text-[10px] font-bold uppercase text-white/30">PA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((entry, i) => (
                      <tr key={entry.team.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3 text-white/30">{i + 1}</td>
                        <td className="px-4 py-3">
                          <Link href={`/teams/${entry.team.id}`} className="flex items-center gap-2 hover:text-[#00C8FF] transition-colors">
                            <div
                              className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black"
                              style={{ backgroundColor: entry.team.primary_color ?? "#333", color: "#fff" }}
                            >
                              {entry.team.abbreviation.slice(0, 2)}
                            </div>
                            <span className="font-semibold">{entry.team.city} {entry.team.name}</span>
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-center text-white/50">{entry.conference}</td>
                        <td className="px-3 py-3 text-center font-bold text-white">{entry.wins}</td>
                        <td className="px-3 py-3 text-center text-white/50">{entry.losses}</td>
                        <td className="px-3 py-3 text-center text-white/50">{entry.ties}</td>
                        <td className="px-3 py-3 text-center text-[#00C8FF] font-semibold">{entry.points_for}</td>
                        <td className="px-3 py-3 text-center text-white/50">{entry.points_against}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-white/30 text-center py-8">No standings data yet</p>
            )}
          </div>
        )}

        {tab === "schedule" && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">Schedule</h2>
            {games && games.length > 0 ? (
              <div className="space-y-2">
                {games.map((game) => (
                  <div key={game.id} className="rounded-xl border border-white/8 bg-[#141414] p-4" data-testid={`row-game-${game.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-center min-w-[60px]">
                          <p className="text-[10px] text-white/30 uppercase">Week {game.week}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-1">
                          <span className="font-semibold text-sm text-white flex-1 text-right">{game.home_team_name}</span>
                          {game.status === "COMPLETED" ? (
                            <span className="text-base font-black text-[#00C8FF]">
                              {game.home_score} - {game.away_score}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-white/30 px-2">VS</span>
                          )}
                          <span className="font-semibold text-sm text-white/50 flex-1">{game.away_team_name}</span>
                        </div>
                      </div>
                      <span className={`ml-4 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${
                        game.status === "COMPLETED"
                          ? "bg-green-900/30 text-green-400 border-green-500/30"
                          : game.status === "IN_PROGRESS"
                          ? "bg-[#00C8FF]/20 text-[#00C8FF] border-[#00C8FF]/30"
                          : "bg-white/8 text-white/40 border-white/15"
                      }`}>
                        {game.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/30 text-center py-8">No games scheduled yet</p>
            )}
          </div>
        )}

        {tab === "stats" && statLeaders && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(["passing", "rushing", "receiving", "defense"] as const).map((cat) => (
              <div key={cat}>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">{cat}</h2>
                <div className="space-y-2">
                  {statLeaders[cat].length > 0 ? (
                    statLeaders[cat].map((entry, i) => (
                      <div key={entry.player.id} className="rounded-lg border border-white/8 bg-[#141414] p-3 flex items-center gap-2">
                        <span className="text-[10px] text-white/20 w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{entry.player.name}</p>
                          <p className="text-[10px] text-white/40">{entry.team_name} &bull; {entry.player.position}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-[#00C8FF]">{entry.stat_value}</p>
                          <p className="text-[9px] text-white/30">{entry.stat_label}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-white/30 text-center py-4">No data</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "teams" && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">Teams</h2>
            {teams && teams.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {teams.map((team) => (
                  <Link key={team.id} href={`/teams/${team.id}`} data-testid={`card-team-${team.id}`}>
                    <div className="rounded-xl border border-white/8 bg-[#141414] p-4 hover:border-[#00C8FF]/30 hover:bg-[#181818] transition-all cursor-pointer">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="h-9 w-9 rounded-lg flex items-center justify-center text-xs font-black text-white"
                          style={{ backgroundColor: team.primary_color ?? "#333" }}
                        >
                          {team.abbreviation}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{team.city} {team.name}</p>
                          <p className="text-[10px] text-white/40">{team.conference} {team.division}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/50">{team.wins}-{team.losses}{team.ties > 0 ? `-${team.ties}` : ""}</span>
                        <span className="rounded bg-[#00C8FF]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#00C8FF]">
                          OVR {team.overall_rating}
                        </span>
                      </div>
                      {team.is_user_team && (
                        <p className="text-[10px] text-[#00C8FF] mt-2 font-semibold">Your Team</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/30 text-center py-8">No teams in this league yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-[#141414] px-4 py-3 text-center">
      <p className="text-lg font-black text-[#00C8FF]">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">{label}</p>
    </div>
  );
}
