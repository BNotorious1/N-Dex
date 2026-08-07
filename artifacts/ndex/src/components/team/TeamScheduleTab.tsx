import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import TeamLogo from "@/components/TeamLogo";
import { getWeekLabelShort } from "@/lib/weekLabel";
import type { TeamGame } from "@workspace/api-client-react";

interface Props {
  team: { id: number; primary_color?: string | null };
  games: TeamGame[];
}

function gameResult(game: TeamGame, teamId: number): "W" | "L" | "T" | null {
  if (game.status !== "FINAL" || game.home_score == null || game.away_score == null) return null;
  const isHome = game.home_team_id === teamId;
  const ts = isHome ? game.home_score : game.away_score;
  const os = isHome ? game.away_score : game.home_score;
  if (ts > os) return "W";
  if (ts < os) return "L";
  return "T";
}

export default function TeamScheduleTab({ team, games }: Props) {
  const primaryColor = team.primary_color ?? "#555";
  const [, navigate] = useLocation();

  const seasons = useMemo(() => {
    const s = Array.from(new Set(games.map(g => g.season ?? 0))).sort((a, b) => b - a);
    return s;
  }, [games]);

  const [selectedSeason, setSelectedSeason] = useState<number | "all">("all");

  const filtered = useMemo(() => {
    const base = [...games].sort((a, b) => (a.season ?? 0) - (b.season ?? 0) || a.week - b.week);
    if (selectedSeason === "all") return base;
    return base.filter(g => (g.season ?? 0) === selectedSeason);
  }, [games, selectedSeason]);

  // Group by season
  const bySeason = useMemo(() => {
    const map = new Map<number, typeof filtered>();
    for (const g of filtered) {
      const s = g.season ?? 0;
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(g);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [filtered]);

  if (games.length === 0) {
    return (
      <div className="py-20 text-center text-white/30 text-sm">No schedule data yet.</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Season filter */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] uppercase tracking-widest text-white/40 font-bold">Season</span>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setSelectedSeason("all")}
            className={`px-3 py-1 rounded text-[11px] font-bold transition-colors ${selectedSeason === "all" ? "text-white" : "text-white/40 hover:text-white/70 bg-white/5"}`}
            style={selectedSeason === "all" ? { backgroundColor: primaryColor } : {}}
          >
            All
          </button>
          {seasons.map(s => (
            <button
              key={s}
              onClick={() => setSelectedSeason(s)}
              className={`px-3 py-1 rounded text-[11px] font-bold transition-colors ${selectedSeason === s ? "text-white" : "text-white/40 hover:text-white/70 bg-white/5"}`}
              style={selectedSeason === s ? { backgroundColor: primaryColor } : {}}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule tables per season */}
      {bySeason.map(([season, seasonGames]) => {
        const played = seasonGames.filter(g => g.status === "FINAL");
        const wins = played.filter(g => gameResult(g, team.id) === "W").length;
        const losses = played.filter(g => gameResult(g, team.id) === "L").length;
        const ties = played.filter(g => gameResult(g, team.id) === "T").length;
        return (
          <div key={season} className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
            {/* Season header */}
            <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: primaryColor }}>
              <span className="text-xs font-black uppercase tracking-widest text-white">
                {season} Season
              </span>
              {played.length > 0 && (
                <span className="text-[11px] font-bold text-white/80">
                  {wins}–{losses}{ties > 0 ? `–${ties}` : ""} ({played.length} games played)
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/8" style={{ backgroundColor: `${primaryColor}30` }}>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white/50 w-12">Wk</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white/50 w-8"></th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white/50">Opponent</th>
                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/50 w-12">Res</th>
                    <th className="px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/50">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {seasonGames.map(game => {
                    const isHome = game.home_team_id === team.id;
                    const oppAbbr = isHome ? (game.away_team_abbreviation ?? "—") : (game.home_team_abbreviation ?? "—");
                    const oppColor = isHome ? (game.away_team_color ?? "#333") : (game.home_team_color ?? "#333");
                    const result = gameResult(game, team.id);
                    const ts = isHome ? game.home_score : game.away_score;
                    const os = isHome ? game.away_score : game.home_score;
                    const rc = result === "W" ? "#4ade80" : result === "L" ? "#F44336" : result === "T" ? "#facc15" : "transparent";
                    return (
                      <tr
                        key={game.id}
                        className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => navigate(`/games/${game.id}`)}
                      >
                        <td className="px-4 py-2 text-white/40 font-bold tabular-nums [font-family:'Lora',serif]">{getWeekLabelShort(game.week)}</td>
                        <td className="px-3 py-2 text-[10px] text-white/30">{isHome ? "vs" : "@"}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <TeamLogo abbreviation={oppAbbr} primaryColor={oppColor} size="sm" shape="circle" />
                            <span className="font-semibold text-white/80 [font-family:'Lora',serif]">{oppAbbr}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {result ? (
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-black"
                              style={{ color: rc, backgroundColor: `${rc}18` }}>{result}</span>
                          ) : <span className="text-white/20">—</span>}
                        </td>
                        <td className="px-4 py-2 text-center font-bold tabular-nums [font-family:'Lora',serif]">
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
        );
      })}
    </div>
  );
}
