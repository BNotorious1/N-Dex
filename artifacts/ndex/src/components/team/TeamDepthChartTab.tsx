import { Link } from "wouter";
import { fmtHeight, ovrColor, DEV_LABEL, DEV_COLOR, type TeamPlayer } from "./types";

type AttrKey = keyof TeamPlayer;
interface AttrCol { key: AttrKey; label: string }

// Common base columns for all groups (after OVR/DEV/AGE/HGT/WGT)
const BASE_PHYS: AttrCol[] = [
  { key: "speed", label: "SPD" },
  { key: "strength", label: "STR" },
  { key: "agility", label: "AGI" },
  { key: "acceleration", label: "ACC" },
  { key: "awareness", label: "AWR" },
];

const DEPTH_GROUPS: Array<{
  label: string;
  positions: string[];
  extra: AttrCol[];
}> = [
  {
    label: "Quarterbacks",
    positions: ["QB"],
    extra: [
      { key: "throwing_power", label: "THP" },
      { key: "throw_accuracy_short", label: "SAC" },
      { key: "throw_accuracy_mid", label: "MAC" },
      { key: "throw_accuracy_deep", label: "DAC" },
      { key: "throw_on_run", label: "TOR" },
      { key: "throw_under_pressure", label: "TUP" },
      { key: "play_action", label: "PAC" },
      { key: "break_sack", label: "BKS" },
    ],
  },
  {
    label: "Running Backs",
    positions: ["HB", "RB", "FB"],
    extra: [
      { key: "break_tackle", label: "BTK" },
      { key: "carrying", label: "CAR" },
      { key: "juke_move", label: "JKM" },
      { key: "stiff_arm", label: "STF" },
      { key: "spin_move", label: "SPM" },
      { key: "trucking", label: "TRK" },
      { key: "ball_carrier_vision", label: "BCV" },
    ],
  },
  {
    label: "Wide Receivers",
    positions: ["WR"],
    extra: [
      { key: "change_of_direction", label: "COD" },
      { key: "jumping", label: "JMP" },
      { key: "catching", label: "CTH" },
      { key: "catch_in_traffic", label: "CIT" },
      { key: "spectacular_catch", label: "SPC" },
      { key: "route_run_short", label: "SRR" },
      { key: "route_run_mid", label: "MRR" },
      { key: "route_run_deep", label: "DRR" },
      { key: "release", label: "RLS" },
    ],
  },
  {
    label: "Tight Ends",
    positions: ["TE"],
    extra: [
      { key: "catching", label: "CTH" },
      { key: "catch_in_traffic", label: "CIT" },
      { key: "spectacular_catch", label: "SPC" },
      { key: "route_run_short", label: "SRR" },
      { key: "route_run_mid", label: "MRR" },
      { key: "route_run_deep", label: "DRR" },
      { key: "release", label: "RLS" },
      { key: "run_block", label: "RBK" },
      { key: "pass_block", label: "PBK" },
      { key: "impact_block", label: "IBK" },
    ],
  },
  {
    label: "Offensive Line",
    positions: ["LT", "LG", "C", "RG", "RT", "OL"],
    extra: [
      { key: "pass_block", label: "PBK" },
      { key: "pass_block_power", label: "PPW" },
      { key: "pass_block_finesse", label: "PFN" },
      { key: "run_block", label: "RBK" },
      { key: "run_block_power", label: "RPW" },
      { key: "run_block_finesse", label: "RFN" },
      { key: "impact_block", label: "IBK" },
    ],
  },
  {
    label: "Defensive Line",
    positions: ["DE", "DT", "DL"],
    extra: [
      { key: "tackling", label: "TAK" },
      { key: "hit_power", label: "HIT" },
      { key: "pursuit", label: "PUR" },
      { key: "block_shed", label: "BSH" },
      { key: "finesse_moves", label: "FNM" },
      { key: "power_moves", label: "PWM" },
    ],
  },
  {
    label: "Linebackers",
    positions: ["LOLB", "ROLB", "MLB", "MIKE", "WILL", "SAM", "LB"],
    extra: [
      { key: "tackling", label: "TAK" },
      { key: "hit_power", label: "HIT" },
      { key: "pursuit", label: "PUR" },
      { key: "block_shed", label: "BSH" },
      { key: "man_coverage", label: "MCV" },
      { key: "zone_coverage", label: "ZCV" },
    ],
  },
  {
    label: "Cornerbacks",
    positions: ["CB"],
    extra: [
      { key: "tackling", label: "TAK" },
      { key: "man_coverage", label: "MCV" },
      { key: "zone_coverage", label: "ZCV" },
      { key: "press", label: "PRS" },
      { key: "pursuit", label: "PUR" },
      { key: "jumping", label: "JMP" },
    ],
  },
  {
    label: "Safeties",
    positions: ["SS", "FS", "S"],
    extra: [
      { key: "tackling", label: "TAK" },
      { key: "hit_power", label: "HIT" },
      { key: "man_coverage", label: "MCV" },
      { key: "zone_coverage", label: "ZCV" },
      { key: "pursuit", label: "PUR" },
      { key: "jumping", label: "JMP" },
    ],
  },
  {
    label: "Special Teams",
    positions: ["K", "P"],
    extra: [],
  },
];

function attrVal(player: TeamPlayer, key: AttrKey): number | null {
  const v = player[key];
  return typeof v === "number" ? v : null;
}

function AttrCell({ value }: { value: number | null }) {
  if (value == null) return <td className="px-2 py-2 text-center tabular-nums text-white/20 w-10">—</td>;
  const color =
    value >= 90 ? "#00C8FF" : value >= 80 ? "#4ade80" : value >= 70 ? "#facc15" : "#F44336";
  return (
    <td className="px-2 py-2 text-center tabular-nums text-[11px] font-semibold w-10" style={{ color }}>
      {value}
    </td>
  );
}

interface GroupTableProps {
  label: string;
  players: TeamPlayer[];
  attrs: AttrCol[];
  primaryColor: string;
}

function GroupTable({ label, players, attrs, primaryColor }: GroupTableProps) {
  if (players.length === 0) return null;
  return (
    <div className="rounded-xl overflow-hidden border border-white/8 bg-[#0f0f0f]">
      {/* Group header */}
      <div className="px-4 py-3 border-b border-white/10 bg-[#1a1a1a]">
        <span className="text-sm font-black uppercase tracking-wider text-white">{label}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-[#141414]">
              <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/30 min-w-[140px]">Player</th>
              <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-12">POS</th>
              <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-18">DEV</th>
              <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-10">OVR</th>
              <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-10">AGE</th>
              <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-14">HGT</th>
              <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-14">WGT</th>
              {/* Base physical */}
              {BASE_PHYS.map(a => (
                <th key={a.key} className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-10">
                  {a.label}
                </th>
              ))}
              {/* Position-specific */}
              {attrs.map(a => (
                <th key={a.key} className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 w-10">
                  {a.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => {
              const devLabel = p.dev_trait != null ? (DEV_LABEL[p.dev_trait] ?? "Normal") : "Normal";
              const devColor = p.dev_trait != null ? (DEV_COLOR[p.dev_trait] ?? "text-white/35") : "text-white/35";
              return (
                <tr
                  key={p.id}
                  className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}
                >
                  <td className="px-4 py-2 min-w-[140px]">
                    <Link
                      href={`/players/${p.id}`}
                      className="font-semibold text-[11px] hover:underline"
                      style={{ color: primaryColor }}
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-center w-12">
                    <span className="text-[10px] font-bold text-white/50">{p.position}</span>
                  </td>
                  <td className={`px-2 py-2 text-center w-18 text-[10px] font-bold ${devColor}`}>
                    {devLabel}
                  </td>
                  <td className={`px-2 py-2 text-center w-10 text-[11px] font-black tabular-nums ${ovrColor(p.overall)}`}>
                    {p.overall}
                  </td>
                  <td className="px-2 py-2 text-center w-10 text-[11px] tabular-nums text-white/50">{p.age}</td>
                  <td className="px-2 py-2 text-center w-14 text-[11px] tabular-nums text-white/50">{fmtHeight(p.height)}</td>
                  <td className="px-2 py-2 text-center w-14 text-[11px] tabular-nums text-white/50">
                    {p.weight != null ? `${p.weight}` : "—"}
                  </td>
                  {BASE_PHYS.map(a => (
                    <AttrCell key={a.key} value={attrVal(p, a.key)} />
                  ))}
                  {attrs.map(a => (
                    <AttrCell key={a.key} value={attrVal(p, a.key)} />
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface Props {
  team: { id: number; primary_color?: string | null };
  players: TeamPlayer[];
}

export default function TeamDepthChartTab({ team, players }: Props) {
  const primaryColor = team.primary_color ?? "#555";
  const positionSet = new Map<string, TeamPlayer[]>();

  for (const p of players) {
    const existing = positionSet.get(p.position) ?? [];
    existing.push(p);
    positionSet.set(p.position, existing);
  }

  return (
    <div className="space-y-4">
      {DEPTH_GROUPS.map(group => {
        const groupPlayers = players
          .filter(p => group.positions.includes(p.position))
          .sort((a, b) => {
            // Sort by depth chart order (asc), then overall (desc)
            if (a.depth_chart_order != null && b.depth_chart_order != null) {
              return a.depth_chart_order - b.depth_chart_order;
            }
            if (a.depth_chart_order != null) return -1;
            if (b.depth_chart_order != null) return 1;
            return b.overall - a.overall;
          });
        return (
          <GroupTable
            key={group.label}
            label={group.label}
            players={groupPlayers}
            attrs={group.extra}
            primaryColor={primaryColor}
          />
        );
      })}
    </div>
  );
}
