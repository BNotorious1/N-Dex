import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Link2, Copy, Check, Trash2, Clock, CheckCircle, XCircle, Loader2, Send } from "lucide-react";

interface InviteRow {
  id: number;
  token: string;
  discord_name: string;
  created_by: string;
  league_id: number;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by_discord_name: string | null;
  status: "pending" | "accepted" | "expired";
}

interface Props {
  leagueId: number;
}

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "#F59E0B", bg: "bg-amber-500/10 border-amber-500/30", Icon: Clock },
  accepted: { label: "Accepted", color: "#22C55E", bg: "bg-green-500/10 border-green-500/30", Icon: CheckCircle },
  expired: { label: "Expired", color: "#6B7280", bg: "bg-white/5 border-white/10", Icon: XCircle },
};

function StatusBadge({ status }: { status: InviteRow["status"] }) {
  const cfg = STATUS_CONFIG[status];
  const { Icon } = cfg;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${cfg.bg}`}
      style={{ color: cfg.color }}
    >
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors shrink-0"
      style={copied
        ? { background: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.3)" }
        : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.12)" }
      }
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function inviteLink(token: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}invite/${token}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminInviteSection({ leagueId }: Props) {
  const qc = useQueryClient();
  const queryKey = ["league-invites", leagueId];

  const [discordName, setDiscordName] = useState("");
  const [newInviteToken, setNewInviteToken] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Fetch invites ──────────────────────────────────────────────────────────
  const { data: invites = [], isLoading } = useQuery<InviteRow[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/leagues/${leagueId}/invites`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load invites");
      return res.json() as Promise<InviteRow[]>;
    },
    // sort: pending first, then by created_at desc
    select: (rows) =>
      [...rows].sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (a.status !== "pending" && b.status === "pending") return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
  });

  // ── Create invite ─────────────────────────────────────────────────────────
  const { mutate: createInvite, isPending: creating } = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/leagues/${leagueId}/invites`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discord_name: name }),
      });
      if (!res.ok) throw new Error("Failed to create invite");
      return res.json() as Promise<InviteRow>;
    },
    onSuccess: (invite) => {
      setNewInviteToken(invite.token);
      setDiscordName("");
      qc.invalidateQueries({ queryKey });
    },
  });

  // ── Revoke invite ─────────────────────────────────────────────────────────
  const revokeInvite = async (token: string) => {
    setRevoking(token);
    try {
      await fetch(`/api/leagues/${leagueId}/invites/${token}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (newInviteToken === token) setNewInviteToken(null);
      qc.invalidateQueries({ queryKey });
    } finally {
      setRevoking(null);
    }
  };

  const handleGenerate = () => {
    const name = discordName.trim();
    if (!name) return;
    createInvite(name);
  };

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-white font-bold text-xl flex items-center gap-2">
          <UserPlus className="h-5 w-5 shrink-0" style={{ color: "#5865F2" }} />
          Invite Players
        </h2>
        <p className="text-white/40 text-sm mt-1">
          Generate an invite link and share it with a player on Discord. They'll sign in and join the league automatically.
        </p>
      </div>

      {/* Generate form */}
      <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
        <div className="px-5 py-4 border-b border-white/8">
          <h3 className="text-white/70 text-xs font-bold uppercase tracking-wider">Generate Invite Link</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-white/50 text-xs mb-1.5">Discord Username</label>
              <input
                ref={inputRef}
                type="text"
                value={discordName}
                onChange={(e) => setDiscordName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                placeholder="e.g. madden_player99"
                className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:ring-1 focus:ring-[#5865F2]/60"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleGenerate}
                disabled={creating || !discordName.trim()}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                style={{ background: "#5865F2" }}
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {creating ? "Generating…" : "Generate Link"}
              </button>
            </div>
          </div>

          {/* Generated link box */}
          {newInviteToken && (
            <div
              className="rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-1"
              style={{ background: "rgba(88,101,242,0.1)", border: "1px solid rgba(88,101,242,0.25)" }}
            >
              <div className="flex items-center gap-2 text-[#818cf8] text-xs font-semibold">
                <Link2 className="h-3.5 w-3.5" />
                Invite link ready — copy and share with the player on Discord
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] text-white/70 break-all leading-relaxed font-mono">
                  {inviteLink(newInviteToken)}
                </code>
                <CopyButton text={inviteLink(newInviteToken)} />
              </div>
              <p className="text-white/30 text-[11px]">
                Expires in 7 days. The player must sign in with Discord to accept.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Invites table */}
      <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
          <h3 className="text-white/70 text-xs font-bold uppercase tracking-wider">All Invites</h3>
          <span className="text-white/30 text-xs">{invites.length} total</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-white/30" />
          </div>
        ) : invites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-8">
            <UserPlus className="h-8 w-8 text-white/15 mb-3" />
            <p className="text-white/40 text-sm">No invites yet</p>
            <p className="text-white/25 text-xs mt-1">Generate a link above to invite your first player.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  {["Discord User", "Invited By", "Created", "Expires", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr
                    key={inv.token}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ background: "rgba(88,101,242,0.2)", color: "#818cf8" }}
                        >
                          {inv.discord_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white/80 font-medium">{inv.discord_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/50">{inv.created_by}</td>
                    <td className="px-4 py-3 text-white/40 text-xs">{fmtDate(inv.created_at)}</td>
                    <td className="px-4 py-3 text-white/40 text-xs">{fmtDate(inv.expires_at)}</td>
                    <td className="px-4 py-3">
                      {inv.status === "accepted" && inv.accepted_by_discord_name ? (
                        <div className="space-y-0.5">
                          <StatusBadge status="accepted" />
                          <p className="text-white/30 text-[10px]">by {inv.accepted_by_discord_name}</p>
                        </div>
                      ) : (
                        <StatusBadge status={inv.status} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {inv.status === "pending" && (
                          <CopyButton text={inviteLink(inv.token)} />
                        )}
                        {inv.status !== "accepted" && (
                          <button
                            onClick={() => revokeInvite(inv.token)}
                            disabled={revoking === inv.token}
                            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
                            style={{ color: "rgba(248,113,113,0.7)", background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.15)" }}
                            title="Revoke invite"
                          >
                            {revoking === inv.token
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Trash2 className="h-3 w-3" />
                            }
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
