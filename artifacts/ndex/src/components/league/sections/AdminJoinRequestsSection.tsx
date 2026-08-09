import { useState } from "react";
import { UserPlus, CheckCircle, XCircle, Clock, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import {
  useGetLeagueJoinRequests,
  getGetLeagueJoinRequestsQueryKey,
  useUpdateLeagueJoinRequest,
  useDeleteLeagueJoinRequest,
  useGetLeagueTeams,
  getGetLeagueTeamsQueryKey,
} from "@workspace/api-client-react";
import type { JoinRequest, Team } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface Props { leagueId: number }

type FilterStatus = "all" | "pending" | "approved" | "denied";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "#F59E0B", bg: "bg-amber-500/10 border-amber-500/30", icon: Clock },
  approved: { label: "Approved", color: "#22C55E", bg: "bg-green-500/10 border-green-500/30", icon: CheckCircle },
  denied: { label: "Denied", color: "#F44336", bg: "bg-red-500/10 border-red-500/30", icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? { label: status, color: "#888", bg: "bg-white/5 border-white/10", icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${cfg.bg}`} style={{ color: cfg.color }}>
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

function DiscordAvatar({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <div
      className="rounded-full bg-[#5865F2]/20 border border-[#5865F2]/30 flex items-center justify-center font-bold text-[#5865F2] shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function TeamLogo({ abbreviation, size = 22 }: { abbreviation: string; size?: number }) {
  return (
    <img
      src={`https://a.espncdn.com/combiner/i?img=/i/teamlogos/nfl/500/${abbreviation.toLowerCase()}.png&h=${size * 2}&w=${size * 2}`}
      alt={abbreviation}
      style={{ width: size, height: size }}
      className="object-contain shrink-0"
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

export default function AdminJoinRequestsSection({ leagueId }: Props) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [assignTeam, setAssignTeam] = useState<Record<number, string>>({});

  const { data: requests = [], isLoading } = useGetLeagueJoinRequests(leagueId, {
    query: { queryKey: getGetLeagueJoinRequestsQueryKey(leagueId) },
  });
  const { data: teams = [] } = useGetLeagueTeams(leagueId, {
    query: { queryKey: getGetLeagueTeamsQueryKey(leagueId) },
  });

  const updateRequest = useUpdateLeagueJoinRequest();
  const deleteRequest = useDeleteLeagueJoinRequest();

  const teamMap = new Map<number, Team>(teams.map((t: Team) => [t.id, t]));

  const filtered = (filter === "all" ? requests : requests.filter((r: JoinRequest) => r.status === filter))
    .sort((a: JoinRequest, b: JoinRequest) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const counts = {
    all: requests.length,
    pending: requests.filter((r: JoinRequest) => r.status === "pending").length,
    approved: requests.filter((r: JoinRequest) => r.status === "approved").length,
    denied: requests.filter((r: JoinRequest) => r.status === "denied").length,
  };

  const approve = async (r: JoinRequest) => {
    const teamId = assignTeam[r.id] ? Number(assignTeam[r.id]) : undefined;
    await updateRequest.mutateAsync({
      id: leagueId,
      requestId: r.id,
      data: { status: "approved", team_id: teamId ?? null },
    });
    qc.invalidateQueries({ queryKey: getGetLeagueJoinRequestsQueryKey(leagueId) });
    setExpandedId(null);
  };

  const deny = async (r: JoinRequest) => {
    await updateRequest.mutateAsync({
      id: leagueId,
      requestId: r.id,
      data: { status: "denied" },
    });
    qc.invalidateQueries({ queryKey: getGetLeagueJoinRequestsQueryKey(leagueId) });
  };

  const remove = async (r: JoinRequest) => {
    await deleteRequest.mutateAsync({ id: leagueId, requestId: r.id });
    qc.invalidateQueries({ queryKey: getGetLeagueJoinRequestsQueryKey(leagueId) });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[#F44336]/10 border border-[#F44336]/20">
          <UserPlus className="h-5 w-5 text-[#F44336]" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Join Requests</h2>
          <p className="text-xs text-white/40">Review and approve players who want to join this league</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5">
        {(["all", "pending", "approved", "denied"] as FilterStatus[]).map((s) => {
          const cfg = s === "all"
            ? { label: "All", color: "text-white/60", activeColor: "text-white", activeBg: "bg-white/8 border-white/15" }
            : { pending: { label: "Pending", color: "text-amber-400/60", activeColor: "text-amber-400", activeBg: "bg-amber-500/10 border-amber-500/25" },
                approved: { label: "Approved", color: "text-green-400/60", activeColor: "text-green-400", activeBg: "bg-green-500/10 border-green-500/25" },
                denied: { label: "Denied", color: "text-[#F44336]/60", activeColor: "text-[#F44336]", activeBg: "bg-red-500/10 border-red-500/25" },
              }[s]!;
          const isActive = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                isActive ? `${cfg.activeBg} ${cfg.activeColor}` : `border-transparent ${cfg.color} hover:${cfg.activeColor}`
              }`}
            >
              {cfg.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${isActive ? "bg-white/10" : "bg-white/5"}`}>
                {counts[s]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Request cards */}
      <div className="space-y-2">
        {isLoading && (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-white/3 rounded-xl border border-white/6 animate-pulse" />
          ))
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <div className="p-4 rounded-full bg-white/3 border border-white/8">
              <UserPlus className="h-8 w-8 text-white/20" />
            </div>
            <p className="text-sm text-white/40">
              {filter === "pending" ? "No pending requests" : `No ${filter} requests`}
            </p>
          </div>
        )}

        {filtered.map((r: JoinRequest) => {
          const isExpanded = expandedId === r.id;
          const team = r.team_id ? teamMap.get(r.team_id) : null;
          const selectedTeam = assignTeam[r.id] ? teamMap.get(Number(assignTeam[r.id])) : null;

          return (
            <div key={r.id} className="rounded-xl border border-white/8 bg-white/2 overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <DiscordAvatar name={r.discord_name} size={36} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-white">{r.discord_name}</p>
                    {r.gamer_tag && (
                      <span className="text-[10px] text-white/40 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                        {r.gamer_tag}
                      </span>
                    )}
                    {r.platform && (
                      <span className="text-[10px] text-white/40 border border-white/10 px-1.5 py-0.5 rounded">
                        {r.platform}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/30 mt-0.5">{formatDate(r.created_at)}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={r.status} />

                  {r.status === "pending" && (
                    <>
                      <button
                        onClick={() => deny(r)}
                        disabled={updateRequest.isPending}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/8 border border-red-500/20 text-[#F44336] text-[11px] font-semibold hover:bg-red-500/15 transition-colors"
                      >
                        <XCircle className="h-3 w-3" />
                        Deny
                      </button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : r.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500/8 border border-green-500/20 text-green-400 text-[11px] font-semibold hover:bg-green-500/15 transition-colors"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Approve
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => remove(r)}
                    disabled={deleteRequest.isPending}
                    className="text-white/20 hover:text-[#F44336] transition-colors p-1"
                    title="Delete request"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Message */}
              {r.message && !isExpanded && (
                <div className="px-4 pb-3">
                  <p className="text-[11px] text-white/40 italic">"{r.message}"</p>
                </div>
              )}

              {/* Assigned team (approved) */}
              {r.status === "approved" && team && !isExpanded && (
                <div className="px-4 pb-3 flex items-center gap-2">
                  <TeamLogo abbreviation={team.abbreviation} size={16} />
                  <span className="text-[11px] text-white/50">{team.city} {team.name}</span>
                </div>
              )}

              {/* Approve expand panel */}
              {isExpanded && r.status === "pending" && (
                <div className="border-t border-white/8 px-4 py-4 bg-black/20 space-y-3">
                  {r.message && (
                    <div className="bg-white/3 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Message</p>
                      <p className="text-sm text-white/70 italic">"{r.message}"</p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">Assign Team (optional)</p>
                    <select
                      value={assignTeam[r.id] ?? ""}
                      onChange={(e) => setAssignTeam((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
                    >
                      <option value="">— No team —</option>
                      {teams.sort((a: Team, b: Team) => a.name.localeCompare(b.name)).map((t: Team) => (
                        <option key={t.id} value={t.id}>{t.city} {t.name} ({t.abbreviation})</option>
                      ))}
                    </select>
                    {selectedTeam && (
                      <div className="flex items-center gap-2 mt-1 px-1">
                        <TeamLogo abbreviation={selectedTeam.abbreviation} size={18} />
                        <span className="text-xs text-white/60">{selectedTeam.city} {selectedTeam.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExpandedId(null)}
                      className="px-4 py-1.5 rounded-lg text-xs text-white/50 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => approve(r)}
                      disabled={updateRequest.isPending}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-500 text-white text-xs font-black hover:bg-green-400 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      {updateRequest.isPending ? "Approving…" : "Confirm Approve"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
