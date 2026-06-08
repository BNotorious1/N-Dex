import { useState } from "react";
import { Link } from "wouter";
import { useListLeagues } from "@workspace/api-client-react";
import Navbar from "@/components/Navbar";
import LeagueCard from "@/components/LeagueCard";

const platforms = ["PS5", "Xbox", "PC"];
const difficulties = ["ALL_MADDEN", "ADVANCED", "PRO", "VETERAN", "ROOKIE"];
const categories = ["REGULAR", "FANTASY"];
const skillLevels = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

export default function Leagues() {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [category, setCategory] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [crossPlay, setCrossPlay] = useState<boolean | undefined>(undefined);
  const [moneyLeague, setMoneyLeague] = useState<boolean | undefined>(undefined);

  const params = {
    ...(search && { search }),
    ...(platform && { platform }),
    ...(difficulty && { difficulty }),
    ...(category && { category }),
    ...(skillLevel && { skill_level: skillLevel }),
    ...(crossPlay !== undefined && { is_cross_play: crossPlay }),
    ...(moneyLeague !== undefined && { is_money_league: moneyLeague }),
  };

  const { data: leagues, isLoading } = useListLeagues(params);

  const resetFilters = () => {
    setSearch("");
    setPlatform("");
    setDifficulty("");
    setCategory("");
    setSkillLevel("");
    setCrossPlay(undefined);
    setMoneyLeague(undefined);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Madden Leagues</h1>
            <p className="text-xs text-white/40 mt-1">{leagues?.length ?? 0} leagues found</p>
          </div>
          <Link
            href="/leagues/new"
            className="rounded-lg bg-[#00C8FF] px-4 py-2 text-xs font-bold text-black uppercase tracking-wider hover:bg-[#00b3e0] transition-colors"
            data-testid="button-create-league"
          >
            + Create League
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters sidebar */}
          <aside className="w-full lg:w-56 shrink-0">
            <div className="rounded-xl border border-white/10 bg-[#141414] p-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">
                  Search
                </label>
                <input
                  type="search"
                  placeholder="League name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-[#00C8FF]/40 focus:outline-none transition-colors"
                  data-testid="input-search"
                />
              </div>

              <FilterSelect label="Platform" value={platform} onChange={setPlatform} options={platforms} />
              <FilterSelect label="Difficulty" value={difficulty} onChange={setDifficulty} options={difficulties} />
              <FilterSelect label="Category" value={category} onChange={setCategory} options={categories} />
              <FilterSelect label="Skill Level" value={skillLevel} onChange={setSkillLevel} options={skillLevels} />

              <div className="space-y-2">
                <ToggleFilter label="Cross Play Enabled" value={crossPlay} onChange={setCrossPlay} />
                <ToggleFilter label="Money Leagues Only" value={moneyLeague} onChange={setMoneyLeague} />
              </div>

              <button
                onClick={resetFilters}
                className="w-full rounded-lg bg-[#F44336] py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#d32f2f] transition-colors"
                data-testid="button-reset-filters"
              >
                Reset Filters
              </button>
            </div>
          </aside>

          {/* League grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-52 rounded-xl bg-[#141414] border border-white/8 animate-pulse" />
                ))}
              </div>
            ) : leagues && leagues.length > 0 ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {leagues.map((league) => (
                  <LeagueCard key={league.id} league={league} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-white/30 text-sm mb-2">No leagues found</p>
                <p className="text-white/20 text-xs mb-4">Try adjusting your filters or create a new league</p>
                <Link href="/leagues/new" className="text-xs text-[#00C8FF] hover:underline">
                  Create a League
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-[#00C8FF]/40 focus:outline-none transition-colors"
        data-testid={`select-${label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-[#1a1a1a]">
            {opt.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | undefined;
  onChange: (v: boolean | undefined) => void;
}) {
  return (
    <button
      onClick={() => onChange(value === undefined ? true : value === true ? false : undefined)}
      className="flex items-center gap-2 w-full text-left"
      data-testid={`toggle-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className={`relative h-4 w-8 rounded-full transition-colors ${value ? "bg-[#00C8FF]" : "bg-white/20"}`}>
        <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
      <span className="text-xs text-white/50">{label}</span>
    </button>
  );
}
