import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Link2, Copy, Check, RefreshCw, Loader2, AlertTriangle } from "lucide-react";

interface JoinLinkData {
  token: string;
  league_id: number;
  league_name: string;
}

interface Props {
  leagueId: number;
}

function joinUrl(token: string) {
  return `${window.location.origin}${import.meta.env.BASE_URL}join/${token}`;
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
      className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all"
      style={copied
        ? { background: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.3)" }
        : { background: "#5865F2", color: "#fff", border: "1px solid transparent" }
      }
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied!" : "Copy Link"}
    </button>
  );
}

export default function AdminInviteSection({ leagueId }: Props) {
  const qc = useQueryClient();
  const queryKey = ["league-join-link", leagueId];
  const [showConfirm, setShowConfirm] = useState(false);

  const { data, isLoading } = useQuery<JoinLinkData>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/leagues/${leagueId}/join-link`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load join link");
      return res.json() as Promise<JoinLinkData>;
    },
  });

  const { mutate: regenerate, isPending: regenerating } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leagues/${leagueId}/join-link/regenerate`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to regenerate");
      return res.json() as Promise<JoinLinkData>;
    },
    onSuccess: (newData) => {
      qc.setQueryData(queryKey, newData);
      setShowConfirm(false);
    },
  });

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-white font-bold text-xl flex items-center gap-2">
          <UserPlus className="h-5 w-5 shrink-0" style={{ color: "#5865F2" }} />
          Invite Players
        </h2>
        <p className="text-white/40 text-sm mt-1">
          Share this link with anyone you want to join your league. Anyone with the link can sign in with Discord and join automatically.
        </p>
      </div>

      {/* Link card */}
      <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
        <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
          <Link2 className="h-4 w-4 shrink-0" style={{ color: "#818cf8" }} />
          <h3 className="text-white/70 text-xs font-bold uppercase tracking-wider">League Join Link</h3>
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="flex items-center gap-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-white/30" />
              <span className="text-white/30 text-sm">Loading…</span>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* URL display */}
              <div
                className="flex items-center gap-3 rounded-xl p-4"
                style={{ background: "rgba(88,101,242,0.08)", border: "1px solid rgba(88,101,242,0.2)" }}
              >
                <code className="flex-1 text-sm text-white/70 break-all font-mono leading-relaxed">
                  {joinUrl(data.token)}
                </code>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <CopyButton text={joinUrl(data.token)} />
                <button
                  onClick={() => setShowConfirm(true)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reset Link
                </button>
              </div>
            </div>
          ) : (
            <p className="text-red-400/70 text-sm">Failed to load join link.</p>
          )}
        </div>
      </div>

      {/* Reset confirmation */}
      {showConfirm && (
        <div
          className="rounded-xl border p-5 space-y-4"
          style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.25)" }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
            <div>
              <p className="text-white/80 text-sm font-semibold">Reset the join link?</p>
              <p className="text-white/40 text-xs mt-1 leading-relaxed">
                The old link will stop working immediately. Anyone who already joined via the old link keeps their membership.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => regenerate()}
              disabled={regenerating}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "#F59E0B" }}
            >
              {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {regenerating ? "Resetting…" : "Yes, Reset It"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="rounded-xl border border-white/8 p-5 space-y-3" style={{ background: "rgba(255,255,255,0.02)" }}>
        <h4 className="text-white/50 text-xs font-bold uppercase tracking-wider">How it works</h4>
        <ol className="space-y-2">
          {[
            "Copy the link above and share it with your players on Discord.",
            "They open the link and sign in with their Discord account.",
            "They're automatically added to your league's member list.",
            "Assign them a team and set permissions from the Members tab.",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-white/40">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold mt-0.5"
                style={{ background: "rgba(88,101,242,0.2)", color: "#818cf8" }}
              >
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
