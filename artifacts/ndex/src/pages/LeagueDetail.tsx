import { useState } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/context/AuthContext";
import {
  useGetLeagueSummary,
  useGetLeagueStandings,
  useGetLeagueGames,
  useGetLeagueStatLeaders,
  useGetLeagueTeams,
  useGetLeagueGameOfWeek,
  useGetLeagueMembers,
  getGetLeagueSummaryQueryKey,
  getGetLeagueStandingsQueryKey,
  getGetLeagueGamesQueryKey,
  getGetLeagueStatLeadersQueryKey,
  getGetLeagueTeamsQueryKey,
  getGetLeagueGameOfWeekQueryKey,
  getGetLeagueMembersQueryKey,
} from "@workspace/api-client-react";

import Navbar from "@/components/Navbar";
import LeagueSidebar from "@/components/league/LeagueSidebar";
import LeagueBanner from "@/components/league/LeagueBanner";
import HomeSection from "@/components/league/sections/HomeSection";
import TeamsSection from "@/components/league/sections/TeamsSection";
import PlayersSection from "@/components/league/sections/PlayersSection";
import StandingsSection from "@/components/league/sections/StandingsSection";
import GamesSection from "@/components/league/sections/GamesSection";
import PlayoffMachineSection from "@/components/league/sections/PlayoffMachineSection";
import StatisticsSection from "@/components/league/sections/StatisticsSection";
import RankingsSection from "@/components/league/sections/RankingsSection";
import PlaceholderSection from "@/components/league/sections/PlaceholderSection";
import AdminSettingsSection from "@/components/league/sections/AdminSettingsSection";
import AdminEAConnect from "@/components/league/sections/AdminEAConnect";
import AdminImportStatus from "@/components/league/sections/AdminImportStatus";
import AdminMembersSection from "@/components/league/sections/AdminMembersSection";
import AdminJoinRequestsSection from "@/components/league/sections/AdminJoinRequestsSection";
import AdminGameOfWeekSection from "@/components/league/sections/AdminGameOfWeekSection";
import AdminInviteSection from "@/components/league/sections/AdminInviteSection";
import TransactionsSection from "@/components/league/sections/TransactionsSection";
import DraftSection from "@/components/league/sections/DraftSection";
import DraftSectionTest from "@/components/league/sections/DraftSectionTest";
import CreateTradeSection from "@/components/league/sections/CreateTradeSection";
import AwardsSection from "@/components/league/sections/AwardsSection";
import LeagueTradesSection from "@/components/league/sections/LeagueTradesSection";
import TradeCountsSection from "@/components/league/sections/TradeCountsSection";

export type LeagueSection =
  | "home" | "rules" | "news" | "teams" | "players" | "players-search" | "suspensions"
  | "games" | "games-gotw" | "games-playoff" | "statistics" | "standings" | "transactions" | "draft"
  | "rankings" | "trades" | "trades-create" | "trades-league" | "trades-counts" | "awards" | "draft-recap"
  | "admin" | "admin-settings" | "admin-ea-connect" | "admin-import-status"
  | "admin-members" | "admin-requests" | "admin-invite" | "admin-advance";

export default function LeagueDetail() {
  const params = useParams<{ id: string }>();
  const leagueId = Number(params.id);
  const { user } = useAuth();
  const [section, setSection] = useState<LeagueSection>(() => {
    const s = new URLSearchParams(window.location.search).get("section");
    return (s as LeagueSection) ?? "home";
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: summary, isLoading } = useGetLeagueSummary(leagueId, {
    query: { enabled: !!leagueId, queryKey: getGetLeagueSummaryQueryKey(leagueId) },
  });
  const { data: standings } = useGetLeagueStandings(leagueId, {
    query: {
      enabled: !!leagueId && (section === "standings" || section === "rankings" || section === "home" || section === "games-playoff"),
      queryKey: getGetLeagueStandingsQueryKey(leagueId),
    },
  });
  const { data: games } = useGetLeagueGames(leagueId, {
    query: { enabled: !!leagueId && (section === "games" || section === "games-playoff"), queryKey: getGetLeagueGamesQueryKey(leagueId) },
  });
  const { data: statLeaders } = useGetLeagueStatLeaders(leagueId, {
    query: {
      enabled: !!leagueId && (section === "statistics" || section === "home"),
      queryKey: getGetLeagueStatLeadersQueryKey(leagueId),
    },
  });
  const { data: teams } = useGetLeagueTeams(leagueId, {
    query: { enabled: !!leagueId && section === "teams", queryKey: getGetLeagueTeamsQueryKey(leagueId) },
  });
  const { data: gotw } = useGetLeagueGameOfWeek(leagueId, {
    query: {
      enabled: !!leagueId && (section === "home" || section === "games-gotw"),
      queryKey: getGetLeagueGameOfWeekQueryKey(leagueId),
    },
  });
  const { data: members = [] } = useGetLeagueMembers(leagueId, {
    query: { enabled: !!leagueId, queryKey: getGetLeagueMembersQueryKey(leagueId) },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="space-y-3 w-64">
            <div className="h-6 bg-white/5 rounded animate-pulse" />
            <div className="h-4 bg-white/5 rounded animate-pulse w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  const league = summary?.league;
  const isAdmin = !!user && !!league && user.username === league.commissioner_name;
  const isMember = isAdmin || (!!user && members.some((m: { discord_name: string }) => m.discord_name === user.username));
  const myTeamId: number | null = (() => {
    if (!user) return null;
    const me = members.find((m: { discord_name: string; team_id?: number | null }) => m.discord_name === user.username);
    return me?.team_id ?? null;
  })();

  if (!league) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/40 text-sm">League not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-white overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <LeagueSidebar
          league={league}
          section={section}
          onSelect={(s) => {
            // Block non-admins from navigating into admin sections
            if (!isAdmin && (s as string).startsWith("admin")) return;
            setSection(s);
          }}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
          isAdmin={isAdmin}
        />
        <main className="flex-1 overflow-y-auto">
          <LeagueBanner league={league} summary={summary} currentUsername={user?.username ?? null} isMember={isMember} />
          <div className="px-6 py-6">
            {section === "home" && (
              <HomeSection summary={summary} leagueId={leagueId} statLeaders={statLeaders} standings={standings} gotw={gotw} onNavigate={setSection as (s: string) => void} />
            )}
            {section === "teams" && <TeamsSection teams={teams ?? []} leagueId={leagueId} />}
            {(section === "players" || section === "players-search") && <PlayersSection leagueId={leagueId} />}
            {section === "standings" && <StandingsSection standings={standings ?? []} />}
            {section === "games" && <GamesSection games={games ?? []} />}
            {section === "games-gotw" && (
              <AdminGameOfWeekSection leagueId={leagueId} currentWeek={summary?.current_week} currentSeason={summary?.league?.season} />
            )}
            {section === "games-playoff" && (
              <PlayoffMachineSection games={games ?? []} standings={standings ?? []} />
            )}
            {section === "statistics" && <StatisticsSection leagueId={leagueId} />}
            {section === "rankings" && <RankingsSection standings={standings ?? []} />}
            {section === "rules" && (
              <PlaceholderSection icon="FileText" title="League Rules" description="No rules have been posted for this league yet. The commissioner can add rules here." />
            )}
            {section === "news" && (
              <PlaceholderSection icon="Newspaper" title="League News" description="No news posts yet. League updates and announcements will appear here." />
            )}
            {section === "suspensions" && (
              <PlaceholderSection icon="Ban" title="Suspensions" description="No active player suspensions in this league." />
            )}
            {section === "transactions" && <TransactionsSection leagueId={leagueId} />}
            {section === "draft" && <DraftSection leagueId={leagueId} />}
            {section === "draft-recap" && <DraftSectionTest leagueId={leagueId} />}
            {(section === "trades" || section === "trades-create") && (
              <CreateTradeSection leagueId={leagueId} season={league.season} isMember={isMember} myTeamId={myTeamId} />
            )}
            {section === "trades-league" && <LeagueTradesSection leagueId={leagueId} />}
            {section === "trades-counts" && <TradeCountsSection leagueId={leagueId} />}
            {section === "awards" && (
              <AwardsSection leagueId={leagueId} season={league.season} currentWeek={league.week ?? 1} isAdmin={isAdmin} />
            )}

            {/* Administration */}
            {(section === "admin" || section === "admin-settings") && (
              <AdminSettingsSection league={league} />
            )}
            {section === "admin-ea-connect" && (
              <AdminEAConnect leagueId={leagueId} />
            )}
            {section === "admin-import-status" && (
              <AdminImportStatus leagueId={leagueId} />
            )}
            {section === "admin-members" && (
              <AdminMembersSection leagueId={leagueId} />
            )}
            {section === "admin-requests" && (
              <AdminJoinRequestsSection leagueId={leagueId} />
            )}
            {section === "admin-invite" && (
              <AdminInviteSection leagueId={leagueId} />
            )}
            {section === "admin-advance" && (
              <PlaceholderSection
                icon="SkipForward"
                title="Advance Week"
                description="Force-advance the league to the next week or phase. Advance controls coming soon."
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
