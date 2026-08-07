import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Shield, CheckCircle, XCircle, Clock, Loader2, LogIn, UserPlus } from "lucide-react";

interface InviteInfo {
  token: string;
  discord_name: string;
  created_by: string;
  league_id: number;
  league_name: string | null;
  expires_at: string;
  accepted_at: string | null;
  accepted_by_discord_name: string | null;
  status: "pending" | "accepted" | "expired";
}

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invites/${token}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "not_found" : "error");
        return r.json() as Promise<InviteInfo>;
      })
      .then(setInvite)
      .catch((e) => setError(e.message === "not_found" ? "not_found" : "error"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 409) {
        const body = await res.json() as { error: string };
        // Already a member — just go to the league
        if (body.error === "Already a member of this league") {
          navigate(`/leagues/${invite?.league_id}`);
          return;
        }
        setError("already_used");
        return;
      }
      if (!res.ok) throw new Error("failed");
      const data = await res.json() as { ok: boolean; league_id: number };
      setAccepted(true);
      setTimeout(() => navigate(`/leagues/${data.league_id}`), 1800);
    } catch {
      setError("accept_failed");
    } finally {
      setAccepting(false);
    }
  };

  const signInUrl = `/api/auth/discord?returnTo=${encodeURIComponent(window.location.pathname)}`;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)" }}>
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  // ── Error / Not found ────────────────────────────────────────────────────
  if (error === "not_found" || !invite) {
    return <InviteStatus icon={<XCircle className="h-12 w-12 text-red-400" />} title="Invite Not Found" description="This invite link is invalid or has been revoked." />;
  }
  if (error === "already_used" || invite.status === "accepted") {
    return <InviteStatus icon={<CheckCircle className="h-12 w-12 text-green-400" />} title="Invite Already Used" description={`This invite was already accepted${invite.accepted_by_discord_name ? ` by ${invite.accepted_by_discord_name}` : ""}.`} />;
  }
  if (invite.status === "expired") {
    return <InviteStatus icon={<Clock className="h-12 w-12 text-yellow-400" />} title="Invite Expired" description="This invite link has expired. Ask the commissioner to send a new one." />;
  }
  if (error === "accept_failed") {
    return <InviteStatus icon={<XCircle className="h-12 w-12 text-red-400" />} title="Something Went Wrong" description="Could not accept this invite. Please try again or contact the league commissioner." />;
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (accepted) {
    return (
      <InviteStatus
        icon={<CheckCircle className="h-12 w-12 text-green-400" />}
        title="You're In!"
        description={`Welcome to ${invite.league_name ?? "the league"}! Redirecting you now…`}
      />
    );
  }

  // ── Main invite card ─────────────────────────────────────────────────────
  const expiresDate = new Date(invite.expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)" }}>
      <div className="w-full max-w-md">
        {/* Logo / brand */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8" style={{ color: "#5865F2" }} />
            <span className="text-white font-bold text-2xl tracking-tight">N-Dex</span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
          {/* Header */}
          <div className="px-8 py-6 border-b border-white/10" style={{ background: "rgba(88,101,242,0.12)" }}>
            <div className="flex items-center gap-3 mb-1">
              <UserPlus className="h-5 w-5 shrink-0" style={{ color: "#5865F2" }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#5865F2" }}>League Invitation</span>
            </div>
            <h1 className="text-white font-bold text-2xl mt-2">
              {invite.league_name ?? "A League"}
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Invited by <span className="text-white/80 font-medium">{invite.created_by}</span>
            </p>
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-5">
            {/* Invite details */}
            <div className="rounded-xl border border-white/8 divide-y divide-white/8" style={{ background: "rgba(255,255,255,0.03)" }}>
              <Row label="Invited for" value={invite.discord_name} />
              <Row label="Expires" value={expiresDate} />
            </div>

            {/* Username mismatch warning */}
            {user && user.username !== invite.discord_name && (
              <div className="rounded-lg border border-yellow-500/20 px-4 py-3" style={{ background: "rgba(245,158,11,0.07)" }}>
                <p className="text-yellow-300/80 text-xs leading-relaxed">
                  This invite was for <strong>{invite.discord_name}</strong>, but you're logged in as <strong>{user.username}</strong>. You can still accept it if the commissioner intended it for you.
                </p>
              </div>
            )}

            {/* CTA */}
            {user ? (
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-white transition-opacity disabled:opacity-60"
                style={{ background: "#5865F2" }}
              >
                {accepting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Joining…</>
                ) : (
                  <><UserPlus className="h-4 w-4" /> Accept Invite &amp; Join League</>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-white/50 text-sm text-center">Sign in with Discord to accept this invite.</p>
                <a
                  href={signInUrl}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-white no-underline"
                  style={{ background: "#5865F2" }}
                >
                  <LogIn className="h-4 w-4" />
                  Sign In with Discord
                </a>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-white/25 text-xs mt-6">
          N-Dex · Madden Franchise Tracker
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-white/40 text-sm">{label}</span>
      <span className="text-white/80 text-sm font-medium">{value}</span>
    </div>
  );
}

function InviteStatus({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)" }}>
      <div className="text-center max-w-sm space-y-4">
        <div className="flex justify-center">{icon}</div>
        <h1 className="text-white font-bold text-xl">{title}</h1>
        <p className="text-white/50 text-sm leading-relaxed">{description}</p>
        <a href="/ndex" className="inline-block mt-4 text-sm text-white/40 hover:text-white/70 transition-colors">← Back to N-Dex</a>
      </div>
    </div>
  );
}
