interface League {
  id: number; name: string; commissioner_name: string;
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

export default function AdminSettingsSection({ league }: Props) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div>
          <h2 className="text-sm font-bold text-white">League Settings</h2>
          <p className="text-[11px] text-white/35 mt-0.5">Commissioner-only configuration. Contact support to make changes.</p>
        </div>
      </div>

      {/* Identity */}
      <SettingsCard title="Identity">
        <Field label="League Name" value={league.name} />
        <Field label="Commissioner" value={`@${league.commissioner_name}`} />
        <Field label="Description" value={league.description || "No description set."} />
      </SettingsCard>

      {/* Game Settings */}
      <SettingsCard title="Game Settings">
        <div className="grid grid-cols-2 gap-0">
          <Field label="Platform" value={league.platform} />
          <Field label="Difficulty" value={league.difficulty.replace(/_/g, " ")} />
          <Field label="Category" value={league.category} />
          <Field label="Skill Level" value={league.skill_level} />
          <Field label="Advance Time" value={`${league.advance_time_hours} hours`} />
          <Field
            label="Cross Play"
            value={league.is_cross_play ? "Enabled" : "Disabled"}
            valueColor={league.is_cross_play ? "text-[#00C8FF]" : "text-white/50"}
          />
          <Field
            label="Money League"
            value={league.is_money_league ? "Yes" : "No"}
            valueColor={league.is_money_league ? "text-[#F44336]" : "text-white/50"}
          />
          <Field label="Max Members" value={String(league.max_members)} />
        </div>
      </SettingsCard>

      {/* Season Progress */}
      <SettingsCard title="Season Progress">
        <div className="grid grid-cols-2 gap-0">
          <Field label="Current Season" value={String(league.season)} />
          <Field label="Current Week" value={String(league.week)} />
          <Field label="Phase" value={PHASE_LABEL[league.phase] ?? league.phase} />
          <Field label="Members" value={`${league.member_count} / ${league.max_members}`} />
        </div>
      </SettingsCard>

      {/* League ID */}
      <SettingsCard title="Technical">
        <Field label="League ID" value={String(league.id)} mono />
        <p className="text-[10px] text-white/25 mt-3 px-4 pb-3">
          Use this ID to connect external tools or the EA Companion app to this league.
        </p>
      </SettingsCard>
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
