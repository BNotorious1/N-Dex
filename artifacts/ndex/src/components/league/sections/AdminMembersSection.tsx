import { useState } from "react";
import { UserCog, Plus, Pencil, Trash2, Check, X, Users } from "lucide-react";
import {
  useGetLeagueMembers,
  getGetLeagueMembersQueryKey,
  useAddLeagueMember,
  useUpdateLeagueMember,
  useDeleteLeagueMember,
  useGetLeagueTeams,
  getGetLeagueTeamsQueryKey,
} from "@workspace/api-client-react";
import type { Member, Team } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface Props { leagueId: number }

const PLATFORM_COLORS: Record<string, string> = {
  PS5: "#003791",
  PS4: "#003791",
  XSX: "#107C10",
  XBOX: "#107C10",
  PC: "#7B68EE",
};

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

function DiscordAvatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <div
      className="rounded-full bg-[#5865F2]/20 border border-[#5865F2]/30 flex items-center justify-center font-bold text-[#5865F2] shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function AdminMembersSection({ leagueId }: Props) {
  const qc = useQueryClient();
  const [editId, setEditId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [editFields, setEditFields] = useState<{ discord_name: string; gamer_tag: string; team_id: string }>({
    discord_name: "", gamer_tag: "", team_id: "",
  });
  const [addFields, setAddFields] = useState({ discord_name: "", gamer_tag: "", team_id: "" });
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: members = [], isLoading } = useGetLeagueMembers(leagueId, {
    query: { queryKey: getGetLeagueMembersQueryKey(leagueId) },
  });
  const { data: teams = [] } = useGetLeagueTeams(leagueId, {
    query: { queryKey: getGetLeagueTeamsQueryKey(leagueId) },
  });

  const addMember = useAddLeagueMember();
  const updateMember = useUpdateLeagueMember();
  const deleteMember = useDeleteLeagueMember();

  const teamMap = new Map<number, Team>(teams.map((t: Team) => [t.id, t]));

  const filtered = members.filter((m: Member) =>
    m.discord_name.toLowerCase().includes(search.toLowerCase()) ||
    (m.gamer_tag ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (m: Member) => {
    setEditId(m.id);
    setEditFields({
      discord_name: m.discord_name,
      gamer_tag: m.gamer_tag ?? "",
      team_id: m.team_id ? String(m.team_id) : "",
    });
  };

  const saveEdit = async () => {
    if (!editId) return;
    await updateMember.mutateAsync({
      id: leagueId,
      memberId: editId,
      data: {
        discord_name: editFields.discord_name || undefined,
        gamer_tag: editFields.gamer_tag || null,
        team_id: editFields.team_id ? Number(editFields.team_id) : null,
      },
    });
    qc.invalidateQueries({ queryKey: getGetLeagueMembersQueryKey(leagueId) });
    setEditId(null);
  };

  const confirmDelete = async (id: number) => {
    await deleteMember.mutateAsync({ id: leagueId, memberId: id });
    qc.invalidateQueries({ queryKey: getGetLeagueMembersQueryKey(leagueId) });
    setDeletingId(null);
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

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[#F44336]/10 border border-[#F44336]/20">
          <UserCog className="h-5 w-5 text-[#F44336]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-white">Members</h2>
          <p className="text-xs text-white/40">{members.length} member{members.length !== 1 ? "s" : ""} in this league</p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F44336]/10 border border-[#F44336]/20 text-[#F44336] text-xs font-semibold hover:bg-[#F44336]/20 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Member
        </button>
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
                {teams.sort((a: Team, b: Team) => a.name.localeCompare(b.name)).map((t: Team) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
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
      <div className="rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: "#F44336" }}>
              {["Member", "Gamer Tag", "Team", "Actions"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-white">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td colSpan={4} className="px-4 py-3">
                    <div className="h-4 bg-white/5 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  <Users className="h-8 w-8 text-white/15 mx-auto mb-2" />
                  <p className="text-sm text-white/30">No members found</p>
                </td>
              </tr>
            )}
            {filtered.map((m: Member) => {
              const team = m.team_id ? teamMap.get(m.team_id) : null;
              const isEditing = editId === m.id;
              const isDeleting = deletingId === m.id;
              return (
                <tr key={m.id} className="border-t border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        value={editFields.discord_name}
                        onChange={(e) => setEditFields((f) => ({ ...f, discord_name: e.target.value }))}
                        className="bg-black/40 border border-white/15 rounded px-2 py-1 text-sm text-white w-full focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <DiscordAvatar name={m.discord_name} size={30} />
                        <div>
                          <p className="text-sm font-semibold text-white">{m.discord_name}</p>
                          <p className="text-[10px] text-white/35">ID #{m.id}</p>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        value={editFields.gamer_tag}
                        onChange={(e) => setEditFields((f) => ({ ...f, gamer_tag: e.target.value }))}
                        placeholder="Gamer Tag"
                        className="bg-black/40 border border-white/15 rounded px-2 py-1 text-sm text-white w-full focus:outline-none"
                      />
                    ) : (
                      <span className="text-sm text-white/70">{m.gamer_tag ?? <span className="text-white/20 italic">—</span>}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <select
                        value={editFields.team_id}
                        onChange={(e) => setEditFields((f) => ({ ...f, team_id: e.target.value }))}
                        className="bg-black/40 border border-white/15 rounded px-2 py-1 text-sm text-white w-full focus:outline-none"
                      >
                        <option value="">— No team —</option>
                        {teams.sort((a: Team, b: Team) => a.name.localeCompare(b.name)).map((t: Team) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    ) : team ? (
                      <div className="flex items-center gap-2">
                        <TeamLogo abbreviation={team.abbreviation} size={20} />
                        <div>
                          <p className="text-xs font-semibold text-white">{team.name}</p>
                          <p className="text-[10px] text-white/35">{team.abbreviation}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-white/20 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isDeleting ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/50">Remove?</span>
                        <button onClick={() => confirmDelete(m.id)} className="text-[#F44336] hover:text-[#F44336]/70 transition-colors">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeletingId(null)} className="text-white/40 hover:text-white transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : isEditing ? (
                      <div className="flex items-center gap-2">
                        <button onClick={saveEdit} disabled={updateMember.isPending} className="text-[#00C8FF] hover:text-[#00C8FF]/70 transition-colors">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditId(null)} className="text-white/40 hover:text-white transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEdit(m)} className="text-white/30 hover:text-[#00C8FF] transition-colors" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeletingId(m.id)} className="text-white/30 hover:text-[#F44336] transition-colors" title="Remove">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
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
