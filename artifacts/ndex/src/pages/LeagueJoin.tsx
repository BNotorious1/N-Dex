import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Shield, CheckCircle, XCircle, UserPlus, Loader2, LogIn, Users, Gamepad2 } from "lucide-react";

interface JoinInfo {
  token: string;
  league_id: number;
  league_name: string;
  commissioner: string;
  platform: string;
  member_count: number;
  max_members: number;
}

export default function LeagueJoin() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [info, setInfo] = useState<JoinInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/join/${token}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "not_found" : "error");
        return r.json() as Promise<JoinInfo>;
      })
      .then(setInfo)
      .catch((e) => setError(e.message === "not_found" ? "not_found" : "error"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoin = async () => {
    if (!token) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/join/${token}/accept`, {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 409) {
        // Already a member — just navigate there
        navigate(`/leagues/${info?.league_id}`);
        return;
      }
      if (!res.ok) throw new Error("failed");
      const data = await res.json() as { ok: boolean; league_id: number };
      setJoined(true);
      setTimeout(() => navigate(`/leagues/${data.league_id}`), 1800);
    } catch {
      setError("join_failed");
    } finally {
      setJoining(false);
    }
  };

  const signInUrl = `/api/auth/discord?returnTo=${encodeURIComponent(window.location.pathname)}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)" }}>
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (error === "not_found" || !info) {
    return <JoinStatus icon={<XCircle className="h-12 w-12 text-red-400" />} title="Link Not Found" description="This invite link is invalid or has been reset by the commissioner." />;
  }
  if (error === "join_failed") {
    return <JoinStatus icon={<XCircle className="h-12 w-12 text-red-400" />} title="Something Went Wrong" description="Couldn't join the league. Please try again or contact the commissioner." />;
  }
  if (joined) {
    return <JoinStatus icon={<CheckCircle className="h-12 w-12 text-green-400" />} title="You're In!" description={`Welcome to ${info.league_name}! Redirecting you now…`} />;
  }

  const platformLabel: Record<string, string> = { PS5: "PlayStation 5", XBOX: "Xbox", PC: "PC" };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)" }}>
      <div className="w-full max-w-md">
        {/* Brand */}
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
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="h-4 w-4 shrink-0" style={{ color: "#818cf8" }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#818cf8" }}>You've been invited</span>
            </div>
            <h1 className="text-white font-bold text-2xl">{info.league_name}</h1>
            <p className="text-white/50 text-sm mt-1">
              Commissioner: <span className="text-white/80 font-medium">{info.commissioner}</span>
            </p>
          </div>

          {/* Details */}
          <div className="px-8 py-6 space-y-5">
            <div className="rounded-xl border border-white/8 divide-y divide-white/8" style={{ background: "rgba(255,255,255,0.03)" }}>
              <Row icon={<Gamepad2 className="h-3.5 w-3.5" />} label="Platform" value={platformLabel[info.platform] ?? info.platform} />
              <Row icon={<Users className="h-3.5 w-3.5" />} label="Members" value={`${info.member_count} / ${info.max_members}`} />
            </div>

            {user ? (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-white transition-opacity disabled:opacity-60"
                style={{ background: "#5865F2" }}
              >
                {joining ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Joining…</>
                ) : (
                  <><UserPlus className="h-4 w-4" /> Join League</>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-white/50 text-sm text-center">Sign in with Discord to join this league.</p>
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

        <p className="text-center text-white/25 text-xs mt-6">N-Dex · Madden Franchise Tracker</p>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2 text-white/40 text-sm">
        <span style={{ color: "#818cf8" }}>{icon}</span>
        {label}
      </div>
      <span className="text-white/80 text-sm font-medium">{value}</span>
    </div>
  );
}

function JoinStatus({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
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
