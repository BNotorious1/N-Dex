import { useState, useEffect } from "react";
import {
  CheckCircle, ChevronRight, Loader2, Link2, AlertTriangle,
  LogIn, Users, Trophy, ArrowRight, LinkIcon,
} from "lucide-react";

interface Persona {
  personaId: string;
  displayName: string;
}

interface EALeague {
  leagueId: string;
  leagueName: string;
  userTeamName: string;
}

interface LeagueInfo {
  is_ea_connected: boolean;
}

interface Props {
  leagueId: number;
}

const STEPS = [
  { n: 1, label: "Connect to EA", icon: LogIn },
  { n: 2, label: "Select Persona", icon: Users },
  { n: 3, label: "Select League", icon: Trophy },
  { n: 4, label: "Done", icon: CheckCircle },
];

export default function AdminEAConnect({ leagueId }: Props) {
  const [step, setStep] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Step 1 state
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [pastedCode, setPastedCode] = useState("");

  // Step 2 state
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [accessToken, setAccessToken] = useState("");

  // Step 3 state
  const [eaLeagues, setEaLeagues] = useState<EALeague[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<EALeague | null>(null);
  const [eaTokenData, setEaTokenData] = useState<{
    access_token: string; refresh_token: string; expiry: number; systemConsole: string; blazeId: string;
  } | null>(null);
  const [personaError, setPersonaError] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/leagues/${leagueId}/ea/export-info`);
      if (res.ok) {
        const d = (await res.json()) as { is_ea_connected: boolean };
        setIsConnected(d.is_ea_connected);
        if (d.is_ea_connected) setStep(4);
      }
      setLoading(false);
    })();
  }, [leagueId]);

  const openEALogin = async () => {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/leagues/${leagueId}/ea/login-url`);
      const { url } = (await res.json()) as { url: string };
      window.open(url, "_blank");
    } catch {
      setError("Failed to generate EA login URL.");
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    if (!pastedCode.trim()) return;
    setBusy(true); setError("");
    try {
      let code = pastedCode.trim();
      if (code.includes("code=")) {
        try { code = new URL(code).searchParams.get("code") ?? code; }
        catch { const idx = code.indexOf("code="); if (idx >= 0) code = code.slice(idx + 5).split("&")[0]; }
      }
      const res = await fetch(`/api/leagues/${leagueId}/ea/retrieve-personas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as { access_token?: string; personas?: Persona[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Failed to retrieve personas");
      setAccessToken(data.access_token ?? "");
      setPersonas(data.personas ?? []);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const selectPersona = async () => {
    if (!selectedPersona) return;
    setBusy(true); setPersonaError("");
    try {
      const res = await fetch(`/api/leagues/${leagueId}/ea/select-league`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_persona: JSON.stringify(selectedPersona), access_token: accessToken }),
      });
      const data = (await res.json()) as {
        access_token?: string; refresh_token?: string; expiry?: number;
        systemConsole?: string; blazeId?: string; leagues?: EALeague[]; message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Failed to load leagues");
      setEaTokenData({
        access_token: data.access_token ?? "",
        refresh_token: data.refresh_token ?? "",
        expiry: data.expiry ?? 0,
        systemConsole: data.systemConsole ?? "",
        blazeId: data.blazeId ?? "",
      });
      setEaLeagues(data.leagues ?? []);
      setStep(3);
    } catch (err) {
      setPersonaError(err instanceof Error ? err.message : "Failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const connectLeague = async () => {
    if (!selectedLeague || !eaTokenData) return;
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/leagues/${leagueId}/ea/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: eaTokenData.access_token,
          refresh_token: eaTokenData.refresh_token,
          expiry: eaTokenData.expiry,
          console: eaTokenData.systemConsole,
          selected_league: selectedLeague.leagueId,
          blaze_id: eaTokenData.blazeId,
        }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { message?: string };
        throw new Error(d.message ?? "Failed to connect");
      }
      setIsConnected(true);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const unlinkAccount = async () => {
    setBusy(true);
    await fetch(`/api/leagues/${leagueId}/ea/unlink`, { method: "POST" });
    setIsConnected(false);
    setStep(1);
    setPastedCode(""); setPersonas([]); setSelectedPersona(null);
    setEaLeagues([]); setSelectedLeague(null); setEaTokenData(null);
    setAccessToken(""); setError(""); setPersonaError("");
    setBusy(false);
  };

  const leagueInfo = { is_ea_connected: isConnected } as LeagueInfo;
  void leagueInfo;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-5 w-5 animate-spin text-white/30" />
    </div>
  );

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white">EA Connect</h2>
          <p className="text-[11px] text-white/35 mt-0.5">
            Link your EA account to sync Madden franchise data automatically.
          </p>
        </div>
        {isConnected && (
          <button
            onClick={unlinkAccount}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-[#F44336]/30 bg-[#F44336]/8 text-[#F44336] px-3 py-1.5 text-xs font-semibold hover:bg-[#F44336]/15 transition-colors disabled:opacity-40"
          >
            <LinkIcon className="h-3.5 w-3.5" /> Unlink EA
          </button>
        )}
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = step > s.n;
          const active = step === s.n;
          return (
            <div key={s.n} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                done ? "text-emerald-400 bg-emerald-500/10" :
                active ? "text-[#00C8FF] bg-[#00C8FF]/10" :
                "text-white/25 bg-white/3"
              }`}>
                <Icon className="h-3 w-3" />
                <span className="hidden sm:block">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-white/15 shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Connect */}
      {step === 1 && (
        <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/8 bg-[#0f0f0f]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Step 1 — Connect to EA Account</p>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-xs text-white/50">
              Click the button below to sign in with your EA account. After logging in, you'll land on a blank page — copy the full URL from your browser's address bar and paste it below.
            </p>

            {!showDisclaimer ? (
              <button
                onClick={() => setShowDisclaimer(true)}
                className="flex items-center gap-2 rounded-lg border border-[#00C8FF]/30 bg-[#00C8FF]/10 hover:bg-[#00C8FF]/20 px-4 py-2.5 text-xs font-semibold text-[#00C8FF] transition-colors"
              >
                <LogIn className="h-4 w-4" /> Connect with EA
              </button>
            ) : (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-white mb-1">Important Legal Disclaimer</p>
                    <ul className="text-[10px] text-white/40 space-y-1 list-disc list-inside">
                      <li>This is an <strong className="text-white/60">unofficial</strong> integration with EA's services.</li>
                      <li>We <strong className="text-white/60">do not store your EA password</strong> — only auth tokens.</li>
                      <li>There is a risk of account restrictions when using unofficial tools with EA.</li>
                      <li>We are not responsible for any actions taken by EA against your account.</li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowDisclaimer(false)} className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">Cancel</button>
                  <button
                    onClick={() => { setShowDisclaimer(false); void openEALogin(); }}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-lg bg-[#00C8FF] text-black px-3 py-1.5 text-xs font-bold hover:bg-[#00C8FF]/90 transition-colors disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogIn className="h-3 w-3" />}
                    I Accept — Open EA Login
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-white/8 bg-[#0f0f0f] p-3 text-[10px] text-white/35 space-y-1">
              <p className="font-semibold text-white/50">After you log in:</p>
              <p>The page will go blank or show an error. This is expected.</p>
              <p>Copy the full URL from your browser's address bar — it starts with <code className="text-[#00C8FF]/80">http://127.0.0.1/success?code=…</code></p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-white/40">Paste EA authorization URL or code:</label>
              <div className="flex gap-2">
                <input
                  value={pastedCode}
                  onChange={(e) => setPastedCode(e.target.value)}
                  placeholder="http://127.0.0.1/success?code=... or paste code"
                  className="flex-1 rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#00C8FF]/40"
                />
                <button
                  onClick={submitCode}
                  disabled={!pastedCode.trim() || busy}
                  className="flex items-center gap-1.5 rounded-lg bg-[#00C8FF] text-black px-3 py-2 text-xs font-bold disabled:opacity-40 transition-opacity"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  Submit
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-[#F44336]">{error}</p>}
          </div>
        </div>
      )}

      {/* Step 2: Select Persona */}
      {step === 2 && (
        <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/8 bg-[#0f0f0f]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Step 2 — Select Your Persona</p>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-white/50">Choose the persona associated with your Madden entitlements.</p>
            {personas.length === 0 ? (
              <p className="text-xs text-amber-400">No personas found for this account.</p>
            ) : (
              <div className="rounded-lg border border-white/8 overflow-hidden divide-y divide-white/5">
                {personas.map((p) => (
                  <button
                    key={p.personaId}
                    onClick={() => setSelectedPersona(p)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-xs transition-colors ${selectedPersona?.personaId === p.personaId ? "bg-[#00C8FF]/10 text-[#00C8FF]" : "text-white/70 hover:bg-white/4"}`}
                  >
                    <span className="font-semibold">{p.displayName}</span>
                    {selectedPersona?.personaId === p.personaId && <CheckCircle className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            )}
            {personaError && <p className="text-xs text-[#F44336]">{personaError}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setStep(1)} className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">← Back</button>
              <button
                onClick={selectPersona}
                disabled={!selectedPersona || busy}
                className="flex items-center gap-1.5 rounded-lg bg-[#00C8FF] text-black px-4 py-1.5 text-xs font-bold disabled:opacity-40 transition-opacity"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Select League */}
      {step === 3 && (
        <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/8 bg-[#0f0f0f]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Step 3 — Select Your League</p>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-white/50">Choose the Madden franchise you want to sync with N-Dex.</p>
            {eaLeagues.length === 0 ? (
              <p className="text-xs text-amber-400">No leagues found for this persona.</p>
            ) : (
              <div className="rounded-lg border border-white/8 overflow-hidden divide-y divide-white/5">
                {eaLeagues.map((l) => (
                  <button
                    key={l.leagueId}
                    onClick={() => setSelectedLeague(l)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-xs transition-colors ${selectedLeague?.leagueId === l.leagueId ? "bg-[#00C8FF]/10 text-[#00C8FF]" : "text-white/70 hover:bg-white/4"}`}
                  >
                    <div className="text-left">
                      <p className="font-semibold">{l.leagueName}</p>
                      <p className="text-white/35 text-[10px]">Your team: {l.userTeamName}</p>
                    </div>
                    {selectedLeague?.leagueId === l.leagueId && <CheckCircle className="h-4 w-4 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
            {error && <p className="text-xs text-[#F44336]">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setStep(2)} className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">← Back</button>
              <button
                onClick={connectLeague}
                disabled={!selectedLeague || busy}
                className="flex items-center gap-1.5 rounded-lg bg-[#00C8FF] text-black px-4 py-1.5 text-xs font-bold disabled:opacity-40 transition-opacity"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                Connect League
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Success / Already Connected */}
      {step === 4 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <CheckCircle className="h-10 w-10 text-emerald-400" />
            <div>
              <p className="text-sm font-bold text-white">EA Account Connected</p>
              <p className="text-[11px] text-white/40 mt-1">
                Your Madden franchise is linked. Head to Import Status to begin importing data.
              </p>
            </div>
            <p className="text-[10px] text-white/25">
              To disconnect, click "Unlink EA" at the top of this page.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
