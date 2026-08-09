import { useState, useMemo } from "react";
import { Repeat2, Plus, X, ArrowLeftRight, CheckCircle2, Trash2 } from "lucide-react";
import {
  useGetLeagueTeams,
  getGetLeagueTeamsQueryKey,
  useGetTeamPlayers,
  getGetTeamPlayersQueryKey,
  useCreateLeagueTrade,
} from "@workspace/api-client-react";
import type { Team, Player } from "@workspace/api-client-react";

interface Props {
  leagueId: number;
  season: number;
  isMember: boolean;
  myTeamId: number | null;
}

interface DraftPick {
  round: number;
  year: 0 | 1 | 2; // 0 = current, 1 = +1, 2 = +2
}

const PORTRAIT_BASE = "https://madden-assets-cdn.pulse.ea.com/madden26/portraits/75/";
const ROUND_VALUES = [0, 100, 60, 40, 25, 15, 10, 5]; // index = round
const YEAR_MULTIPLIER = [1, 0.85, 0.70];

const DEV_LABELS: Record<number, string> = { 0: "Normal", 1: "Star", 2: "SS", 3: "X-Factor" };
const DEV_COLORS: Record<number, string> = {
  0: "text-white/30 border-white/15",
  1: "text-yellow-400 border-yellow-400/40",
  2: "text-orange-400 border-orange-400/40",
  3: "text-purple-400 border-purple-400/40",
};

function pickValue(pick: DraftPick) {
  return Math.round(ROUND_VALUES[pick.round] * YEAR_MULTIPLIER[pick.year]);
}

function playerValue(ovr: number) {
  // exponential curve: rewards elite players more
  return Math.round(Math.pow(ovr / 99, 2.5) * 200);
}

function EvalBadge({ ratio }: { ratio: number }) {
  const pct = Math.round(ratio * 100);
  let label: string;
  let cls: string;
  if (ratio >= 0.88) {
    label = "Fair Trade";
    cls = "bg-green-500/15 text-green-400 border-green-500/30";
  } else if (ratio >= 0.72) {
    label = "Slightly Lopsided";
    cls = "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  } else {
    label = "Very Lopsided";
    cls = "bg-[#F44336]/15 text-[#F44336] border-[#F44336]/30";
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${cls}`}>
      {label}
      <span className="opacity-60">·</span>
      <span>{pct}% fair</span>
    </span>
  );
}

function DevBadge({ trait }: { trait?: number | null }) {
  if (trait == null || trait === 0) return null;
  return (
    <span className={`text-[8px] font-black uppercase tracking-wide border rounded px-1 py-px leading-none ${DEV_COLORS[trait] ?? DEV_COLORS[0]}`}>
      {DEV_LABELS[trait] ?? ""}
    </span>
  );
}

function TeamLogoImg({ abbreviation, size = 28 }: { abbreviation: string; size?: number }) {
  return (
    <img
      src={`https://a.espncdn.com/combiner/i?img=/i/teamlogos/nfl/500/${abbreviation.toLowerCase()}.png&h=${size * 2}&w=${size * 2}`}
      alt={abbreviation}
      style={{ width: size, height: size }}
      className="object-contain"
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

function PlayerCard({
  player,
  selected,
  onToggle,
}: {
  player: Player;
  selected: boolean;
  onToggle: () => void;
}) {
  const ovrColor = player.overall >= 90
    ? "text-[#F44336]"
    : player.overall >= 80
    ? "text-[#00C8FF]"
    : player.overall >= 70
    ? "text-white/80"
    : "text-white/45";

  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
        selected
          ? "bg-[#00C8FF]/12 border border-[#00C8FF]/35"
          : "bg-white/2 border border-white/6 hover:bg-white/5"
      }`}
    >
      {/* Portrait */}
      <div className="relative shrink-0">
        {player.portrait_id ? (
          <img
            src={`${PORTRAIT_BASE}${player.portrait_id}.png`}
            alt={player.name}
            className="w-9 h-9 rounded-full object-cover bg-white/5"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center">
            <span className="text-[9px] text-white/30 font-black">{player.position}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate leading-tight">{player.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[10px] font-bold text-white/40">{player.position}</span>
          {"dev_trait" in player && <DevBadge trait={(player as Player & { dev_trait?: number | null }).dev_trait} />}
          <span className="text-[10px] text-white/25">· Age {player.age}</span>
        </div>
      </div>

      {/* OVR */}
      <div className="shrink-0 flex items-center gap-2">
        <span className={`text-sm font-black tabular-nums ${ovrColor}`}>{player.overall}</span>
        {selected && <CheckCircle2 className="h-3.5 w-3.5 text-[#00C8FF] shrink-0" />}
      </div>
    </button>
  );
}

function DraftPicksSelector({
  picks,
  season,
  accentColor,
  onChange,
}: {
  picks: DraftPick[];
  season: number;
  accentColor: string;
  onChange: (picks: DraftPick[]) => void;
}) {
  const yearLabels = [`${season + 1}`, `${season + 2}`, `${season + 3}`];

  const addPick = () => onChange([...picks, { round: 1, year: 0 }]);
  const removePick = (i: number) => onChange(picks.filter((_, idx) => idx !== i));
  const updatePick = (i: number, field: keyof DraftPick, value: number) =>
    onChange(picks.map((p, idx) => idx === i ? { ...p, [field]: value } : p));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-white/35">Draft Picks</span>
        <button
          onClick={addPick}
          className="flex items-center gap-1 text-[10px] font-bold transition-colors hover:opacity-80"
          style={{ color: accentColor }}
        >
          <Plus className="h-3 w-3" />
          Add Pick
        </button>
      </div>

      {picks.length === 0 && (
        <p className="text-[11px] text-white/20 italic text-center py-2">No draft picks included</p>
      )}

      {picks.map((pick, i) => (
        <div key={i} className="flex items-center gap-2 bg-white/3 border border-white/8 rounded-lg px-2.5 py-2">
          {/* Year */}
          <select
            value={pick.year}
            onChange={(e) => updatePick(i, "year", Number(e.target.value) as 0 | 1 | 2)}
            className="bg-[#0d0d0d] border border-white/10 rounded px-1.5 py-1 text-[11px] text-white focus:outline-none flex-1"
          >
            {yearLabels.map((label, idx) => (
              <option key={idx} value={idx}>{label}</option>
            ))}
          </select>
          {/* Round */}
          <select
            value={pick.round}
            onChange={(e) => updatePick(i, "round", Number(e.target.value))}
            className="bg-[#0d0d0d] border border-white/10 rounded px-1.5 py-1 text-[11px] text-white focus:outline-none w-20"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((r) => (
              <option key={r} value={r}>Round {r}</option>
            ))}
          </select>
          {/* Value */}
          <span className="text-[10px] font-black tabular-nums text-white/40 w-10 text-right shrink-0">
            {pickValue(pick)}
          </span>
          {/* Remove */}
          <button
            onClick={() => removePick(i)}
            className="text-white/25 hover:text-[#F44336] transition-colors shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function CreateTradeSection({ leagueId, season, isMember, myTeamId }: Props) {
  const [teamAId, setTeamAId] = useState<number | null>(myTeamId);
  const [teamBId, setTeamBId] = useState<number | null>(null);
  const [playersFromA, setPlayersFromA] = useState<Set<number>>(new Set());
  const [playersFromB, setPlayersFromB] = useState<Set<number>>(new Set());
  const [picksFromA, setPicksFromA] = useState<DraftPick[]>([]);
  const [picksFromB, setPicksFromB] = useState<DraftPick[]>([]);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");

  const { data: allTeams } = useGetLeagueTeams(leagueId, {
    query: { queryKey: getGetLeagueTeamsQueryKey(leagueId) },
  });

  const { data: playersA } = useGetTeamPlayers(teamAId ?? 0, {
    query: { enabled: !!teamAId, queryKey: getGetTeamPlayersQueryKey(teamAId ?? 0) },
  });

  const { data: playersB } = useGetTeamPlayers(teamBId ?? 0, {
    query: { enabled: !!teamBId, queryKey: getGetTeamPlayersQueryKey(teamBId ?? 0) },
  });

  const createTrade = useCreateLeagueTrade();

  const teamAPlayers: Player[] = playersA ?? [];
  const teamBPlayers: Player[] = playersB ?? [];

  const filteredA = teamAPlayers.filter((p) =>
    p.name.toLowerCase().includes(searchA.toLowerCase()) ||
    p.position.toLowerCase().includes(searchA.toLowerCase())
  );
  const filteredB = teamBPlayers.filter((p) =>
    p.name.toLowerCase().includes(searchB.toLowerCase()) ||
    p.position.toLowerCase().includes(searchB.toLowerCase())
  );

  const teamAObj = allTeams?.find((t: Team) => t.id === teamAId);
  const teamBObj = allTeams?.find((t: Team) => t.id === teamBId);

  const selectedAPlayers = teamAPlayers.filter((p) => playersFromA.has(p.id));
  const selectedBPlayers = teamBPlayers.filter((p) => playersFromB.has(p.id));

  // Trade value calculation
  const valueA = useMemo(() => {
    const players = selectedAPlayers.reduce((sum, p) => sum + playerValue(p.overall), 0);
    const picks = picksFromA.reduce((sum, pk) => sum + pickValue(pk), 0);
    return players + picks;
  }, [selectedAPlayers, picksFromA]);

  const valueB = useMemo(() => {
    const players = selectedBPlayers.reduce((sum, p) => sum + playerValue(p.overall), 0);
    const picks = picksFromB.reduce((sum, pk) => sum + pickValue(pk), 0);
    return players + picks;
  }, [selectedBPlayers, picksFromB]);

  const fairnessRatio = useMemo(() => {
    if (valueA === 0 && valueB === 0) return null;
    const total = valueA + valueB;
    if (total === 0) return null;
    const minVal = Math.min(valueA, valueB);
    const maxVal = Math.max(valueA, valueB);
    return maxVal === 0 ? 0 : minVal / maxVal;
  }, [valueA, valueB]);

  const hasContent = playersFromA.size > 0 || playersFromB.size > 0 || picksFromA.length > 0 || picksFromB.length > 0;
  const canSubmit = teamAId && teamBId && teamAId !== teamBId && hasContent;

  const buildPicksNote = (picks: DraftPick[], teamName: string) => {
    if (picks.length === 0) return "";
    const yearLabels = [`${season + 1}`, `${season + 2}`, `${season + 3}`];
    const list = picks.map((p) => `${yearLabels[p.year]} R${p.round}`).join(", ");
    return `[${teamName} draft picks: ${list}]`;
  };

  const handleSubmit = async () => {
    if (!canSubmit || !teamAId || !teamBId) return;
    const pickNotes = [
      buildPicksNote(picksFromA, teamAObj?.name ?? "Team A"),
      buildPicksNote(picksFromB, teamBObj?.name ?? "Team B"),
    ].filter(Boolean).join(" ");
    const fullNotes = [notes.trim(), pickNotes].filter(Boolean).join(" | ");

    await createTrade.mutateAsync({
      id: leagueId,
      data: {
        season,
        team_a_id: teamAId,
        team_b_id: teamBId,
        players_from_a: Array.from(playersFromA),
        players_from_b: Array.from(playersFromB),
        notes: fullNotes || undefined,
      },
    });
    setSubmitted(true);
  };

  const resetForm = () => {
    setTeamAId(myTeamId); setTeamBId(null);
    setPlayersFromA(new Set()); setPlayersFromB(new Set());
    setPicksFromA([]); setPicksFromB([]);
    setNotes(""); setSubmitted(false);
    setSearchA(""); setSearchB("");
  };

  if (!isMember) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="h-14 w-14 rounded-full bg-white/5 border border-white/8 flex items-center justify-center">
          <Repeat2 className="h-6 w-6 text-white/20" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white/40">Members Only</p>
          <p className="text-xs text-white/25 mt-1 max-w-xs">You must be a league member to propose trades. Request to join this league from the banner above.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="rounded-full bg-[#00C8FF]/10 border border-[#00C8FF]/30 p-5">
          <CheckCircle2 className="h-10 w-10 text-[#00C8FF]" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-white mb-1">Trade Submitted!</h2>
          <p className="text-sm text-white/50">
            The trade proposal between{" "}
            <span className="text-white/80">{teamAObj?.name}</span> and{" "}
            <span className="text-white/80">{teamBObj?.name}</span> is now pending review.
          </p>
        </div>
        <button
          onClick={resetForm}
          className="mt-2 px-5 py-2 rounded-lg bg-[#00C8FF]/10 border border-[#00C8FF]/25 text-[#00C8FF] text-sm font-semibold hover:bg-[#00C8FF]/20 transition-colors"
        >
          Propose Another Trade
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[#00C8FF]/10 border border-[#00C8FF]/20">
          <Repeat2 className="h-5 w-5 text-[#00C8FF]" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Create Trade</h2>
          <p className="text-xs text-white/40">Propose a trade between two teams</p>
        </div>
      </div>

      {/* Two-column panels */}
      <div className="grid grid-cols-2 gap-4">
        <TeamPanel
          label="Team A"
          accentColor="#00C8FF"
          teams={allTeams ?? []}
          selectedTeamId={teamAId}
          otherTeamId={teamBId}
          onSelectTeam={(id) => { setTeamAId(id); setPlayersFromA(new Set()); setPicksFromA([]); }}
          players={filteredA}
          selectedPlayers={playersFromA}
          onTogglePlayer={(id) => setPlayersFromA((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
          })}
          onClearPlayers={() => setPlayersFromA(new Set())}
          search={searchA}
          onSearch={setSearchA}
          picks={picksFromA}
          onPicksChange={setPicksFromA}
          season={season}
        />
        <TeamPanel
          label="Team B"
          accentColor="#F44336"
          teams={allTeams ?? []}
          selectedTeamId={teamBId}
          otherTeamId={teamAId}
          onSelectTeam={(id) => { setTeamBId(id); setPlayersFromB(new Set()); setPicksFromB([]); }}
          players={filteredB}
          selectedPlayers={playersFromB}
          onTogglePlayer={(id) => setPlayersFromB((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
          })}
          onClearPlayers={() => setPlayersFromB(new Set())}
          search={searchB}
          onSearch={setSearchB}
          picks={picksFromB}
          onPicksChange={setPicksFromB}
          season={season}
        />
      </div>

      {/* Trade evaluation panel */}
      {hasContent && teamAId && teamBId && (
        <div className="rounded-xl border border-white/8 bg-[#111] p-4 space-y-3">
          {/* Fairness badge + value bars */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-wider text-white/30">Trade Analysis</p>
            {fairnessRatio != null && <EvalBadge ratio={fairnessRatio} />}
          </div>

          {/* Value comparison */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-white/35 font-bold uppercase tracking-wider mb-0.5">{teamAObj?.name ?? "Team A"}</p>
              <p className="text-2xl font-black text-[#00C8FF] tabular-nums">{valueA}</p>
            </div>
            <div className="text-center px-1">
              <ArrowLeftRight className="h-4 w-4 text-white/20 mx-auto" />
            </div>
            <div>
              <p className="text-[10px] text-white/35 font-bold uppercase tracking-wider mb-0.5">{teamBObj?.name ?? "Team B"}</p>
              <p className="text-2xl font-black text-[#F44336] tabular-nums">{valueB}</p>
            </div>
          </div>

          {/* Value bar */}
          {(valueA > 0 || valueB > 0) && (() => {
            const total = valueA + valueB;
            const pctA = total > 0 ? (valueA / total) * 100 : 50;
            return (
              <div className="h-1.5 rounded-full overflow-hidden bg-white/8 flex">
                <div className="h-full rounded-l-full transition-all duration-300" style={{ width: `${pctA}%`, backgroundColor: "#00C8FF" }} />
                <div className="h-full rounded-r-full flex-1 transition-all duration-300" style={{ backgroundColor: "#F44336" }} />
              </div>
            );
          })()}

          {/* Trade summary: players + picks */}
          {hasContent && (
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start pt-1 border-t border-white/6">
              <div className="space-y-1">
                {selectedAPlayers.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5 text-xs text-white/70">
                    <span className="text-[10px] font-black text-[#00C8FF]/70 tabular-nums w-6 text-right shrink-0">{p.overall}</span>
                    <span className="font-medium truncate">{p.name}</span>
                    <span className="text-white/30 shrink-0">{p.position}</span>
                  </div>
                ))}
                {picksFromA.map((pk, i) => (
                  <div key={`pka-${i}`} className="flex items-center gap-1.5 text-xs text-white/50">
                    <span className="text-[10px] font-black text-[#00C8FF]/50 tabular-nums w-6 text-right shrink-0">{pickValue(pk)}</span>
                    <span>{season + 1 + pk.year} R{pk.round} Pick</span>
                  </div>
                ))}
                {!selectedAPlayers.length && !picksFromA.length && (
                  <p className="text-xs text-white/20 italic">Nothing selected</p>
                )}
              </div>
              <div className="flex items-center pt-1">
                <ArrowLeftRight className="h-3.5 w-3.5 text-white/20" />
              </div>
              <div className="space-y-1">
                {selectedBPlayers.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5 text-xs text-white/70">
                    <span className="text-[10px] font-black text-[#F44336]/70 tabular-nums w-6 text-right shrink-0">{p.overall}</span>
                    <span className="font-medium truncate">{p.name}</span>
                    <span className="text-white/30 shrink-0">{p.position}</span>
                  </div>
                ))}
                {picksFromB.map((pk, i) => (
                  <div key={`pkb-${i}`} className="flex items-center gap-1.5 text-xs text-white/50">
                    <span className="text-[10px] font-black text-[#F44336]/50 tabular-nums w-6 text-right shrink-0">{pickValue(pk)}</span>
                    <span>{season + 1 + pk.year} R{pk.round} Pick</span>
                  </div>
                ))}
                {!selectedBPlayers.length && !picksFromB.length && (
                  <p className="text-xs text-white/20 italic">Nothing selected</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-wider text-white/40">
          Trade Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add context or a message for this trade..."
          rows={3}
          className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#00C8FF]/40 resize-none"
        />
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between pt-1">
        {canSubmit ? (
          <p className="text-[11px] text-white/30">
            {Array.from(playersFromA).length + Array.from(playersFromB).length} player{(playersFromA.size + playersFromB.size) !== 1 ? "s" : ""} ·{" "}
            {picksFromA.length + picksFromB.length} pick{(picksFromA.length + picksFromB.length) !== 1 ? "s" : ""}
          </p>
        ) : (
          <p className="text-[11px] text-white/25 italic">Select both teams and add players or picks</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || createTrade.isPending}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#00C8FF] text-[#0a0a0a] text-sm font-black hover:bg-[#00C8FF]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          {createTrade.isPending ? "Submitting…" : "Submit Trade"}
        </button>
      </div>
    </div>
  );
}

interface TeamPanelProps {
  label: string;
  accentColor: string;
  teams: Team[];
  selectedTeamId: number | null;
  otherTeamId: number | null;
  onSelectTeam: (id: number) => void;
  players: Player[];
  selectedPlayers: Set<number>;
  onTogglePlayer: (id: number) => void;
  onClearPlayers: () => void;
  search: string;
  onSearch: (v: string) => void;
  picks: DraftPick[];
  onPicksChange: (picks: DraftPick[]) => void;
  season: number;
}

function TeamPanel({
  label, accentColor, teams, selectedTeamId, otherTeamId,
  onSelectTeam, players, selectedPlayers, onTogglePlayer, onClearPlayers,
  search, onSearch, picks, onPicksChange, season,
}: TeamPanelProps) {
  const selectedTeam = teams.find((t: Team) => t.id === selectedTeamId);
  const totalSelected = selectedPlayers.size + picks.length;

  return (
    <div className="bg-white/2 border border-white/8 rounded-xl overflow-hidden flex flex-col">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-white/8" style={{ backgroundColor: `${accentColor}12` }}>
        <div className="flex items-center gap-2">
          {selectedTeam && <TeamLogoImg abbreviation={selectedTeam.abbreviation} size={22} />}
          <span className="text-xs font-black text-white/70 uppercase tracking-wider">{label}</span>
          {totalSelected > 0 && (
            <span
              className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
            >
              {totalSelected} item{totalSelected !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="p-3 flex flex-col gap-3 flex-1">
        {/* Team selector */}
        <select
          value={selectedTeamId ?? ""}
          onChange={(e) => onSelectTeam(Number(e.target.value))}
          className="w-full bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
        >
          <option value="">— Select team —</option>
          {teams
            .filter((t: Team) => t.id !== otherTeamId)
            .sort((a: Team, b: Team) => a.name.localeCompare(b.name))
            .map((t: Team) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
        </select>

        {selectedTeamId ? (
          <>
            {/* Player search */}
            <input
              type="text"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Filter players…"
              className="w-full bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-white/25"
            />

            {/* Player list */}
            <div className="space-y-1 max-h-64 overflow-y-auto pr-0.5">
              {players.length === 0 && (
                <p className="text-xs text-white/30 text-center py-4">No players found</p>
              )}
              {players
                .sort((a: Player, b: Player) => b.overall - a.overall)
                .map((p: Player) => (
                  <PlayerCard
                    key={p.id}
                    player={p}
                    selected={selectedPlayers.has(p.id)}
                    onToggle={() => onTogglePlayer(p.id)}
                  />
                ))}
            </div>

            {/* Clear players */}
            {selectedPlayers.size > 0 && (
              <button
                onClick={onClearPlayers}
                className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/55 transition-colors"
              >
                <X className="h-3 w-3" />
                Clear players
              </button>
            )}

            {/* Draft picks */}
            <div className="border-t border-white/6 pt-3">
              <DraftPicksSelector
                picks={picks}
                season={season}
                accentColor={accentColor}
                onChange={onPicksChange}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center py-8">
            <p className="text-xs text-white/25 text-center">Select a team to view their roster</p>
          </div>
        )}
      </div>
    </div>
  );
}
