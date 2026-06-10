import { Link, useParams } from "wouter";
import {
  useGetTeam,
  useGetTeamPlayers,
  useGetTeamGames,
  getGetTeamQueryKey,
  getGetTeamPlayersQueryKey,
  getGetTeamGamesQueryKey,
} from "@workspace/api-client-react";
import Navbar from "@/components/Navbar";
import TeamLogo from "@/components/TeamLogo";
import type { TeamGame } from "@workspace/api-client-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

const positionColors: Record<string, string> = {
  QB: "bg-[#00C8FF]/15 text-[#00C8FF]",
  RB: "bg-green-900/30 text-green-400",
  FB: "bg-green-900/30 text-green-400",
  HB: "bg-green-900/30 text-green-400",
  WR: "bg-purple-900/30 text-purple-400",
  TE: "bg-yellow-900/30 text-yellow-400",
  OL: "bg-orange-900/30 text-orange-400",
  LT: "bg-orange-900/30 text-orange-400",
  LG: "bg-orange-900/30 text-orange-400",
  C: "bg-orange-900/30 text-orange-400",
  RG: "bg-orange-900/30 text-orange-400",
  RT: "bg-orange-900/30 text-orange-400",
  DL: "bg-[#F44336]/15 text-[#F44336]",
  DT: "bg-[#F44336]/15 text-[#F44336]",
  DE: "bg-[#F44336]/15 text-[#F44336]",
  LB: "bg-[#F44336]/15 text-[#F44336]",
  MLB: "bg-[#F44336]/15 text-[#F44336]",
  LOLB: "bg-[#F44336]/15 text-[#F44336]",
  ROLB: "bg-[#F44336]/15 text-[#F44336]",
  MIKE: "bg-[#F44336]/15 text-[#F44336]",
  WILL: "bg-[#F44336]/15 text-[#F44336]",
  SAM: "bg-[#F44336]/15 text-[#F44336]",
  CB: "bg-blue-900/30 text-blue-400",
  SS: "bg-blue-900/30 text-blue-400",
  FS: "bg-blue-900/30 text-blue-400",
  S: "bg-blue-900/30 text-blue-400",
  K: "bg-white/10 text-white/60",
  P: "bg-white/10 text-white/60",
};

function RatingBar({ value, max = 99 }: { value: number | null | undefined; max?: number }) {
  if (value == null) return <span className="text-white/20 text-xs">—</span>;
  const pct = Math.round((value / max) * 100);
  const color = value >= 90 ? "#00C8FF" : value >= 80 ? "#4ade80" : value >= 70 ? "#facc15" : "#F44336";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 flex-1 max-w-[40px] rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <div className="px-4 py-2.5 flex items-center" style={{ backgroundColor: color }}>
      <span className="text-xs font-black uppercase tracking-widest text-white">{title}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-[11px] text-white/40 uppercase tracking-wider">{label}</span>
      <span className="text-xs font-semibold text-white text-right">{value}</span>
    </div>
  );
}

function gameResult(game: TeamGame, teamId: number): "W" | "L" | "T" | null {
  if (game.status !== "FINAL" || game.home_score == null || game.away_score == null) return null;
  const isHome = game.home_team_id === teamId;
  const teamScore = isHome ? game.home_score : game.away_score;
  const oppScore = isHome ? game.away_score : game.home_score;
  if (teamScore > oppScore) return "W";
  if (teamScore < oppScore) return "L";
  return "T";
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TeamDetail() {
  const params = useParams<{ id: string }>();
  const teamId = Number(params.id);

  const { data: team, isLoading: teamLoading } = useGetTeam(teamId, {
    query: { enabled: !!teamId, queryKey: getGetTeamQueryKey(teamId) },
  });
  const { data: players, isLoading: playersLoading } = useGetTeamPlayers(teamId, {
    query: { enabled: !!teamId, queryKey: getGetTeamPlayersQueryKey(teamId) },
  });
  const { data: games } = useGetTeamGames(teamId, {
    query: { enabled: !!teamId, queryKey: getGetTeamGamesQueryKey(teamId) },
  });

  if (teamLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <Navbar />
        <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
          <div className="h-6 w-40 bg-white/5 rounded animate-pulse" />
          <div className="h-48 rounded-xl bg-[#141414] border border-white/8 animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 rounded-xl bg-[#141414] border border-white/8 animate-pulse" />
            <div className="h-32 rounded-xl bg-[#141414] border border-white/8 animate-pulse" />
          </div>
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

  const primaryColor = team.primary_color ?? "#333333";
  const sortedPlayers = players ? [...players].sort((a, b) => b.overall - a.overall) : [];

  const gp = team.wins + team.losses + team.ties;
  const winPct = gp > 0 ? ((team.wins + team.ties * 0.5) / gp).toFixed(3) : "—";

  const sortedGames = games ? [...games].sort((a, b) => a.week - b.week) : [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />

      {/* ─── Hero Banner ─── */}
      <div
        className="relative border-b border-white/8"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}28 0%, ${primaryColor}10 30%, #0a0a0a 65%)`,
        }}
      >
        {/* Glow blob */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 50% 80% at 10% 50%, ${primaryColor}22 0%, transparent 70%)`,
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 py-8">
          <Link
            href={`/leagues/${team.league_id}`}
            className="text-[11px] text-white/30 hover:text-[#00C8FF] transition-colors mb-5 inline-flex items-center gap-1"
          >
            <span>←</span>
            <span className="uppercase tracking-wider font-bold">Back to League</span>
          </Link>

          <div className="flex items-center gap-6">
            {/* Team logo */}
            <div
              className="shrink-0 shadow-2xl"
              style={{ filter: `drop-shadow(0 0 16px ${primaryColor}50)` }}
              data-testid="img-team-logo"
            >
              <TeamLogo
                abbreviation={team.abbreviation}
                primaryColor={primaryColor}
                size="2xl"
                shape="circle"
                noBg
              />
            </div>

            {/* Name + meta */}
            <div>
              <p className="text-sm text-white/40 uppercase tracking-widest font-bold mb-0.5">
                {team.city}
              </p>
              <h1
                className="text-4xl font-black uppercase tracking-tight leading-none"
                data-testid="text-team-name"
                style={{ color: "white", textShadow: `0 0 40px ${primaryColor}60` }}
              >
                {team.name}
              </h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-sm text-white/50">
                  {team.conference} · {team.division}
                </span>
                <span
                  className="rounded px-2 py-0.5 text-[11px] font-black uppercase tracking-wider border"
                  style={{ color: primaryColor, borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}15` }}
                >
                  OVR {team.overall_rating}
                </span>
                {team.is_user_team && (
                  <span className="rounded bg-[#00C8FF]/10 border border-[#00C8FF]/30 px-2 py-0.5 text-[11px] font-bold text-[#00C8FF]">
                    Your Team
                  </span>
                )}
              </div>

              {/* Record strip */}
              <div className="flex items-center gap-4 mt-3">
                <div className="text-center">
                  <p className="text-2xl font-black text-white tabular-nums">{team.wins}</p>
                  <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Wins</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-2xl font-black text-white/50 tabular-nums">{team.losses}</p>
                  <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Losses</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-2xl font-black text-white/30 tabular-nums">{team.ties}</p>
                  <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Ties</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-2xl font-black text-white/60 tabular-nums">{winPct}</p>
                  <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Win %</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">

        {/* Info cards row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Details card */}
          <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
            <SectionHeader title="Details" color={primaryColor} />
            <div className="px-4 py-1">
              <InfoRow label="Conference" value={team.conference} />
              <InfoRow label="Division" value={`${team.conference} ${team.division}`} />
              <InfoRow label="Overall Rating" value={
                <span style={{ color: team.overall_rating >= 90 ? "#00C8FF" : team.overall_rating >= 80 ? "#4ade80" : "#facc15" }}>
                  {team.overall_rating}
                </span>
              } />
              {team.is_user_team && (
                <InfoRow label="Status" value={
                  <span className="text-[#00C8FF]">Your Team</span>
                } />
              )}
            </div>
          </div>

          {/* Season Stats card */}
          <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
            <SectionHeader title="Season Record" color={primaryColor} />
            <div className="px-4 py-1">
              <InfoRow label="Record" value={`${team.wins}–${team.losses}${team.ties > 0 ? `–${team.ties}` : ""}`} />
              <InfoRow label="Win Percentage" value={winPct} />
              <InfoRow label="Games Played" value={gp} />
              {sortedGames.length > 0 && (() => {
                const played = sortedGames.filter(g => g.status === "FINAL");
                const results = played.map(g => gameResult(g, teamId)).filter(Boolean);
                const streak = results.length > 0 ? (() => {
                  const last = results[results.length - 1]!;
                  let n = 0;
                  for (let i = results.length - 1; i >= 0 && results[i] === last; i--) n++;
                  return `${last}${n}`;
                })() : "—";
                return <InfoRow label="Current Streak" value={
                  <span style={{ color: streak.startsWith("W") ? "#4ade80" : streak.startsWith("L") ? "#F44336" : "white" }}>
                    {streak}
                  </span>
                } />;
              })()}
            </div>
          </div>
        </div>

        {/* ─── Schedule ─── */}
        {sortedGames.length > 0 && (
          <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
            <SectionHeader title={`Schedule (${sortedGames.length} games)`} color={primaryColor} />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/8 bg-[#0d0d0d]">
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/30 w-12">Wk</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/30 w-8"></th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Opponent</th>
                    <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-16">Result</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGames.map((game) => {
                    const isHome = game.home_team_id === teamId;
                    const oppAbbr = isHome ? (game.away_team_abbreviation ?? game.away_team_name ?? "—") : (game.home_team_abbreviation ?? game.home_team_name ?? "—");
                    const oppColor = isHome ? (game.away_team_color ?? "#333") : (game.home_team_color ?? "#333");
                    const result = gameResult(game, teamId);
                    const teamScore = isHome ? game.home_score : game.away_score;
                    const oppScore = isHome ? game.away_score : game.home_score;
                    const resultColor = result === "W" ? "#4ade80" : result === "L" ? "#F44336" : result === "T" ? "#facc15" : "transparent";
                    const isFinal = game.status === "FINAL";

                    return (
                      <tr key={game.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="px-4 py-2.5 text-white/40 font-bold tabular-nums">{game.week}</td>
                        <td className="px-3 py-2.5 text-[10px] text-white/30">{isHome ? "vs" : "@"}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <TeamLogo
                              abbreviation={oppAbbr ?? "—"}
                              primaryColor={oppColor}
                              size="sm"
                              shape="circle"
                            />
                            <span className="font-semibold text-white/80">{oppAbbr}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {result ? (
                            <span
                              className="inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-black"
                              style={{ color: resultColor, backgroundColor: `${resultColor}18` }}
                            >
                              {result}
                            </span>
                          ) : (
                            <span className="text-white/20 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold tabular-nums">
                          {isFinal && teamScore != null && oppScore != null ? (
                            <span style={{ color: result === "W" ? "#4ade80" : result === "L" ? "#F44336" : "white" }}>
                              {teamScore}–{oppScore}
                            </span>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Roster ─── */}
        <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
          <SectionHeader title={`Roster (${sortedPlayers.length} players)`} color={primaryColor} />

          {playersLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : sortedPlayers.length === 0 ? (
            <div className="py-12 text-center text-white/30 text-sm">No players on roster yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/8 bg-[#0d0d0d]">
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Player</th>
                    <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">Pos</th>
                    <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">Age</th>
                    <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">OVR</th>
                    <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 hidden md:table-cell">SPD</th>
                    <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 hidden md:table-cell">STR</th>
                    <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 hidden lg:table-cell">AWR</th>
                    <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 hidden lg:table-cell">Spec.</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlayers.map((player) => {
                    const specAttr =
                      player.position === "QB"
                        ? { label: "THP", value: player.throwing_power }
                        : ["WR", "TE"].includes(player.position)
                        ? { label: "CTH", value: player.catching }
                        : ["DL", "DT", "DE", "LB", "MLB", "LOLB", "ROLB", "MIKE", "WILL", "SAM", "CB", "S", "SS", "FS"].includes(player.position)
                        ? { label: "TAK", value: player.tackling }
                        : null;

                    return (
                      <tr
                        key={player.id}
                        className="border-b border-white/5 hover:bg-white/3 transition-colors"
                        data-testid={`row-player-${player.id}`}
                      >
                        <td className="px-4 py-2.5 font-semibold text-white">{player.name}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${positionColors[player.position] ?? "bg-white/10 text-white/60"}`}>
                            {player.position}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-white/50 tabular-nums">{player.age}</td>
                        <td className="px-3 py-2.5 text-center"><RatingBar value={player.overall} /></td>
                        <td className="px-3 py-2.5 text-center hidden md:table-cell"><RatingBar value={player.speed} /></td>
                        <td className="px-3 py-2.5 text-center hidden md:table-cell"><RatingBar value={player.strength} /></td>
                        <td className="px-3 py-2.5 text-center hidden lg:table-cell"><RatingBar value={player.awareness} /></td>
                        <td className="px-3 py-2.5 text-center hidden lg:table-cell">
                          {specAttr ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[9px] text-white/30 uppercase">{specAttr.label}</span>
                              <RatingBar value={specAttr.value} />
                            </div>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
