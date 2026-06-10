import { useState, useEffect, useCallback } from "react";
import { Copy, Check, RefreshCw, Wifi, WifiOff } from "lucide-react";

interface ImportRecord {
  id: number;
  import_type: string;
  status: string;
  records_processed: number;
  error_message: string | null;
  created_at: string;
}

interface Props {
  leagueId: number;
}

const TYPE_LABELS: Record<string, string> = {
  leagueTeams: "Teams",
  leagueRosters: "Rosters",
  leagueStandings: "Standings",
  leagueSchedules: "Schedule",
  unknown: "Unknown",
};

export default function AdminEAConnect({ leagueId }: Props) {
  const importUrl = `${window.location.origin}/api/import/${leagueId}`;
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<ImportRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/import/${leagueId}/history`);
      if (res.ok) setHistory(await res.json());
    } finally {
      setLoadingHistory(false);
    }
  }, [leagueId]);

  useEffect(() => { void fetchHistory(); }, [fetchHistory]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(importUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = importUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-sm font-bold text-white">EA Connect</h2>
        <p className="text-[11px] text-white/35 mt-0.5">
          Use the Madden Companion App to automatically sync franchise data into N-Dex.
        </p>
      </div>

      {/* Import URL card */}
      <div className="rounded-xl border border-[#00C8FF]/20 bg-[#00C8FF]/5 overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#00C8FF]/60 mb-1">Your Import URL</p>
          <p className="text-[10px] text-white/35 mb-3">
            Paste this into the Madden Companion App to begin syncing data.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2.5">
            <code className="flex-1 text-xs text-[#00C8FF] font-mono truncate">{importUrl}</code>
            <button
              onClick={handleCopy}
              className="shrink-0 flex items-center gap-1.5 rounded-md bg-[#00C8FF]/10 hover:bg-[#00C8FF]/20 border border-[#00C8FF]/20 px-3 py-1.5 text-[11px] font-semibold text-[#00C8FF] transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {/* Setup instructions */}
      <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8 bg-[#0f0f0f]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">How to Connect</p>
        </div>
        <ol className="divide-y divide-white/5">
          {[
            { n: 1, title: "Open Madden Companion App", desc: "Download from the App Store or Google Play and sign in with your EA account." },
            { n: 2, title: "Open your franchise", desc: "Navigate to your franchise in the app. Make sure it's the same franchise you want to sync here." },
            { n: 3, title: "Go to Settings → Export", desc: 'Find the "Export" or "League Data" option in the Companion App settings.' },
            { n: 4, title: "Paste your Import URL", desc: "Enter the URL above as the league export destination. The app will use it for all future exports." },
            { n: 5, title: "Tap Export", desc: "Export your data. N-Dex will receive teams, rosters, standings, and schedules automatically." },
          ].map((step) => (
            <li key={step.n} className="flex gap-3 px-4 py-3">
              <div className="h-5 w-5 rounded-full bg-[#00C8FF]/10 border border-[#00C8FF]/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[9px] font-black text-[#00C8FF]">{step.n}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{step.title}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Supported data types */}
      <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8 bg-[#0f0f0f]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Supported Data Types</p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-white/5">
          {[
            { label: "Teams", desc: "Names, ratings, colors" },
            { label: "Rosters", desc: "Players + all attributes" },
            { label: "Standings", desc: "W/L/T records" },
            { label: "Schedule", desc: "Games & scores" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 px-4 py-3">
              <Wifi className="h-3 w-3 text-[#00C8FF]/50 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">{item.label}</p>
                <p className="text-[10px] text-white/35">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Import history */}
      <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8 bg-[#0f0f0f] flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Import History</p>
          <button
            onClick={fetchHistory}
            disabled={loadingHistory}
            className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`h-3 w-3 ${loadingHistory ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2">
            <WifiOff className="h-6 w-6 text-white/15" />
            <p className="text-xs text-white/25">No imports yet.</p>
            <p className="text-[10px] text-white/15">Exports from the Companion App will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {history.map((row) => (
              <div key={row.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${row.status === "success" ? "bg-emerald-500" : "bg-[#F44336]"}`} />
                  <span className="text-xs font-semibold text-white">
                    {TYPE_LABELS[row.import_type] ?? row.import_type}
                  </span>
                  {row.records_processed > 0 && (
                    <span className="text-[10px] text-white/30">{row.records_processed} records</span>
                  )}
                </div>
                <div className="text-right">
                  {row.error_message && (
                    <p className="text-[10px] text-[#F44336] truncate max-w-[180px]">{row.error_message}</p>
                  )}
                  <p className="text-[10px] text-white/25">
                    {new Date(row.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
