import { Link } from "wouter";
import {
  useGetLeagueStandings,
  getGetLeagueStandingsQueryKey,
} from "@workspace/api-client-react";
import type { StandingEntry, TeamGame } from "@workspace/api-client-react";
import TeamLogo from "@/components/TeamLogo";
import { getWeekLabelShort } from "@/lib/weekLabel";
import { fmtMoney, ovrColor, DEV_LABEL, DEV_COLOR, type TeamPlayer } from "./types";

// ─── Position badge colors ────────────────────────────────────────────────────
const posColor: Record<string, string> = {
  QB: "bg-[#00C8FF]/15 text-[#00C8FF]",
  HB: "bg-green-900/30 text-green-400", RB: "bg-green-900/30 text-green-400", FB: "bg-green-900/30 text-green-400",
  WR: "bg-purple-900/30 text-purple-400",
  TE: "bg-yellow-900/30 text-yellow-400",
  LT: "bg-orange-900/30 text-orange-400", LG: "bg-orange-900/30 text-orange-400",
  C: "bg-orange-900/30 text-orange-400", RG: "bg-orange-900/30 text-orange-400",
  RT: "bg-orange-900/30 text-orange-400", OL: "bg-orange-900/30 text-orange-400",
  DL: "bg-red-900/30 text-red-400", DT: "bg-red-900/30 text-red-400", DE: "bg-red-900/30 text-red-400",
  LB: "bg-red-900/30 text-red-400", MLB: "bg-red-900/30 text-red-400",
  LOLB: "bg-red-900/30 text-red-400", ROLB: "bg-red-900/30 text-red-400",
  MIKE: "bg-red-900/30 text-red-400", WILL: "bg-red-900/30 text-red-400", SAM: "bg-red-900/30 text-red-400",
  CB: "bg-blue-900/30 text-blue-400", SS: "bg-blue-900/30 text-blue-400",
  FS: "bg-blue-900/30 text-blue-400", S: "bg-blue-900/30 text-blue-400",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function gameResult(game: TeamGame, teamId: number): "W" | "L" | "T" | null {
  if (game.status !== "FINAL" || game.home_score == null || game.away_score == null) return null;
  const isHome = game.home_team_id === teamId;
  const ts = isHome ? game.home_score : game.away_score;
  const os = isHome ? game.away_score : game.home_score;
  if (ts > os) return "W";
  if (ts < os) return "L";
  return "T";
}

// ─── Contract rows table (reused for Most Expensive + Upcoming FAs) ───────────
function ContractMiniTable({
  players,
  primaryColor,
  emptyMessage,
}: {
  players: TeamPlayer[];
  primaryColor: string;
  emptyMessage: string;
}) {
  if (players.length === 0) {
    return <div className="py-8 text-center text-white/30 text-xs">{emptyMessage}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/8 bg-[#0d0d0d]">
            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Player</th>
            <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">Pos</th>
            <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">OVR</th>
            <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-white/30">Cap Hit</th>
            <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-white/30 hidden sm:table-cell">Salary</th>
            <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-white/30 hidden md:table-cell">Bonus</th>
            <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">Yrs Left</th>
            <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 hidden sm:table-cell">Len</th>
          </tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr key={p.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
              <td className="px-3 py-2">
                <Link href={`/players/${p.id}`} className="font-semibold hover:underline" style={{ color: primaryColor }}>
                  {p.name}
                </Link>
              </td>
              <td className="px-2 py-2 text-center">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${posColor[p.position] ?? "bg-white/10 text-white/50"}`}>
                  {p.position}
                </span>
              </td>
              <td className={`px-2 py-2 text-center text-[11px] font-bold tabular-nums ${ovrColor(p.overall)}`}>{p.overall}</td>
              <td className="px-2 py-2 text-right tabular-nums text-white/80">{fmtMoney(p.cap_hit)}</td>
              <td className="px-2 py-2 text-right tabular-nums text-white/50 hidden sm:table-cell">{fmtMoney(p.contract_salary)}</td>
              <td className="px-2 py-2 text-right tabular-nums text-white/50 hidden md:table-cell">{fmtMoney(p.contract_bonus)}</td>
              <td className="px-2 py-2 text-center tabular-nums text-white/70">
                {p.contract_years_left ?? "—"}
              </td>
              <td className="px-2 py-2 text-center tabular-nums text-white/40 hidden sm:table-cell">
                {p.contract_length ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  team: {
    id: number;
    league_id: number;
    name: string;
    city: string;
    conference: string;
    division: string;
    wins: number;
    losses: number;
    ties: number;
    overall_rating: number;
    primary_color?: string | null;
    is_user_team: boolean;
  };
  players: TeamPlayer[];
  games: TeamGame[];
}

export default function TeamHomeTab({ team, players, games }: Props) {
  const primaryColor = team.primary_color ?? "#333";

  const { data: standings } = useGetLeagueStandings(team.league_id, {
    query: { enabled: !!team.league_id, queryKey: getGetLeagueStandingsQueryKey(team.league_id) },
  });

  // Division standings (same conf + division)
  const divisionStandings = (standings ?? []).filter(
    (s: StandingEntry) => s.conference === team.conference && s.division === team.division,
  );

  // Most Expensive: top 10 by cap_hit desc (exclude null)
  const mostExpensive = [...players]
    .filter(p => p.cap_hit != null)
    .sort((a, b) => (b.cap_hit ?? 0) - (a.cap_hit ?? 0))
    .slice(0, 10);

  // Upcoming FAs: top 10 by years_left asc (include 0 = this year)
  const upcomingFAs = [...players]
    .filter(p => p.contract_years_left != null)
    .sort((a, b) => (a.contract_years_left ?? 999) - (b.contract_years_left ?? 999))
    .slice(0, 10);

  // Season stats
  const gp = team.wins + team.losses + team.ties;
  const winPct = gp > 0 ? ((team.wins + team.ties * 0.5) / gp).toFixed(3) : "—";
  const sortedGames = [...games].sort((a, b) => a.week - b.week);

  const noContractData = players.every(p => p.cap_hit == null);

  return (
    <div className="space-y-6">
      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
          <div className="px-4 py-2.5" style={{ backgroundColor: primaryColor }}>
            <span className="text-xs font-black uppercase tracking-widest text-white">Details</span>
          </div>
          <div className="px-4 py-1 divide-y divide-white/5">
            {[
              ["Conference", team.conference],
              ["Division", `${team.conference} ${team.division}`],
              ["Overall Rating", team.overall_rating],
              ...(team.is_user_team ? [["Status", "Your Team"]] : []),
            ].map(([l, v]) => (
              <div key={String(l)} className="flex items-center justify-between py-2.5">
                <span className="text-[11px] text-white/40 uppercase tracking-wider">{l}</span>
                <span className="text-xs font-semibold text-white">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
          <div className="px-4 py-2.5" style={{ backgroundColor: primaryColor }}>
            <span className="text-xs font-black uppercase tracking-widest text-white">Season Record</span>
          </div>
          <div className="px-4 py-1 divide-y divide-white/5">
            {[
              ["Record", `${team.wins}–${team.losses}${team.ties > 0 ? `–${team.ties}` : ""}`],
              ["Win %", winPct],
              ["Games Played", gp],
            ].map(([l, v]) => (
              <div key={String(l)} className="flex items-center justify-between py-2.5">
                <span className="text-[11px] text-white/40 uppercase tracking-wider">{l}</span>
                <span className="text-xs font-semibold text-white">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule */}
      {sortedGames.length > 0 && (
        <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
          <div className="px-4 py-2.5" style={{ backgroundColor: primaryColor }}>
            <span className="text-xs font-black uppercase tracking-widest text-white">Schedule</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/8 bg-[#0d0d0d]">
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white/30 w-12">Wk</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white/30 w-8"></th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Opponent</th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-12">Res</th>
                  <th className="px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">Score</th>
                </tr>
              </thead>
              <tbody>
                {sortedGames.map(game => {
                  const isHome = game.home_team_id === team.id;
                  const oppAbbr = isHome ? (game.away_team_abbreviation ?? "—") : (game.home_team_abbreviation ?? "—");
                  const oppColor = isHome ? (game.away_team_color ?? "#333") : (game.home_team_color ?? "#333");
                  const result = gameResult(game, team.id);
                  const ts = isHome ? game.home_score : game.away_score;
                  const os = isHome ? game.away_score : game.home_score;
                  const rc = result === "W" ? "#4ade80" : result === "L" ? "#F44336" : result === "T" ? "#facc15" : "transparent";
                  return (
                    <tr key={game.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="px-4 py-2 text-white/40 font-bold tabular-nums">{getWeekLabelShort(game.week)}</td>
                      <td className="px-3 py-2 text-[10px] text-white/30">{isHome ? "vs" : "@"}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <TeamLogo abbreviation={oppAbbr} primaryColor={oppColor} size="sm" shape="circle" />
                          <span className="font-semibold text-white/80">{oppAbbr}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {result ? (
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-black"
                            style={{ color: rc, backgroundColor: `${rc}18` }}>{result}</span>
                        ) : <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-4 py-2 text-center font-bold tabular-nums">
                        {game.status === "FINAL" && ts != null && os != null
                          ? <span style={{ color: result === "W" ? "#4ade80" : result === "L" ? "#F44336" : "white" }}>{ts}–{os}</span>
                          : <span className="text-white/20">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contract tables */}
      {noContractData ? (
        <div className="rounded-xl border border-white/8 bg-[#111] p-6 text-center text-white/30 text-sm">
          No contract data yet — re-import rosters to populate contract information.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Most Expensive */}
          <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
            <div className="px-4 py-2.5" style={{ backgroundColor: primaryColor }}>
              <span className="text-xs font-black uppercase tracking-widest text-white">Most Expensive</span>
            </div>
            <ContractMiniTable
              players={mostExpensive}
              primaryColor={primaryColor}
              emptyMessage="No cap hit data available"
            />
          </div>
          {/* Upcoming FAs */}
          <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
            <div className="px-4 py-2.5" style={{ backgroundColor: primaryColor }}>
              <span className="text-xs font-black uppercase tracking-widest text-white">Upcoming Free Agents</span>
            </div>
            <ContractMiniTable
              players={upcomingFAs}
              primaryColor={primaryColor}
              emptyMessage="No contract data available"
            />
          </div>
        </div>
      )}

      {/* Division Standings */}
      {divisionStandings.length > 0 && (
        <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
          <div className="px-4 py-2.5" style={{ backgroundColor: primaryColor }}>
            <span className="text-xs font-black uppercase tracking-widest text-white">
              {team.conference} {team.division} Standings
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/8 bg-[#0d0d0d]">
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Team</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-10">W</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-10">L</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-10">T</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-14">PCT</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-14">PF</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-14">PA</th>
                </tr>
              </thead>
              <tbody>
                {divisionStandings.map((s: StandingEntry) => {
                  const gps = s.wins + s.losses + s.ties;
                  const pct = gps > 0 ? ((s.wins + s.ties * 0.5) / gps).toFixed(3) : ".000";
                  const isThisTeam = s.team.id === team.id;
                  return (
                    <tr key={s.team.id}
                      className={`border-b border-white/5 hover:bg-white/3 ${isThisTeam ? "bg-white/4" : ""}`}>
                      <td className="px-4 py-2.5">
                        <Link href={`/teams/${s.team.id}`} className="flex items-center gap-2 hover:opacity-80">
                          <TeamLogo
                            abbreviation={s.team.abbreviation ?? "—"}
                            primaryColor={s.team.primary_color ?? "#333"}
                            size="sm"
                            shape="circle"
                          />
                          <span className={`font-bold text-[11px] ${isThisTeam ? "text-white" : "text-white/70"}`}>
                            {s.team.abbreviation}
                            {isThisTeam && <span className="ml-1 text-[9px] text-white/40">(this team)</span>}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold tabular-nums text-white">{s.wins}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-white/50">{s.losses}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-white/40">{s.ties}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-white/60">{pct}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-white/60">{s.points_for}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-white/40">{s.points_against}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
