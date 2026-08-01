import { getWeekLabel } from "@/lib/weekLabel";

interface League {
  id: number;
  name: string;
  platform: string;
  difficulty: string;
  week: number;
  season: number;
  phase: string;
  member_count: number;
  max_members: number;
  commissioner_name: string;
  is_money_league: boolean;
}

interface Summary {
  total_teams: number;
  total_games_played: number;
  current_week: number;
  league: League;
}

interface Props {
  league: League;
  summary?: Summary;
}

const phaseLabel: Record<string, string> = {
  PRE_SEASON: "Pre Season",
  REGULAR_SEASON: "Regular Season",
  POST_SEASON: "Post Season",
  SUPER_BOWL: "Super Bowl",
};

export default function LeagueBanner({ league, summary }: Props) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-[#0d1a2a] to-[#0a0a0a] border-b border-white/8">
      {/* Background grid lines */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "linear-gradient(rgba(0,200,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,0.15) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-[#00C8FF]/10 blur-3xl rounded-full" />

      <div className="relative px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black uppercase tracking-tight text-white truncate">
                {league.name}
              </h1>
              {league.is_money_league && (
                <span className="shrink-0 rounded-full bg-[#F44336]/20 border border-[#F44336]/40 px-2 py-0.5 text-[9px] font-black text-[#F44336] uppercase tracking-wider">
                  💰 Money
                </span>
              )}
            </div>
            <p className="text-xs text-white/40 mb-3">
              Commissioner: @{league.commissioner_name} &bull; {league.platform} &bull; {league.difficulty.replace(/_/g, " ")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip label={phaseLabel[league.phase] ?? league.phase} cyan />
              <Chip label={`Season ${league.season}`} />
              <Chip label={getWeekLabel(league.week)} />
              <Chip label={`${league.member_count}/${league.max_members} Members`} />
            </div>
          </div>

          <div className="flex gap-4 shrink-0">
            <Stat label="Teams" value={String(summary?.total_teams ?? "—")} />
            <Stat label="Played" value={String(summary?.total_games_played ?? "—")} />
            <Stat label="Week" value={getWeekLabel(summary?.current_week ?? league.week)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ label, cyan }: { label: string; cyan?: boolean }) {
  return (
    <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold ${
      cyan
        ? "border-[#00C8FF]/40 bg-[#00C8FF]/10 text-[#00C8FF]"
        : "border-white/12 bg-white/5 text-white/50"
    }`}>
      {label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-black text-[#00C8FF]">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-white/35">{label}</p>
    </div>
  );
}
