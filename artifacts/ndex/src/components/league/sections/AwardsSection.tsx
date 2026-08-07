import { useState, useEffect, useRef } from "react";
import { Trophy, Star, Search, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AwardPlayer {
  id: number;
  name: string;
  position: string;
  overall: number;
  portrait_id: number | null;
  age?: number;
}

interface AwardTeam {
  id?: number;
  full_name: string;
  abbreviation: string;
  primary_color?: string | null;
  conference?: string;
}

interface AwardEntry {
  id: number;
  award_type: string;
  season: number;
  week: number | null;
  is_override: boolean;
  player: AwardPlayer;
  team: AwardTeam;
}

interface Candidate {
  player: AwardPlayer;
  team: AwardTeam;
  score: number;
  stats: Record<string, number | null>;
}

interface LeaguePlayer {
  id: number;
  name: string;
  position: string;
  overall: number;
  portrait_id: number | null;
  team_name: string;
  team_abbreviation: string;
}

// ─── Config ─────────────────────────────────────────────────────────────────

const YEARLY_AWARDS: { type: string; label: string }[] = [
  { type: "MVP",      label: "League MVP" },
  { type: "AFC_OPOY", label: "AFC Offensive Player of the Year" },
  { type: "NFC_OPOY", label: "NFC Offensive Player of the Year" },
  { type: "DPOY",     label: "Defensive Player of the Year" },
  { type: "OROY",     label: "Offensive Rookie of the Year" },
  { type: "DROY",     label: "Defensive Rookie of the Year" },
];

const ALL_PRO_SLOTS: { type: string; label: string; group: string }[] = [
  { type: "AP_QB",   label: "QB",      group: "Offense" },
  { type: "AP_RB",   label: "RB",      group: "Offense" },
  { type: "AP_WR1",  label: "WR (1)",  group: "Offense" },
  { type: "AP_WR2",  label: "WR (2)",  group: "Offense" },
  { type: "AP_TE",   label: "TE",      group: "Offense" },
  { type: "AP_FLEX", label: "FLEX",    group: "Offense" },
  { type: "AP_LT",   label: "LT",      group: "O-Line" },
  { type: "AP_LG",   label: "LG",      group: "O-Line" },
  { type: "AP_C",    label: "C",       group: "O-Line" },
  { type: "AP_RG",   label: "RG",      group: "O-Line" },
  { type: "AP_RT",   label: "RT",      group: "O-Line" },
  { type: "AP_EDGE1","label": "EDGE (1)", group: "D-Line" },
  { type: "AP_EDGE2","label": "EDGE (2)", group: "D-Line" },
  { type: "AP_DT1",  label: "DT (1)",  group: "D-Line" },
  { type: "AP_DT2",  label: "DT (2)",  group: "D-Line" },
  { type: "AP_SAM",  label: "SAM LB",  group: "Linebackers" },
  { type: "AP_MIKE", label: "MIKE LB", group: "Linebackers" },
  { type: "AP_WILL", label: "WILL LB", group: "Linebackers" },
  { type: "AP_CB1",  label: "CB (1)",  group: "Secondary" },
  { type: "AP_CB2",  label: "CB (2)",  group: "Secondary" },
  { type: "AP_S1",   label: "S (1)",   group: "Secondary" },
  { type: "AP_S2",   label: "S (2)",   group: "Secondary" },
];

const WEEKLY_SLOTS: { type: string; label: string; conf: string; side: string }[] = [
  { type: "AFC_OPOW", label: "AFC Offensive POTW", conf: "AFC", side: "Offense" },
  { type: "NFC_OPOW", label: "NFC Offensive POTW", conf: "NFC", side: "Offense" },
  { type: "AFC_DPOW", label: "AFC Defensive POTW", conf: "AFC", side: "Defense" },
  { type: "NFC_DPOW", label: "NFC Defensive POTW", conf: "NFC", side: "Defense" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getApiBase() {
  const base = import.meta.env.BASE_URL ?? "/";
  return base.replace(/\/$/, "") + "/api";
}

function OvrBadge({ ovr }: { ovr: number }) {
  const color = ovr >= 90 ? "#FFD700" : ovr >= 80 ? "#00C8FF" : ovr >= 70 ? "#A0A0A0" : "#888";
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ borderColor: `${color}40`, color, background: `${color}12` }}>
      {ovr}
    </span>
  );
}

function PlayerCard({ player, team, onRemove, isAdmin }: { player: AwardPlayer; team: AwardTeam; onRemove?: () => void; isAdmin: boolean }) {
  const color = team.primary_color ?? "#888";
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/3 px-3 py-2" style={{ borderLeftColor: color, borderLeftWidth: 2 }}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{player.name}</p>
        <p className="text-[10px] text-white/40 truncate">{player.position} · {team.abbreviation}</p>
      </div>
      <OvrBadge ovr={player.overall} />
      {isAdmin && onRemove && (
        <button onClick={onRemove} className="text-white/20 hover:text-white/60 transition-colors ml-1">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function EmptySlot({ label, onPick, isAdmin }: { label: string; onPick: () => void; isAdmin: boolean }) {
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/2 px-3 py-3">
        <span className="text-[10px] text-white/25">Not yet awarded</span>
      </div>
    );
  }
  return (
    <button onClick={onPick} className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 bg-white/2 px-3 py-2.5 text-[10px] text-white/35 hover:border-[#00C8FF]/30 hover:text-[#00C8FF]/60 transition-colors">
      <Search className="h-3 w-3" />
      Select {label}
    </button>
  );
}

// ─── Player Picker Modal ─────────────────────────────────────────────────────

function PlayerPickerModal({
  leagueId,
  onSelect,
  onClose,
  title,
}: {
  leagueId: number;
  onSelect: (player: LeaguePlayer) => void;
  onClose: () => void;
  title: string;
}) {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<LeaguePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const base = getApiBase();
    fetch(`${base}/leagues/${leagueId}/players`)
      .then(r => r.json())
      .then(data => { setPlayers(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [leagueId]);

  const filtered = players.filter(p => {
    const q = query.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.position.toLowerCase().includes(q) || p.team_name.toLowerCase().includes(q);
  }).slice(0, 50);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#141414] border border-white/10 rounded-xl shadow-2xl w-full max-w-sm flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <span className="text-sm font-semibold text-white">Select {title}</span>
          <button onClick={onClose} className="text-white/30 hover:text-white/70"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, position, or team…"
              className="w-full rounded-lg bg-white/5 border border-white/10 pl-8 pr-3 py-2 text-xs text-white placeholder-white/25 focus:border-[#00C8FF]/40 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {loading && <div className="flex items-center justify-center py-8"><Loader2 className="h-4 w-4 text-white/30 animate-spin" /></div>}
          {!loading && filtered.length === 0 && <p className="text-center text-[11px] text-white/30 py-6">No players found</p>}
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{p.name}</p>
                <p className="text-[10px] text-white/40">{p.position} · {p.team_abbreviation}</p>
              </div>
              <OvrBadge ovr={p.overall} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Candidate Card (Weekly auto-curated) ────────────────────────────────────

function CandidateCard({ candidate, awardType, label, winner, isAdmin, season, week, leagueId, onMutate }: {
  candidate: Candidate | null;
  awardType: string;
  label: string;
  winner: AwardEntry | null;
  isAdmin: boolean;
  season: number;
  week: number;
  leagueId: number;
  onMutate: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const [loading, setLoading] = useState(false);

  const setWinner = async (playerId: number, isOverride: boolean) => {
    setLoading(true);
    try {
      const base = getApiBase();
      await fetch(`${base}/leagues/${leagueId}/awards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId, season, week, award_type: awardType, is_override: isOverride }),
      });
      onMutate();
    } finally { setLoading(false); }
  };

  const removeWinner = async () => {
    if (!winner) return;
    setLoading(true);
    try {
      const base = getApiBase();
      await fetch(`${base}/leagues/${leagueId}/awards/${winner.id}`, { method: "DELETE" });
      onMutate();
    } finally { setLoading(false); }
  };

  return (
    <div className="rounded-xl border border-white/8 bg-white/2 p-4 space-y-3">
      <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">{label}</p>

      {/* Winner row */}
      <div>
        <p className="text-[10px] text-white/30 mb-1.5">Winner</p>
        {winner ? (
          <PlayerCard player={winner.player} team={winner.team} onRemove={isAdmin ? removeWinner : undefined} isAdmin={isAdmin} />
        ) : (
          <EmptySlot label="player" onPick={() => setPicking(true)} isAdmin={isAdmin} />
        )}
      </div>

      {/* Candidate row (only if no override winner or it's auto) */}
      {candidate && (
        <div>
          <p className="text-[10px] text-white/30 mb-1.5 flex items-center gap-1">
            <Star className="h-2.5 w-2.5 text-yellow-400/60" /> Auto-suggested
          </p>
          <div className="rounded-lg border border-white/8 bg-white/2 px-3 py-2 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{candidate.player.name}</p>
              <p className="text-[10px] text-white/40 truncate">{candidate.player.position} · {candidate.team.abbreviation}</p>
            </div>
            <OvrBadge ovr={candidate.player.overall} />
            <span className="text-[10px] text-white/30 font-mono ml-1">#{Math.round(candidate.score)}</span>
            {isAdmin && !winner && (
              <button
                disabled={loading}
                onClick={() => setWinner(candidate.player.id, false)}
                className="ml-1 text-[10px] text-[#00C8FF] hover:text-[#00C8FF]/80 font-semibold transition-colors"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Award →"}
              </button>
            )}
          </div>
          {isAdmin && winner && !winner.is_override && (
            <button
              disabled={loading}
              onClick={() => setPicking(true)}
              className="mt-2 w-full text-[10px] text-white/30 hover:text-[#00C8FF]/60 transition-colors"
            >
              Override with different player
            </button>
          )}
        </div>
      )}

      {!candidate && !winner && (
        <p className="text-[10px] text-white/20">No stats found for this week.</p>
      )}

      {picking && (
        <PlayerPickerModal
          leagueId={leagueId}
          title={label}
          onClose={() => setPicking(false)}
          onSelect={async p => {
            setPicking(false);
            await setWinner(p.id, true);
          }}
        />
      )}
    </div>
  );
}

// ─── Weekly Tab ───────────────────────────────────────────────────────────────

function WeeklyTab({ leagueId, season, currentWeek, isAdmin }: { leagueId: number; season: number; currentWeek: number; isAdmin: boolean }) {
  const [week, setWeek] = useState(Math.max(1, currentWeek));
  const [awards, setAwards] = useState<AwardEntry[]>([]);
  const [candidates, setCandidates] = useState<Record<string, Candidate | null>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const base = getApiBase();
    const [awds, cands] = await Promise.all([
      fetch(`${base}/leagues/${leagueId}/awards?season=${season}&week=${week}`).then(r => r.json()).catch(() => []),
      fetch(`${base}/leagues/${leagueId}/awards/weekly-candidates?season=${season}&week=${week}`).then(r => r.json()).catch(() => ({})),
    ]);
    setAwards(awds);
    setCandidates(cands);
    setLoading(false);
  };

  useEffect(() => { load(); }, [week, season]);

  const weeklyAwards = awards.filter(a => WEEKLY_SLOTS.map(s => s.type).includes(a.award_type));

  return (
    <div className="space-y-6">
      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeek(w => Math.max(1, w - 1))} disabled={week <= 1} className="p-1.5 rounded-lg border border-white/8 text-white/40 hover:text-white/70 disabled:opacity-25 transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-white">Week {week}</p>
        <button onClick={() => setWeek(w => Math.min(18, w + 1))} disabled={week >= 18} className="p-1.5 rounded-lg border border-white/8 text-white/40 hover:text-white/70 disabled:opacity-25 transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 text-white/20 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WEEKLY_SLOTS.map(slot => (
            <CandidateCard
              key={slot.type}
              awardType={slot.type}
              label={slot.label}
              candidate={candidates[slot.type] ?? null}
              winner={weeklyAwards.find(a => a.award_type === slot.type) ?? null}
              isAdmin={isAdmin}
              season={season}
              week={week}
              leagueId={leagueId}
              onMutate={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Award Row (Yearly & All-Pro) ────────────────────────────────────────────

function AwardRow({ awardType, label, winner, isAdmin, season, leagueId, onMutate }: {
  awardType: string; label: string; winner: AwardEntry | null;
  isAdmin: boolean; season: number; leagueId: number; onMutate: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const [loading, setLoading] = useState(false);

  const setWinner = async (playerId: number) => {
    setLoading(true);
    try {
      const base = getApiBase();
      await fetch(`${base}/leagues/${leagueId}/awards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId, season, award_type: awardType }),
      });
      onMutate();
    } finally { setLoading(false); }
  };

  const removeWinner = async () => {
    if (!winner) return;
    setLoading(true);
    try {
      const base = getApiBase();
      await fetch(`${base}/leagues/${leagueId}/awards/${winner.id}`, { method: "DELETE" });
      onMutate();
    } finally { setLoading(false); }
  };

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/50 w-52 shrink-0">{label}</span>
      <div className="flex-1">
        {winner ? (
          <PlayerCard player={winner.player} team={winner.team} onRemove={isAdmin ? removeWinner : undefined} isAdmin={isAdmin} />
        ) : (
          <EmptySlot label={label} onPick={() => setPicking(true)} isAdmin={isAdmin} />
        )}
      </div>
      {isAdmin && winner && (
        <button onClick={() => setPicking(true)} className="text-[10px] text-white/30 hover:text-[#00C8FF]/60 transition-colors shrink-0">
          Change
        </button>
      )}
      {loading && <Loader2 className="h-3.5 w-3.5 text-white/30 animate-spin shrink-0" />}
      {picking && (
        <PlayerPickerModal
          leagueId={leagueId}
          title={label}
          onClose={() => setPicking(false)}
          onSelect={async p => { setPicking(false); await setWinner(p.id); }}
        />
      )}
    </div>
  );
}

// ─── Yearly Tab ───────────────────────────────────────────────────────────────

function YearlyTab({ leagueId, season, isAdmin }: { leagueId: number; season: number; isAdmin: boolean }) {
  const [awards, setAwards] = useState<AwardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const base = getApiBase();
    const data = await fetch(`${base}/leagues/${leagueId}/awards?season=${season}`).then(r => r.json()).catch(() => []);
    setAwards(data.filter((a: AwardEntry) => a.week == null && !a.award_type.startsWith("AP_")));
    setLoading(false);
  };

  useEffect(() => { load(); }, [season]);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 text-white/20 animate-spin" /></div>;

  return (
    <div className="rounded-xl border border-white/8 bg-white/2 px-4 py-2 divide-y divide-white/5">
      {YEARLY_AWARDS.map(aw => (
        <AwardRow
          key={aw.type}
          awardType={aw.type}
          label={aw.label}
          winner={awards.find(a => a.award_type === aw.type) ?? null}
          isAdmin={isAdmin}
          season={season}
          leagueId={leagueId}
          onMutate={load}
        />
      ))}
    </div>
  );
}

// ─── All-Pro Tab ─────────────────────────────────────────────────────────────

function AllProTab({ leagueId, season, isAdmin }: { leagueId: number; season: number; isAdmin: boolean }) {
  const [awards, setAwards] = useState<AwardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const base = getApiBase();
    const data = await fetch(`${base}/leagues/${leagueId}/awards?season=${season}`).then(r => r.json()).catch(() => []);
    setAwards(data.filter((a: AwardEntry) => a.award_type.startsWith("AP_")));
    setLoading(false);
  };

  useEffect(() => { load(); }, [season]);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 text-white/20 animate-spin" /></div>;

  const groups = Array.from(new Set(ALL_PRO_SLOTS.map(s => s.group)));

  return (
    <div className="space-y-6">
      {groups.map(group => (
        <div key={group} className="rounded-xl border border-white/8 bg-white/2 px-4 py-2">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider pt-2 pb-1 border-b border-white/5 mb-1">{group}</p>
          {ALL_PRO_SLOTS.filter(s => s.group === group).map(slot => (
            <AwardRow
              key={slot.type}
              awardType={slot.type}
              label={slot.label}
              winner={awards.find(a => a.award_type === slot.type) ?? null}
              isAdmin={isAdmin}
              season={season}
              leagueId={leagueId}
              onMutate={load}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

type Tab = "weekly" | "yearly" | "all-pro";

interface Props {
  leagueId: number;
  season: number;
  currentWeek: number;
  isAdmin: boolean;
}

export default function AwardsSection({ leagueId, season, currentWeek, isAdmin }: Props) {
  const [tab, setTab] = useState<Tab>("weekly");

  const tabs: { id: Tab; label: string }[] = [
    { id: "weekly",  label: "Player of the Week" },
    { id: "yearly",  label: "Season Awards" },
    { id: "all-pro", label: "All-Pro Team" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
          <Trophy className="h-4 w-4 text-yellow-400/70" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Awards</h2>
          <p className="text-[11px] text-white/30">Season {season} recognition</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-white/3 p-1 border border-white/8 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.id ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "weekly"  && <WeeklyTab  leagueId={leagueId} season={season} currentWeek={currentWeek} isAdmin={isAdmin} />}
      {tab === "yearly"  && <YearlyTab  leagueId={leagueId} season={season} isAdmin={isAdmin} />}
      {tab === "all-pro" && <AllProTab  leagueId={leagueId} season={season} isAdmin={isAdmin} />}
    </div>
  );
}
