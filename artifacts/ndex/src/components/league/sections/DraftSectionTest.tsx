import { useState, useMemo } from "react";
import { useGetLeagueDraft, getGetLeagueDraftQueryKey, LeagueDraftEntry } from "@workspace/api-client-react";
import { Link } from "wouter";
import TeamLogo from "../../TeamLogo";
import { ClipboardList, TrendingUp, TrendingDown } from "lucide-react";

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

const OVR_COLOR = (v: number) =>
  v >= 90 ? "#ef4444" : v >= 80 ? "#d97706" : v >= 70 ? "#22c55e" : "#94a3b8";

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
  if (drafted == null) return <span className="text-white/20 text-xs">—</span>;
  const delta = current - drafted;
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-black text-[13px] tabular-nums text-white/80">{drafted}</span>
      {delta !== 0 && (
        <span className={`text-[10px] font-bold flex items-center gap-0.5 ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
          {delta > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
          {Math.abs(delta)}
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
  const pickLabel = (p.draft_round != null && p.draft_pick != null)
    ? `${p.draft_round}.${String(p.draft_pick).padStart(2, "0")}`
    : "—";

  const draftAbbr = p.draft_team_abbreviation;
  const draftColor = p.draft_team_color;
  const draftTeamName = p.draft_team_name;
  const draftTeamId = p.draft_team_id;

  const posChanged = p.draft_position != null && p.draft_position !== p.position;

  return (
    <tr className="border-b border-white/5 hover:bg-white/3 transition-colors group">
      {/* Pick */}
      <td className="py-3 pl-4 pr-2 whitespace-nowrap">
        <span className="text-xs font-black text-white/40 tabular-nums">{pickLabel}</span>
      </td>

      {/* Player */}
      <td className="py-3 px-2">
        <Link href={`/players/${p.player_id}`}>
          <div className="flex items-center gap-2.5 cursor-pointer group-hover:opacity-90">
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
        <span className="text-xs text-white/50 tabular-nums">{p.rookie_year ?? "—"}</span>
      </td>

      {/* ── AT DRAFT ─────────────────────── */}

      {/* Drafted Team */}
      <td className="py-3 px-2 border-l border-white/5">
        {draftAbbr && draftTeamId ? (
          <Link href={`/teams/${draftTeamId}`}>
            <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
              <TeamLogo abbreviation={draftAbbr} size="sm" primaryColor={draftColor ?? undefined} />
              <span className="text-xs font-bold text-white/70">{draftAbbr}</span>
            </div>
          </Link>
        ) : (
          <span className="text-white/20 text-xs">—</span>
        )}
      </td>

      {/* Drafted Pos */}
      <td className="py-3 px-2 text-center">
        {p.draft_position ? (
          <span className="text-[11px] font-black text-[#00C8FF]/70 bg-[#00C8FF]/8 px-1.5 py-0.5 rounded">
            {p.draft_position}
          </span>
        ) : (
          <span className="text-white/20 text-xs">—</span>
        )}
      </td>

      {/* Drafted Age */}
      <td className="py-3 px-2 text-center">
        <span className="text-xs font-bold text-white/60 tabular-nums">
          {p.draft_age ?? "—"}
        </span>
      </td>

      {/* Drafted OVR */}
      <td className="py-3 px-2 text-center">
        {p.draft_overall != null ? (
          <OvrDelta drafted={p.draft_overall} current={p.overall} />
        ) : (
          <span className="text-white/20 text-xs">—</span>
        )}
      </td>

      {/* ── CURRENT ──────────────────────── */}

      {/* Current Team */}
      <td className="py-3 px-2 border-l border-white/5">
        <Link href={`/teams/${p.team_id}`}>
          <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
            <TeamLogo abbreviation={p.team_abbreviation} size="sm" primaryColor={p.team_color ?? undefined} />
            <span className="text-xs font-bold text-white/70">{p.team_abbreviation}</span>
          </div>
        </Link>
      </td>

      {/* Current Pos */}
      <td className="py-3 px-2 text-center">
        <span className={`text-[11px] font-black px-1.5 py-0.5 rounded ${
          posChanged ? "text-amber-400 bg-amber-400/10" : "text-white/60 bg-white/5"
        }`}>
          {p.position}
        </span>
      </td>

      {/* Current Age */}
      <td className="py-3 px-2 text-center">
        <span className="text-xs font-bold text-white/70 tabular-nums">{p.age}</span>
      </td>

      {/* Current OVR */}
      <td className="py-3 px-4 text-left">
        <OvrDelta drafted={p.draft_overall} current={p.overall} />
      </td>
    </tr>
  );
}

export default function DraftSectionTest({ leagueId }: { leagueId: number }) {
  const { data: picks = [], isLoading } = useGetLeagueDraft(leagueId, {
    query: { queryKey: getGetLeagueDraftQueryKey(leagueId) },
  });

  const [roundFilter, setRoundFilter] = useState<string>("ALL");
  const [teamFilter,  setTeamFilter]  = useState<string>("ALL");
  const [posFilter,   setPosFilter]   = useState<string>("ALL");
  const [yearFilter,  setYearFilter]  = useState<string>("ALL");

  const rounds = useMemo(() => {
    const s = new Set<number>();
    for (const p of picks) if (p.draft_round != null) s.add(p.draft_round);
    return Array.from(s).sort((a, b) => a - b);
  }, [picks]);

  const teams = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of picks) seen.set(p.team_abbreviation, p.team_name);
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [picks]);

  const years = useMemo(() => {
    const s = new Set<number>();
    for (const p of picks) if (p.rookie_year != null) s.add(p.rookie_year);
    return Array.from(s).sort((a, b) => b - a);
  }, [picks]);

  const usedPositions = useMemo(() => {
    const s = new Set<string>();
    for (const p of picks) s.add(p.position);
    return POSITIONS.filter(pos => s.has(pos));
  }, [picks]);

  const filtered = useMemo(() => picks.filter(p => {
    if (roundFilter !== "ALL" && String(p.draft_round) !== roundFilter) return false;
    if (teamFilter  !== "ALL" && p.team_abbreviation   !== teamFilter)  return false;
    if (posFilter   !== "ALL" && p.position             !== posFilter)   return false;
    if (yearFilter  !== "ALL" && String(p.rookie_year)  !== yearFilter)  return false;
    return true;
  }), [picks, roundFilter, teamFilter, posFilter, yearFilter]);

  const hasFilters = roundFilter !== "ALL" || teamFilter !== "ALL" || posFilter !== "ALL" || yearFilter !== "ALL";

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

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#00C8FF]/40" />
          <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">At Draft</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400/40" />
          <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Current</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">POS</span>
          <span className="text-[10px] text-white/30">= position changed</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
        {years.length > 1 && (
          <FilterPill label="Year" value={yearFilter} onChange={setYearFilter}
            options={years.map(y => ({ value: String(y), label: String(y) }))} allLabel="All Years" />
        )}
        {rounds.length > 1 && (
          <FilterPill label="Round" value={roundFilter} onChange={setRoundFilter}
            options={rounds.map(r => ({ value: String(r), label: `Round ${r}` }))} allLabel="All Rounds" />
        )}
        {teams.length > 0 && (
          <FilterPill label="Team" value={teamFilter} onChange={setTeamFilter}
            options={teams.map(([abbr, name]) => ({ value: abbr, label: name }))} allLabel="All Teams" />
        )}
        {usedPositions.length > 0 && (
          <FilterPill label="Pos" value={posFilter} onChange={setPosFilter}
            options={usedPositions.map(pos => ({ value: pos, label: pos }))} allLabel="All Positions" />
        )}
        {hasFilters && (
          <button
            onClick={() => { setRoundFilter("ALL"); setTeamFilter("ALL"); setPosFilter("ALL"); setYearFilter("ALL"); }}
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
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-white/8">
                <th className="py-2.5 pl-4 pr-2 text-[10px] font-black uppercase tracking-wider text-white/25" colSpan={2}>
                  Player
                </th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-white/25 text-center">
                  Year
                </th>
                {/* At Draft group */}
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-[#00C8FF]/40 text-center border-l border-white/5">
                  Drafted Team
                </th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-[#00C8FF]/40 text-center">
                  Drafted Pos
                </th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-[#00C8FF]/40 text-center">
                  Drafted Age
                </th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-[#00C8FF]/40 text-center">
                  Drafted OVR
                </th>
                {/* Current group */}
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-emerald-400/50 text-center border-l border-white/5">
                  Current Team
                </th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-emerald-400/50 text-center">
                  Current Pos
                </th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-emerald-400/50 text-center">
                  Current Age
                </th>
                <th className="py-2.5 px-4 text-[10px] font-black uppercase tracking-wider text-emerald-400/50 text-left">
                  Current OVR
                </th>
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
    </div>
  );
}
