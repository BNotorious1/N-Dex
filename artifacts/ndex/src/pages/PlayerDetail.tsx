import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import TeamLogo from "@/components/TeamLogo";
import { useGetPlayerGameLog } from "@workspace/api-client-react";
import type { GameLogEntry } from "@workspace/api-client-react";
import { ArrowLeft, User, Zap, Star, ShieldAlert, Activity, BarChart3, Trophy, Clock, BookOpen, UserCircle2, Check, X } from "lucide-react";
import devTraitNormal from "@assets/Normal_1781202579092.png";
import devTraitStar from "@assets/Star_1781202579092.png";
import devTraitSuperstar from "@assets/Superstar_1781202579092.png";
import devTraitXFactor from "@assets/Superstar_X-Factor_1781202579092.png";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlayerDetail {
  id: number;
  name: string;
  position: string;
  overall: number;
  age: number;
  dev_trait: number | null;
  ea_player_id: string | null;
  presentation_id: number | null;
  portrait_id: number | null;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  team_id: number;
  team_name: string;
  team_city: string;
  team_abbreviation: string;
  team_primary_color: string | null;
  team_secondary_color: string | null;
  league_id: number;
  // Physical
  speed: number;
  acceleration: number | null;
  agility: number | null;
  strength: number;
  stamina: number | null;
  injury: number | null;
  toughness: number | null;
  jumping: number | null;
  // Mental
  awareness: number;
  confidence: number | null;
  play_recognition: number | null;
  // Passing
  throwing_power: number | null;
  throw_accuracy: number | null;
  throw_accuracy_short: number | null;
  throw_accuracy_mid: number | null;
  throw_accuracy_deep: number | null;
  throw_on_run: number | null;
  throw_under_pressure: number | null;
  play_action: number | null;
  break_sack: number | null;
  // Receiving
  catching: number | null;
  catch_in_traffic: number | null;
  spectacular_catch: number | null;
  route_run_short: number | null;
  route_run_mid: number | null;
  route_run_deep: number | null;
  release: number | null;
  // Ball carrying
  carrying: number | null;
  ball_carrier_vision: number | null;
  break_tackle: number | null;
  stiff_arm: number | null;
  spin_move: number | null;
  juke_move: number | null;
  trucking: number | null;
  change_of_direction: number | null;
  // Blocking
  run_block: number | null;
  run_block_power: number | null;
  run_block_finesse: number | null;
  pass_block: number | null;
  pass_block_power: number | null;
  pass_block_finesse: number | null;
  impact_block: number | null;
  lead_block: number | null;
  // Defense
  tackling: number | null;
  hit_power: number | null;
  pursuit: number | null;
  block_shed: number | null;
  finesse_moves: number | null;
  power_moves: number | null;
  man_coverage: number | null;
  zone_coverage: number | null;
  press: number | null;
  // Special teams
  kick_accuracy: number | null;
  kick_power: number | null;
  kick_return: number | null;
  long_snap: number | null;
  // Traits
  clutch_trait: number | null;
  high_motor_trait: number | null;
  penalty_trait: number | null;
  predict_trait: number | null;
  decision_maker_trait: number | null;
  qb_style_trait: number | null;
  force_pass_trait: number | null;
  sense_pressure_trait: number | null;
  throw_away_trait: number | null;
  tight_spiral_trait: number | null;
  cover_ball_trait: number | null;
  fight_for_yards_trait: number | null;
  run_style: number | null;
  feet_in_bounds_trait: number | null;
  hp_catch_trait: number | null;
  play_ball_trait: number | null;
  pos_catch_trait: number | null;
  yac_catch_trait: number | null;
  drop_open_pass_trait: number | null;
  big_hit_trait: number | null;
  strip_ball_trait: number | null;
  dl_bull_rush_trait: number | null;
  dl_spin_trait: number | null;
  dl_swim_trait: number | null;
  lb_style_trait: number | null;
  abilities: Array<{
    slot_index: number;
    title: string;
    description: string;
    activation_description: string | null;
    deactivation_description: string | null;
    is_passive: boolean;
    logo_id: number | null;
    ovr_threshold: number | null;
  }>;
}

type PageTab = "attributes" | "traits" | "abilities" | "gamelog" | "career" | "awards" | "history";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DEV_TRAIT = [
  { label: "Normal",    color: "#a16207", glow: "#a1620720", img: devTraitNormal    },
  { label: "Star",      color: "#9ca3af", glow: "#9ca3af20", img: devTraitStar      },
  { label: "Superstar", color: "#d97706", glow: "#d9770620", img: devTraitSuperstar },
  { label: "X-Factor",  color: "#ef4444", glow: "#ef444420", img: devTraitXFactor   },
];

const TABS: { key: PageTab; label: string; icon: React.ReactNode }[] = [
  { key: "attributes", label: "Attributes",    icon: <Activity className="h-3 w-3" /> },
  { key: "traits",     label: "Traits",        icon: <ShieldAlert className="h-3 w-3" /> },
  { key: "abilities",  label: "Abilities",     icon: <Zap className="h-3 w-3" /> },
  { key: "gamelog",    label: "Game Log",      icon: <BarChart3 className="h-3 w-3" /> },
  { key: "career",     label: "Career Stats",  icon: <BookOpen className="h-3 w-3" /> },
  { key: "awards",     label: "Awards",        icon: <Trophy className="h-3 w-3" /> },
  { key: "history",    label: "History",       icon: <Clock className="h-3 w-3" /> },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ovrColor(v: number) {
  if (v >= 99) return "#FFD700";
  if (v >= 90) return "#F44336";
  if (v >= 80) return "#00C8FF";
  if (v >= 70) return "#22c55e";
  return "rgba(255,255,255,0.4)";
}

function ratingBarColor(v: number) {
  if (v >= 91) return "#15803d";
  if (v >= 81) return "#22c55e";
  if (v >= 71) return "#facc15";
  if (v >= 61) return "#f97316";
  return "#b91c1c";
}

const NAME_SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);

function splitName(fullName: string): [string, string] {
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) return ["", parts[0]!];
  const suffix = parts[parts.length - 1]!;
  if (NAME_SUFFIXES.has(suffix.toLowerCase()) && parts.length >= 3) {
    const last = parts.slice(-2).join(" ");
    return [parts.slice(0, -2).join(" "), last];
  }
  const last = parts.pop()!;
  return [parts.join(" "), last];
}

function espnLogoUrl(abbr: string): string {
  const slug = abbr.toLowerCase() === "was" ? "wsh" : abbr.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png`;
}

function portraitUrl(portraitId: number): string {
  return `https://ratings-images-prod.pulse.ea.com/madden-nfl-26/portraits/${portraitId}.png`;
}

// ─── Small components ─────────────────────────────────────────────────────────

function RatingRow({ label, value, max = 99 }: { label: string; value: number | null | undefined; max?: number }) {
  if (value == null) return null;
  const pct = Math.round((value / max) * 100);
  const color = ratingBarColor(value);
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-[11px] uppercase tracking-wider w-36 shrink-0 text-[#ffffff]">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-7 text-right" style={{ color }}>{value}</span>
    </div>
  );
}

function AttrCard({ title, teamColor, children }: { title: string; teamColor: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
      <div className="px-4 py-2.5 flex items-center" style={{ backgroundColor: teamColor }}>
        <span className="text-xs font-black uppercase tracking-widest text-white">{title}</span>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}

function PlaceholderTab({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="h-14 w-14 rounded-full bg-white/5 border border-white/8 flex items-center justify-center text-white/25">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-white/35">{title}</p>
        <p className="text-xs text-white/20 mt-1 max-w-xs">{description}</p>
      </div>
    </div>
  );
}

// ─── Attribute groups ─────────────────────────────────────────────────────────

type AttrGroup = { title: string; rows: { label: string; value: number | null | undefined }[] };

function getAttrGroups(p: PlayerDetail): AttrGroup[] {
  const physical: AttrGroup = {
    title: "Physical",
    rows: [
      { label: "Speed",        value: p.speed },
      { label: "Acceleration", value: p.acceleration },
      { label: "Agility",      value: p.agility },
      { label: "Strength",     value: p.strength },
      { label: "Jumping",      value: p.jumping },
      { label: "Stamina",      value: p.stamina },
      { label: "Injury",       value: p.injury },
      { label: "Toughness",    value: p.toughness },
    ],
  };

  const mental: AttrGroup = {
    title: "Mental",
    rows: [
      { label: "Awareness",        value: p.awareness },
      { label: "Confidence",       value: p.confidence },
      { label: "Play Recognition", value: p.play_recognition },
    ],
  };

  const passing: AttrGroup = {
    title: "Passing",
    rows: [
      { label: "Throw Power",      value: p.throwing_power },
      { label: "Throw Acc (S)",    value: p.throw_accuracy_short },
      { label: "Throw Acc (M)",    value: p.throw_accuracy_mid },
      { label: "Throw Acc (D)",    value: p.throw_accuracy_deep },
      { label: "Throw on Run",     value: p.throw_on_run },
      { label: "Under Pressure",   value: p.throw_under_pressure },
      { label: "Play Action",      value: p.play_action },
      { label: "Break Sack",       value: p.break_sack },
    ],
  };

  const receiving: AttrGroup = {
    title: "Receiving",
    rows: [
      { label: "Catching",          value: p.catching },
      { label: "Catch in Traffic",  value: p.catch_in_traffic },
      { label: "Spec. Catch",       value: p.spectacular_catch },
      { label: "Route Run (S)",     value: p.route_run_short },
      { label: "Route Run (M)",     value: p.route_run_mid },
      { label: "Route Run (D)",     value: p.route_run_deep },
      { label: "Release",           value: p.release },
    ],
  };

  const carrying: AttrGroup = {
    title: "Ball Carrying",
    rows: [
      { label: "Carrying",          value: p.carrying },
      { label: "BCV",               value: p.ball_carrier_vision },
      { label: "Break Tackle",      value: p.break_tackle },
      { label: "Trucking",          value: p.trucking },
      { label: "Stiff Arm",         value: p.stiff_arm },
      { label: "Spin Move",         value: p.spin_move },
      { label: "Juke Move",         value: p.juke_move },
      { label: "Elusiveness",       value: p.change_of_direction },
    ],
  };

  const passRush: AttrGroup = {
    title: "Pass Rush",
    rows: [
      { label: "Block Shed",    value: p.block_shed },
      { label: "Finesse Moves", value: p.finesse_moves },
      { label: "Power Moves",   value: p.power_moves },
      { label: "Pursuit",       value: p.pursuit },
      { label: "Hit Power",     value: p.hit_power },
    ],
  };

  const defense: AttrGroup = {
    title: "Defense",
    rows: [
      { label: "Tackling",         value: p.tackling },
      { label: "Hit Power",        value: p.hit_power },
      { label: "Pursuit",          value: p.pursuit },
      { label: "Play Recognition", value: p.play_recognition },
      { label: "Block Shed",       value: p.block_shed },
    ],
  };

  const coverage: AttrGroup = {
    title: "Coverage",
    rows: [
      { label: "Man Coverage",     value: p.man_coverage },
      { label: "Zone Coverage",    value: p.zone_coverage },
      { label: "Press",            value: p.press },
      { label: "Play Recognition", value: p.play_recognition },
    ],
  };

  const blocking: AttrGroup = {
    title: "Blocking",
    rows: [
      { label: "Run Block",           value: p.run_block },
      { label: "Run Block Power",     value: p.run_block_power },
      { label: "Run Block Finesse",   value: p.run_block_finesse },
      { label: "Pass Block",          value: p.pass_block },
      { label: "Pass Block Power",    value: p.pass_block_power },
      { label: "Pass Block Finesse",  value: p.pass_block_finesse },
      { label: "Impact Block",        value: p.impact_block },
      { label: "Lead Block",          value: p.lead_block },
    ],
  };

  const kicking: AttrGroup = {
    title: "Kicking",
    rows: [
      { label: "Kick Accuracy", value: p.kick_accuracy },
      { label: "Kick Power",    value: p.kick_power },
      { label: "Kick Return",   value: p.kick_return },
    ],
  };

  return [physical, mental, passing, receiving, carrying, passRush, blocking, defense, coverage, kicking];
}

// ─── Attributes tab ───────────────────────────────────────────────────────────

function AttributesTab({ player, teamColor }: { player: PlayerDetail; teamColor: string }) {
  const groups = getAttrGroups(player).map(g => ({
    ...g,
    rows: g.rows.filter(r => r.value != null),
  })).filter(g => g.rows.length > 0);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <Activity className="h-10 w-10 text-white/15" />
        <p className="text-sm text-white/30">No attribute data imported yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {groups.map(g => (
        <AttrCard key={g.title} title={g.title} teamColor={teamColor}>
          {g.rows.map(r => (
            <RatingRow key={r.label} label={r.label} value={r.value} />
          ))}
        </AttrCard>
      ))}
    </div>
  );
}

// ─── Traits tab ───────────────────────────────────────────────────────────────

type TraitDef =
  | { kind: "bool";  label: string; value: number | null; activeLabel?: string; inactiveLabel?: string }
  | { kind: "named"; label: string; value: number | null; map: Record<number, string> };

function TraitRow({ trait, teamColor }: { trait: TraitDef; teamColor: string }) {
  if (trait.value == null) return null;

  if (trait.kind === "bool") {
    const active = trait.value === 1;
    return (
      <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
        <span className="text-[11px] text-white/50 uppercase tracking-wider">{trait.label}</span>
        <div className="flex items-center gap-1.5">
          {active ? (
            <>
              <span className="text-[11px] font-bold" style={{ color: teamColor }}>{trait.activeLabel ?? trait.label}</span>
              <div className="flex items-center justify-center w-5 h-5 rounded-full" style={{ backgroundColor: `${teamColor}25` }}>
                <Check className="h-3 w-3" style={{ color: teamColor }} />
              </div>
            </>
          ) : (
            <>
              <span className="text-[11px] font-medium text-white/20">{trait.inactiveLabel ?? "Normal"}</span>
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-white/5">
                <X className="h-3 w-3 text-white/20" />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const label = trait.map[trait.value] ?? `${trait.value}`;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-[11px] text-white/50 uppercase tracking-wider">{trait.label}</span>
      <span
        className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full"
        style={{ backgroundColor: `${teamColor}20`, color: teamColor, border: `1px solid ${teamColor}40` }}
      >
        {label}
      </span>
    </div>
  );
}

function TraitCard({ title, traits, teamColor }: { title: string; traits: TraitDef[]; teamColor: string }) {
  const visible = traits.filter(t => t.value != null);
  if (visible.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
      <div className="px-4 py-2.5 flex items-center" style={{ backgroundColor: teamColor }}>
        <span className="text-xs font-black uppercase tracking-widest text-white">{title}</span>
      </div>
      <div className="px-4">
        {visible.map(t => <TraitRow key={t.label} trait={t} teamColor={teamColor} />)}
      </div>
    </div>
  );
}

const QB_STYLE   = { 0: "Pocket", 1: "Scrambler", 2: "Improviser", 3: "Field General" };
const SENSE_P    = { 0: "Paranoid", 1: "Average", 2: "Trigger Happy" };
const LB_STYLE   = { 0: "Balanced", 1: "Run Stopper", 2: "Pass Rusher" };
const RUN_STYLE  = { 0: "Balanced", 1: "Power", 2: "Elusive", 3: "Speed", 4: "Compact" };
const DEC_MAKER  = { 0: "Conservative", 1: "Normal", 2: "Aggressive" };

function TraitsTab({ player, teamColor }: { player: PlayerDetail; teamColor: string }) {
  const core: TraitDef[] = [
    { kind: "bool",  label: "Clutch",          value: player.clutch_trait,         activeLabel: "Clutch" },
    { kind: "bool",  label: "High Motor",       value: player.high_motor_trait,     activeLabel: "High Motor" },
    { kind: "bool",  label: "Penalty",          value: player.penalty_trait,        activeLabel: "Undisciplined" },
    { kind: "bool",  label: "Predictable",      value: player.predict_trait,        activeLabel: "Predictable" },
    { kind: "named", label: "Decision Maker",   value: player.decision_maker_trait, map: DEC_MAKER },
  ];
  const passing: TraitDef[] = [
    { kind: "named", label: "QB Style",         value: player.qb_style_trait,       map: QB_STYLE },
    { kind: "bool",  label: "Tight Spiral",     value: player.tight_spiral_trait,   activeLabel: "Tight Spiral" },
    { kind: "named", label: "Sense Pressure",   value: player.sense_pressure_trait, map: SENSE_P },
    { kind: "bool",  label: "Throw Away",       value: player.throw_away_trait,     activeLabel: "Throws Away" },
    { kind: "bool",  label: "Force Pass",       value: player.force_pass_trait,     activeLabel: "Forces Passes" },
  ];
  const ballCarrier: TraitDef[] = [
    { kind: "bool",  label: "Cover Ball",       value: player.cover_ball_trait,     activeLabel: "Covers Ball" },
    { kind: "bool",  label: "Fight for Yards",  value: player.fight_for_yards_trait,activeLabel: "Fights for Yards" },
    { kind: "named", label: "Run Style",        value: player.run_style,            map: RUN_STYLE },
  ];
  const receiving: TraitDef[] = [
    { kind: "bool",  label: "Feet in Bounds",   value: player.feet_in_bounds_trait, activeLabel: "Keeps Feet In" },
    { kind: "bool",  label: "High Point Catch", value: player.hp_catch_trait,       activeLabel: "High Points" },
    { kind: "bool",  label: "Play Ball",        value: player.play_ball_trait,      activeLabel: "Aggressive" },
    { kind: "bool",  label: "Possession Catch", value: player.pos_catch_trait,      activeLabel: "Possession" },
    { kind: "bool",  label: "YAC Catch",        value: player.yac_catch_trait,      activeLabel: "RAC Specialist" },
    { kind: "bool",  label: "Drop Open Pass",   value: player.drop_open_pass_trait, activeLabel: "Drops Passes" },
  ];
  const defense: TraitDef[] = [
    { kind: "bool",  label: "Big Hitter",       value: player.big_hit_trait,        activeLabel: "Big Hitter" },
    { kind: "bool",  label: "Strip Ball",       value: player.strip_ball_trait,     activeLabel: "Strip Ball" },
    { kind: "bool",  label: "DL Bull Rush",     value: player.dl_bull_rush_trait,   activeLabel: "Bull Rush" },
    { kind: "bool",  label: "DL Spin Move",     value: player.dl_spin_trait,        activeLabel: "Spin Move" },
    { kind: "bool",  label: "DL Swim Move",     value: player.dl_swim_trait,        activeLabel: "Swim Move" },
    { kind: "named", label: "LB Style",         value: player.lb_style_trait,       map: LB_STYLE },
  ];

  const hasAny = [core, passing, ballCarrier, receiving, defense]
    .flat().some(t => t.value != null);

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <ShieldAlert className="h-10 w-10 text-white/15" />
        <p className="text-sm text-white/30">No trait data imported yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <TraitCard title="Core"        traits={core}        teamColor={teamColor} />
      <TraitCard title="Passing"     traits={passing}     teamColor={teamColor} />
      <TraitCard title="Ball Carrier" traits={ballCarrier} teamColor={teamColor} />
      <TraitCard title="Receiving"   traits={receiving}   teamColor={teamColor} />
      <TraitCard title="Defense"     traits={defense}     teamColor={teamColor} />
    </div>
  );
}

// ─── Abilities tab ────────────────────────────────────────────────────────────

const DEV_TIER_META: Record<number, { label: string; color: string; img: string }> = {
  0: { label: "Normal",    color: "#a16207", img: devTraitNormal   },
  1: { label: "Star",      color: "#9ca3af", img: devTraitStar     },
  2: { label: "Superstar", color: "#d97706", img: devTraitSuperstar },
  3: { label: "X-Factor",  color: "#ef4444", img: devTraitXFactor  },
};
const SUPERSTAR_COLOR = "#9333ea";

// ─── Game Log Tab ─────────────────────────────────────────────────────────────

type ColDef = { header: string; render: (g: GameLogEntry) => string | number; dim?: boolean };

const QB_COLS: ColDef[] = [
  { header: "CMP/ATT", render: g => g.pss_cmp != null ? `${g.pss_cmp}/${g.pss_att ?? 0}` : "–" },
  { header: "YDS",     render: g => g.pss_yds ?? "–" },
  { header: "TD",      render: g => g.pss_tds ?? "–" },
  { header: "INT",     render: g => g.pss_ints ?? "–" },
  { header: "SCK",     render: g => g.pss_sacks ?? "–", dim: true },
  { header: "RTG",     render: g => g.pss_rating ?? "–" },
  { header: "RSH",     render: g => g.rsh_yds != null ? `${g.rsh_yds}` : "–", dim: true },
  { header: "RSH TD",  render: g => g.rsh_tds ?? "–", dim: true },
];
const RB_COLS: ColDef[] = [
  { header: "CAR",  render: g => g.rsh_att ?? "–" },
  { header: "YDS",  render: g => g.rsh_yds ?? "–" },
  { header: "AVG",  render: g => g.rsh_att ? ((g.rsh_yds ?? 0) / g.rsh_att).toFixed(1) : "–" },
  { header: "TD",   render: g => g.rsh_tds ?? "–" },
  { header: "LNG",  render: g => g.rsh_lng ?? "–", dim: true },
  { header: "TGT",  render: g => g.rec_tgts ?? "–", dim: true },
  { header: "REC",  render: g => g.rec_catches ?? "–" },
  { header: "RYDS", render: g => g.rec_yds ?? "–" },
  { header: "RTD",  render: g => g.rec_tds ?? "–" },
  { header: "FMB",  render: g => g.fmb_lost ?? "–", dim: true },
];
const WR_TE_COLS: ColDef[] = [
  { header: "TGT",  render: g => g.rec_tgts ?? "–" },
  { header: "REC",  render: g => g.rec_catches ?? "–" },
  { header: "YDS",  render: g => g.rec_yds ?? "–" },
  { header: "AVG",  render: g => g.rec_catches ? ((g.rec_yds ?? 0) / g.rec_catches).toFixed(1) : "–" },
  { header: "TD",   render: g => g.rec_tds ?? "–" },
  { header: "LNG",  render: g => g.rec_lng ?? "–", dim: true },
  { header: "DROP", render: g => g.rec_drops ?? "–", dim: true },
  { header: "YAC",  render: g => g.rec_yac ?? "–", dim: true },
];
const DEF_COLS: ColDef[] = [
  { header: "TKL",  render: g => g.def_total_tackles ?? "–" },
  { header: "TFL",  render: g => g.def_tfl ?? "–" },
  { header: "SCK",  render: g => g.def_sacks ?? "–" },
  { header: "INT",  render: g => g.def_ints ?? "–" },
  { header: "FF",   render: g => g.def_ff ?? "–", dim: true },
  { header: "PD",   render: g => g.def_pd ?? "–" },
  { header: "TD",   render: g => g.def_tds ?? "–", dim: true },
  { header: "FR",   render: g => g.def_fum_rec ?? "–", dim: true },
];
const K_COLS: ColDef[] = [
  { header: "FG M/A", render: g => `${g.fg_made ?? 0}/${g.fg_att ?? 0}` },
  { header: "LNG",    render: g => g.fg_lng ?? "–" },
  { header: "XP M/A", render: g => `${g.xp_made ?? 0}/${g.xp_att ?? 0}` },
];
const P_COLS: ColDef[] = [
  { header: "NO",   render: g => g.punt_att ?? "–" },
  { header: "YDS",  render: g => g.punt_yds ?? "–" },
  { header: "AVG",  render: g => g.punt_avg ?? "–" },
  { header: "LNG",  render: g => g.punt_lng ?? "–" },
  { header: "IN20", render: g => g.punt_in20 ?? "–" },
  { header: "TB",   render: g => g.punt_tbs ?? "–", dim: true },
];

const QB_POS  = new Set(["QB"]);
const RB_POS  = new Set(["HB", "FB", "RB"]);
const WRTE    = new Set(["WR", "TE"]);
const DEF_POS = new Set(["MLB","LOLB","ROLB","OLB","RE","LE","DT","LEDGE","CB","FS","SS","ILB","LB"]);
const K_POS   = new Set(["K"]);
const P_POS   = new Set(["P"]);

function getColsForPosition(position: string): ColDef[] {
  if (QB_POS.has(position))  return QB_COLS;
  if (RB_POS.has(position))  return RB_COLS;
  if (WRTE.has(position))    return WR_TE_COLS;
  if (DEF_POS.has(position)) return DEF_COLS;
  if (K_POS.has(position))   return K_COLS;
  if (P_POS.has(position))   return P_COLS;
  return DEF_COLS;
}

const STAGE_LABEL: Record<number, string> = {
  2: "Wild Card", 3: "Divisional", 4: "Conf. Championship", 5: "Super Bowl",
};

function weekLabel(g: GameLogEntry): string {
  return STAGE_LABEL[g.stage_index] ?? `WK ${g.week}`;
}

function resultStyle(result: string | null | undefined) {
  if (result === "W") return "bg-green-900/60 text-green-400 border border-green-700/40";
  if (result === "L") return "bg-red-900/60 text-red-400 border border-red-600/40";
  if (result === "T") return "bg-zinc-700/60 text-zinc-300 border border-zinc-600/40";
  return "bg-zinc-800/40 text-zinc-500 border border-zinc-700/20";
}

function GameLogTab({ playerId, position }: { playerId: number; position: string }) {
  const { data: log, isLoading } = useGetPlayerGameLog(playerId, {
    query: { queryKey: ["player-gamelog", playerId] },
  });

  const cols = getColsForPosition(position);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-white/30 text-sm">
        Loading game log…
      </div>
    );
  }

  if (!log || log.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <BarChart3 className="h-8 w-8 text-white/15" />
        <p className="text-sm text-white/30 font-medium">No games played yet</p>
        <p className="text-xs text-white/20">Game log will populate after weekly stat imports.</p>
      </div>
    );
  }

  const bySeason = log.reduce((m, g) => {
    const arr = m.get(g.season) ?? [];
    arr.push(g);
    m.set(g.season, arr);
    return m;
  }, new Map<number, typeof log>());
  const seasons = [...bySeason.keys()].sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      {seasons.map(season => {
        const games = bySeason.get(season)!;
        return (
          <div key={season}>
            <div className="flex items-center gap-3 mb-2 px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                {season} Season
              </span>
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[10px] text-white/20">
                {games.length} game{games.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-white/5">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="text-left py-2 px-3 text-white/30 font-semibold tracking-wide w-12">WK</th>
                    <th className="text-left py-2 px-3 text-white/30 font-semibold tracking-wide">OPP</th>
                    <th className="text-center py-2 px-3 text-white/30 font-semibold tracking-wide w-10">RES</th>
                    <th className="text-center py-2 px-2 text-white/30 font-semibold tracking-wide w-14">SCORE</th>
                    {cols.map(c => (
                      <th key={c.header} className={`text-right py-2 px-3 font-semibold tracking-wide ${c.dim ? "text-white/20" : "text-white/30"}`}>
                        {c.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {games.map((g, i) => (
                    <tr
                      key={g.id}
                      className={`border-b border-white/4 transition-colors hover:bg-white/[0.03] ${i % 2 === 0 ? "" : "bg-white/[0.015]"}`}
                    >
                      <td className="py-2 px-3 text-white/40 font-mono">{weekLabel(g)}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          {g.opponent_abbreviation ? (
                            <>
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: g.opponent_primary_color ?? "#6b7280" }}
                              />
                              <span className="text-white/50 text-[11px]">
                                {g.is_home === false ? "@" : ""}
                                <span className="text-white/80 font-bold">{g.opponent_abbreviation}</span>
                              </span>
                            </>
                          ) : (
                            <span className="text-white/20">–</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-block px-1.5 py-px rounded text-[10px] font-black ${resultStyle(g.result)}`}>
                          {g.result ?? "–"}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center [font-family:'Lora',serif] text-[11px] text-[#ffffff]">
                        {g.player_score != null
                          ? `${g.player_score}-${g.opponent_score ?? "?"}`
                          : "–"}
                      </td>
                      {cols.map(c => (
                        <td key={c.header} className={`py-2 px-3 text-right [font-family:'Lora',serif] ${c.dim ? "text-white/25" : "text-white/70"}`}>
                          {c.render(g)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AbilitiesTab({ player }: { player: PlayerDetail }) {
  const devTier  = player.dev_trait ?? 0;
  const meta     = DEV_TIER_META[devTier] ?? DEV_TIER_META[0]!;
  const abilities = player.abilities ?? [];

  const xfAbility  = abilities.find(a => a.activation_description);
  const ssAbilities = abilities.filter(a => !a.activation_description);

  if (abilities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <img src={meta.img} alt={meta.label} className="w-16 h-16 object-contain opacity-60" />
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: meta.color }}>{meta.label}</span>
        <p className="text-sm text-white/30">
          {devTier <= 1
            ? `${meta.label} players don't have signature abilities`
            : "Ability data not yet imported from Madden"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Dev tier badge */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border"
          style={{ borderColor: `${meta.color}40`, backgroundColor: `${meta.color}10` }}
        >
          <img src={meta.img} alt={meta.label} className="w-7 h-7 object-contain" />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: meta.color }}>{meta.label}</span>
        </div>
        <span className="text-[11px] text-white/30">
          {devTier === 3 && xfAbility
            ? `Zone ability + ${ssAbilities.length} superstar ${ssAbilities.length === 1 ? "ability" : "abilities"}`
            : `${ssAbilities.length} superstar ${ssAbilities.length === 1 ? "ability" : "abilities"}`}
        </span>
      </div>

      {/* X-Factor zone ability */}
      {xfAbility && (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: `${meta.color}30` }}>
          <div className="px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: `${meta.color}15` }}>
            <Zap className="h-3.5 w-3.5" style={{ color: meta.color }} />
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: meta.color }}>X-Factor Zone</span>
          </div>
          <div className="px-4 pt-4 pb-4 bg-[#141414]">
            <div className="flex items-start gap-3">
              <div
                className="w-11 h-11 rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: `${meta.color}15`, border: `1px solid ${meta.color}30` }}
              >
                <Zap className="h-5 w-5" style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-black uppercase tracking-wide text-white leading-tight">{xfAbility.title}</h3>
                <p className="text-[12px] text-white/55 mt-1 leading-relaxed">{xfAbility.description}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg p-3" style={{ backgroundColor: `${meta.color}08`, border: `1px solid ${meta.color}20` }}>
                <div className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: meta.color }}>In Zone When</div>
                <p className="text-[12px] text-white/60 leading-relaxed">{xfAbility.activation_description}</p>
              </div>
              <div className="rounded-lg p-3 bg-white/[0.03] border border-white/8">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">Out of Zone When</div>
                <p className="text-[12px] text-white/40 leading-relaxed">{xfAbility.deactivation_description}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Superstar abilities */}
      {ssAbilities.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
          <div className="px-4 py-2.5 flex items-center gap-2 bg-[#1d1d1d]">
            <Star className="h-3.5 w-3.5" style={{ color: SUPERSTAR_COLOR }} />
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: SUPERSTAR_COLOR }}>Superstar Abilities</span>
          </div>
          <div className="divide-y divide-white/5">
            {ssAbilities.map(a => (
              <div key={a.slot_index} className="px-4 py-3.5 flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: `${SUPERSTAR_COLOR}12`, border: `1px solid ${SUPERSTAR_COLOR}28` }}
                >
                  <Star className="h-4 w-4" style={{ color: SUPERSTAR_COLOR }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-black uppercase tracking-wide text-white">{a.title}</span>
                    {a.ovr_threshold != null && a.ovr_threshold > 0 && (
                      <span className="text-[10px] font-bold text-white/25 border border-white/10 px-1.5 py-0.5 rounded-full">
                        REQ {a.ovr_threshold} OVR
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-white/50 mt-0.5 leading-relaxed">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlayerDetail() {
  const params = useParams<{ id: string }>();
  const playerId = Number(params.id);
  const [tab, setTab] = useState<PageTab>("attributes");

  const { data: player, isLoading } = useQuery<PlayerDetail>({
    queryKey: ["player", playerId],
    queryFn: () => fetch(`/api/players/${playerId}`).then(r => r.json()),
    enabled: !!playerId,
  });

  const [portraitError, setPortraitError] = useState(false);

  const teamColor = player?.team_primary_color ?? "#00C8FF";
  const [firstName, lastName] = player ? splitName(player.name) : ["", ""];
  const showPortrait = !!player?.portrait_id && !portraitError;

  const devInfo = player?.dev_trait != null
    ? DEV_TRAIT[player.dev_trait] ?? DEV_TRAIT[0]!
    : null;

  const birthStr = (() => {
    if (!player?.birth_year) return null;
    const parts: string[] = [];
    if (player.birth_month != null) parts.push(MONTHS[player.birth_month - 1] ?? "");
    if (player.birth_day != null) parts.push(String(player.birth_day) + ",");
    parts.push(String(player.birth_year));
    return parts.join(" ");
  })();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 rounded-full border-2 border-[#00C8FF]/30 border-t-[#00C8FF] animate-spin" />
        </div>
      ) : !player ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <User className="h-10 w-10 text-white/20" />
          <p className="text-white/40">Player not found</p>
        </div>
      ) : (
        <>
          {/* ─── Hero ─────────────────────────────────────────────────────── */}
          <div className="relative overflow-hidden border-b border-white/8 bg-[#0d0d0d]">

            {/* Team color left accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: teamColor }} />

            {/* Background: team logo watermark (right side) */}
            <div className="absolute right-0 top-0 h-full w-1/2 flex items-center justify-end overflow-hidden opacity-[0.045] select-none pointer-events-none">
              <img src={espnLogoUrl(player.team_abbreviation)} alt="" className="h-[380px] w-[380px] object-contain" style={{ filter: "brightness(1.4) saturate(0)" }} />
            </div>

            {/* Team color ambient glow */}
            <div className="absolute inset-0 opacity-[0.07]" style={{ background: `radial-gradient(ellipse at 70% 50%, ${teamColor} 0%, transparent 60%)` }} />

            <div className="relative px-8 py-8 pl-10 mt-[0px] mb-[0px]">
              {/* Back nav row */}
              <div className="flex items-center justify-between mb-6">
                <Link href={`/leagues/${player.league_id}`} className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
                  <ArrowLeft className="h-3 w-3" />
                  Back to League
                </Link>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black tracking-wider border"
                  style={{ color: ovrColor(player.overall), backgroundColor: `${ovrColor(player.overall)}18`, borderColor: `${ovrColor(player.overall)}30` }}
                >
                  <span className="text-[10px] font-semibold text-white/40">OVR</span>
                  {player.overall}
                </span>
              </div>

              {/* Main two-column: portrait + info */}
              <div className="flex items-end gap-7">

                {/* Portrait */}
                <div
                  className="shrink-0 relative rounded-2xl overflow-hidden border border-white/10"
                  style={{
                    width: 140,
                    height: 140,
                    background: `linear-gradient(160deg, ${teamColor}22 0%, #111 100%)`,
                    boxShadow: `0 0 32px ${teamColor}25`,
                  }}
                >
                  {showPortrait ? (
                    <img
                      src={portraitUrl(player.portrait_id!)}
                      alt={player.name}
                      onError={() => setPortraitError(true)}
                      className="w-full h-full object-cover object-top scale-125 origin-top mt-[-35px] mb-[-35px]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-end justify-center pb-2">
                      <UserCircle2 className="h-24 w-24 text-white/10" />
                    </div>
                  )}
                  <div
                    className="absolute bottom-0 left-0 right-0 py-1 text-center text-[11px] font-black tracking-wider"
                    style={{ backgroundColor: `${teamColor}cc`, color: "#fff" }}
                  >
                    {player.position} · {player.overall}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 mb-3">
                    <TeamLogo abbreviation={player.team_abbreviation} primaryColor={player.team_primary_color} size="sm" shape="circle" />
                    <span className="text-[11px] tracking-[0.2em] uppercase text-white/40">
                      {player.team_city} · {player.team_name}
                    </span>
                  </div>

                  <div className="mb-4">
                    {firstName && (
                      <p className="text-xl font-semibold text-white/70 tracking-wide leading-none mb-0.5">{firstName}</p>
                    )}
                    <p className="text-5xl sm:text-6xl font-black uppercase leading-none tracking-tight text-white">{lastName}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {devInfo && (
                      <span
                        className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-md border"
                        style={{ color: devInfo.color, backgroundColor: devInfo.glow, borderColor: `${devInfo.color}40` }}
                      >
                        <img src={devInfo.img} alt={devInfo.label} className="w-5 h-5 object-contain" />
                        <span className="text-xs font-bold uppercase tracking-wide">{devInfo.label}</span>
                      </span>
                    )}
                    <span className="text-xs text-white/35">
                      Age <span className="text-white/60 font-semibold">{player.age}</span>
                    </span>
                    {birthStr && <span className="text-xs text-white/25">· Born {birthStr}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Content ──────────────────────────────────────────────────── */}
          <div className="max-w-5xl mx-auto px-6 py-7">

            {/* Tab bar */}
            <div className="flex mb-6 border-b border-white/8 overflow-x-auto justify-center items-center gap-[30px]">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap border-[#00C8FF] text-[#ffff] border-t-[#ffffff65] border-r-[#ffffff65] border-b-[#ffffff65] border-l-[#ffffff65]"
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab === "attributes" && <AttributesTab player={player} teamColor={teamColor} />}
            {tab === "traits" && <TraitsTab player={player} teamColor={teamColor} />}
            {tab === "abilities" && <AbilitiesTab player={player} />}
            {tab === "gamelog" && player && (
              <GameLogTab playerId={player.id} position={player.position} />
            )}
            {tab === "career" && (
              <PlaceholderTab
                icon={<BookOpen className="h-6 w-6" />}
                title="Career Stats Not Yet Available"
                description="Aggregated season and career statistics will appear here once stat data is imported."
              />
            )}
            {tab === "awards" && (
              <PlaceholderTab
                icon={<Trophy className="h-6 w-6" />}
                title="No Awards Yet"
                description="League awards and milestones earned by this player will be shown here."
              />
            )}
            {tab === "history" && (
              <PlaceholderTab
                icon={<Clock className="h-6 w-6" />}
                title="No History Yet"
                description="Team transaction history, trades, and contract data will appear here."
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
