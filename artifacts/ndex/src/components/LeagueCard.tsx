import { Link } from "wouter";
import type { League } from "@workspace/api-client-react";

const platformColors: Record<string, string> = {
  PS5: "bg-[#00439c] text-white",
  Xbox: "bg-[#107c10] text-white",
  PC: "bg-[#7f7f7f] text-white",
};

const difficultyColors: Record<string, string> = {
  ALL_MADDEN: "bg-[#00C8FF]/20 text-[#00C8FF] border border-[#00C8FF]/30",
  ADVANCED: "bg-purple-900/40 text-purple-300 border border-purple-500/30",
  PRO: "bg-yellow-900/40 text-yellow-300 border border-yellow-500/30",
  ROOKIE: "bg-green-900/40 text-green-300 border border-green-500/30",
  VETERAN: "bg-orange-900/40 text-orange-300 border border-orange-500/30",
};

const categoryColors: Record<string, string> = {
  REGULAR: "bg-white/10 text-white/70",
  FANTASY: "bg-[#F44336]/20 text-[#F44336] border border-[#F44336]/30",
};

const phaseLabels: Record<string, string> = {
  PRE_SEASON: "Pre Season",
  REGULAR_SEASON: "Regular Season",
  POST_SEASON: "Post Season",
  SUPER_BOWL: "Super Bowl",
};

interface Props {
  league: League;
}

export default function LeagueCard({ league }: Props) {
  return (
    <Link href={`/leagues/${league.id}`} data-testid={`card-league-${league.id}`}>
      <div className="group relative rounded-xl border border-white/10 bg-[#141414] p-4 hover:border-[#00C8FF]/40 hover:bg-[#181818] transition-all cursor-pointer">
        {league.is_money_league && (
          <span className="absolute top-3 right-3 rounded-full bg-[#F44336]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F44336] border border-[#F44336]/30">
            $
          </span>
        )}

        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#00C8FF]/10 border border-[#00C8FF]/20">
            <span className="text-xs font-black text-[#00C8FF]">NS</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-bold text-sm text-white uppercase tracking-wide group-hover:text-[#00C8FF] transition-colors" data-testid={`text-league-name-${league.id}`}>
              {league.name}
            </h3>
            <p className="text-xs text-white/40 mt-0.5">@{league.commissioner_name}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {league.platform && (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${platformColors[league.platform] ?? "bg-white/10 text-white/60"}`}>
              {league.platform}
            </span>
          )}
          {league.is_cross_play && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white/60">
              Crossplay
            </span>
          )}
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${categoryColors[league.category] ?? "bg-white/10 text-white/70"}`}>
            {league.category}
          </span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${difficultyColors[league.difficulty] ?? "bg-white/10 text-white/70"}`}>
            {league.difficulty.replace("_", " ")}
          </span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/60">
            {league.skill_level}
          </span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/60">
            {league.advance_time_hours}H
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-white/50">
            {league.season}
          </span>
          <span className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-white/50">
            {phaseLabels[league.phase] ?? league.phase}
          </span>
          <span className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-white/50">
            Week {league.week}
          </span>
        </div>

        {league.description && (
          <p className="text-[11px] text-white/40 line-clamp-2 mb-3">{league.description}</p>
        )}

        <div className="flex items-center justify-between border-t border-white/8 pt-2.5">
          <span className="text-[11px] text-white/40">
            <span className="text-white/70 font-semibold">{league.member_count}</span> / {league.max_members} members
          </span>
          <span className="text-[10px] text-[#00C8FF] font-semibold uppercase tracking-wider">
            View League &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
