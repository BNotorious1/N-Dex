import { useState, useEffect, useCallback, useRef } from "react";
import {
  Download, RefreshCw, RotateCcw, CheckCircle, AlertTriangle,
  Wifi, WifiOff, Clock, Copy, Check,
} from "lucide-react";

interface StatWeek {
  games: string | null;
  team: string | null;
  passing: string | null;
  rushing: string | null;
  receiving: string | null;
  kicking: string | null;
  punting: string | null;
  defense: string | null;
}

interface ExportInfo {
  league: string | null;
  rosters: string | null;
  statistics: Record<string, StatWeek>;
}

interface StatusData {
  is_ea_connected: boolean;
  export_info: ExportInfo;
  stats_cooldown_remaining_s: number;
  week: number;
}

interface Props {
  leagueId: number;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const STAT_COLS: { key: keyof StatWeek; label: string }[] = [
  { key: "games", label: "Games" },
  { key: "team", label: "Team" },
  { key: "passing", label: "Passing" },
  { key: "rushing", label: "Rushing" },
  { key: "receiving", label: "Receiving" },
  { key: "kicking", label: "Kicking" },
  { key: "punting", label: "Punting" },
  { key: "defense", label: "Defense" },
];

export default function AdminImportStatus({ leagueId }: Props) {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [copied, setCopied] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const importUrl = `${window.location.origin}/api/import/${leagueId}`;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/ea/export-info`);
      if (res.ok) {
        const d = (await res.json()) as StatusData;
        setData(d);
        setCooldown(d.stats_cooldown_remaining_s);
      }
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, [cooldown]);

  const doImport = async (key: string, path: string) => {
    if (importing) return;
    setImporting(key);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/ea/${path}`, { method: "POST" });
      const json = (await res.json()) as { export_info?: ExportInfo; message?: string; week?: number };
      if (!res.ok) throw new Error(json.message ?? "Import failed");
      if (json.export_info) {
        setData((prev) => prev ? {
          ...prev,
          export_info: json.export_info!,
          ...(json.week !== undefined ? { week: json.week } : {}),
        } : prev);
      }
      // Re-fetch full status after league/schedule imports — these update league.week
      if (key === "league-info" || key === "schedules") {
        await fetchStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setImporting(null);
    }
  };

  const doWeekImport = async (weekIndex: number) => {
    if (importing) return;
    setImporting(`week-${weekIndex}`);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/ea/import-week-stats/${weekIndex}`, { method: "POST" });
      const json = (await res.json()) as { export_info?: ExportInfo };
      if (json.export_info) {
        setData((prev) => prev ? { ...prev, export_info: json.export_info! } : prev);
      }
    } finally {
      setImporting(null);
    }
  };

  const doReset = async () => {
    const res = await fetch(`/api/leagues/${leagueId}/ea/reset-export-status`, { method: "POST" });
    const json = (await res.json()) as { export_info?: ExportInfo };
    if (json.export_info) {
      setData((prev) => prev ? { ...prev, export_info: json.export_info! } : prev);
    }
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(importUrl); }
    catch { const el = document.createElement("textarea"); el.value = importUrl; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-2 text-white/30 text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" />Loading import status…
        </div>
      </div>
    );
  }

  const isConnected = data?.is_ea_connected ?? false;
  const exportInfo = data?.export_info ?? { league: null, rosters: null, statistics: {} };
  const currentWeek = data?.week ?? 1;
  const anyImporting = importing !== null;

  const TopBtn = ({
    label, busy, disabled, onClick,
  }: { label: string; busy: boolean; disabled: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-[#00C8FF]/10 hover:border-[#00C8FF]/30 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 text-xs font-semibold text-white transition-colors"
    >
      {busy
        ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#00C8FF]" />
        : <Download className="h-3.5 w-3.5 text-[#00C8FF]" />}
      {label}
    </button>
  );

  return (
    <div className="max-w-5xl space-y-5">
      {/* Heading + refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white">Import Status</h2>
          <p className="text-[11px] text-white/35 mt-0.5">Track what data has been imported and trigger new imports.</p>
        </div>
        <button onClick={fetchStatus} className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/70 transition-colors">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Connection status */}
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${isConnected ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
        {isConnected
          ? <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
          : <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />}
        <div className="flex-1">
          <p className="text-xs font-semibold text-white">
            {isConnected ? "EA Account Connected" : "EA Account Not Connected"}
          </p>
          <p className="text-[11px] text-white/40 mt-0.5">
            {isConnected
              ? "You can import data directly from EA's servers using the buttons below."
              : "Connect your EA account via the EA Connect tab to enable direct imports. You can also use the Companion App URL below."}
          </p>
        </div>
        {isConnected && (
          <button
            onClick={doReset}
            className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}
      </div>

      {/* Top-level import buttons */}
      {isConnected && (
        <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/8 bg-[#0f0f0f]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Import Steps</p>
          </div>
          <div className="p-4 space-y-3">
            <ol className="text-[11px] text-white/40 list-decimal list-inside space-y-1 mb-4">
              <li><strong className="text-white/60">League Info</strong> — Import basic league information</li>
              <li><strong className="text-white/60">Rosters</strong> — Import team rosters and player data</li>
              <li><strong className="text-white/60">Import All Stats</strong> — Import all player stats (may take 5–10 min)</li>
            </ol>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div>
                <p className="text-[10px] text-white/30 mb-1.5">League Info</p>
                <p className={`text-[10px] mb-2 font-mono ${exportInfo.league ? "text-emerald-400" : "text-amber-400"}`}>
                  {exportInfo.league ? timeAgo(exportInfo.league) : "Missing"}
                </p>
                <TopBtn
                  label="Import"
                  busy={importing === "league-info"}
                  disabled={!isConnected || anyImporting}
                  onClick={() => void doImport("league-info", "import-league-info")}
                />
              </div>
              <div>
                <p className="text-[10px] text-white/30 mb-1.5">Rosters</p>
                <p className={`text-[10px] mb-2 font-mono ${exportInfo.rosters ? "text-emerald-400" : "text-amber-400"}`}>
                  {exportInfo.rosters ? timeAgo(exportInfo.rosters) : "Missing"}
                </p>
                <TopBtn
                  label="Import"
                  busy={importing === "rosters"}
                  disabled={!isConnected || anyImporting}
                  onClick={() => void doImport("rosters", "import-rosters")}
                />
              </div>
              <div>
                <p className="text-[10px] text-white/30 mb-1.5">Schedules</p>
                <p className={`text-[10px] mb-2 font-mono ${(exportInfo as unknown as Record<string,string|null>)["schedules"] ? "text-emerald-400" : "text-amber-400"}`}>
                  {(exportInfo as unknown as Record<string,string|null>)["schedules"] ? timeAgo((exportInfo as unknown as Record<string,string|null>)["schedules"]) : "Missing"}
                </p>
                <TopBtn
                  label="Import"
                  busy={importing === "schedules"}
                  disabled={!isConnected || anyImporting}
                  onClick={() => void doImport("schedules", "import-schedules")}
                />
              </div>
              <div>
                <p className="text-[10px] text-white/30 mb-1.5">All Stats</p>
                <p className="text-[10px] mb-2 text-white/25 flex items-center gap-1">
                  {cooldown > 0 ? <><Clock className="h-3 w-3" />{cooldown}s cooldown</> : "Ready"}
                </p>
                <button
                  onClick={() => { if (!cooldown && !anyImporting) void doImport("all-stats", "import-all-stats").then(() => setCooldown(1800)); }}
                  disabled={!isConnected || anyImporting || cooldown > 0}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${cooldown > 0 ? "border-white/8 bg-white/3 text-white/30" : "border-white/10 bg-white/5 hover:bg-[#00C8FF]/10 hover:border-[#00C8FF]/30 text-white"}`}
                >
                  {importing === "all-stats" ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#00C8FF]" /> : <Download className="h-3.5 w-3.5 text-[#00C8FF]" />}
                  {cooldown > 0 ? `Wait ${cooldown}s` : "Queue Import"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per-week stats table */}
      <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8 bg-[#0f0f0f]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Week-by-Week Stats</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left px-3 py-2 text-white/30 font-semibold w-8"></th>
                <th className="text-left px-3 py-2 text-white/30 font-semibold">Week</th>
                {STAT_COLS.map((c) => (
                  <th key={c.key} className="text-left px-3 py-2 text-white/30 font-semibold whitespace-nowrap">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 18 }, (_, i) => {
                const weekData = exportInfo.statistics[String(i)] as StatWeek | undefined;
                const isNotYetPlayed = i >= currentWeek;
                const isImportingThisWeek = importing === `week-${i}`;
                return (
                  <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={() => void doWeekImport(i)}
                        disabled={!isConnected || anyImporting || isNotYetPlayed}
                        title={`Import Week ${i + 1} Stats`}
                        className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-[#00C8FF]/15 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                      >
                        {isImportingThisWeek
                          ? <RefreshCw className="h-3 w-3 text-[#00C8FF] animate-spin" />
                          : <Download className="h-3 w-3 text-white/40 hover:text-[#00C8FF]" />}
                      </button>
                    </td>
                    <td className="px-3 py-1.5 font-semibold text-white/70">Week {i + 1}</td>
                    {STAT_COLS.map((c) => {
                      const val = weekData?.[c.key] ?? null;
                      return (
                        <td key={c.key} className="px-3 py-1.5">
                          {val ? (
                            <span className="text-emerald-400 font-mono">{timeAgo(val)}</span>
                          ) : isNotYetPlayed ? (
                            <span className="text-white/20">Not Played</span>
                          ) : (
                            <span className="text-amber-500/70">Missing</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Companion App URL */}
      <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8 bg-[#0f0f0f] flex items-center gap-2">
          {isConnected ? <Wifi className="h-3.5 w-3.5 text-[#00C8FF]" /> : <WifiOff className="h-3.5 w-3.5 text-white/25" />}
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Companion App Export URL</p>
        </div>
        <div className="p-4">
          <p className="text-[11px] text-white/35 mb-3">
            Alternatively, use the Madden Companion App to manually export data to this URL.
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
    </div>
  );
}
