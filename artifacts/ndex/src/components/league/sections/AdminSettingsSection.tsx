import { useState } from "react";
import { useUpdateLeague } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetLeagueSummaryQueryKey } from "@workspace/api-client-react";
import { Check, Pencil, X, Copy } from "lucide-react";

interface League {
  id: number; custom_id?: string | null; name: string; commissioner_name: string;
  platform: string; difficulty: string; category: string;
  skill_level: string; advance_time_hours: number;
  week: number; season: number; phase: string;
  member_count: number; max_members: number;
  is_cross_play: boolean; is_money_league: boolean;
  description?: string | null;
}

interface Props { league: League }

const PHASE_LABEL: Record<string, string> = {
  PRE_SEASON: "Pre Season",
  REGULAR_SEASON: "Regular Season",
  POST_SEASON: "Post Season",
  SUPER_BOWL: "Super Bowl",
};

const PLATFORMS = ["PS5", "Xbox", "PC"];
const DIFFICULTIES: { value: string; label: string }[] = [
  { value: "ROOKIE",    label: "Rookie"    },
  { value: "PRO",       label: "Pro"       },
  { value: "ALL_PRO",   label: "All-Pro"   },
  { value: "ALL_MADDEN",label: "All-Madden"},
];
const CATEGORIES = ["REGULAR", "FANTASY"];
const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

export default function AdminSettingsSection({ league }: Props) {
  const queryClient = useQueryClient();
  const updateLeague = useUpdateLeague();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: league.name,
    description: league.description ?? "",
    custom_id: league.custom_id ?? "",
    platform: league.platform,
    difficulty: league.difficulty,
    category: league.category,
    skill_level: league.skill_level,
    advance_time_hours: league.advance_time_hours,
    max_members: league.max_members,
    is_cross_play: league.is_cross_play,
    is_money_league: league.is_money_league,
  });
  const [customIdError, setCustomIdError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = () => {
    setCustomIdError(null);
    const customIdVal = form.custom_id.trim() === "" ? null : form.custom_id.trim();
    if (customIdVal && !/^[a-z0-9_-]+$/i.test(customIdVal)) {
      setCustomIdError("League ID may only contain letters, numbers, hyphens, and underscores.");
      return;
    }
    updateLeague.mutate(
      { id: league.id, data: { ...form, custom_id: customIdVal, advance_time_hours: Number(form.advance_time_hours), max_members: Number(form.max_members) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetLeagueSummaryQueryKey(league.id) });
          setEditing(false);
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "Failed to save";
          if (msg.includes("taken") || msg.includes("unique") || msg.includes("duplicate") || msg.includes("409")) {
            setCustomIdError("That League ID is already taken. Please choose a different one.");
          }
        },
      }
    );
  };

  const handleCancel = () => {
    setCustomIdError(null);
    setForm({
      name: league.name,
      description: league.description ?? "",
      custom_id: league.custom_id ?? "",
      platform: league.platform,
      difficulty: league.difficulty,
      category: league.category,
      skill_level: league.skill_level,
      advance_time_hours: league.advance_time_hours,
      max_members: league.max_members,
      is_cross_play: league.is_cross_play,
      is_money_league: league.is_money_league,
    });
    setEditing(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white">League Settings</h2>
          <p className="text-[11px] text-white/35 mt-0.5">Commissioner-only configuration</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-[11px] text-[#00C8FF] font-semibold">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
          {editing ? (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateLeague.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-[#00C8FF] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#00b3e0] transition-colors disabled:opacity-50"
              >
                <Check className="h-3 w-3" /> {updateLeague.isPending ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white hover:border-white/25 transition-colors"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Identity */}
      <SettingsCard title="Identity">
        <EditRow label="League Name" editing={editing}>
          <input
            value={form.name}
            onChange={e => set("name", e.target.value)}
            className="w-full rounded-md bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white focus:border-[#00C8FF]/40 focus:outline-none"
          />
        </EditRow>
        <Field label="Commissioner" value={`@${league.commissioner_name}`} />
        <EditRow label="Description" editing={editing}>
          <textarea
            value={form.description}
            onChange={e => set("description", e.target.value)}
            rows={2}
            className="w-full rounded-md bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white focus:border-[#00C8FF]/40 focus:outline-none resize-none"
          />
        </EditRow>
        <EditRow label="Custom League ID" editing={editing}>
          <div className="space-y-1">
            <input
              value={form.custom_id}
              onChange={e => { set("custom_id", e.target.value); setCustomIdError(null); }}
              placeholder={String(league.id)}
              className="w-full rounded-md bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono focus:border-[#00C8FF]/40 focus:outline-none"
            />
            {customIdError && <p className="text-[10px] text-[#F44336]">{customIdError}</p>}
            <p className="text-[10px] text-white/25">Letters, numbers, hyphens, underscores only. Leave blank to use numeric ID.</p>
          </div>
        </EditRow>
      </SettingsCard>

      {/* Game Settings */}
      <SettingsCard title="Game Settings">
        <div className={editing ? "space-y-0" : "grid grid-cols-2 gap-0"}>
          <EditRow label="Platform" editing={editing}>
            <select value={form.platform} onChange={e => set("platform", e.target.value)} className={selectCls}>
              {PLATFORMS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </EditRow>
          <EditRow label="Difficulty" editing={editing}>
            <select value={form.difficulty} onChange={e => set("difficulty", e.target.value)} className={selectCls}>
              {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </EditRow>
          <EditRow label="Category" editing={editing}>
            <select value={form.category} onChange={e => set("category", e.target.value)} className={selectCls}>
              {CATEGORIES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </EditRow>
          <EditRow label="Skill Level" editing={editing}>
            <select value={form.skill_level} onChange={e => set("skill_level", e.target.value)} className={selectCls}>
              {SKILL_LEVELS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </EditRow>
          <EditRow label="Advance Time (hrs)" editing={editing}>
            <input
              type="number" min={1} max={168}
              value={form.advance_time_hours}
              onChange={e => set("advance_time_hours", Number(e.target.value))}
              className={inputCls}
            />
          </EditRow>
          <EditRow label="Max Members" editing={editing}>
            <input
              type="number" min={2} max={32}
              value={form.max_members}
              onChange={e => set("max_members", Number(e.target.value))}
              className={inputCls}
            />
          </EditRow>
          <EditRow label="Cross Play" editing={editing}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_cross_play}
                onChange={e => set("is_cross_play", e.target.checked)}
                className="accent-[#00C8FF]"
              />
              <span className="text-xs text-white">{form.is_cross_play ? "Enabled" : "Disabled"}</span>
            </label>
          </EditRow>
          <EditRow label="Money League" editing={editing}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_money_league}
                onChange={e => set("is_money_league", e.target.checked)}
                className="accent-[#F44336]"
              />
              <span className="text-xs text-white">{form.is_money_league ? "Yes" : "No"}</span>
            </label>
          </EditRow>
        </div>
      </SettingsCard>

      {/* Season Progress (read-only) */}
      <SettingsCard title="Season Progress">
        <div className="grid grid-cols-2 gap-0">
          <Field label="Current Season" value={String(league.season)} />
          <Field label="Current Week" value={String(league.week)} />
          <Field label="Phase" value={PHASE_LABEL[league.phase] ?? league.phase} />
          <Field label="Members" value={`${league.member_count} / ${league.max_members}`} />
        </div>
      </SettingsCard>

      {/* Technical */}
      <SettingsCard title="Technical">
        <LeagueIdField id={league.id} customId={league.custom_id ?? null} />
        <p className="text-[10px] text-white/25 mt-3 px-4 pb-3">
          Use the League ID to connect external tools or the EA Companion app to this league.
        </p>
      </SettingsCard>
    </div>
  );
}

const selectCls = "w-full rounded-md bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white focus:border-[#00C8FF]/40 focus:outline-none";
const inputCls = "w-full rounded-md bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white focus:border-[#00C8FF]/40 focus:outline-none";

function EditRow({ label, children, editing }: { label: string; children: React.ReactNode; editing: boolean }) {
  if (!editing) return null;
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/40 shrink-0 w-36">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/8 bg-[#0f0f0f]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{title}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Field({
  label, value, valueColor = "text-white", mono = false,
}: {
  label: string; value: string; valueColor?: string; mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/40">{label}</span>
      <span className={`text-xs font-semibold ${valueColor} ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function LeagueIdField({ id, customId }: { id: number; customId: string | null }) {
  const [copied, setCopied] = useState(false);
  const displayVal = customId ?? String(id);
  const handleCopy = () => {
    navigator.clipboard.writeText(displayVal).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-0 gap-3">
      <div>
        <span className="text-xs text-white/40">League ID</span>
        {customId && <p className="text-[10px] text-white/25 mt-0.5">Numeric: {id}</p>}
      </div>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={displayVal}
          onFocus={e => e.target.select()}
          className="w-36 rounded-md bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-white font-mono text-right focus:border-[#00C8FF]/40 focus:outline-none cursor-text select-all"
        />
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/50 hover:text-white hover:border-white/25 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <Check className="h-3 w-3 text-[#00C8FF]" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
