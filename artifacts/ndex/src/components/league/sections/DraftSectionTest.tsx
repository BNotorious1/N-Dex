import { useState, useMemo } from "react";
import { useGetLeagueDraft, getGetLeagueDraftQueryKey, LeagueDraftEntry } from "@workspace/api-client-react";
import { Link } from "wouter";
import TeamLogo from "../../TeamLogo";
import { ClipboardList, TrendingUp, TrendingDown, Search } from "lucide-react";

import devTraitNormal    from "@assets/Normal_1781202579092.png";
import devTraitStar      from "@assets/Star_1781202579092.png";
import devTraitSuperstar from "@assets/Superstar_1781202579092.png";
import devTraitXFactor   from "@assets/Superstar_X-Factor_1781202579092.png";

const DEV_TRAIT: Record<number, { label: string; color: string; img: string }> = {
  0: { label: "Normal",    color: "#a16207", img: devTraitNormal    },
  1: { label: "Star",      color: "#9ca3af", img: devTraitStar      },
  2: { label: "Superstar", color: "#d97706", img: devTraitSuperstar },
  3: { label: "X-Factor",  color: "#ef4444", img: devTraitXFactor   },
};

const POSITIONS = [
  "QB","HB","FB","WR","TE","LT","LG","C","RG","RT",
  "LE","RE","DT","LOLB","MLB","ROLB","CB","FS","SS","K","P","KR","PR",
];

function eaPortraitUrl(portraitId: number) {
  return `/api/proxy/image?url=${encodeURIComponent(
    `https://ratings-images-prod.pulse.ea.com/madden-nfl-26/portraits/${portraitId}.png`
  )}`;
}

function Portrait({ portraitId, name }: { portraitId?: number | null; name: string }) {
  const [err, setErr] = useState(false);
  const has = !!portraitId && !err;
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-white/5 border border-white/10">
      {has ? (
        <img
          src={eaPortraitUrl(portraitId!)}
          alt={name}
          className="w-full h-full object-cover object-[center_10%] scale-125 translate-y-0.5"
          loading="lazy"
          onError={() => setErr(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[11px] font-black text-white/30">
          {name.charAt(0)}
        </div>
      )}
    </div>
  );
}

function OvrDelta({ drafted, current }: { drafted: number | null | undefined; current: number }) {
  if (drafted == null) return <span className="font-black text-[13px] tabular-nums" style={{ color: current >= 90 ? "#ef4444" : current >= 80 ? "#d97706" : current >= 70 ? "#22c55e" : "#94a3b8" }}>{current}</span>;
  const delta = current - drafted;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-black text-[13px] tabular-nums" style={{ color: current >= 90 ? "#ef4444" : current >= 80 ? "#d97706" : current >= 70 ? "#22c55e" : "#94a3b8" }}>
        {current}
      </span>
      {delta !== 0 && (
        <span className={`text-[9px] font-bold flex items-center gap-0.5 ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
          {delta > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
          {delta > 0 ? "+" : ""}{delta}
        </span>
      )}
    </div>
  );
}

function FilterPill({
  label, value, onChange, options, allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-white/25"
      >
        <option value="ALL">{allLabel}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function RecapRow({ p }: { p: LeagueDraftEntry }) {
  const dev = p.dev_trait != null ? DEV_TRAIT[p.dev_trait] : null;

  const isUDFA = p.draft_round == null;
  const pickLabel = !isUDFA && p.draft_pick != null
    ? `${p.draft_round}.${String(p.draft_pick).padStart(2, "0")}`
    : null;

  const draftAbbr = p.draft_team_abbreviation;
  const draftColor = p.draft_team_color;
  const draftTeamId = p.draft_team_id;

  const posChanged = p.draft_position != null && p.draft_position !== p.position;

  return (
    <tr className="border-b border-white/5 last:border-0 hover:bg-white/[0.025] transition-colors group">
      {/* Pick / UDFA */}
      <td className="py-3 pl-4 pr-2 whitespace-nowrap">
        {isUDFA ? (
          <span className="text-[9px] font-black text-white/30 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
            UDFA
          </span>
        ) : (
          <span className="text-xs font-black text-white/40 tabular-nums">{pickLabel}</span>
        )}
      </td>

      {/* Player */}
      <td className="py-3 px-2">
        <Link href={`/players/${p.player_id}`}>
          <div className="flex items-center gap-2.5 cursor-pointer">
            <Portrait portraitId={p.portrait_id} name={p.name} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-tight truncate group-hover:text-[#00C8FF] transition-colors">
                {p.name}
              </p>
              {dev && (
                <div className="flex items-center gap-1 mt-0.5">
                  <img src={dev.img} alt={dev.label} className="w-3 h-3" />
                  <span className="text-[9px] font-bold" style={{ color: dev.color }}>{dev.label}</span>
                </div>
              )}
            </div>
          </div>
        </Link>
      </td>

      {/* Year */}
      <td className="py-3 px-2 text-center">
        <span className="text-xs text-white/40 tabular-nums">{p.rookie_year ?? "—"}</span>
      </td>

      {/* ── AT DRAFT ─────────────────────── */}

      {/* Drafted By */}
      <td className="py-3 px-2 border-l border-[#00C8FF]/10 text-center">
        {draftAbbr && draftTeamId ? (
          <Link href={`/teams/${draftTeamId}`}>
            <div className="flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
              <TeamLogo abbreviation={draftAbbr} size="sm" primaryColor={draftColor ?? undefined} />
              <span className="text-xs font-bold text-white/60">{draftAbbr}</span>
            </div>
          </Link>
        ) : (
          <span className="text-white/20 text-xs">—</span>
        )}
      </td>

      {/* Drafted Pos */}
      <td className="py-3 px-2 text-center">
        {p.draft_position ? (
          <span className="text-[10px] font-black text-[#00C8FF]/60 bg-[#00C8FF]/8 border border-[#00C8FF]/15 px-1.5 py-0.5 rounded">
            {p.draft_position}
          </span>
        ) : (
          <span className="text-white/20 text-xs">—</span>
        )}
      </td>

      {/* Drafted Age */}
      <td className="py-3 px-2 text-center">
        <span className="text-xs font-bold text-white/40 tabular-nums">
          {p.draft_age ?? "—"}
        </span>
      </td>

      {/* Drafted OVR */}
      <td className="py-3 px-2 text-center">
        {p.draft_overall != null ? (
          <span className="text-xs font-black tabular-nums text-white/50">{p.draft_overall}</span>
        ) : (
          <span className="text-white/20 text-xs">—</span>
        )}
      </td>

      {/* ── NOW ──────────────────────── */}

      {/* Current Team */}
      <td className="py-3 px-2 border-l border-emerald-400/10 text-center">
        <Link href={`/teams/${p.team_id}`}>
          <div className="flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
            <TeamLogo abbreviation={p.team_abbreviation} size="sm" primaryColor={p.team_color ?? undefined} />
            <span className="text-xs font-bold text-white/70">{p.team_abbreviation}</span>
          </div>
        </Link>
      </td>

      {/* Current Pos */}
      <td className="py-3 px-2 text-center">
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
          posChanged
            ? "text-amber-400 bg-amber-400/8 border-amber-400/20"
            : "text-white/50 bg-white/5 border-white/10"
        }`}>
          {p.position}
        </span>
      </td>

      {/* Current Age */}
      <td className="py-3 px-2 text-center">
        <span className="text-xs font-bold text-white/60 tabular-nums">{p.age}</span>
      </td>

      {/* Current OVR (with delta) */}
      <td className="py-3 px-4 text-center">
        <OvrDelta drafted={p.draft_overall} current={p.overall} />
      </td>
    </tr>
  );
}

export default function DraftSectionTest({ leagueId }: { leagueId: number }) {
  const { data, isLoading } = useGetLeagueDraft(leagueId, {
    query: { queryKey: getGetLeagueDraftQueryKey(leagueId) },
  });

  const picks = data?.picks ?? [];
  const foundedYear = data?.founded_year;

  const [roundFilter,    setRoundFilter]    = useState<string>("ALL");
  const [draftTeamFilter, setDraftTeamFilter] = useState<string>("ALL");
  const [posFilter,      setPosFilter]      = useState<string>("ALL");
  const [yearFilter,     setYearFilter]     = useState<string>("ALL");
  const [nameSearch,     setNameSearch]     = useState<string>("");

  const rounds = useMemo(() => {
    const s = new Set<number>();
    for (const p of picks) if (p.draft_round != null) s.add(p.draft_round);
    return Array.from(s).sort((a, b) => a - b);
  }, [picks]);

  // Drafted-by teams (not current team)
  const draftTeams = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of picks) {
      if (p.draft_team_abbreviation && p.draft_team_name)
        seen.set(p.draft_team_abbreviation, p.draft_team_name);
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [picks]);

  const years = useMemo(() => {
    const s = new Set<number>();
    if (foundedYear != null) s.add(foundedYear);
    for (const p of picks) if (p.rookie_year != null) s.add(p.rookie_year);
    if (foundedYear != null && s.size > 1) {
      const max = Math.max(...Array.from(s));
      for (let y = foundedYear; y <= max; y++) s.add(y);
    }
    return Array.from(s).sort((a, b) => b - a);
  }, [picks, foundedYear]);

  const usedPositions = useMemo(() => {
    const s = new Set<string>();
    for (const p of picks) s.add(p.position);
    return POSITIONS.filter(pos => s.has(pos));
  }, [picks]);

  const filtered = useMemo(() => {
    const q = nameSearch.trim().toLowerCase();
    return picks.filter(p => {
      if (roundFilter     !== "ALL" && String(p.draft_round)          !== roundFilter)     return false;
      if (draftTeamFilter !== "ALL" && p.draft_team_abbreviation      !== draftTeamFilter) return false;
      if (posFilter       !== "ALL" && p.position                     !== posFilter)        return false;
      if (yearFilter      !== "ALL" && String(p.rookie_year)          !== yearFilter)       return false;
      if (q && !p.name.toLowerCase().includes(q))                                          return false;
      return true;
    });
  }, [picks, roundFilter, draftTeamFilter, posFilter, yearFilter, nameSearch]);

  const hasFilters = roundFilter !== "ALL" || draftTeamFilter !== "ALL" || posFilter !== "ALL" || yearFilter !== "ALL" || nameSearch !== "";

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <ClipboardList className="w-5 h-5 text-[#00C8FF]" />
        <h2 className="text-xl font-black text-white tracking-tight">Draft Recap</h2>
        {hasFilters && (
          <span className="text-[11px] text-white/30 font-bold">{filtered.length} of {picks.length}</span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
        {/* Name search */}
        <div className="flex items-center gap-1.5">
          <Search className="w-3 h-3 text-white/30" />
          <input
            type="text"
            value={nameSearch}
            onChange={e => setNameSearch(e.target.value)}
            placeholder="Player name…"
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/25 w-32"
          />
        </div>

        {years.length > 0 && (
          <FilterPill label="Year" value={yearFilter} onChange={setYearFilter}
            options={years.map(y => ({ value: String(y), label: String(y) }))} allLabel="All Years" />
        )}
        {rounds.length > 1 && (
          <FilterPill label="Round" value={roundFilter} onChange={setRoundFilter}
            options={rounds.map(r => ({ value: String(r), label: `Round ${r}` }))} allLabel="All Rounds" />
        )}
        {draftTeams.length > 0 && (
          <FilterPill label="Drafted By" value={draftTeamFilter} onChange={setDraftTeamFilter}
            options={draftTeams.map(([abbr, name]) => ({ value: abbr, label: name }))} allLabel="All Teams" />
        )}
        {usedPositions.length > 0 && (
          <FilterPill label="Pos" value={posFilter} onChange={setPosFilter}
            options={usedPositions.map(pos => ({ value: pos, label: pos }))} allLabel="All Positions" />
        )}
        {hasFilters && (
          <button
            onClick={() => { setRoundFilter("ALL"); setDraftTeamFilter("ALL"); setPosFilter("ALL"); setYearFilter("ALL"); setNameSearch(""); }}
            className="px-2.5 py-1 rounded text-[10px] font-bold text-white/30 hover:text-white transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {picks.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-[#141414] py-20 flex flex-col items-center gap-3">
          <ClipboardList className="w-8 h-8 text-white/10" />
          <p className="text-white/30 text-sm font-bold">No draft data yet</p>
          <p className="text-white/20 text-xs text-center max-w-xs">
            Draft picks appear once rosters with draft round and pick data are imported from EA.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/8 bg-[#141414] overflow-x-auto">
          <table className="w-full text-left min-w-[820px]">
            <thead>
              {/* Group header row */}
              <tr className="border-b border-white/5" style={{ backgroundColor: "#0d0d0d" }}>
                <th colSpan={3} className="py-1.5 pl-4 pr-2 text-[9px] font-black uppercase tracking-widest text-white/20" />
                <th colSpan={4} className="py-1.5 px-2 text-[9px] font-black uppercase tracking-widest text-[#00C8FF]/40 text-center border-l border-[#00C8FF]/10">
                  At Draft
                </th>
                <th colSpan={4} className="py-1.5 px-4 text-[9px] font-black uppercase tracking-widest text-emerald-400/40 text-center border-l border-emerald-400/10">
                  Now
                </th>
              </tr>
              {/* Column header row */}
              <tr className="border-b border-white/8" style={{ backgroundColor: "#101010" }}>
                <th className="py-2.5 pl-4 pr-2 text-[10px] font-black uppercase tracking-wider text-white/25 w-14">Pick</th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-white/25">Player</th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-white/25 text-center w-14">Year</th>
                {/* At Draft */}
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-[#00C8FF]/35 text-center border-l border-[#00C8FF]/10">Team</th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-[#00C8FF]/35 text-center w-16">Pos</th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-[#00C8FF]/35 text-center w-14">Age</th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-[#00C8FF]/35 text-center w-14">OVR</th>
                {/* Now */}
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-emerald-400/40 text-center border-l border-emerald-400/10">Team</th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-emerald-400/40 text-center w-16">Pos</th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-emerald-400/40 text-center w-14">Age</th>
                <th className="py-2.5 px-4 text-[10px] font-black uppercase tracking-wider text-emerald-400/40 text-center w-16">OVR</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => <RecapRow key={p.player_id} p={p} />)}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-10 text-center text-white/25 text-sm">No players match the current filters.</div>
          )}
        </div>
      )}

      {/* Legend */}
      {picks.length > 0 && (
        <div className="flex items-center gap-5 flex-wrap pt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-400/60" />
            <span className="text-[10px] text-white/25 font-bold">Amber pos = position changed since draft</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-emerald-400/60" />
            <span className="text-[10px] text-white/25 font-bold">OVR change since drafted</span>
          </div>
        </div>
      )}
    </div>
  );
}
