import { useState } from "react";
import { Repeat2, Plus, X, ArrowLeftRight, CheckCircle2 } from "lucide-react";
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
}

const PORTRAIT_BASE = "https://madden-assets-cdn.pulse.ea.com/madden26/portraits/75/";

function TeamLogo({ abbreviation, size = 28 }: { abbreviation: string; size?: number }) {
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
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
        selected
          ? "bg-[#00C8FF]/15 border border-[#00C8FF]/40"
          : "bg-white/3 border border-white/6 hover:bg-white/6"
      }`}
    >
      <div className="relative shrink-0">
        {player.portrait_id ? (
          <img
            src={`${PORTRAIT_BASE}${player.portrait_id}.png`}
            alt={player.name}
            className="w-8 h-8 rounded-full object-cover bg-white/5"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "";
            }}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center">
            <span className="text-[9px] text-white/30 font-bold">{player.position}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{player.name}</p>
        <p className="text-[10px] text-white/40">{player.position}</p>
      </div>
      <div className="shrink-0 text-right">
        <span className={`text-xs font-black ${player.overall >= 90 ? "text-[#F44336]" : player.overall >= 80 ? "text-[#00C8FF]" : "text-white/60"}`}>
          {player.overall}
        </span>
      </div>
      {selected && <CheckCircle2 className="h-3.5 w-3.5 text-[#00C8FF] shrink-0" />}
    </button>
  );
}

export default function CreateTradeSection({ leagueId, season }: Props) {
  const [teamAId, setTeamAId] = useState<number | null>(null);
  const [teamBId, setTeamBId] = useState<number | null>(null);
  const [playersFromA, setPlayersFromA] = useState<Set<number>>(new Set());
  const [playersFromB, setPlayersFromB] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");

  const { data: allTeams } = useGetLeagueTeams(leagueId, {
    query: { queryKey: getGetLeagueTeamsQueryKey(leagueId) },
  });

  const { data: playersA } = useGetTeamPlayers(teamAId ?? 0, {
    query: {
      enabled: !!teamAId,
      queryKey: getGetTeamPlayersQueryKey(teamAId ?? 0),
    },
  });

  const { data: playersB } = useGetTeamPlayers(teamBId ?? 0, {
    query: {
      enabled: !!teamBId,
      queryKey: getGetTeamPlayersQueryKey(teamBId ?? 0),
    },
  });

  const createTrade = useCreateLeagueTrade();

  const teamAPlayers: Player[] = playersA ?? [];
  const teamBPlayers: Player[] = playersB ?? [];

  const filteredA = teamAPlayers.filter((p: Player) =>
    p.name.toLowerCase().includes(searchA.toLowerCase()) ||
    p.position.toLowerCase().includes(searchA.toLowerCase())
  );
  const filteredB = teamBPlayers.filter((p: Player) =>
    p.name.toLowerCase().includes(searchB.toLowerCase()) ||
    p.position.toLowerCase().includes(searchB.toLowerCase())
  );

  const teamAObj = allTeams?.find((t: Team) => t.id === teamAId);
  const teamBObj = allTeams?.find((t: Team) => t.id === teamBId);

  const selectedAPlayers = teamAPlayers.filter((p: Player) => playersFromA.has(p.id));
  const selectedBPlayers = teamBPlayers.filter((p: Player) => playersFromB.has(p.id));

  const canSubmit = teamAId && teamBId && teamAId !== teamBId &&
    (playersFromA.size > 0 || playersFromB.size > 0);

  const handleSubmit = async () => {
    if (!canSubmit || !teamAId || !teamBId) return;
    await createTrade.mutateAsync({
      id: leagueId,
      data: {
        season,
        team_a_id: teamAId,
        team_b_id: teamBId,
        players_from_a: Array.from(playersFromA),
        players_from_b: Array.from(playersFromB),
        notes: notes || undefined,
      },
    });
    setSubmitted(true);
  };

  const resetForm = () => {
    setTeamAId(null);
    setTeamBId(null);
    setPlayersFromA(new Set());
    setPlayersFromB(new Set());
    setNotes("");
    setSubmitted(false);
    setSearchA("");
    setSearchB("");
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="rounded-full bg-[#00C8FF]/10 border border-[#00C8FF]/30 p-5">
          <CheckCircle2 className="h-10 w-10 text-[#00C8FF]" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-white mb-1">Trade Submitted!</h2>
          <p className="text-sm text-white/50">
            The trade proposal between <span className="text-white/80">{teamAObj?.name}</span> and{" "}
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[#00C8FF]/10 border border-[#00C8FF]/20">
          <Repeat2 className="h-5 w-5 text-[#00C8FF]" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Create Trade</h2>
          <p className="text-xs text-white/40">Propose a trade between two teams</p>
        </div>
      </div>

      {/* Trade summary bar */}
      {(playersFromA.size > 0 || playersFromB.size > 0) && teamAId && teamBId && (
        <div className="bg-white/3 border border-white/8 rounded-xl p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-white/30 mb-3">Trade Summary</p>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1.5">
                {teamAObj?.name} sends
              </p>
              {selectedAPlayers.map((p: Player) => (
                <div key={p.id} className="flex items-center gap-2 text-xs text-white/80">
                  <span className="text-[10px] text-white/40 font-mono w-6 text-right">{p.overall}</span>
                  <span className="font-medium">{p.name}</span>
                  <span className="text-white/35">{p.position}</span>
                </div>
              ))}
              {playersFromA.size === 0 && <p className="text-xs text-white/25 italic">No players selected</p>}
            </div>
            <div className="flex items-center pt-6">
              <ArrowLeftRight className="h-4 w-4 text-white/25" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1.5">
                {teamBObj?.name} sends
              </p>
              {selectedBPlayers.map((p: Player) => (
                <div key={p.id} className="flex items-center gap-2 text-xs text-white/80">
                  <span className="text-[10px] text-white/40 font-mono w-6 text-right">{p.overall}</span>
                  <span className="font-medium">{p.name}</span>
                  <span className="text-white/35">{p.position}</span>
                </div>
              ))}
              {playersFromB.size === 0 && <p className="text-xs text-white/25 italic">No players selected</p>}
            </div>
          </div>
        </div>
      )}

      {/* Two-column team picker */}
      <div className="grid grid-cols-2 gap-5">
        <TeamPanel
          label="Team A"
          accentColor="#00C8FF"
          teams={allTeams ?? []}
          selectedTeamId={teamAId}
          otherTeamId={teamBId}
          onSelectTeam={(id) => { setTeamAId(id); setPlayersFromA(new Set()); }}
          players={filteredA}
          selectedPlayers={playersFromA}
          onTogglePlayer={(id) => setPlayersFromA(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
          })}
          search={searchA}
          onSearch={setSearchA}
        />

        <TeamPanel
          label="Team B"
          accentColor="#F44336"
          teams={allTeams ?? []}
          selectedTeamId={teamBId}
          otherTeamId={teamAId}
          onSelectTeam={(id) => { setTeamBId(id); setPlayersFromB(new Set()); }}
          players={filteredB}
          selectedPlayers={playersFromB}
          onTogglePlayer={(id) => setPlayersFromB(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
          })}
          search={searchB}
          onSearch={setSearchB}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-wider text-white/40">
          Trade Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a message or context for this trade..."
          rows={3}
          className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#00C8FF]/40 resize-none"
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || createTrade.isPending}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#00C8FF] text-[#0a0a0a] text-sm font-black hover:bg-[#00C8FF]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          {createTrade.isPending ? "Submitting..." : "Submit Trade"}
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
  search: string;
  onSearch: (v: string) => void;
}

function TeamPanel({
  label, accentColor, teams, selectedTeamId, otherTeamId,
  onSelectTeam, players, selectedPlayers, onTogglePlayer,
  search, onSearch,
}: TeamPanelProps) {
  const selectedTeam = teams.find((t: Team) => t.id === selectedTeamId);

  return (
    <div className="bg-white/2 border border-white/8 rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-white/8" style={{ backgroundColor: `${accentColor}14` }}>
        <div className="flex items-center gap-2">
          {selectedTeam && (
            <TeamLogo abbreviation={selectedTeam.abbreviation} size={22} />
          )}
          <span className="text-xs font-black text-white/70 uppercase tracking-wider">{label}</span>
          {selectedPlayers.size > 0 && (
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
              {selectedPlayers.size} selected
            </span>
          )}
        </div>
      </div>

      <div className="p-3 flex flex-col gap-3 flex-1">
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

        {selectedTeamId && (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Filter players..."
              className="w-full bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-white/25"
            />
            <div className="space-y-1 max-h-72 overflow-y-auto pr-0.5">
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
            {selectedPlayers.size > 0 && (
              <button
                onClick={() => Array.from(selectedPlayers).forEach(id => onTogglePlayer(id))}
                className="flex items-center gap-1.5 text-[10px] text-white/35 hover:text-white/60 transition-colors"
              >
                <X className="h-3 w-3" />
                Clear selection
              </button>
            )}
          </>
        )}

        {!selectedTeamId && (
          <div className="flex-1 flex items-center justify-center py-8">
            <p className="text-xs text-white/25 text-center">Select a team to view their roster</p>
          </div>
        )}
      </div>
    </div>
  );
}
