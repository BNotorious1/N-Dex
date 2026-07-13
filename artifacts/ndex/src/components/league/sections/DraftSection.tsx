import { useState, useMemo } from "react";
import { useGetLeagueDraft, getGetLeagueDraftQueryKey, LeagueDraftEntry } from "@workspace/api-client-react";
import TeamLogo from "../../TeamLogo";
import { Link } from "wouter";
import { ClipboardList } from "lucide-react";

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

function eaPortraitUrl(portraitId: number): string {
  return `/api/proxy/image?url=${encodeURIComponent(
    `https://ratings-images-prod.pulse.ea.com/madden-nfl-26/portraits/${portraitId}.png`
  )}`;
}

function PortraitCircle({ portraitId, name }: { portraitId: number | null | undefined; name: string }) {
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

const POSITIONS = [
  "QB","HB","FB","WR","TE","LT","LG","C","RG","RT",
  "LE","RE","DT","LOLB","MLB","ROLB","CB","FS","SS","K","P","KR","PR",
];

function OvrBar({ value }: { value: number }) {
  const color = value >= 90 ? "#ef4444" : value >= 80 ? "#d97706" : value >= 70 ? "#22c55e" : "#94a3b8";
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-black text-[13px] tabular-nums" style={{ color }}>{value}</span>
      <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function DraftSection({ leagueId }: { leagueId: number }) {
  const { data: picks = [], isLoading } = useGetLeagueDraft(leagueId, {
    query: { queryKey: getGetLeagueDraftQueryKey(leagueId) },
  });

  const [roundFilter, setRoundFilter] = useState<number | "ALL">("ALL");
  const [teamFilter, setTeamFilter] = useState<string>("ALL");
  const [posFilter, setPosFilter] = useState<string>("ALL");
  const [yearFilter, setYearFilter] = useState<number | "ALL">("ALL");

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

  const filtered = useMemo(() => {
    return picks.filter(p => {
      if (roundFilter !== "ALL" && p.draft_round !== roundFilter) return false;
      if (teamFilter !== "ALL" && p.team_abbreviation !== teamFilter) return false;
      if (posFilter !== "ALL" && p.position !== posFilter) return false;
      if (yearFilter !== "ALL" && p.rookie_year !== yearFilter) return false;
      return true;
    });
  }, [picks, roundFilter, teamFilter, posFilter, yearFilter]);

  const grouped = useMemo(() => {
    if (roundFilter !== "ALL") return null;
    const map = new Map<number, LeagueDraftEntry[]>();
    for (const p of filtered) {
      const rnd = p.draft_round ?? 0;
      if (!map.has(rnd)) map.set(rnd, []);
      map.get(rnd)!.push(p);
    }
    return map;
  }, [filtered, roundFilter]);

  const hasFilters = roundFilter !== "ALL" || teamFilter !== "ALL" || posFilter !== "ALL" || yearFilter !== "ALL";

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ClipboardList className="w-5 h-5 text-[#00C8FF]" />
        <h2 className="text-xl font-black text-white tracking-tight">Draft Recap</h2>
        {hasFilters && (
          <span className="text-[11px] text-white/30 font-bold">{filtered.length} of {picks.length}</span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
        {years.length > 1 && (
          <FilterSelect
            label="Year"
            value={yearFilter === "ALL" ? "ALL" : String(yearFilter)}
            onChange={v => setYearFilter(v === "ALL" ? "ALL" : Number(v))}
            options={years.map(y => ({ value: String(y), label: String(y) }))}
            allLabel="All Years"
          />
        )}
        {rounds.length > 1 && (
          <FilterSelect
            label="Round"
            value={roundFilter === "ALL" ? "ALL" : String(roundFilter)}
            onChange={v => setRoundFilter(v === "ALL" ? "ALL" : Number(v))}
            options={rounds.map(r => ({ value: String(r), label: `Round ${r}` }))}
            allLabel="All Rounds"
          />
        )}
        {teams.length > 0 && (
          <FilterSelect
            label="Team"
            value={teamFilter}
            onChange={setTeamFilter}
            options={teams.map(([abbr, name]) => ({ value: abbr, label: name }))}
            allLabel="All Teams"
          />
        )}
        {usedPositions.length > 0 && (
          <FilterSelect
            label="Pos"
            value={posFilter}
            onChange={setPosFilter}
            options={usedPositions.map(pos => ({ value: pos, label: pos }))}
            allLabel="All Positions"
          />
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
            Draft picks will appear here once player rosters with draft round and pick data are imported from EA.
          </p>
        </div>
      ) : grouped && grouped.size > 0 ? (
        /* Grouped by round */
        <div className="space-y-6">
          {Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]).map(([rnd, rows]) => (
            <div key={rnd}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#00C8FF]/10 border border-[#00C8FF]/20 flex items-center justify-center">
                  <span className="text-[11px] font-black text-[#00C8FF]">{rnd === 0 ? "?" : rnd}</span>
                </div>
                <span className="text-[12px] font-black text-white/50 uppercase tracking-wider">
                  {rnd === 0 ? "Undrafted / Unknown Round" : `Round ${rnd}`}
                </span>
                <span className="text-[10px] text-white/20">{rows.length} picks</span>
              </div>
              <DraftTable rows={rows} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-[#141414] py-12 flex flex-col items-center gap-2">
          <p className="text-white/30 text-sm font-bold">No picks match your filters</p>
        </div>
      ) : (
        <DraftTable rows={filtered} />
      )}
    </div>
  );
}

function FilterSelect({
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
        className="bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-[11px] text-white/70 focus:outline-none focus:border-white/25"
      >
        <option value="ALL">{allLabel}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function DraftTable({ rows }: { rows: LeagueDraftEntry[] }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: "#0f0f0f" }} className="border-b border-white/8">
              <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-white/30 w-10">Rd</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-white/30 w-10">Pk</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-white/30">Player</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-white/30">Team</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-white/30">Pos</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-white/30">Age</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-white/30">OVR</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-white/30">Dev</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-white/30">Yr</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <DraftRow key={p.player_id} entry={p} odd={i % 2 === 1} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DraftRow({ entry: p, odd }: { entry: LeagueDraftEntry; odd: boolean }) {
  const dev = p.dev_trait != null ? DEV_TRAIT[p.dev_trait] : null;

  return (
    <tr
      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
      style={odd ? { backgroundColor: "rgba(255,255,255,0.012)" } : undefined}
    >
      {/* Round */}
      <td className="px-3 py-2.5 text-center">
        <span className="font-black text-[12px] text-white/40 tabular-nums">
          {p.draft_round ?? "—"}
        </span>
      </td>

      {/* Pick */}
      <td className="px-3 py-2.5 text-center">
        <span className="font-black text-[12px] text-[#00C8FF]/70 tabular-nums">
          {p.draft_pick ?? "—"}
        </span>
      </td>

      {/* Player */}
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <PortraitCircle portraitId={p.portrait_id} name={p.name} />
          <Link href={`/players/${p.player_id}`} className="font-bold text-[13px] text-white hover:text-[#00C8FF] transition-colors whitespace-nowrap">
            {p.name}
          </Link>
        </div>
      </td>

      {/* Team */}
      <td className="px-4 py-2.5">
        <Link href={`/teams/${p.team_id}`} className="flex items-center gap-2 group w-fit">
          <TeamLogo size="sm" abbreviation={p.team_abbreviation} primaryColor={p.team_color} />
          <span className="text-[12px] font-bold text-white/70 group-hover:text-[#00C8FF] transition-colors whitespace-nowrap">
            {p.team_name}
          </span>
        </Link>
      </td>

      {/* Position */}
      <td className="px-3 py-2.5 text-center">
        <span className="rounded border border-white/12 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-white/55">
          {p.position}
        </span>
      </td>

      {/* Age */}
      <td className="px-3 py-2.5 text-center">
        <span className="text-[12px] text-white/60 tabular-nums">{p.age}</span>
      </td>

      {/* OVR */}
      <td className="px-4 py-2.5">
        <OvrBar value={p.overall} />
      </td>

      {/* Dev */}
      <td className="px-3 py-2.5 text-center">
        {dev ? (
          <img src={dev.img} alt={dev.label} title={dev.label} className="w-5 h-5 mx-auto object-contain" />
        ) : (
          <span className="text-white/20">—</span>
        )}
      </td>

      {/* Rookie Year */}
      <td className="px-3 py-2.5 text-center">
        <span className="text-[11px] text-white/30 tabular-nums">
          {p.rookie_year ?? "—"}
        </span>
      </td>
    </tr>
  );
}
