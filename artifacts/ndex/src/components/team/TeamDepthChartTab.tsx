import { useState } from "react";
import { Link } from "wouter";
import { fmtHeight, DEV_LABEL, DEV_COLOR, type TeamPlayer } from "./types";

type AttrKey = keyof TeamPlayer;
interface AttrCol { key: AttrKey; label: string }

const BASE_PHYS: AttrCol[] = [
  { key: "speed", label: "SPD" },
  { key: "strength", label: "STR" },
  { key: "agility", label: "AGI" },
  { key: "acceleration", label: "ACC" },
  { key: "awareness", label: "AWR" },
];

const DEPTH_GROUPS: Array<{ label: string; positions: string[]; extra: AttrCol[] }> = [
  {
    label: "Quarterbacks", positions: ["QB"],
    extra: [
      { key: "throwing_power", label: "THP" }, { key: "throw_accuracy_short", label: "SAC" },
      { key: "throw_accuracy_mid", label: "MAC" }, { key: "throw_accuracy_deep", label: "DAC" },
      { key: "throw_on_run", label: "TOR" }, { key: "throw_under_pressure", label: "TUP" },
      { key: "play_action", label: "PAC" }, { key: "break_sack", label: "BKS" },
    ],
  },
  {
    label: "Running Backs", positions: ["HB", "RB", "FB"],
    extra: [
      { key: "break_tackle", label: "BTK" }, { key: "carrying", label: "CAR" },
      { key: "juke_move", label: "JKM" }, { key: "stiff_arm", label: "STF" },
      { key: "spin_move", label: "SPM" }, { key: "trucking", label: "TRK" },
      { key: "ball_carrier_vision", label: "BCV" },
    ],
  },
  {
    label: "Wide Receivers", positions: ["WR"],
    extra: [
      { key: "change_of_direction", label: "COD" }, { key: "jumping", label: "JMP" },
      { key: "catching", label: "CTH" }, { key: "catch_in_traffic", label: "CIT" },
      { key: "spectacular_catch", label: "SPC" }, { key: "route_run_short", label: "SRR" },
      { key: "route_run_mid", label: "MRR" }, { key: "route_run_deep", label: "DRR" },
      { key: "release", label: "RLS" },
    ],
  },
  {
    label: "Tight Ends", positions: ["TE"],
    extra: [
      { key: "catching", label: "CTH" }, { key: "catch_in_traffic", label: "CIT" },
      { key: "spectacular_catch", label: "SPC" }, { key: "route_run_short", label: "SRR" },
      { key: "route_run_mid", label: "MRR" }, { key: "route_run_deep", label: "DRR" },
      { key: "release", label: "RLS" }, { key: "run_block", label: "RBK" },
      { key: "pass_block", label: "PBK" }, { key: "impact_block", label: "IBK" },
    ],
  },
  {
    label: "Offensive Line", positions: ["LT", "LG", "C", "RG", "RT", "OL"],
    extra: [
      { key: "pass_block", label: "PBK" }, { key: "pass_block_power", label: "PPW" },
      { key: "pass_block_finesse", label: "PFN" }, { key: "run_block", label: "RBK" },
      { key: "run_block_power", label: "RPW" }, { key: "run_block_finesse", label: "RFN" },
      { key: "impact_block", label: "IBK" },
    ],
  },
  {
    label: "Defensive Line", positions: ["DE", "DT", "DL"],
    extra: [
      { key: "tackling", label: "TAK" }, { key: "hit_power", label: "HIT" },
      { key: "pursuit", label: "PUR" }, { key: "block_shed", label: "BSH" },
      { key: "finesse_moves", label: "FNM" }, { key: "power_moves", label: "PWM" },
    ],
  },
  {
    label: "Linebackers", positions: ["LOLB", "ROLB", "MLB", "MIKE", "WILL", "SAM", "LB"],
    extra: [
      { key: "tackling", label: "TAK" }, { key: "hit_power", label: "HIT" },
      { key: "pursuit", label: "PUR" }, { key: "block_shed", label: "BSH" },
      { key: "man_coverage", label: "MCV" }, { key: "zone_coverage", label: "ZCV" },
    ],
  },
  {
    label: "Cornerbacks", positions: ["CB"],
    extra: [
      { key: "tackling", label: "TAK" }, { key: "man_coverage", label: "MCV" },
      { key: "zone_coverage", label: "ZCV" }, { key: "press", label: "PRS" },
      { key: "pursuit", label: "PUR" }, { key: "jumping", label: "JMP" },
    ],
  },
  {
    label: "Safeties", positions: ["SS", "FS", "S"],
    extra: [
      { key: "tackling", label: "TAK" }, { key: "hit_power", label: "HIT" },
      { key: "man_coverage", label: "MCV" }, { key: "zone_coverage", label: "ZCV" },
      { key: "pursuit", label: "PUR" }, { key: "jumping", label: "JMP" },
    ],
  },
  { label: "Special Teams", positions: ["K", "P"], extra: [] },
];

function attrVal(player: TeamPlayer, key: AttrKey): number | null {
  const v = player[key];
  return typeof v === "number" ? v : null;
}

type SortDir = "asc" | "desc";
interface SortState { key: string; dir: SortDir }

function sortPlayers(players: TeamPlayer[], sort: SortState | null, allCols: AttrCol[]): TeamPlayer[] {
  if (!sort) return players;
  return [...players].sort((a, b) => {
    let av: number | null = null;
    let bv: number | null = null;
    if (sort.key === "overall") { av = a.overall; bv = b.overall; }
    else if (sort.key === "age") { av = a.age; bv = b.age; }
    else if (sort.key === "dev_trait") { av = a.dev_trait; bv = b.dev_trait; }
    else if (sort.key === "height") { av = a.height; bv = b.height; }
    else if (sort.key === "weight") { av = a.weight; bv = b.weight; }
    else {
      const col = allCols.find(c => c.key === sort.key);
      if (col) { av = attrVal(a, col.key); bv = attrVal(b, col.key); }
    }
    av = av ?? -999; bv = bv ?? -999;
    return sort.dir === "desc" ? bv - av : av - bv;
  });
}

interface GroupTableProps {
  label: string;
  players: TeamPlayer[];
  attrs: AttrCol[];
  primaryColor: string;
}

function SortTh({ colKey, label, sort, onSort }: {
  colKey: string;
  label: string;
  sort: SortState | null;
  onSort: (key: string) => void;
}) {
  const active = sort?.key === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none w-10 whitespace-nowrap hover:text-white transition-colors"
      style={{ color: active ? "white" : "rgba(255,255,255,0.35)" }}
    >
      {label}
      {active && <span className="ml-0.5">{sort!.dir === "desc" ? "↓" : "↑"}</span>}
    </th>
  );
}

function GroupTable({ label, players, attrs, primaryColor }: GroupTableProps) {
  const [sort, setSort] = useState<SortState | null>({ key: "overall", dir: "desc" });
  if (players.length === 0) return null;

  const allCols: AttrCol[] = [...BASE_PHYS, ...attrs];

  function handleSort(key: string) {
    setSort(prev =>
      prev?.key === key
        ? { key, dir: prev.dir === "desc" ? "asc" : "desc" }
        : { key, dir: "desc" }
    );
  }

  const sorted = sortPlayers(players, sort, allCols);

  return (
    <div className="rounded-xl overflow-hidden border border-white/8 bg-[#0f0f0f]">
      <div className="px-4 py-3 border-b border-white/10 bg-[#1a1a1a]">
        <span className="text-sm font-black uppercase tracking-wider text-white">{label}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10" style={{ backgroundColor: `${primaryColor}25` }}>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider min-w-[140px]"
                  style={{ color: "rgba(255,255,255,0.5)" }}>Player</th>
              <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/40 w-12">POS</th>
              <SortTh colKey="dev_trait" label="DEV" sort={sort} onSort={handleSort} />
              <SortTh colKey="overall"   label="OVR" sort={sort} onSort={handleSort} />
              <SortTh colKey="age"       label="AGE" sort={sort} onSort={handleSort} />
              <SortTh colKey="height"    label="HGT" sort={sort} onSort={handleSort} />
              <SortTh colKey="weight"    label="WGT" sort={sort} onSort={handleSort} />
              {BASE_PHYS.map(a => <SortTh key={String(a.key)} colKey={String(a.key)} label={a.label} sort={sort} onSort={handleSort} />)}
              {attrs.map(a => <SortTh key={String(a.key)} colKey={String(a.key)} label={a.label} sort={sort} onSort={handleSort} />)}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => {
              const devLabel = p.dev_trait != null ? (DEV_LABEL[p.dev_trait] ?? "Normal") : "Normal";
              const devColor = p.dev_trait != null ? (DEV_COLOR[p.dev_trait] ?? "text-white/35") : "text-white/35";
              return (
                <tr key={p.id} className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <td className="px-4 py-2 min-w-[140px]">
                    <Link href={`/players/${p.id}`} className="font-semibold text-[11px] hover:underline [font-family:'Lora',serif]" style={{ color: primaryColor }}>
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-center w-12">
                    <span className="text-[10px] font-bold text-white/50">{p.position}</span>
                  </td>
                  <td className="px-2 py-2 text-center w-18 text-[10px] font-bold text-[#ffffff80]">{devLabel}</td>
                  <td className="px-2 py-2 text-center w-10 text-[11px] font-black tabular-nums text-white [font-family:'Lora',serif]">{p.overall}</td>
                  <td className="px-2 py-2 text-center w-10 text-[11px] tabular-nums text-white/50 [font-family:'Lora',serif]">{p.age}</td>
                  <td className="px-2 py-2 text-center w-14 text-[11px] tabular-nums text-white/50 [font-family:'Lora',serif]">{fmtHeight(p.height)}</td>
                  <td className="px-2 py-2 text-center w-14 text-[11px] tabular-nums text-white/50 [font-family:'Lora',serif]">{p.weight != null ? p.weight : "—"}</td>
                  {BASE_PHYS.map(a => {
                    const v = attrVal(p, a.key);
                    return (
                      <td key={String(a.key)} className="px-2 py-2 text-center tabular-nums text-[11px] text-white/70 w-10 [font-family:'Lora',serif]">
                        {v ?? "—"}
                      </td>
                    );
                  })}
                  {attrs.map(a => {
                    const v = attrVal(p, a.key);
                    return (
                      <td key={String(a.key)} className="px-2 py-2 text-center tabular-nums text-[11px] text-white/70 w-10 [font-family:'Lora',serif]">
                        {v ?? "—"}
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
  );
}

interface Props {
  team: { id: number; primary_color?: string | null };
  players: TeamPlayer[];
}

export default function TeamDepthChartTab({ team, players }: Props) {
  const primaryColor = team.primary_color ?? "#555";

  return (
    <div className="space-y-4">
      {DEPTH_GROUPS.map(group => {
        const groupPlayers = players.filter(p => group.positions.includes(p.position));
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
