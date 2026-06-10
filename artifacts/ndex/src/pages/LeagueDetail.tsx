import { useState } from "react";
import { useParams } from "wouter";
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
import LeagueSidebar from "@/components/league/LeagueSidebar";
import LeagueBanner from "@/components/league/LeagueBanner";
import HomeSection from "@/components/league/sections/HomeSection";
import TeamsSection from "@/components/league/sections/TeamsSection";
import PlayersSection from "@/components/league/sections/PlayersSection";
import StandingsSection from "@/components/league/sections/StandingsSection";
import GamesSection from "@/components/league/sections/GamesSection";
import StatisticsSection from "@/components/league/sections/StatisticsSection";
import RankingsSection from "@/components/league/sections/RankingsSection";
import PlaceholderSection from "@/components/league/sections/PlaceholderSection";

export type LeagueSection =
  | "home" | "rules" | "news" | "teams" | "players" | "suspensions"
  | "games" | "statistics" | "standings" | "transactions" | "draft"
  | "rankings" | "trades" | "awards";

export default function LeagueDetail() {
  const params = useParams<{ id: string }>();
  const leagueId = Number(params.id);
  const [section, setSection] = useState<LeagueSection>("home");

  const { data: summary, isLoading } = useGetLeagueSummary(leagueId, {
    query: { enabled: !!leagueId, queryKey: getGetLeagueSummaryQueryKey(leagueId) },
  });
  const { data: standings } = useGetLeagueStandings(leagueId, {
    query: {
      enabled: !!leagueId && (section === "standings" || section === "rankings" || section === "home"),
      queryKey: getGetLeagueStandingsQueryKey(leagueId),
    },
  });
  const { data: games } = useGetLeagueGames(leagueId, {
    query: { enabled: !!leagueId && section === "games", queryKey: getGetLeagueGamesQueryKey(leagueId) },
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
        <LeagueSidebar league={league} section={section} onSelect={setSection} />
        <main className="flex-1 overflow-y-auto">
          <LeagueBanner league={league} summary={summary} />
          <div className="px-6 py-6">
            {section === "home" && (
              <HomeSection summary={summary} statLeaders={statLeaders} standings={standings} />
            )}
            {section === "teams" && <TeamsSection teams={teams ?? []} leagueId={leagueId} />}
            {section === "players" && <PlayersSection leagueId={leagueId} />}
            {section === "standings" && <StandingsSection standings={standings ?? []} />}
            {section === "games" && <GamesSection games={games ?? []} />}
            {section === "statistics" && <StatisticsSection statLeaders={statLeaders} />}
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
            {section === "transactions" && (
              <PlaceholderSection icon="ArrowLeftRight" title="Transactions" description="Player transactions (signings, releases, trades) will be tracked here." />
            )}
            {section === "draft" && (
              <PlaceholderSection icon="ClipboardList" title="Draft" description="Draft board and picks will appear here when the draft is active." />
            )}
            {section === "trades" && (
              <PlaceholderSection icon="Repeat2" title="Trades" description="No trade proposals have been submitted yet." />
            )}
            {section === "awards" && (
              <PlaceholderSection icon="Trophy" title="Awards" description="Season awards and accolades will be displayed here at the end of each season." />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
