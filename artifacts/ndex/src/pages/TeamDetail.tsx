import { useState } from "react";
import { useParams } from "wouter";
import {
  useGetTeam,
  useGetTeamPlayers,
  useGetTeamGames,
  useGetLeagueSummary,
  getGetTeamQueryKey,
  getGetTeamPlayersQueryKey,
  getGetTeamGamesQueryKey,
  getGetLeagueSummaryQueryKey,
} from "@workspace/api-client-react";
import Navbar from "@/components/Navbar";
import LeagueSidebar from "@/components/league/LeagueSidebar";
import TeamLogo from "@/components/TeamLogo";
import type { TeamPlayer } from "@/components/team/types";
import TeamHomeTab from "@/components/team/TeamHomeTab";
import TeamRosterTab from "@/components/team/TeamRosterTab";
import TeamDepthChartTab from "@/components/team/TeamDepthChartTab";
import TeamScheduleTab from "@/components/team/TeamScheduleTab";
import TeamStatisticsTab from "@/components/team/TeamStatisticsTab";
import TeamContractsTab from "@/components/team/TeamContractsTab";

type TabKey = "home" | "roster" | "depth" | "schedule" | "stats" | "contracts";

const TABS: { key: TabKey; label: string }[] = [
  { key: "home",      label: "Home" },
  { key: "roster",    label: "Roster" },
  { key: "depth",     label: "Depth Chart" },
  { key: "schedule",  label: "Schedule" },
  { key: "stats",     label: "Statistics" },
  { key: "contracts", label: "Contracts" },
];

export default function TeamDetail() {
  const params = useParams<{ id: string }>();
  const teamId = Number(params.id);
  const [tab, setTab] = useState<TabKey>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: team, isLoading: teamLoading } = useGetTeam(teamId, {
    query: { enabled: !!teamId, queryKey: getGetTeamQueryKey(teamId) },
  });
  const { data: rawPlayers } = useGetTeamPlayers(teamId, {
    query: { enabled: !!teamId, queryKey: getGetTeamPlayersQueryKey(teamId) },
  });
  const { data: games } = useGetTeamGames(teamId, {
    query: { enabled: !!teamId, queryKey: getGetTeamGamesQueryKey(teamId) },
  });
  const { data: leagueSummary } = useGetLeagueSummary(team?.league_id ?? 0, {
    query: {
      enabled: !!team?.league_id,
      queryKey: getGetLeagueSummaryQueryKey(team?.league_id ?? 0),
    },
  });

  const players = (rawPlayers ?? []) as TeamPlayer[];

  if (teamLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <Navbar />
        <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
          <div className="h-6 w-40 bg-white/5 rounded animate-pulse" />
          <div className="h-48 rounded-xl bg-[#141414] border border-white/8 animate-pulse" />
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

  // Regular-season record (wins/losses/ties from API already filtered to reg season)
  const gp = team.wins + team.losses + team.ties;
  const winPct = gp > 0 ? ((team.wins + team.ties * 0.5) / gp).toFixed(3) : "—";

  const leagueSidebarLeague = leagueSummary?.league ?? {
    id: team.league_id,
    name: "…",
    platform: "—",
    season: 0,
    week: 0,
    phase: "—",
  };

  // user_name may come from team response (we added it to formatTeam)
  const teamWithUserName = team as typeof team & { user_name?: string | null };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-white overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <LeagueSidebar
          league={leagueSidebarLeague}
          section="teams"
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(v => !v)}
          navLeagueId={team.league_id}
        />
        <main className="flex-1 overflow-y-auto">

          {/* ─── Hero Banner ─── */}
          <div
            className="relative border-b border-white/8"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}28 0%, ${primaryColor}10 30%, #0a0a0a 65%)`,
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 50% 80% at 10% 50%, ${primaryColor}22 0%, transparent 70%)`,
              }}
            />
            <div className="relative mx-auto max-w-6xl px-4 py-8">
              <div className="flex items-center gap-6">
                <div className="shrink-0 shadow-2xl" style={{ filter: `drop-shadow(0 0 16px ${primaryColor}50)` }}>
                  <TeamLogo
                    abbreviation={team.abbreviation}
                    primaryColor={primaryColor}
                    size="2xl"
                    shape="circle"
                    noBg
                  />
                </div>
                <div>
                  <p className="text-sm text-white/40 uppercase tracking-widest font-bold mb-0.5">
                    {team.city}
                  </p>
                  <h1
                    className="text-4xl font-black uppercase tracking-tight leading-none"
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
                  {/* Regular Season Record */}
                  <div className="flex items-center gap-4 mt-3">
                    {[
                      { val: team.wins, label: "Wins" },
                      { val: team.losses, label: "Losses", muted: true },
                      { val: team.ties, label: "Ties", muted: true },
                      { val: winPct, label: "Win %" },
                    ].map((s, i) => (
                      <div key={s.label} className="flex items-center gap-4">
                        {i > 0 && <div className="w-px h-8 bg-white/10" />}
                        <div className="text-center">
                          <p className={`text-2xl font-black tabular-nums [font-family:'Lora',serif] ${s.muted ? "text-white/50" : "text-white"}`}>
                            {s.val}
                          </p>
                          <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">{s.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Sub-tabs ─── */}
          <div className="border-b border-white/8 bg-[#0a0a0a] sticky top-0 z-10">
            <div className="mx-auto max-w-6xl px-4">
              <div className="flex gap-0 overflow-x-auto">
                {TABS.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
                      tab === t.key
                        ? "text-white"
                        : "text-white/35 border-transparent hover:text-white/60"
                    }`}
                    style={tab === t.key ? { borderColor: primaryColor, color: primaryColor } : {}}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Tab Content ─── */}
          <div className="mx-auto max-w-6xl px-4 py-6">
            {tab === "home" && (
              <TeamHomeTab
                team={{ ...teamWithUserName, user_name: teamWithUserName.user_name ?? null }}
                players={players}
                games={games ?? []}
              />
            )}
            {tab === "roster" && (
              <TeamRosterTab team={team} players={players} />
            )}
            {tab === "depth" && (
              <TeamDepthChartTab team={team} players={players} />
            )}
            {tab === "schedule" && (
              <TeamScheduleTab team={team} games={games ?? []} />
            )}
            {tab === "stats" && (
              <TeamStatisticsTab team={team} leagueId={team.league_id} />
            )}
            {tab === "contracts" && (
              <TeamContractsTab team={team} players={players} />
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
