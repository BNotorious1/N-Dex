import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  useGetLeagueStandings,
  getGetLeagueStandingsQueryKey,
} from "@workspace/api-client-react";
import type { StandingEntry, TeamGame } from "@workspace/api-client-react";
import TeamLogo from "@/components/TeamLogo";
import { fmtMoney, ovrColor, DEV_LABEL, DEV_COLOR, type TeamPlayer } from "./types";

const OFFENSE_POS = new Set(["QB","HB","RB","FB","WR","TE","LT","LG","C","RG","RT","OL"]);
const DEFENSE_POS = new Set(["DE","DT","DL","LOLB","ROLB","MLB","MIKE","WILL","SAM","LB","CB","SS","FS","S"]);

const posColor: Record<string, string> = {
  QB: "bg-[#00C8FF]/15 text-[#00C8FF]",
  HB: "bg-green-900/30 text-green-400", RB: "bg-green-900/30 text-green-400", FB: "bg-green-900/30 text-green-400",
  WR: "bg-purple-900/30 text-purple-400",
  TE: "bg-yellow-900/30 text-yellow-400",
  LT: "bg-orange-900/30 text-orange-400", LG: "bg-orange-900/30 text-orange-400",
  C: "bg-orange-900/30 text-orange-400", RG: "bg-orange-900/30 text-orange-400", RT: "bg-orange-900/30 text-orange-400",
  DL: "bg-red-900/30 text-red-400", DT: "bg-red-900/30 text-red-400", DE: "bg-red-900/30 text-red-400",
  LB: "bg-red-900/30 text-red-400", MLB: "bg-red-900/30 text-red-400", LOLB: "bg-red-900/30 text-red-400", ROLB: "bg-red-900/30 text-red-400",
  CB: "bg-blue-900/30 text-blue-400", SS: "bg-blue-900/30 text-blue-400", FS: "bg-blue-900/30 text-blue-400",
};

interface StatRow {
  player: { id: number; name: string; position: string; overall: number };
  team_id: number;
  pss_yds?: number; rsh_yds?: number; rec_yds?: number;
}
interface TeamDefenseRow {
  team_id: number;
  pass_yds_allowed: number;
  rush_yds_allowed: number;
  total_yds_allowed: number;
}
interface StatsResponse {
  passing: StatRow[];
  rushing: StatRow[];
  receiving: StatRow[];
  defense: StatRow[];
  team_defense?: TeamDefenseRow[];
}

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
    user_name?: string | null;
  };
  players: TeamPlayer[];
  games: TeamGame[];
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-[11px] text-white/40 uppercase tracking-wider">{label}</span>
      <span className="text-xs font-semibold text-white text-right">{value}</span>
    </div>
  );
}

function Card({ header, primaryColor, children }: { header: string; primaryColor: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
      <div className="px-4 py-2.5" style={{ backgroundColor: primaryColor }}>
        <span className="text-xs font-black uppercase tracking-widest text-white">{header}</span>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

function MiniContractTable({ players, primaryColor, emptyMessage }: { players: TeamPlayer[]; primaryColor: string; emptyMessage: string }) {
  if (players.length === 0) return <div className="py-8 text-center text-white/30 text-xs">{emptyMessage}</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/8" style={{ backgroundColor: `${primaryColor}30` }}>
            {["Player","Pos","OVR","Cap Hit","Salary","Yrs"].map(h => (
              <th key={h} className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-white/60 first:px-3 first:text-left text-center last:text-center">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr key={p.id} className="border-b border-white/5 hover:bg-white/3">
              <td className="px-3 py-2">
                <Link href={`/players/${p.id}`} className="font-semibold hover:underline [font-family:'Lora',serif]" style={{ color: primaryColor }}>
                  {p.name}
                </Link>
              </td>
              <td className="px-2 py-2 text-center">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${posColor[p.position] ?? "bg-white/10 text-white/50"}`}>{p.position}</span>
              </td>
              <td className={`px-2 py-2 text-center text-[11px] font-bold tabular-nums [font-family:'Lora',serif] ${ovrColor(p.overall)}`}>{p.overall}</td>
              <td className="px-2 py-2 text-center tabular-nums text-white/80 [font-family:'Lora',serif]">{fmtMoney(p.cap_hit)}</td>
              <td className="px-2 py-2 text-center tabular-nums text-white/50 [font-family:'Lora',serif]">{fmtMoney(p.contract_salary)}</td>
              <td className="px-2 py-2 text-center tabular-nums text-white/70 [font-family:'Lora',serif]">{p.contract_years_left ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Rank badge: e.g. "#3"
function RankBadge({ rank, total }: { rank: number; total: number }) {
  const color = rank <= 5 ? "#4ade80" : rank <= 16 ? "#facc15" : "#F44336";
  return (
    <span className="text-[10px] font-black tabular-nums" style={{ color }}>
      #{rank}
    </span>
  );
}

function StatBlock({ label, value, rank, total }: { label: string; value: string | number; rank: number; total: number }) {
  return (
    <div className="flex-1 min-w-[70px] text-center">
      <p className="text-[9px] uppercase tracking-widest text-white/35 font-bold mb-0.5">{label}</p>
      <p className="text-lg font-black text-white tabular-nums [font-family:'Lora',serif]">{value}</p>
      <RankBadge rank={rank} total={total} />
    </div>
  );
}

export default function TeamHomeTab({ team, players, games }: Props) {
  const primaryColor = team.primary_color ?? "#333";

  const { data: standings } = useGetLeagueStandings(team.league_id, {
    query: { enabled: !!team.league_id, queryKey: getGetLeagueStandingsQueryKey(team.league_id) },
  });

  const { data: leagueStats } = useQuery<StatsResponse>({
    queryKey: ["home-tab-stats", team.league_id],
    queryFn: async () => {
      const res = await fetch(`/api/leagues/${team.league_id}/stats/players?phase=regular`);
      return res.json();
    },
    enabled: !!team.league_id,
    staleTime: 5 * 60 * 1000,
  });

  const divisionStandings = (standings ?? []).filter(
    (s: StandingEntry) => s.conference === team.conference && s.division === team.division,
  );

  // ── Player sub-groups ──
  const offDevs = players.filter(p => OFFENSE_POS.has(p.position) && (p.dev_trait ?? 0) >= 2).length;
  const defDevs = players.filter(p => DEFENSE_POS.has(p.position) && (p.dev_trait ?? 0) >= 2).length;
  const capSpent = players.reduce((s, p) => s + (p.cap_hit ?? 0), 0);
  const tradeBlockPlayers = players.filter(p => p.trade_block);

  // ── Contract tables ──
  const mostExpensive = [...players]
    .filter(p => p.cap_hit != null)
    .sort((a, b) => (b.cap_hit ?? 0) - (a.cap_hit ?? 0))
    .slice(0, 10);
  const upcomingFAs = [...players]
    .filter(p => p.contract_years_left != null)
    .sort((a, b) => (a.contract_years_left ?? 999) - (b.contract_years_left ?? 999))
    .slice(0, 10);
  const noContractData = players.every(p => p.cap_hit == null);

  // ── Offense / Defense ranks from standings + league stats ──
  const allTeams = standings ?? [];

  // PTS ranks from standings
  const sortedByPtsFor = [...allTeams].sort((a, b) => (b.points_for ?? 0) - (a.points_for ?? 0));
  const offPtsRank = sortedByPtsFor.findIndex(s => s.team.id === team.id) + 1 || 0;
  const thisStanding = allTeams.find(s => s.team.id === team.id);

  const sortedByPtsAgainst = [...allTeams].sort((a, b) => (a.points_against ?? 0) - (b.points_against ?? 0));
  const defPtsRank = sortedByPtsAgainst.findIndex(s => s.team.id === team.id) + 1 || 0;

  // YDS ranks from player stats
  type TeamYds = { teamId: number; passYds: number; rushYds: number; totalYds: number };
  const teamYdsMap = new Map<number, TeamYds>();

  const allPassing = leagueStats?.passing ?? [];
  const allRushing = leagueStats?.rushing ?? [];

  for (const r of allPassing) {
    const existing = teamYdsMap.get(r.team_id) ?? { teamId: r.team_id, passYds: 0, rushYds: 0, totalYds: 0 };
    existing.passYds += (r.pss_yds ?? 0);
    teamYdsMap.set(r.team_id, existing);
  }
  for (const r of allRushing) {
    const existing = teamYdsMap.get(r.team_id) ?? { teamId: r.team_id, passYds: 0, rushYds: 0, totalYds: 0 };
    existing.rushYds += (r.rsh_yds ?? 0);
    teamYdsMap.set(r.team_id, existing);
  }
  for (const [, v] of teamYdsMap) {
    v.totalYds = v.passYds + v.rushYds;
  }

  const sortedByTotalYds = [...teamYdsMap.values()].sort((a, b) => b.totalYds - a.totalYds);
  const sortedByPassYds  = [...teamYdsMap.values()].sort((a, b) => b.passYds - a.passYds);
  const sortedByRushYds  = [...teamYdsMap.values()].sort((a, b) => b.rushYds - a.rushYds);
  const teamYds = teamYdsMap.get(team.id);

  const offYdsRank  = sortedByTotalYds.findIndex(t => t.teamId === team.id) + 1 || 0;
  const offPassRank = sortedByPassYds.findIndex(t => t.teamId === team.id) + 1 || 0;
  const offRushRank = sortedByRushYds.findIndex(t => t.teamId === team.id) + 1 || 0;

  // Defense yards ranks — derived from team_defense (yards allowed per team)
  const teamDefense = leagueStats?.team_defense ?? [];
  const sortedByTotalYdsAllowed = [...teamDefense].sort((a, b) => a.total_yds_allowed - b.total_yds_allowed);
  const sortedByPassYdsAllowed  = [...teamDefense].sort((a, b) => a.pass_yds_allowed - b.pass_yds_allowed);
  const sortedByRushYdsAllowed  = [...teamDefense].sort((a, b) => a.rush_yds_allowed - b.rush_yds_allowed);
  const thisTeamDef = teamDefense.find(t => t.team_id === team.id);

  const defYdsRank  = sortedByTotalYdsAllowed.findIndex(t => t.team_id === team.id) + 1 || 0;
  const defPassRank = sortedByPassYdsAllowed.findIndex(t => t.team_id === team.id) + 1 || 0;
  const defRushRank = sortedByRushYdsAllowed.findIndex(t => t.team_id === team.id) + 1 || 0;

  const n = allTeams.length || 32;

  return (
    <div className="space-y-5">
      {/* ── Top row: Details + Cap Info ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Details */}
        <Card header="Details" primaryColor={primaryColor}>
          <InfoRow label="Division" value={`${team.conference} ${team.division}`} />
          {team.user_name && <InfoRow label="Member" value={<span style={{ color: primaryColor }}>@{team.user_name}</span>} />}
          <InfoRow label="Roster Count" value={players.length} />
          <InfoRow label="Off Devs (SS/XF)" value={offDevs} />
          <InfoRow label="Def Devs (SS/XF)" value={defDevs} />
          <InfoRow label="Injury Count" value={0} />
        </Card>

        {/* Cap Information */}
        <Card header="Cap Information" primaryColor={primaryColor}>
          <InfoRow label="Cap Spent" value={<span style={{ color: primaryColor }}>{capSpent > 0 ? fmtMoney(capSpent) : "—"}</span>} />
          <InfoRow label="Available" value={capSpent > 0 ? "—" : "—"} />
          <div className="py-2 text-[10px] text-white/20">
            Re-import rosters to update cap data.
          </div>
        </Card>
      </div>

      {/* ── Offense / Defense Ranks ── */}
      {allTeams.length > 0 && (offPtsRank > 0 || offYdsRank > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Offense */}
          <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
            <div className="px-4 py-2.5" style={{ backgroundColor: primaryColor }}>
              <span className="text-xs font-black uppercase tracking-widest text-white">Offense</span>
            </div>
            <div className="p-4 flex items-center gap-4">
              {offPtsRank > 0 && <StatBlock label="PTS" value={thisStanding?.points_for ?? "—"} rank={offPtsRank} total={n} />}
              {offYdsRank > 0 && <StatBlock label="YDS" value={teamYds?.totalYds ?? "—"} rank={offYdsRank} total={n} />}
              {offPassRank > 0 && <StatBlock label="P.YDS" value={teamYds?.passYds ?? "—"} rank={offPassRank} total={n} />}
              {offRushRank > 0 && <StatBlock label="R.YDS" value={teamYds?.rushYds ?? "—"} rank={offRushRank} total={n} />}
            </div>
          </div>

          {/* Defense */}
          <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
            <div className="px-4 py-2.5" style={{ backgroundColor: primaryColor }}>
              <span className="text-xs font-black uppercase tracking-widest text-white">Defense</span>
            </div>
            <div className="p-4 flex items-center gap-4">
              {defPtsRank > 0 && <StatBlock label="PTS" value={thisStanding?.points_against ?? "—"} rank={defPtsRank} total={n} />}
              {defYdsRank > 0 && <StatBlock label="YDS" value={thisTeamDef?.total_yds_allowed ?? "—"} rank={defYdsRank} total={teamDefense.length} />}
              {defPassRank > 0 && <StatBlock label="P.YDS" value={thisTeamDef?.pass_yds_allowed ?? "—"} rank={defPassRank} total={teamDefense.length} />}
              {defRushRank > 0 && <StatBlock label="R.YDS" value={thisTeamDef?.rush_yds_allowed ?? "—"} rank={defRushRank} total={teamDefense.length} />}
            </div>
          </div>
        </div>
      )}

      {/* ── On the Block ── */}
      {tradeBlockPlayers.length > 0 && (
        <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
          <div className="px-4 py-2.5" style={{ backgroundColor: primaryColor }}>
            <span className="text-xs font-black uppercase tracking-widest text-white">On the Block</span>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-2">
            {tradeBlockPlayers.map(p => (
              <Link key={p.id} href={`/players/${p.id}`}
                className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 hover:bg-white/8 transition-colors">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${posColor[p.position] ?? "bg-white/10 text-white/50"}`}>{p.position}</span>
                <span className="text-xs font-semibold text-white/80">{p.name}</span>
                <span className={`text-[11px] font-bold tabular-nums ${ovrColor(p.overall)}`}>{p.overall}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Contract tables ── */}
      {noContractData ? (
        <div className="rounded-xl border border-white/8 bg-[#111] p-6 text-center text-white/30 text-sm">
          No contract data yet — re-import rosters to populate contract information.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
            <div className="px-4 py-2.5" style={{ backgroundColor: primaryColor }}>
              <span className="text-xs font-black uppercase tracking-widest text-white">Most Expensive</span>
            </div>
            <MiniContractTable players={mostExpensive} primaryColor={primaryColor} emptyMessage="No cap hit data available" />
          </div>
          <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
            <div className="px-4 py-2.5" style={{ backgroundColor: primaryColor }}>
              <span className="text-xs font-black uppercase tracking-widest text-white">Upcoming Free Agents</span>
            </div>
            <MiniContractTable players={upcomingFAs} primaryColor={primaryColor} emptyMessage="No contract data available" />
          </div>
        </div>
      )}

      {/* ── Division Standings ── */}
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
                <tr className="border-b border-white/8" style={{ backgroundColor: `${primaryColor}30` }}>
                  {["Team","W","L","T","PCT","PF","PA"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white/60 first:px-4 first:text-left text-center">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {divisionStandings.map((s: StandingEntry) => {
                  const gps = s.wins + s.losses + s.ties;
                  const pct = gps > 0 ? ((s.wins + s.ties * 0.5) / gps).toFixed(3) : ".000";
                  const isThisTeam = s.team.id === team.id;
                  return (
                    <tr key={s.team.id} className={`border-b border-white/5 hover:bg-white/3 ${isThisTeam ? "bg-white/4" : ""}`}>
                      <td className="px-4 py-2.5">
                        <Link href={`/teams/${s.team.id}`} className="flex items-center gap-2 hover:opacity-80">
                          <TeamLogo abbreviation={s.team.abbreviation ?? "—"} primaryColor={s.team.primary_color ?? "#333"} size="sm" shape="circle" />
                          <span className={`font-bold text-[11px] [font-family:'Lora',serif] ${isThisTeam ? "text-white" : "text-white/70"}`}>
                            {s.team.abbreviation}
                            {isThisTeam && <span className="ml-1 text-[9px] text-white/40">(you)</span>}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold tabular-nums text-white [font-family:'Lora',serif]">{s.wins}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-white/50 [font-family:'Lora',serif]">{s.losses}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-white/40 [font-family:'Lora',serif]">{s.ties}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-white/60 [font-family:'Lora',serif]">{pct}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-white/60 [font-family:'Lora',serif]">{s.points_for}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-white/40 [font-family:'Lora',serif]">{s.points_against}</td>
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
