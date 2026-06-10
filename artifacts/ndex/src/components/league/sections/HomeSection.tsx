import { Link } from "wouter";

interface Team {
  id: number; name: string; city: string; abbreviation: string;
  wins: number; losses: number; ties: number;
  overall_rating: number; primary_color?: string | null;
  conference: string; division: string;
}
interface Game {
  id: number; home_team_name?: string | null; away_team_name?: string | null;
  home_score?: number | null; away_score?: number | null; week: number; status: string;
}
interface StatLine {
  player: { id: number; name: string; position: string };
  team_name: string; stat_label: string; stat_value: number;
}
interface StatLeaders { passing: StatLine[]; rushing: StatLine[]; receiving: StatLine[]; defense: StatLine[] }
interface StandingEntry {
  team: Team; wins: number; losses: number; ties: number;
  points_for: number; points_against: number; conference: string; division: string;
}

interface Props {
  summary?: {
    league: { name: string; season: number };
    top_teams: Team[];
    recent_games: Game[];
    total_teams: number;
    total_games_played: number;
    current_week: number;
  };
  statLeaders?: StatLeaders;
  standings?: StandingEntry[];
}

export default function HomeSection({ summary, statLeaders, standings }: Props) {
  const afcTeams = standings?.filter((s) => s.conference === "AFC").slice(0, 8) ?? [];
  const nfcTeams = standings?.filter((s) => s.conference === "NFC").slice(0, 8) ?? [];

  return (
    <div className="space-y-6">
      {/* Top row: standings splits */}
      {standings && standings.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-4">
          <StandingsSplit title="AFC Standings" entries={afcTeams} />
          <StandingsSplit title="NFC Standings" entries={nfcTeams} />
        </div>
      )}

      {/* Middle row: top teams + recent games */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SectionHeader>Top Teams</SectionHeader>
          <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/8 bg-[#0f0f0f]">
                  <Th left>#</Th>
                  <Th left>Team</Th>
                  <Th>Conf</Th>
                  <Th>W</Th>
                  <Th>L</Th>
                  <Th>T</Th>
                  <Th>OVR</Th>
                </tr>
              </thead>
              <tbody>
                {summary?.top_teams.map((team, i) => (
                  <tr key={team.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-2.5 text-white/25 text-[10px] w-8">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <Link href={`/teams/${team.id}`} className="flex items-center gap-2 hover:text-[#00C8FF] transition-colors">
                        <TeamBadge team={team} size="sm" />
                        <span className="font-semibold text-white">{team.city} {team.name}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-center text-white/40">{team.conference}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-white">{team.wins}</td>
                    <td className="px-3 py-2.5 text-center text-white/40">{team.losses}</td>
                    <td className="px-3 py-2.5 text-center text-white/40">{team.ties}</td>
                    <td className="px-3 py-2.5 text-center">
                      <OvrBadge value={team.overall_rating} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <SectionHeader>Recent Games</SectionHeader>
          <div className="space-y-2">
            {summary?.recent_games && summary.recent_games.length > 0 ? (
              summary.recent_games.map((game) => (
                <GameCard key={game.id} game={game} />
              ))
            ) : (
              <Empty>No completed games yet</Empty>
            )}
          </div>
        </div>
      </div>

      {/* Stat leaders */}
      {statLeaders && (
        <div>
          <SectionHeader>Stat Leaders</SectionHeader>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(["passing", "rushing", "receiving", "defense"] as const).map((cat) => (
              <StatCard key={cat} title={cat} entries={statLeaders[cat]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StandingsSplit({ title, entries }: { title: string; entries: StandingEntry[] }) {
  return (
    <div>
      <SectionHeader>{title}</SectionHeader>
      <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/8 bg-[#0f0f0f]">
              <Th left>Team</Th>
              <Th>W</Th>
              <Th>L</Th>
              <Th>T</Th>
              <Th>PF</Th>
              <Th>PA</Th>
            </tr>
          </thead>
          <tbody>
            {entries.length > 0 ? entries.map((e) => (
              <tr key={e.team.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-3 py-2">
                  <Link href={`/teams/${e.team.id}`} className="flex items-center gap-2 hover:text-[#00C8FF] transition-colors">
                    <TeamBadge team={e.team} size="xs" />
                    <span className="font-semibold text-white truncate">{e.team.city} {e.team.name}</span>
                  </Link>
                </td>
                <td className="px-2 py-2 text-center font-bold text-white">{e.wins}</td>
                <td className="px-2 py-2 text-center text-white/40">{e.losses}</td>
                <td className="px-2 py-2 text-center text-white/40">{e.ties}</td>
                <td className="px-2 py-2 text-center text-[#00C8FF] font-semibold">{e.points_for}</td>
                <td className="px-2 py-2 text-center text-white/40">{e.points_against}</td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="py-6 text-center text-white/30 text-[11px]">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ title, entries }: { title: string; entries: StatLine[] }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">{title}</p>
      <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
        {entries.length > 0 ? entries.map((e, i) => (
          <div key={e.player.id} className={`flex items-center gap-2 px-3 py-2.5 ${i < entries.length - 1 ? "border-b border-white/5" : ""}`}>
            <span className="text-[10px] text-white/20 w-4 shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{e.player.name}</p>
              <p className="text-[10px] text-white/35 truncate">{e.team_name} · {e.player.position}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-black text-[#00C8FF]">{e.stat_value}</p>
              <p className="text-[9px] text-white/25">{e.stat_label}</p>
            </div>
          </div>
        )) : (
          <p className="py-6 text-center text-white/25 text-[11px]">No data</p>
        )}
      </div>
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#141414] p-3">
      <p className="text-[10px] text-white/30 mb-1.5">Week {game.week}</p>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-xs font-semibold text-white truncate">{game.home_team_name}</span>
        <span className="text-sm font-black text-[#00C8FF] shrink-0">
          {game.home_score} – {game.away_score}
        </span>
        <span className="flex-1 text-xs text-white/50 truncate text-right">{game.away_team_name}</span>
      </div>
    </div>
  );
}

function TeamBadge({ team, size }: { team: { abbreviation: string; primary_color?: string | null }; size: "xs" | "sm" }) {
  const dim = size === "sm" ? "h-5 w-5 text-[8px]" : "h-4 w-4 text-[7px]";
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center font-black text-white shrink-0`}
      style={{ backgroundColor: team.primary_color ?? "#333" }}
    >
      {team.abbreviation.slice(0, 2)}
    </div>
  );
}

function OvrBadge({ value }: { value: number }) {
  return (
    <span className="rounded bg-[#00C8FF]/10 border border-[#00C8FF]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#00C8FF]">
      {value}
    </span>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">{children}</h2>
  );
}

function Th({ children, left }: { children: React.ReactNode; left?: boolean }) {
  return (
    <th className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white/30 ${left ? "text-left" : "text-center"}`}>
      {children}
    </th>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-white/30 text-center py-8">{children}</p>;
}
