import { useState, useMemo } from "react";
import { Link } from "wouter";

interface Game {
  id: number; week: number; season: number; status: string;
  home_team_name?: string | null; away_team_name?: string | null;
  home_score?: number | null; away_score?: number | null;
}

interface Props { games: Game[] }

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Final",
  IN_PROGRESS: "Live",
  SCHEDULED: "Scheduled",
  BYE: "Bye",
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-900/30 text-green-400 border-green-500/30",
  IN_PROGRESS: "bg-[#00C8FF]/15 text-[#00C8FF] border-[#00C8FF]/30",
  SCHEDULED: "bg-white/5 text-white/35 border-white/12",
  BYE: "bg-white/5 text-white/25 border-white/10",
};

export default function GamesSection({ games }: Props) {
  const weeks = useMemo(() => {
    const ws = [...new Set(games.map((g) => g.week))].sort((a, b) => a - b);
    return ws;
  }, [games]);

  const [weekFilter, setWeekFilter] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return games.filter((g) => {
      const matchWeek = weekFilter === "all" || g.week === weekFilter;
      const matchStatus = statusFilter === "all" || g.status === statusFilter;
      return matchWeek && matchStatus;
    });
  }, [games, weekFilter, statusFilter]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<number, Game[]>>((acc, g) => {
      if (!acc[g.week]) acc[g.week] = [];
      acc[g.week].push(g);
      return acc;
    }, {});
  }, [filtered]);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <select
          value={weekFilter}
          onChange={(e) => setWeekFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 outline-none focus:border-[#00C8FF]/40"
        >
          <option value="all">All Weeks</option>
          {weeks.map((w) => <option key={w} value={w}>Week {w}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 outline-none focus:border-[#00C8FF]/40"
        >
          <option value="all">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="SCHEDULED">Scheduled</option>
        </select>
        <span className="text-[10px] text-white/30 ml-auto">{filtered.length} games</span>
      </div>
      {/* Games grouped by week */}
      {Object.keys(grouped).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([week, weekGames]) => (
              <div key={week}>
                <p className="font-bold uppercase tracking-widest text-white/40 mb-3 text-center text-[20px]">
                  Week {week}
                </p>
                <div className="space-y-2">
                  {weekGames.map((game) => (
                    <GameRow key={game.id} game={game} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <p className="text-center text-white/30 text-xs py-16">No games found</p>
      )}
    </div>
  );
}

function GameRow({ game }: { game: Game }) {
  const isCompleted = game.status === "COMPLETED" || game.status === "FINAL";
  const statusClass = STATUS_COLORS[game.status] ?? STATUS_COLORS.SCHEDULED;
  const statusLabel = STATUS_LABELS[game.status] ?? game.status;

  return (
    <Link
      href={`/games/${game.id}`}
      className="rounded-xl border border-white/8 bg-[#141414] px-5 py-4 flex items-center gap-4 hover:border-[#00C8FF]/30 hover:bg-[#00C8FF]/3 transition-colors block"
    >
      {/* Away */}
      <div className="flex-1 text-right">
        <p className="font-bold text-white text-[24px] text-center">
          {game.away_team_name ?? "TBD"}
        </p>
        <p className="text-white/30 text-[14px] text-center">Away</p>
      </div>
      {/* Score / VS */}
      <div className="text-center min-w-[100px]">
        {isCompleted ? (
          <p className="text-xl font-black tracking-tight">
            <span className="font-black tracking-tight text-[32px]">
              {game.away_score}
            </span>
            <span className="text-white/20 mx-1.5">–</span>
            <span className={(game.home_score ?? 0) > (game.away_score ?? 0) ? "text-[#00C8FF]" : "text-white/45"}>
              {game.home_score}
            </span>
          </p>
        ) : (
          <p className="text-sm font-bold text-white/25">VS</p>
        )}
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase mt-1 ${statusClass}`}>
          {statusLabel}
        </span>
      </div>
      {/* Home */}
      <div className="flex-1">
        <p className={`font-bold text-[24px] text-center ${isCompleted && (game.home_score ?? 0) > (game.away_score ?? 0) ? "text-[#00C8FF]" : "text-white/60"}`}>
          {game.home_team_name ?? "TBD"}
        </p>
        <p className="text-white/30 text-[14px] text-center">Home</p>
      </div>
    </Link>
  );
}
