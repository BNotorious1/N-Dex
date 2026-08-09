import { useState, useCallback } from "react";
import { UserCog, Plus, Users, Trash2, Crown } from "lucide-react";
import {
  useGetLeagueMembers,
  getGetLeagueMembersQueryKey,
  useAddLeagueMember,
  useUpdateLeagueMember,
  useDeleteLeagueMember,
  useGetLeagueTeams,
  getGetLeagueTeamsQueryKey,
  useGetLeague,
  getGetLeagueQueryKey,
} from "@workspace/api-client-react";
import type { Member, Team } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface Props { leagueId: number }

const PERM_CREATE_TRADE = 1;
const PERM_VOTE_TRADE   = 2;
const PERM_FORCE_TRADE  = 4;
const PERM_EDIT_LEAGUE  = 8;

function hasFlag(permissions: number | undefined, flag: number) {
  return ((permissions ?? 0) & flag) !== 0;
}

function toggleFlag(permissions: number | undefined, flag: number): number {
  return ((permissions ?? 0) ^ flag);
}

function DiscordAvatar({ name, avatarUrl, size = 32 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const [imgErr, setImgErr] = useState(false);
  if (avatarUrl && !imgErr) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setImgErr(true)}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-[#5865F2]/20 border border-[#5865F2]/30 flex items-center justify-center font-bold text-[#5865F2] shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function TeamLogo({ abbreviation, size = 20 }: { abbreviation: string; size?: number }) {
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

function PermToggle({
  checked,
  onChange,
  disabled,
  pending,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  pending?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled || pending}
      className={[
        "w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
        disabled
          ? "opacity-30 cursor-not-allowed border-white/15 bg-transparent"
          : checked
            ? "border-[#00C8FF] bg-[#00C8FF]/20 hover:bg-[#00C8FF]/30"
            : "border-white/20 bg-white/3 hover:border-white/40",
        pending ? "opacity-50" : "",
      ].join(" ")}
      aria-label={checked ? "Revoke" : "Grant"}
    >
      {checked && (
        <svg className="w-3 h-3 text-[#00C8FF]" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

function KickDialog({
  count,
  onConfirm,
  onCancel,
  isPending,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#161616] border border-white/15 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#F44336]/15 border border-[#F44336]/25">
            <Trash2 className="h-5 w-5 text-[#F44336]" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">Kick Member{count !== 1 ? "s" : ""}</h3>
            <p className="text-xs text-white/40">{count} member{count !== 1 ? "s" : ""} selected</p>
          </div>
        </div>
        <p className="text-sm text-white/60">
          These member{count !== 1 ? "s" : ""} will be kicked from the league. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white transition-colors border border-white/10 hover:border-white/25"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-[#F44336] text-white hover:bg-[#F44336]/80 transition-colors disabled:opacity-40"
          >
            {isPending ? "Kicking…" : "Kick"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminMembersSection({ leagueId }: Props) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showKickDialog, setShowKickDialog] = useState(false);
  const [kickPending, setKickPending] = useState(false);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addFields, setAddFields] = useState({ discord_name: "", gamer_tag: "", team_id: "" });
  const [pendingPerm, setPendingPerm] = useState<Set<number>>(new Set());
  const [pendingTeam, setPendingTeam] = useState<Set<number>>(new Set());

  const { data: league } = useGetLeague(leagueId, {
    query: { queryKey: getGetLeagueQueryKey(leagueId) },
  });
  const { data: members = [], isLoading } = useGetLeagueMembers(leagueId, {
    query: { queryKey: getGetLeagueMembersQueryKey(leagueId) },
  });
  const { data: teams = [] } = useGetLeagueTeams(leagueId, {
    query: { queryKey: getGetLeagueTeamsQueryKey(leagueId) },
  });

  const addMember = useAddLeagueMember();
  const updateMember = useUpdateLeagueMember();
  const deleteMember = useDeleteLeagueMember();

  const commissionerName = league?.commissioner_name?.toLowerCase() ?? "";
  const teamMap = new Map<number, Team>(teams.map((t: Team) => [t.id, t]));
  const sortedTeams = [...teams].sort((a: Team, b: Team) => a.name.localeCompare(b.name));

  const filtered = members.filter((m: Member) =>
    m.discord_name.toLowerCase().includes(search.toLowerCase()) ||
    (m.gamer_tag ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const isOwner = (m: Member) =>
    commissionerName !== "" && m.discord_name.toLowerCase() === commissionerName;

  const allKickable = filtered.filter((m: Member) => !isOwner(m));
  const allSelected = allKickable.length > 0 && allKickable.every((m) => selected.has(m.id));
  const someSelected = allKickable.some((m) => selected.has(m.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allKickable.map((m) => m.id)));
    }
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handlePermToggle = useCallback(async (m: Member, flag: number) => {
    const newPerms = toggleFlag(m.permissions, flag);
    setPendingPerm((prev) => new Set(prev).add(m.id));
    try {
      await updateMember.mutateAsync({
        id: leagueId,
        memberId: m.id,
        data: { permissions: newPerms },
      });
      qc.invalidateQueries({ queryKey: getGetLeagueMembersQueryKey(leagueId) });
    } finally {
      setPendingPerm((prev) => { const s = new Set(prev); s.delete(m.id); return s; });
    }
  }, [leagueId, qc, updateMember]);

  const handleTeamChange = useCallback(async (m: Member, teamIdStr: string) => {
    const newTeamId = teamIdStr ? Number(teamIdStr) : null;
    setPendingTeam((prev) => new Set(prev).add(m.id));
    try {
      await updateMember.mutateAsync({
        id: leagueId,
        memberId: m.id,
        data: { team_id: newTeamId },
      });
      qc.invalidateQueries({ queryKey: getGetLeagueMembersQueryKey(leagueId) });
    } finally {
      setPendingTeam((prev) => { const s = new Set(prev); s.delete(m.id); return s; });
    }
  }, [leagueId, qc, updateMember]);

  const handleKick = async () => {
    setKickPending(true);
    try {
      await Promise.all(
        [...selected].map((id) => deleteMember.mutateAsync({ id: leagueId, memberId: id }))
      );
      qc.invalidateQueries({ queryKey: getGetLeagueMembersQueryKey(leagueId) });
      setSelected(new Set());
      setShowKickDialog(false);
    } finally {
      setKickPending(false);
    }
  };

  const handleAdd = async () => {
    if (!addFields.discord_name.trim()) return;
    await addMember.mutateAsync({
      id: leagueId,
      data: {
        discord_name: addFields.discord_name,
        gamer_tag: addFields.gamer_tag || undefined,
        team_id: addFields.team_id ? Number(addFields.team_id) : undefined,
      },
    });
    qc.invalidateQueries({ queryKey: getGetLeagueMembersQueryKey(leagueId) });
    setAddFields({ discord_name: "", gamer_tag: "", team_id: "" });
    setShowAdd(false);
  };

  function formatDate(iso: string | null | undefined) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const PERM_COLS: { flag: number; label: string; short: string }[] = [
    { flag: PERM_CREATE_TRADE, label: "Create A Trade", short: "Create Trade" },
    { flag: PERM_VOTE_TRADE,   label: "Vote On Trade",  short: "Vote Trade"  },
    { flag: PERM_FORCE_TRADE,  label: "Force A Trade",  short: "Force Trade" },
    { flag: PERM_EDIT_LEAGUE,  label: "Edit League / Admin", short: "Edit League" },
  ];

  return (
    <div className="space-y-5">
      {showKickDialog && (
        <KickDialog
          count={selected.size}
          onConfirm={handleKick}
          onCancel={() => setShowKickDialog(false)}
          isPending={kickPending}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[#F44336]/10 border border-[#F44336]/20">
          <UserCog className="h-5 w-5 text-[#F44336]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-white">Members</h2>
          <p className="text-xs text-white/40">{members.length} member{members.length !== 1 ? "s" : ""} in this league</p>
        </div>
        <div className="flex items-center gap-2">
          {someSelected && (
            <button
              onClick={() => setShowKickDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F44336]/15 border border-[#F44336]/30 text-[#F44336] text-xs font-bold hover:bg-[#F44336]/25 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Kick ({selected.size})
            </button>
          )}
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F44336]/10 border border-[#F44336]/20 text-[#F44336] text-xs font-semibold hover:bg-[#F44336]/20 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Member
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-[#141414] border border-white/10 rounded-xl p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-white/40">New Member</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Discord Name *</label>
              <input
                value={addFields.discord_name}
                onChange={(e) => setAddFields((f) => ({ ...f, discord_name: e.target.value }))}
                placeholder="username"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/25"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Gamer Tag</label>
              <input
                value={addFields.gamer_tag}
                onChange={(e) => setAddFields((f) => ({ ...f, gamer_tag: e.target.value }))}
                placeholder="PSN / GT"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/25"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Team</label>
              <select
                value={addFields.team_id}
                onChange={(e) => setAddFields((f) => ({ ...f, team_id: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
              >
                <option value="">— No team —</option>
                {sortedTeams.map((t: Team) => (
                  <option key={t.id} value={t.id}>{t.city} {t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-1.5 rounded-lg text-xs text-white/50 hover:text-white transition-colors">Cancel</button>
            <button
              onClick={handleAdd}
              disabled={!addFields.discord_name.trim() || addMember.isPending}
              className="px-4 py-1.5 rounded-lg bg-[#F44336] text-white text-xs font-bold hover:bg-[#F44336]/80 transition-colors disabled:opacity-40"
            >
              {addMember.isPending ? "Adding…" : "Add Member"}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by Discord name or gamer tag…"
        className="w-full bg-white/3 border border-white/8 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/20"
      />

      {/* Table */}
      <div className="rounded-xl border border-white/8 overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr style={{ backgroundColor: "#F44336" }}>
              {/* Select-all checkbox */}
              <th className="px-3 py-2.5 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={toggleAll}
                  className="accent-white cursor-pointer"
                />
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-white min-w-[160px]">Name</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-white min-w-[180px]">Team</th>
              {PERM_COLS.map((c) => (
                <th key={c.flag} className="px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-white whitespace-nowrap" title={c.label}>
                  {c.short}
                </th>
              ))}
              <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-white whitespace-nowrap">Date Joined</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td colSpan={8} className="px-4 py-3">
                    <div className="h-4 bg-white/5 rounded animate-pulse" />
                  </td>
                </tr>
              ))}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <Users className="h-8 w-8 text-white/15 mx-auto mb-2" />
                  <p className="text-sm text-white/30">No members found</p>
                </td>
              </tr>
            )}
            {filtered.map((m: Member) => {
              const owner = isOwner(m);
              const team = m.team_id ? teamMap.get(m.team_id) : null;
              const isPerm = pendingPerm.has(m.id);
              const isTeamPending = pendingTeam.has(m.id);
              return (
                <tr
                  key={m.id}
                  className={[
                    "border-t border-white/5 transition-colors",
                    selected.has(m.id) ? "bg-[#F44336]/5" : "hover:bg-white/2",
                  ].join(" ")}
                >
                  {/* Select checkbox */}
                  <td className="px-3 py-3 text-center">
                    {!owner && (
                      <input
                        type="checkbox"
                        checked={selected.has(m.id)}
                        onChange={() => toggleOne(m.id)}
                        className="accent-[#F44336] cursor-pointer"
                      />
                    )}
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <DiscordAvatar name={m.discord_name} avatarUrl={(m as any).discord_avatar_url} size={30} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-white truncate">{m.discord_name}</p>
                          {owner && (
                            <span title="Commissioner">
                              <Crown className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                            </span>
                          )}
                        </div>
                        {m.gamer_tag && (
                          <p className="text-[10px] text-white/35 truncate">{m.gamer_tag}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Team dropdown (auto-saves) */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {team && <TeamLogo abbreviation={team.abbreviation} size={18} />}
                      <select
                        value={m.team_id ?? ""}
                        onChange={(e) => handleTeamChange(m, e.target.value)}
                        disabled={isTeamPending}
                        className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-white/25 disabled:opacity-50 min-w-0 max-w-[150px] truncate"
                      >
                        <option value="">— No team —</option>
                        {sortedTeams.map((t: Team) => (
                          <option key={t.id} value={t.id}>{t.city} {t.name}</option>
                        ))}
                      </select>
                    </div>
                  </td>

                  {/* Permission toggles */}
                  {PERM_COLS.map((c) => (
                    <td key={c.flag} className="px-3 py-3 text-center">
                      <div className="flex justify-center">
                        <PermToggle
                          checked={hasFlag(m.permissions, c.flag)}
                          onChange={() => handlePermToggle(m, c.flag)}
                          pending={isPerm}
                        />
                      </div>
                    </td>
                  ))}

                  {/* Date Joined */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-white/45">{formatDate(m.date_joined)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
