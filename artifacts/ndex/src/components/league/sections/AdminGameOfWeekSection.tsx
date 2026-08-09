import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getWeekLabel } from "@/lib/weekLabel";
import {
  useGetLeagueGameOfWeek,
  useCreateLeagueGameOfWeek,
  useDeleteLeagueGameOfWeek,
  useGetLeagueTeams,
  getGetLeagueGameOfWeekQueryKey,
} from "@workspace/api-client-react";
import TeamLogo from "@/components/TeamLogo";
import { Trash2, Save, Star } from "lucide-react";

interface Props {
  leagueId: number;
  currentWeek?: number;
  currentSeason?: number;
}

export default function AdminGameOfWeekSection({ leagueId, currentWeek = 1, currentSeason = 2025 }: Props) {
  const qc = useQueryClient();
  const queryKey = getGetLeagueGameOfWeekQueryKey(leagueId);

  const { data: gotw, isLoading: gotwLoading } = useGetLeagueGameOfWeek(leagueId, {
    query: { queryKey },
  });
  const { data: teams = [] } = useGetLeagueTeams(leagueId, {
    query: { queryKey: ["teams", leagueId] },
  });
  const createMut = useCreateLeagueGameOfWeek();
  const deleteMut = useDeleteLeagueGameOfWeek();

  const [week, setWeek] = useState(currentWeek);
  const [season, setSeason] = useState(currentSeason);
  const [homeTeamId, setHomeTeamId] = useState<number | "">("");
  const [awayTeamId, setAwayTeamId] = useState<number | "">("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [kickoff, setKickoff] = useState("");

  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMut.mutateAsync({
      id: leagueId,
      data: {
        week,
        season,
        home_team_id: homeTeamId !== "" ? Number(homeTeamId) : null,
        away_team_id: awayTeamId !== "" ? Number(awayTeamId) : null,
        headline: headline || null,
        description: description || null,
        kickoff: kickoff || null,
      },
    });
    await qc.invalidateQueries({ queryKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDelete = async () => {
    if (!confirm("Remove the current Game of the Week?")) return;
    await deleteMut.mutateAsync({ id: leagueId });
    await qc.invalidateQueries({ queryKey });
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-[#00C8FF]/10 border border-[#00C8FF]/20 flex items-center justify-center">
          <Star className="h-4 w-4 text-[#00C8FF]" />
        </div>
        <div>
          <h2 className="text-base font-black text-white">Game of the Week</h2>
          <p className="text-xs text-white/40">Spotlight a matchup on the league home page</p>
        </div>
      </div>

      {/* Current GOTW */}
      {gotwLoading ? (
        <div className="rounded-xl border border-white/8 bg-[#111] p-4 animate-pulse h-20" />
      ) : gotw ? (
        <div className="rounded-xl border border-[#00C8FF]/20 bg-[#00C8FF]/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#00C8FF]/60 mb-1">Currently Live</p>
              <p className="text-sm font-bold text-white">
                {gotw.away_team ? `${gotw.away_team.city} ${gotw.away_team.name}` : "TBD"}
                {" vs "}
                {gotw.home_team ? `${gotw.home_team.city} ${gotw.home_team.name}` : "TBD"}
              </p>
              <p className="text-xs text-white/40 mt-0.5">{getWeekLabel(gotw.week)} · Season {gotw.season}</p>
              {gotw.headline && <p className="text-xs text-white/60 mt-1 italic">{gotw.headline}</p>}
            </div>
            <button
              onClick={handleDelete}
              disabled={deleteMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#F44336]/30 bg-[#F44336]/10 text-[#F44336] text-xs font-bold hover:bg-[#F44336]/20 transition-colors shrink-0"
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/8 bg-[#111] p-4 text-center">
          <p className="text-xs text-white/30">No Game of the Week is currently set.</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-white/8 bg-[#111] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8 bg-[#0d0d0d]">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
            {gotw ? "Replace Game of the Week" : "Set Game of the Week"}
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Week + Season */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Week</label>
              <input
                type="number"
                min={1}
                max={22}
                value={week}
                onChange={(e) => setWeek(Number(e.target.value))}
                className="w-full rounded-lg bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C8FF]/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Season</label>
              <input
                type="number"
                min={2020}
                value={season}
                onChange={(e) => setSeason(Number(e.target.value))}
                className="w-full rounded-lg bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C8FF]/50"
              />
            </div>
          </div>

          {/* Teams */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Away Team</label>
              <TeamSelect teams={teams} value={awayTeamId} onChange={setAwayTeamId} placeholder="Select team…" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Home Team</label>
              <TeamSelect teams={teams} value={homeTeamId} onChange={setHomeTeamId} placeholder="Select team…" />
            </div>
          </div>

          {/* Headline */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. #1 Eagles vs #4 Chiefs — AFC Showdown"
              className="w-full rounded-lg bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00C8FF]/50"
            />
          </div>

          {/* Kickoff */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Kickoff Info</label>
            <input
              type="text"
              value={kickoff}
              onChange={(e) => setKickoff(e.target.value)}
              placeholder="e.g. Sunday, Dec 14 · 8:20 PM ET"
              className="w-full rounded-lg bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00C8FF]/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Description <span className="text-white/20 normal-case font-normal">(optional)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief note about the matchup…"
              rows={2}
              className="w-full rounded-lg bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00C8FF]/50 resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={createMut.isPending}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                saved
                  ? "bg-green-500/20 border border-green-500/30 text-green-400"
                  : "bg-[#00C8FF]/15 border border-[#00C8FF]/30 text-[#00C8FF] hover:bg-[#00C8FF]/25"
              }`}
            >
              <Save className="h-3.5 w-3.5" />
              {createMut.isPending ? "Saving…" : saved ? "Saved!" : gotw ? "Replace GOTW" : "Set as GOTW"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function TeamSelect({
  teams, value, onChange, placeholder,
}: {
  teams: { id: number; city: string; name: string; abbreviation: string; primary_color?: string | null }[];
  value: number | "";
  onChange: (v: number | "") => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className="w-full rounded-lg bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C8FF]/50 appearance-none pr-8"
      >
        <option value="">{placeholder}</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>{t.city} {t.name} ({t.abbreviation})</option>
        ))}
      </select>
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none text-xs">▾</span>
    </div>
  );
}
