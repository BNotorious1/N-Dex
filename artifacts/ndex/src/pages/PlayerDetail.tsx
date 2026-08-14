import { useState } from "react";
import { Link, useParams } from "wouter";
import { getWeekLabelShort } from "@/lib/weekLabel";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import TeamLogo from "@/components/TeamLogo";
import { useGetPlayerGameLog, useGetPlayerAwards, useAddPlayerAward, useDeletePlayerAward, getGetPlayerAwardsQueryKey, useGetPlayerTransactions, useAddPlayerTransaction, useDeletePlayerTransaction, getGetPlayerTransactionsQueryKey, useGetLeagueSummary, getGetLeagueSummaryQueryKey } from "@workspace/api-client-react";
import LeagueSidebar from "@/components/league/LeagueSidebar";
import type { GameLogEntry, LeagueSummary } from "@workspace/api-client-react";
import { ArrowRight, User, Zap, Star, ShieldAlert, Activity, BarChart3, Trophy, Clock, BookOpen, UserCircle2, Check, X, Plus, Camera } from "lucide-react";
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
  // Bio
  height: number | null;
  weight: number | null;
  years_pro: number | null;
  rookie_year: number | null;
  draft_round: number | null;
  draft_pick: number | null;
  college: string | null;
  // Contract
  contract_salary: number | null;
  contract_bonus: number | null;
  contract_length: number | null;
  contract_years_left: number | null;
  cap_hit: number | null;
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
  trade_block: boolean;
  team_user_name: string | null;
  custom_portrait_url: string | null;
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

const ESPN_SLUG_OVERRIDE: Record<string, string> = { WAS: "wsh", ARZ: "ari", AZ: "ari" };
function espnLogoUrl(abbr: string): string {
  const slug = ESPN_SLUG_OVERRIDE[abbr.toUpperCase()] ?? abbr.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png`;
}

function portraitUrl(portraitId: number): string {
  return `https://ratings-images-prod.pulse.ea.com/madden-nfl-27/portraits/${portraitId}.png`;
}

// ─── Small components ─────────────────────────────────────────────────────────

function fmtHeightIn(inches: number): string {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

function fmtMoney(v: number | null | undefined): string {
  if (v == null || v === 0) return "—";
  const m = v / 1_000_000;
  if (m >= 0.1) return `$${parseFloat(m.toFixed(2))}M`;
  const k = v / 1_000;
  if (k >= 1) return `$${parseFloat(k.toFixed(1))}K`;
  return `$${v}`;
}

function BioPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/4 px-2 py-0.5">
      <span className="text-[10px] text-white/35 uppercase tracking-wider">{label}</span>
      <span className="text-[11px] font-semibold text-white/70">{value}</span>
    </span>
  );
}

function ContractCard({ player, teamColor }: { player: PlayerDetail; teamColor: string }) {
  const hasSalary   = player.contract_salary != null;
  const hasCapHit   = player.cap_hit != null;
  const hasBonus    = player.contract_bonus != null && player.contract_bonus > 0;
  const hasLength   = player.contract_length != null;
  const hasYearsLeft = player.contract_years_left != null;

  if (!hasSalary && !hasCapHit && !hasLength) return null;

  return (
    <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden mb-5">
      <div className="px-4 py-2.5" style={{ backgroundColor: teamColor }}>
        <span className="text-xs font-black uppercase tracking-widest text-white">Contract</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/5">
        {hasSalary && (
          <div className="px-4 py-3">
            <p className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">Salary</p>
            <p className="text-sm font-black text-white">{fmtMoney(player.contract_salary)}</p>
          </div>
        )}
        {hasCapHit && (
          <div className="px-4 py-3">
            <p className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">Cap Hit</p>
            <p className="text-sm font-black text-white">{fmtMoney(player.cap_hit)}</p>
          </div>
        )}
        {hasBonus && (
          <div className="px-4 py-3">
            <p className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">Bonus</p>
            <p className="text-sm font-black text-white">{fmtMoney(player.contract_bonus)}</p>
          </div>
        )}
        {hasLength && (
          <div className="px-4 py-3">
            <p className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">Length</p>
            <p className="text-sm font-black text-white">
              {player.contract_length} yr{(player.contract_length ?? 1) !== 1 ? "s" : ""}
              {hasYearsLeft && (
                <span className="text-white/35 font-normal text-[11px] ml-1">
                  ({player.contract_years_left} left)
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

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
    <>
      <ContractCard player={player} teamColor={teamColor} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {groups.map(g => (
          <AttrCard key={g.title} title={g.title} teamColor={teamColor}>
            {g.rows.map(r => (
              <RatingRow key={r.label} label={r.label} value={r.value} />
            ))}
          </AttrCard>
        ))}
      </div>
    </>
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

type ColDef = {
  header: string;
  render: (g: GameLogEntry) => string | number;
  sortValue?: (g: GameLogEntry) => number;
  dim?: boolean;
};

const QB_COLS: ColDef[] = [
  { header: "CMP/ATT", render: g => g.pss_cmp != null ? `${g.pss_cmp}/${g.pss_att ?? 0}` : "–" },
  { header: "YDS",    render: g => g.pss_yds ?? "–",    sortValue: g => g.pss_yds ?? 0 },
  { header: "TD",     render: g => g.pss_tds ?? "–",    sortValue: g => g.pss_tds ?? 0 },
  { header: "INT",    render: g => g.pss_ints ?? "–",   sortValue: g => g.pss_ints ?? 0 },
  { header: "SCK",    render: g => g.pss_sacks ?? "–",  sortValue: g => g.pss_sacks ?? 0, dim: true },
  { header: "RTG",    render: g => g.pss_rating ?? "–", sortValue: g => g.pss_rating ?? 0 },
  { header: "RSH",    render: g => g.rsh_yds != null ? `${g.rsh_yds}` : "–", sortValue: g => g.rsh_yds ?? 0, dim: true },
  { header: "RSH TD", render: g => g.rsh_tds ?? "–",   sortValue: g => g.rsh_tds ?? 0, dim: true },
];
const RB_COLS: ColDef[] = [
  { header: "CAR",  render: g => g.rsh_att ?? "–",  sortValue: g => g.rsh_att ?? 0 },
  { header: "YDS",  render: g => g.rsh_yds ?? "–",  sortValue: g => g.rsh_yds ?? 0 },
  { header: "AVG",  render: g => g.rsh_att ? ((g.rsh_yds ?? 0) / g.rsh_att).toFixed(1) : "–", sortValue: g => g.rsh_att ? (g.rsh_yds ?? 0) / g.rsh_att : 0 },
  { header: "TD",   render: g => g.rsh_tds ?? "–",  sortValue: g => g.rsh_tds ?? 0 },
  { header: "LNG",  render: g => g.rsh_lng ?? "–",  sortValue: g => g.rsh_lng ?? 0, dim: true },
  { header: "REC",  render: g => g.rec_catches ?? "–", sortValue: g => g.rec_catches ?? 0 },
  { header: "RYDS", render: g => g.rec_yds ?? "–",  sortValue: g => g.rec_yds ?? 0 },
  { header: "RTD",  render: g => g.rec_tds ?? "–",  sortValue: g => g.rec_tds ?? 0 },
  { header: "FMB",  render: g => g.fmb_lost ?? "–", sortValue: g => g.fmb_lost ?? 0, dim: true },
];
const WR_TE_COLS: ColDef[] = [
  { header: "REC",  render: g => g.rec_catches ?? "–", sortValue: g => g.rec_catches ?? 0 },
  { header: "YDS",  render: g => g.rec_yds ?? "–",     sortValue: g => g.rec_yds ?? 0 },
  { header: "AVG",  render: g => g.rec_catches ? ((g.rec_yds ?? 0) / g.rec_catches).toFixed(1) : "–", sortValue: g => g.rec_catches ? (g.rec_yds ?? 0) / g.rec_catches : 0 },
  { header: "TD",   render: g => g.rec_tds ?? "–",     sortValue: g => g.rec_tds ?? 0 },
  { header: "LNG",  render: g => g.rec_lng ?? "–",     sortValue: g => g.rec_lng ?? 0, dim: true },
  { header: "DROP", render: g => g.rec_drops ?? "–",   sortValue: g => g.rec_drops ?? 0, dim: true },
  { header: "YAC",  render: g => g.rec_yac ?? "–",     sortValue: g => g.rec_yac ?? 0, dim: true },
];
const DEF_COLS: ColDef[] = [
  { header: "TKL",  render: g => g.def_total_tackles ?? "–", sortValue: g => g.def_total_tackles ?? 0 },
  { header: "TFL",  render: g => g.def_tfl ?? "–",   sortValue: g => g.def_tfl ?? 0 },
  { header: "SCK",  render: g => g.def_sacks ?? "–", sortValue: g => g.def_sacks ?? 0 },
  { header: "INT",  render: g => g.def_ints ?? "–",  sortValue: g => g.def_ints ?? 0 },
  { header: "FF",   render: g => g.def_ff ?? "–",    sortValue: g => g.def_ff ?? 0, dim: true },
  { header: "PD",   render: g => g.def_pd ?? "–",    sortValue: g => g.def_pd ?? 0 },
  { header: "TD",   render: g => g.def_tds ?? "–",   sortValue: g => g.def_tds ?? 0, dim: true },
  { header: "FR",   render: g => g.def_fum_rec ?? "–", sortValue: g => g.def_fum_rec ?? 0, dim: true },
];
const K_COLS: ColDef[] = [
  { header: "FG M/A", render: g => `${g.fg_made ?? 0}/${g.fg_att ?? 0}` },
  { header: "LNG",    render: g => g.fg_lng ?? "–", sortValue: g => g.fg_lng ?? 0 },
  { header: "XP M/A", render: g => `${g.xp_made ?? 0}/${g.xp_att ?? 0}` },
];
const P_COLS: ColDef[] = [
  { header: "NO",   render: g => g.punt_att ?? "–",  sortValue: g => g.punt_att ?? 0 },
  { header: "YDS",  render: g => g.punt_yds ?? "–",  sortValue: g => g.punt_yds ?? 0 },
  { header: "AVG",  render: g => g.punt_avg ?? "–",  sortValue: g => g.punt_avg ?? 0 },
  { header: "LNG",  render: g => g.punt_lng ?? "–",  sortValue: g => g.punt_lng ?? 0 },
  { header: "IN20", render: g => g.punt_in20 ?? "–", sortValue: g => g.punt_in20 ?? 0 },
  { header: "TB",   render: g => g.punt_tbs ?? "–",  sortValue: g => g.punt_tbs ?? 0, dim: true },
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
  2: "Wildcard", 3: "Divisional", 4: "Conference", 5: "Super Bowl",
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

function GameLogTab({ playerId, position, teamColor }: { playerId: number; position: string; teamColor: string }) {
  const { data: log, isLoading } = useGetPlayerGameLog(playerId, {
    query: { queryKey: ["player-gamelog", playerId] },
  });

  const cols = getColsForPosition(position);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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

  const allSeasons = [...new Set(log.map(g => g.season))].sort((a, b) => b - a);
  const filteredLog = selectedSeason == null ? log : log.filter(g => g.season === selectedSeason);

  const bySeason = filteredLog.reduce((m, g) => {
    const arr = m.get(g.season) ?? [];
    arr.push(g);
    m.set(g.season, arr);
    return m;
  }, new Map<number, typeof log>());
  const seasons = [...bySeason.keys()].sort((a, b) => b - a);

  function computeHighs(games: GameLogEntry[]): Map<string, number> {
    const highs = new Map<string, number>();
    for (const col of cols) {
      if (!col.sortValue) continue;
      const max = Math.max(...games.map(g => col.sortValue!(g)));
      if (max > 0) highs.set(col.header, max);
    }
    return highs;
  }

  function handleSort(header: string) {
    if (sortCol === header) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortCol(header);
      setSortDir("desc");
    }
  }

  function sortGames(games: GameLogEntry[]): GameLogEntry[] {
    if (!sortCol) return games;
    if (sortCol === "WK") {
      return [...games].sort((a, b) => {
        const av = a.stage_index === 1 ? a.week : 100 + a.stage_index;
        const bv = b.stage_index === 1 ? b.week : 100 + b.stage_index;
        return sortDir === "desc" ? bv - av : av - bv;
      });
    }
    const col = cols.find(c => c.header === sortCol);
    if (!col?.sortValue) return games;
    return [...games].sort((a, b) =>
      sortDir === "desc" ? col.sortValue!(b) - col.sortValue!(a) : col.sortValue!(a) - col.sortValue!(b)
    );
  }

  return (
    <div className="space-y-5">
      {/* Season filter pills */}
      {allSeasons.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedSeason(null)}
            className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all"
            style={selectedSeason == null
              ? { backgroundColor: teamColor, color: "#fff" }
              : { backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}
          >
            All
          </button>
          {allSeasons.map(s => (
            <button
              key={s}
              onClick={() => setSelectedSeason(s)}
              className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all"
              style={selectedSeason === s
                ? { backgroundColor: teamColor, color: "#fff" }
                : { backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      {seasons.map(season => {
        const games = bySeason.get(season)!;
        const sorted = sortGames(games);
        const highs = computeHighs(games);

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
                  <tr style={{ backgroundColor: teamColor }}>
                    <th
                      className="text-left py-2 px-3 text-white font-black uppercase tracking-wider text-[10px] w-24 whitespace-nowrap cursor-pointer select-none"
                      onClick={() => handleSort("WK")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        WK
                        <span className="text-[9px] opacity-70 ml-0.5">
                          {sortCol === "WK" ? (sortDir === "desc" ? "▼" : "▲") : "⇅"}
                        </span>
                      </span>
                    </th>
                    <th className="text-left py-2 px-3 text-white font-black uppercase tracking-wider text-[10px]">OPP</th>
                    <th className="text-center py-2 px-3 text-white font-black uppercase tracking-wider text-[10px] w-10">RES</th>
                    <th className="text-center py-2 px-2 text-white font-black uppercase tracking-wider text-[10px] w-14">SCORE</th>
                    {cols.map(c => (
                      <th
                        key={c.header}
                        className={`text-right py-2 px-3 text-white font-black uppercase tracking-wider text-[10px] ${c.sortValue ? "cursor-pointer select-none" : ""}`}
                        onClick={c.sortValue ? () => handleSort(c.header) : undefined}
                      >
                        <span className="inline-flex items-center justify-end gap-0.5">
                          {c.header}
                          {c.sortValue && (
                            <span className="text-[9px] opacity-70 ml-0.5">
                              {sortCol === c.header ? (sortDir === "desc" ? "▼" : "▲") : "⇅"}
                            </span>
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((g, i) => (
                    <tr
                      key={g.id}
                      className={`border-b border-white/4 transition-colors hover:bg-white/[0.03] ${i % 2 === 0 ? "" : "bg-white/[0.015]"}`}
                    >
                      <td className="py-2 px-3 [font-family:'Lora',serif] text-[#ffffff] whitespace-nowrap">{weekLabel(g)}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          {g.opponent_abbreviation ? (
                            <>
                              <TeamLogo abbreviation={g.opponent_abbreviation} primaryColor={g.opponent_primary_color} size="sm" shape="circle" />
                              <span className="[font-family:'Lora',serif] text-white/50 text-[14px]">
                                {g.is_home === false ? "@" : ""}
                                <span className="text-white/80 font-bold text-[14px]">{g.opponent_abbreviation}</span>
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
                      <td className="py-1.5 px-2 text-center [font-family:'Lora',serif] text-[#ffffff] text-[14px]">
                        {g.player_score != null
                          ? `${g.player_score}-${g.opponent_score ?? "?"}`
                          : "–"}
                      </td>
                      {cols.map(c => {
                        const isHigh = c.sortValue != null
                          && highs.has(c.header)
                          && c.sortValue(g) > 0
                          && c.sortValue(g) === highs.get(c.header)!;
                        return (
                          <td
                            key={c.header}
                            className="py-2 px-3 text-right [font-family:'Lora',serif] text-[14px] text-[#ffffff]"
                          >
                            {c.render(g)}
                          </td>
                        );
                      })}
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

// ─── Career Stats Tab ─────────────────────────────────────────────────────────

type AggrRow = {
  season: number; gp: number;
  pss_att: number; pss_cmp: number; pss_yds: number; pss_tds: number; pss_ints: number; pss_sacks: number;
  pss_rtg_wsum: number; pss_rtg_watts: number;
  rsh_att: number; rsh_yds: number; rsh_tds: number; rsh_lng: number; fmb_lost: number;
  rec_catches: number; rec_yds: number; rec_tds: number; rec_lng: number; rec_drops: number; rec_yac: number;
  def_total_tackles: number; def_tfl: number; def_sacks: number; def_ints: number; def_ff: number; def_pd: number; def_tds: number; def_fum_rec: number;
  fg_made: number; fg_att: number; fg_lng: number; xp_made: number; xp_att: number;
  punt_att: number; punt_yds: number; punt_lng: number; punt_in20: number; punt_tbs: number;
};

function emptyAggr(season: number): AggrRow {
  return {
    season, gp: 0,
    pss_att: 0, pss_cmp: 0, pss_yds: 0, pss_tds: 0, pss_ints: 0, pss_sacks: 0, pss_rtg_wsum: 0, pss_rtg_watts: 0,
    rsh_att: 0, rsh_yds: 0, rsh_tds: 0, rsh_lng: 0, fmb_lost: 0,
    rec_catches: 0, rec_yds: 0, rec_tds: 0, rec_lng: 0, rec_drops: 0, rec_yac: 0,
    def_total_tackles: 0, def_tfl: 0, def_sacks: 0, def_ints: 0, def_ff: 0, def_pd: 0, def_tds: 0, def_fum_rec: 0,
    fg_made: 0, fg_att: 0, fg_lng: 0, xp_made: 0, xp_att: 0,
    punt_att: 0, punt_yds: 0, punt_lng: 0, punt_in20: 0, punt_tbs: 0,
  };
}

function aggregateLog(log: GameLogEntry[]): AggrRow[] {
  const map = new Map<number, AggrRow>();
  for (const g of log) {
    if (!map.has(g.season)) map.set(g.season, emptyAggr(g.season));
    const r = map.get(g.season)!;
    r.gp++;
    r.pss_att      += g.pss_att      ?? 0;
    r.pss_cmp      += g.pss_cmp      ?? 0;
    r.pss_yds      += g.pss_yds      ?? 0;
    r.pss_tds      += g.pss_tds      ?? 0;
    r.pss_ints     += g.pss_ints     ?? 0;
    r.pss_sacks    += g.pss_sacks    ?? 0;
    if ((g.pss_att ?? 0) > 0 && g.pss_rating != null) {
      r.pss_rtg_wsum   += g.pss_rating * (g.pss_att ?? 0);
      r.pss_rtg_watts  += g.pss_att ?? 0;
    }
    r.rsh_att      += g.rsh_att      ?? 0;
    r.rsh_yds      += g.rsh_yds      ?? 0;
    r.rsh_tds      += g.rsh_tds      ?? 0;
    r.rsh_lng       = Math.max(r.rsh_lng, g.rsh_lng ?? 0);
    r.fmb_lost     += g.fmb_lost     ?? 0;
    r.rec_catches  += g.rec_catches  ?? 0;
    r.rec_yds      += g.rec_yds      ?? 0;
    r.rec_tds      += g.rec_tds      ?? 0;
    r.rec_lng       = Math.max(r.rec_lng, g.rec_lng ?? 0);
    r.rec_drops    += g.rec_drops    ?? 0;
    r.rec_yac      += g.rec_yac      ?? 0;
    r.def_total_tackles += g.def_total_tackles ?? 0;
    r.def_tfl      += g.def_tfl      ?? 0;
    r.def_sacks    += g.def_sacks    ?? 0;
    r.def_ints     += g.def_ints     ?? 0;
    r.def_ff       += g.def_ff       ?? 0;
    r.def_pd       += g.def_pd       ?? 0;
    r.def_tds      += g.def_tds      ?? 0;
    r.def_fum_rec  += g.def_fum_rec  ?? 0;
    r.fg_made      += g.fg_made      ?? 0;
    r.fg_att       += g.fg_att       ?? 0;
    r.fg_lng        = Math.max(r.fg_lng, g.fg_lng ?? 0);
    r.xp_made      += g.xp_made      ?? 0;
    r.xp_att       += g.xp_att       ?? 0;
    r.punt_att     += g.punt_att     ?? 0;
    r.punt_yds     += g.punt_yds     ?? 0;
    r.punt_lng      = Math.max(r.punt_lng, g.punt_lng ?? 0);
    r.punt_in20    += g.punt_in20    ?? 0;
    r.punt_tbs     += g.punt_tbs     ?? 0;
  }
  return [...map.values()].sort((a, b) => a.season - b.season);
}

function careerTotals(seasons: AggrRow[]): AggrRow {
  const c = emptyAggr(0);
  for (const s of seasons) {
    c.gp           += s.gp;
    c.pss_att      += s.pss_att;      c.pss_cmp  += s.pss_cmp;  c.pss_yds  += s.pss_yds;
    c.pss_tds      += s.pss_tds;      c.pss_ints += s.pss_ints; c.pss_sacks += s.pss_sacks;
    c.pss_rtg_wsum += s.pss_rtg_wsum; c.pss_rtg_watts += s.pss_rtg_watts;
    c.rsh_att      += s.rsh_att;      c.rsh_yds  += s.rsh_yds;  c.rsh_tds  += s.rsh_tds;
    c.rsh_lng       = Math.max(c.rsh_lng, s.rsh_lng);
    c.fmb_lost     += s.fmb_lost;
    c.rec_catches  += s.rec_catches;  c.rec_yds  += s.rec_yds;  c.rec_tds  += s.rec_tds;
    c.rec_lng       = Math.max(c.rec_lng, s.rec_lng);
    c.rec_drops    += s.rec_drops;    c.rec_yac  += s.rec_yac;
    c.def_total_tackles += s.def_total_tackles;
    c.def_tfl      += s.def_tfl;      c.def_sacks += s.def_sacks; c.def_ints += s.def_ints;
    c.def_ff       += s.def_ff;       c.def_pd    += s.def_pd;    c.def_tds  += s.def_tds;
    c.def_fum_rec  += s.def_fum_rec;
    c.fg_made      += s.fg_made;      c.fg_att   += s.fg_att;
    c.fg_lng        = Math.max(c.fg_lng, s.fg_lng);
    c.xp_made      += s.xp_made;      c.xp_att   += s.xp_att;
    c.punt_att     += s.punt_att;     c.punt_yds += s.punt_yds;
    c.punt_lng      = Math.max(c.punt_lng, s.punt_lng);
    c.punt_in20    += s.punt_in20;    c.punt_tbs += s.punt_tbs;
  }
  return c;
}

type CareerColDef = { header: string; render: (r: AggrRow) => string | number; sortValue?: (r: AggrRow) => number; dim?: boolean };

const QB_CAREER_COLS: CareerColDef[] = [
  { header: "CMP",     render: r => r.pss_cmp  || "–", sortValue: r => r.pss_cmp },
  { header: "ATT",     render: r => r.pss_att  || "–", sortValue: r => r.pss_att },
  { header: "CMP%",    render: r => r.pss_att ? `${((r.pss_cmp / r.pss_att) * 100).toFixed(1)}%` : "–", sortValue: r => r.pss_att ? r.pss_cmp / r.pss_att : 0 },
  { header: "YDS",     render: r => r.pss_yds  || "–", sortValue: r => r.pss_yds },
  { header: "TD",      render: r => r.pss_tds  || "–", sortValue: r => r.pss_tds },
  { header: "INT",     render: r => r.pss_ints || "–", sortValue: r => r.pss_ints },
  { header: "SCK",     render: r => r.pss_sacks || "–", sortValue: r => r.pss_sacks, dim: true },
  { header: "RTG",     render: r => r.pss_rtg_watts ? (r.pss_rtg_wsum / r.pss_rtg_watts).toFixed(1) : "–", sortValue: r => r.pss_rtg_watts ? r.pss_rtg_wsum / r.pss_rtg_watts : 0 },
  { header: "RSH YDS", render: r => r.rsh_yds || "–", sortValue: r => r.rsh_yds, dim: true },
  { header: "RSH TD",  render: r => r.rsh_tds || "–", sortValue: r => r.rsh_tds, dim: true },
];
const RB_CAREER_COLS: CareerColDef[] = [
  { header: "CAR",   render: r => r.rsh_att    || "–", sortValue: r => r.rsh_att },
  { header: "YDS",   render: r => r.rsh_yds    || "–", sortValue: r => r.rsh_yds },
  { header: "AVG",   render: r => r.rsh_att ? (r.rsh_yds / r.rsh_att).toFixed(1) : "–", sortValue: r => r.rsh_att ? r.rsh_yds / r.rsh_att : 0 },
  { header: "TD",    render: r => r.rsh_tds    || "–", sortValue: r => r.rsh_tds },
  { header: "LNG",   render: r => r.rsh_lng    || "–", sortValue: r => r.rsh_lng, dim: true },
  { header: "REC",   render: r => r.rec_catches || "–", sortValue: r => r.rec_catches },
  { header: "RYDS",  render: r => r.rec_yds    || "–", sortValue: r => r.rec_yds },
  { header: "RTD",   render: r => r.rec_tds    || "–", sortValue: r => r.rec_tds },
  { header: "FMB",   render: r => r.fmb_lost   || "–", sortValue: r => r.fmb_lost, dim: true },
];
const WR_TE_CAREER_COLS: CareerColDef[] = [
  { header: "REC",   render: r => r.rec_catches || "–", sortValue: r => r.rec_catches },
  { header: "YDS",   render: r => r.rec_yds     || "–", sortValue: r => r.rec_yds },
  { header: "AVG",   render: r => r.rec_catches ? (r.rec_yds / r.rec_catches).toFixed(1) : "–", sortValue: r => r.rec_catches ? r.rec_yds / r.rec_catches : 0 },
  { header: "TD",    render: r => r.rec_tds     || "–", sortValue: r => r.rec_tds },
  { header: "LNG",   render: r => r.rec_lng     || "–", sortValue: r => r.rec_lng, dim: true },
  { header: "DROP",  render: r => r.rec_drops   || "–", sortValue: r => r.rec_drops, dim: true },
  { header: "YAC",   render: r => r.rec_yac     || "–", sortValue: r => r.rec_yac, dim: true },
];
const DEF_CAREER_COLS: CareerColDef[] = [
  { header: "TKL",   render: r => r.def_total_tackles || "–", sortValue: r => r.def_total_tackles },
  { header: "TFL",   render: r => r.def_tfl     || "–", sortValue: r => r.def_tfl },
  { header: "SCK",   render: r => r.def_sacks   || "–", sortValue: r => r.def_sacks },
  { header: "INT",   render: r => r.def_ints    || "–", sortValue: r => r.def_ints },
  { header: "FF",    render: r => r.def_ff      || "–", sortValue: r => r.def_ff, dim: true },
  { header: "PD",    render: r => r.def_pd      || "–", sortValue: r => r.def_pd },
  { header: "TD",    render: r => r.def_tds     || "–", sortValue: r => r.def_tds, dim: true },
  { header: "FR",    render: r => r.def_fum_rec || "–", sortValue: r => r.def_fum_rec, dim: true },
];
const K_CAREER_COLS: CareerColDef[] = [
  { header: "FGM",  render: r => r.fg_made  || "–", sortValue: r => r.fg_made },
  { header: "FGA",  render: r => r.fg_att   || "–", sortValue: r => r.fg_att },
  { header: "FG%",  render: r => r.fg_att ? `${((r.fg_made / r.fg_att) * 100).toFixed(1)}%` : "–", sortValue: r => r.fg_att ? r.fg_made / r.fg_att : 0 },
  { header: "LNG",  render: r => r.fg_lng   || "–", sortValue: r => r.fg_lng, dim: true },
  { header: "XPM",  render: r => r.xp_made  || "–", sortValue: r => r.xp_made },
  { header: "XPA",  render: r => r.xp_att   || "–", sortValue: r => r.xp_att },
];
const P_CAREER_COLS: CareerColDef[] = [
  { header: "NO",   render: r => r.punt_att  || "–", sortValue: r => r.punt_att },
  { header: "YDS",  render: r => r.punt_yds  || "–", sortValue: r => r.punt_yds },
  { header: "AVG",  render: r => r.punt_att ? (r.punt_yds / r.punt_att).toFixed(1) : "–", sortValue: r => r.punt_att ? r.punt_yds / r.punt_att : 0 },
  { header: "LNG",  render: r => r.punt_lng  || "–", sortValue: r => r.punt_lng, dim: true },
  { header: "IN20", render: r => r.punt_in20 || "–", sortValue: r => r.punt_in20 },
  { header: "TB",   render: r => r.punt_tbs  || "–", sortValue: r => r.punt_tbs, dim: true },
];

function getCareerCols(position: string): CareerColDef[] {
  if (QB_POS.has(position))  return QB_CAREER_COLS;
  if (RB_POS.has(position))  return RB_CAREER_COLS;
  if (WRTE.has(position))    return WR_TE_CAREER_COLS;
  if (DEF_POS.has(position)) return DEF_CAREER_COLS;
  if (K_POS.has(position))   return K_CAREER_COLS;
  if (P_POS.has(position))   return P_CAREER_COLS;
  return DEF_CAREER_COLS;
}

function getCareerHighlights(career: AggrRow, position: string): { label: string; value: string | number }[] {
  if (QB_POS.has(position)) return [
    { label: "Pass YDS",  value: career.pss_yds  || "–" },
    { label: "Pass TD",   value: career.pss_tds  || "–" },
    { label: "INT",       value: career.pss_ints || "–" },
    { label: "RTG",       value: career.pss_rtg_watts ? (career.pss_rtg_wsum / career.pss_rtg_watts).toFixed(1) : "–" },
  ];
  if (RB_POS.has(position)) return [
    { label: "Rush YDS",  value: career.rsh_yds    || "–" },
    { label: "Rush TD",   value: career.rsh_tds    || "–" },
    { label: "Rec YDS",   value: career.rec_yds    || "–" },
    { label: "Fumbles",   value: career.fmb_lost   || "–" },
  ];
  if (WRTE.has(position)) return [
    { label: "Rec",       value: career.rec_catches || "–" },
    { label: "Rec YDS",   value: career.rec_yds     || "–" },
    { label: "Rec TD",    value: career.rec_tds     || "–" },
    { label: "YAC",       value: career.rec_yac     || "–" },
  ];
  if (DEF_POS.has(position)) return [
    { label: "Tackles",   value: career.def_total_tackles || "–" },
    { label: "Sacks",     value: career.def_sacks   || "–" },
    { label: "INT",       value: career.def_ints    || "–" },
    { label: "PD",        value: career.def_pd      || "–" },
  ];
  if (K_POS.has(position)) return [
    { label: "FG Made",   value: career.fg_made  || "–" },
    { label: "FG%",       value: career.fg_att ? `${((career.fg_made / career.fg_att) * 100).toFixed(1)}%` : "–" },
    { label: "Long",      value: career.fg_lng   || "–" },
    { label: "XP Made",   value: career.xp_made  || "–" },
  ];
  if (P_POS.has(position)) return [
    { label: "Punts",     value: career.punt_att  || "–" },
    { label: "Avg",       value: career.punt_att ? (career.punt_yds / career.punt_att).toFixed(1) : "–" },
    { label: "Long",      value: career.punt_lng  || "–" },
    { label: "IN20",      value: career.punt_in20 || "–" },
  ];
  return [];
}

function CareerStatsTab({ playerId, position, teamColor }: { playerId: number; position: string; teamColor: string }) {
  const { data: log, isLoading } = useGetPlayerGameLog(playerId, {
    query: { queryKey: ["player-gamelog", playerId] },
  });

  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-white/30 text-sm">
        Loading career stats…
      </div>
    );
  }

  if (!log?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <BookOpen className="h-10 w-10 text-white/15" />
        <p className="text-sm text-white/30 font-medium">No game data yet</p>
        <p className="text-xs text-white/20 max-w-xs">Career statistics will appear here after weekly stat imports.</p>
      </div>
    );
  }

  const allSeasons = aggregateLog(log);
  const career     = careerTotals(allSeasons);
  const cols       = getCareerCols(position);
  const highlights = getCareerHighlights(career, position);

  function handleSort(header: string) {
    if (sortCol === header) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortCol(header);
      setSortDir("desc");
    }
  }

  const seasons = (() => {
    if (!sortCol) return allSeasons;
    if (sortCol === "SEASON") {
      return [...allSeasons].sort((a, b) => sortDir === "desc" ? b.season - a.season : a.season - b.season);
    }
    if (sortCol === "GP") {
      return [...allSeasons].sort((a, b) => sortDir === "desc" ? b.gp - a.gp : a.gp - b.gp);
    }
    const col = cols.find(c => c.header === sortCol);
    if (!col?.sortValue) return allSeasons;
    return [...allSeasons].sort((a, b) =>
      sortDir === "desc" ? col.sortValue!(b) - col.sortValue!(a) : col.sortValue!(a) - col.sortValue!(b)
    );
  })();

  function sortIcon(header: string) {
    if (sortCol !== header) return <span className="text-[9px] opacity-70 ml-0.5">⇅</span>;
    return <span className="text-[9px] opacity-90 ml-0.5">{sortDir === "desc" ? "▼" : "▲"}</span>;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Highlight badges */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <div className="flex flex-col gap-0.5 px-4 py-3 rounded-xl border border-white/8 bg-[#141414]">
          <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Seasons</span>
          <span className="text-2xl font-black tabular-nums leading-tight" style={{ color: teamColor }}>{allSeasons.length}</span>
        </div>
        <div className="flex flex-col gap-0.5 px-4 py-3 rounded-xl border border-white/8 bg-[#141414]">
          <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Games</span>
          <span className="text-2xl font-black tabular-nums leading-tight" style={{ color: teamColor }}>{career.gp}</span>
        </div>
        {highlights.map(h => (
          <div key={h.label} className="flex flex-col gap-0.5 px-4 py-3 rounded-xl border border-white/8 bg-[#141414]">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/30">{h.label}</span>
            <span className="text-2xl font-black tabular-nums leading-tight text-white">{h.value}</span>
          </div>
        ))}
      </div>

      {/* Season-by-season table */}
      <div className="overflow-x-auto rounded-lg border border-white/5">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ backgroundColor: teamColor }}>
              <th
                className="text-left py-2 px-3 text-white font-black uppercase tracking-wider text-[10px] whitespace-nowrap cursor-pointer select-none"
                onClick={() => handleSort("SEASON")}
              >
                <span className="inline-flex items-center gap-0.5">Season{sortIcon("SEASON")}</span>
              </th>
              <th
                className="text-center py-2 px-3 text-white font-black uppercase tracking-wider text-[10px] cursor-pointer select-none"
                onClick={() => handleSort("GP")}
              >
                <span className="inline-flex items-center justify-center gap-0.5">GP{sortIcon("GP")}</span>
              </th>
              {cols.map(c => (
                <th
                  key={c.header}
                  onClick={() => handleSort(c.header)}
                  className={`text-right py-2 px-3 font-black uppercase tracking-wider text-[10px] whitespace-nowrap cursor-pointer select-none ${c.dim ? "text-white/55" : "text-white"}`}
                >
                  <span className="inline-flex items-center justify-end gap-0.5">{c.header}{sortIcon(c.header)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {seasons.map((row, i) => (
              <tr
                key={row.season}
                className={`border-b border-white/4 transition-colors hover:bg-white/[0.03] ${i % 2 === 0 ? "" : "bg-white/[0.015]"}`}
              >
                <td className="py-2 px-3 [font-family:'Lora',serif] text-white font-bold text-[14px] whitespace-nowrap">{row.season}</td>
                <td className="py-2 px-3 text-center [font-family:'Lora',serif] text-white/60 text-[14px]">{row.gp}</td>
                {cols.map(c => (
                  <td
                    key={c.header}
                    className={`py-2 px-3 text-right [font-family:'Lora',serif] text-[14px] ${c.dim ? "text-white/25" : "text-white/70"}`}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: `${teamColor}18` }} className="border-t-2 border-white/15">
              <td className="py-2.5 px-3 font-black uppercase tracking-wider text-[10px] text-white whitespace-nowrap">Career</td>
              <td className="py-2.5 px-3 text-center [font-family:'Lora',serif] text-white font-bold text-[14px]">{career.gp}</td>
              {cols.map(c => (
                <td
                  key={c.header}
                  className="py-2.5 px-3 text-right [font-family:'Lora',serif] text-[14px] font-bold text-white"
                >
                  {c.render(career)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Awards Tab ───────────────────────────────────────────────────────────────

const YEARLY_TYPES = new Set(["MVP", "AFC_OPOY", "NFC_OPOY", "AFC_DPOY", "NFC_DPOY", "AFC_DROY", "NFC_DROY", "AFC_OROY", "NFC_OROY"]);
const ALL_PRO_TYPES = new Set(["ALL_PRO_1ST", "ALL_PRO_2ND"]);

const AWARD_LABELS: Record<string, string> = {
  MVP:        "MVP",
  AFC_OPOY:   "AFC Offensive POY",
  NFC_OPOY:   "NFC Offensive POY",
  AFC_DPOY:   "AFC Defensive POY",
  NFC_DPOY:   "NFC Defensive POY",
  AFC_DROY:   "AFC Defensive ROY",
  NFC_DROY:   "NFC Defensive ROY",
  AFC_OROY:   "AFC Offensive ROY",
  NFC_OROY:   "NFC Offensive ROY",
  ALL_PRO_1ST: "1st Team All-Pro",
  ALL_PRO_2ND: "2nd Team All-Pro",
};

const ALL_AWARD_OPTIONS = [
  { value: "MVP",        group: "Yearly Awards" },
  { value: "AFC_OPOY",   group: "Yearly Awards" },
  { value: "NFC_OPOY",   group: "Yearly Awards" },
  { value: "AFC_DPOY",   group: "Yearly Awards" },
  { value: "NFC_DPOY",   group: "Yearly Awards" },
  { value: "AFC_DROY",   group: "Yearly Awards" },
  { value: "NFC_DROY",   group: "Yearly Awards" },
  { value: "AFC_OROY",   group: "Yearly Awards" },
  { value: "NFC_OROY",   group: "Yearly Awards" },
  { value: "ALL_PRO_1ST", group: "All-Pro" },
  { value: "ALL_PRO_2ND", group: "All-Pro" },
];

type AwardRow = { id: number; season: number; award_type: string; player_id: number; league_id: number; created_at: string };

function AwardTable({
  rows,
  emptyMsg,
  teamColor,
  onDelete,
  deleteDisabled,
}: {
  rows: AwardRow[];
  emptyMsg: string;
  teamColor: string;
  onDelete: (id: number) => void;
  deleteDisabled: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/5">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr style={{ backgroundColor: teamColor }}>
            <th className="text-left py-2 px-3 text-white font-black uppercase tracking-wider text-[10px] w-24">Season</th>
            <th className="text-left py-2 px-3 text-white font-black uppercase tracking-wider text-[10px]">Award</th>
            <th className="py-2 px-3 w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-6 px-3 text-center text-white/20 text-xs">{emptyMsg}</td>
            </tr>
          ) : rows.map((a, i) => (
            <tr
              key={a.id}
              className={`border-b border-white/4 transition-colors hover:bg-white/[0.03] ${i % 2 === 0 ? "" : "bg-white/[0.015]"}`}
            >
              <td className="py-2 px-3 [font-family:'Lora',serif] text-white font-bold text-[14px]">{a.season}</td>
              <td className="py-2 px-3 text-white/80 text-[13px] font-semibold">{AWARD_LABELS[a.award_type] ?? a.award_type}</td>
              <td className="py-2 px-2 text-right">
                <button
                  onClick={() => onDelete(a.id)}
                  disabled={deleteDisabled}
                  className="h-6 w-6 rounded flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-40"
                  title="Remove award"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AwardsTab({ playerId, leagueId, teamColor }: { playerId: number; leagueId: number; teamColor: string }) {
  const queryClient = useQueryClient();

  const { data: awards, isLoading } = useGetPlayerAwards(playerId, {
    query: { queryKey: getGetPlayerAwardsQueryKey(playerId) },
  });

  const addAward    = useAddPlayerAward();
  const deleteAward = useDeletePlayerAward();

  const [season,    setSeason]    = useState<string>("");
  const [awardType, setAwardType] = useState<string>("MVP");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const s = Number(season);
    if (!s || !awardType) return;
    await addAward.mutateAsync({ id: playerId, data: { league_id: leagueId, season: s, award_type: awardType } });
    await queryClient.invalidateQueries({ queryKey: getGetPlayerAwardsQueryKey(playerId) });
    setSeason("");
  }

  async function handleDelete(awardId: number) {
    await deleteAward.mutateAsync({ id: playerId, awardId });
    await queryClient.invalidateQueries({ queryKey: getGetPlayerAwardsQueryKey(playerId) });
  }

  const yearlyAwards = (awards ?? []).filter(a => YEARLY_TYPES.has(a.award_type)).sort((a, b) => b.season - a.season);
  const allProAwards = (awards ?? []).filter(a => ALL_PRO_TYPES.has(a.award_type)).sort((a, b) => b.season - a.season);

  return (
    <div className="flex flex-col gap-6">
      {/* Admin — add award form */}
      <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: teamColor }}>
          <Plus className="h-3.5 w-3.5 text-white" />
          <span className="text-xs font-black uppercase tracking-widest text-white">Add Award</span>
        </div>
        <form onSubmit={handleAdd} className="px-4 py-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/30">Season</label>
            <input
              type="number"
              value={season}
              onChange={e => setSeason(e.target.value)}
              placeholder="2025"
              min={2000}
              max={2100}
              required
              className="w-24 bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/30">Award</label>
            <select
              value={awardType}
              onChange={e => setAwardType(e.target.value)}
              className="bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/30"
            >
              {ALL_AWARD_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{AWARD_LABELS[o.value]}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={addAward.isPending || !season}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider text-white disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: teamColor }}
          >
            <Plus className="h-3.5 w-3.5" />
            {addAward.isPending ? "Adding…" : "Add"}
          </button>
          {addAward.isError && (
            <span className="text-xs text-red-400">Failed to add award.</span>
          )}
        </form>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-white/30 text-sm">Loading awards…</div>
      ) : (
        <>
          {/* Yearly Awards */}
          <div className="flex flex-col gap-2">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-white/40">Yearly Awards</h3>
            <AwardTable rows={yearlyAwards} emptyMsg="No yearly awards recorded" teamColor={teamColor} onDelete={handleDelete} deleteDisabled={deleteAward.isPending} />
          </div>

          {/* All-Pro */}
          <div className="flex flex-col gap-2">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-white/40">All-Pro Selections</h3>
            <AwardTable rows={allProAwards} emptyMsg="No All-Pro selections recorded" teamColor={teamColor} onDelete={handleDelete} deleteDisabled={deleteAward.isPending} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

const TRANSACTION_TYPE_OPTIONS = [
  "DRAFTED",
  "SIGNED",
  "RELEASED",
  "TRADED",
  "WAIVER",
  "PRACTICE_SQUAD",
  "RETIRED",
  "RESTRUCTURED",
] as const;

const TRANSACTION_LABELS: Record<string, string> = {
  DRAFTED:       "Drafted",
  SIGNED:        "Signed",
  RELEASED:      "Released",
  TRADED:        "Traded",
  WAIVER:        "Waiver Claim",
  PRACTICE_SQUAD:"Practice Squad",
  RETIRED:       "Retired",
  RESTRUCTURED:  "Restructured",
};

const TRANSACTION_COLORS: Record<string, string> = {
  DRAFTED:       "#F5A623",
  SIGNED:        "#4CAF50",
  RELEASED:      "#F44336",
  TRADED:        "#00C8FF",
  WAIVER:        "#9C27B0",
  PRACTICE_SQUAD:"#607D8B",
  RETIRED:       "#78909C",
  RESTRUCTURED:  "#FF9800",
};

type TxRow = {
  id: number;
  player_id: number;
  league_id: number;
  season: number;
  week?: number | null;
  transaction_type: string;
  from_team?: string | null;
  to_team?: string | null;
  notes?: string | null;
  created_at: string;
};

function HistoryTab({ playerId, leagueId, teamColor }: { playerId: number; leagueId: number; teamColor: string }) {
  const queryClient = useQueryClient();

  const { data: transactions, isLoading } = useGetPlayerTransactions(playerId, {
    query: { queryKey: getGetPlayerTransactionsQueryKey(playerId) },
  });

  const addTx    = useAddPlayerTransaction();
  const deleteTx = useDeletePlayerTransaction();

  const [season, setSeason]     = useState<string>("");
  const [week,   setWeek]       = useState<string>("");
  const [txType, setTxType]     = useState<string>("SIGNED");
  const [fromTeam, setFromTeam] = useState<string>("");
  const [toTeam, setToTeam]     = useState<string>("");
  const [notes,  setNotes]      = useState<string>("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const s = Number(season);
    if (!s || !txType) return;
    await addTx.mutateAsync({
      id: playerId,
      data: {
        league_id: leagueId,
        season: s,
        week: week ? Number(week) : null,
        transaction_type: txType,
        from_team: fromTeam.trim() || null,
        to_team: toTeam.trim() || null,
        notes: notes.trim() || null,
      },
    });
    await queryClient.invalidateQueries({ queryKey: getGetPlayerTransactionsQueryKey(playerId) });
    setSeason(""); setWeek(""); setFromTeam(""); setToTeam(""); setNotes("");
  }

  async function handleDelete(txId: number) {
    await deleteTx.mutateAsync({ id: playerId, transactionId: txId });
    await queryClient.invalidateQueries({ queryKey: getGetPlayerTransactionsQueryKey(playerId) });
  }

  const rows = (transactions ?? []) as TxRow[];

  return (
    <div className="flex flex-col gap-6">
      {/* Add form */}
      <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: teamColor }}>
          <Plus className="h-3.5 w-3.5 text-white" />
          <span className="text-xs font-black uppercase tracking-widest text-white">Log Transaction</span>
        </div>
        <form onSubmit={handleAdd} className="px-4 py-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/30">Season</label>
            <input
              type="number" value={season} onChange={e => setSeason(e.target.value)}
              placeholder="2025" min={2000} max={2100} required
              className="w-24 bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/30">Week</label>
            <input
              type="number" value={week} onChange={e => setWeek(e.target.value)}
              placeholder="—" min={1} max={22}
              className="w-20 bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/30">Type</label>
            <select
              value={txType} onChange={e => setTxType(e.target.value)}
              className="bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/30"
            >
              {TRANSACTION_TYPE_OPTIONS.map(t => (
                <option key={t} value={t}>{TRANSACTION_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/30">From Team</label>
            <input
              type="text" value={fromTeam} onChange={e => setFromTeam(e.target.value)}
              placeholder="e.g. Eagles"
              className="w-32 bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/30">To Team</label>
            <input
              type="text" value={toTeam} onChange={e => setToTeam(e.target.value)}
              placeholder="e.g. Chiefs"
              className="w-32 bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-40">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/30">Notes</label>
            <input
              type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Optional details…"
              className="w-full bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
            />
          </div>
          <button
            type="submit" disabled={addTx.isPending || !season}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider text-white disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: teamColor }}
          >
            <Plus className="h-3.5 w-3.5" />
            {addTx.isPending ? "Adding…" : "Add"}
          </button>
          {addTx.isError && <span className="text-xs text-red-400">Failed to add.</span>}
        </form>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-white/30 text-sm">Loading history…</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <Clock className="h-10 w-10 text-white/10" />
          <p className="text-sm text-white/25 font-medium">No transactions recorded</p>
          <p className="text-xs text-white/15 max-w-xs">Use the form above to log trades, signings, and other moves.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-0">
          {rows.map((tx, i) => {
            const color = TRANSACTION_COLORS[tx.transaction_type] ?? "#666";
            const label = TRANSACTION_LABELS[tx.transaction_type] ?? tx.transaction_type;
            const isLast = i === rows.length - 1;
            return (
              <div key={tx.id} className="flex gap-3 group">
                {/* Timeline spine */}
                <div className="flex flex-col items-center w-8 shrink-0 pt-1">
                  <div className="h-3 w-3 rounded-full ring-2 ring-[#0a0a0a] shrink-0" style={{ backgroundColor: color }} />
                  {!isLast && <div className="w-px flex-1 mt-1" style={{ backgroundColor: color + "33" }} />}
                </div>

                {/* Card */}
                <div className={`flex-1 pb-5 ${isLast ? "" : ""}`}>
                  <div className="rounded-xl border border-white/6 bg-[#111] px-4 py-3 flex flex-col gap-2">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                          style={{ backgroundColor: color + "22", color }}
                        >
                          {label}
                        </span>
                        <span className="text-xs text-white/30 font-medium">
                          S{tx.season}{tx.week != null ? ` · ${getWeekLabelShort(tx.week)}` : ""}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        disabled={deleteTx.isPending}
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-900/30 transition-all disabled:opacity-40"
                        title="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Team transfer */}
                    {(tx.from_team || tx.to_team) && (
                      <div className="flex items-center gap-2 text-sm font-bold">
                        {tx.from_team && (
                          <span className="text-white/50">{tx.from_team}</span>
                        )}
                        {tx.from_team && tx.to_team && (
                          <ArrowRight className="h-3.5 w-3.5 text-white/30 shrink-0" />
                        )}
                        {tx.to_team && (
                          <span className="text-white">{tx.to_team}</span>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {tx.notes && (
                      <p className="text-xs text-white/40 leading-relaxed">{tx.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
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

// ─── Portrait Upload Button ───────────────────────────────────────────────────

function PortraitUploadButton({
  player,
  leagueSummary,
}: {
  player: PlayerDetail;
  leagueSummary: LeagueSummary | undefined;
}) {
  const queryClient = useQueryClient();
  const { data: authUser } = useQuery<{ user: { username: string } } | null>({
    queryKey: ["auth-me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commissionerName = leagueSummary?.league?.commissioner_name;
  const isCommissioner = !!authUser?.user && authUser.user.username === commissionerName;
  if (!isCommissioner) return null;

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      // 1. Get presigned upload URL
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
        credentials: "include",
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      // 2. Upload directly to GCS
      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed");

      // 3. Save objectPath to player
      const saveRes = await fetch(`/api/players/${player.id}/portrait`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ object_path: objectPath }),
        credentials: "include",
      });
      if (!saveRes.ok) throw new Error("Failed to save portrait");

      queryClient.invalidateQueries({ queryKey: ["player", player.id] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleReset() {
    setUploading(true);
    setError(null);
    try {
      const res = await fetch(`/api/players/${player.id}/portrait`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reset portrait");
      queryClient.invalidateQueries({ queryKey: ["player", player.id] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1 mt-1.5">
      <label className={`flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-colors ${uploading ? "opacity-40 pointer-events-none" : "text-white/30 hover:text-white/70"}`}>
        <Camera className="w-3 h-3" />
        {uploading ? "Uploading…" : "Change Photo"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          disabled={uploading}
        />
      </label>
      {player.custom_portrait_url && !uploading && (
        <button
          onClick={handleReset}
          className="text-[9px] text-white/20 hover:text-white/50 transition-colors"
        >
          Reset to EA photo
        </button>
      )}
      {error && <p className="text-[9px] text-red-400">{error}</p>}
    </div>
  );
}

// ─── Trade Block Toggle ───────────────────────────────────────────────────────

interface AuthUser { username: string }

function TradeBlockToggle({ player, teamColor }: { player: PlayerDetail; teamColor: string }) {
  const { data: authUser } = useQuery<AuthUser>({
    queryKey: ["auth-me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });

  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const isOwner = !!authUser && authUser.username === player.team_user_name;
  if (!isOwner) return null;

  async function handleToggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/players/${player.id}/trade-block`, { method: "PATCH" });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["player", player.id] });
      }
    } finally {
      setBusy(false);
    }
  }

  const onBlock = player.trade_block;
  return (
    <button
      onClick={handleToggle}
      disabled={busy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide border transition-colors disabled:opacity-50"
      style={onBlock
        ? { color: "#facc15", backgroundColor: "#facc1518", borderColor: "#facc1540" }
        : { color: "rgba(255,255,255,0.35)", backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.12)" }}
    >
      🔄 {onBlock ? "On the Block" : "Put on Block"}
    </button>
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: leagueSummary } = useGetLeagueSummary(player?.league_id ?? 0, {
    query: {
      enabled: !!player?.league_id,
      queryKey: getGetLeagueSummaryQueryKey(player?.league_id ?? 0),
    },
  });

  const teamColor = player?.team_primary_color ?? "#00C8FF";
  const [firstName, lastName] = player ? splitName(player.name) : ["", ""];
  const customPortraitSrc = player?.custom_portrait_url
    ? `/api/storage${player.custom_portrait_url}`
    : null;
  const showPortrait = !!customPortraitSrc || (!!player?.portrait_id && !portraitError);

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

  const leagueSidebarLeague = leagueSummary?.league ?? {
    id: player?.league_id ?? 0,
    name: "…",
    platform: "—",
    season: 0,
    week: 0,
    phase: "—",
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-white overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <LeagueSidebar
          league={leagueSidebarLeague}
          section="players-search"
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(v => !v)}
          navLeagueId={player?.league_id ?? 0}
        />
        <main className="flex-1 overflow-y-auto">
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
              {/* OVR badge row + trade block */}
              <div className="flex items-center justify-between mb-6">
                <TradeBlockToggle player={player} teamColor={teamColor} />
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
                <div className="shrink-0 flex flex-col items-center gap-0">
                  <div
                    className="relative rounded-2xl overflow-hidden border border-white/10"
                    style={{
                      width: 140,
                      height: 140,
                      background: `linear-gradient(160deg, ${teamColor}22 0%, #111 100%)`,
                      boxShadow: `0 0 32px ${teamColor}25`,
                    }}
                  >
                    {showPortrait ? (
                      <img
                        src={customPortraitSrc ?? portraitUrl(player.portrait_id!)}
                        alt={player.name}
                        onError={customPortraitSrc ? undefined : () => setPortraitError(true)}
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
                  <PortraitUploadButton player={player} leagueSummary={leagueSummary} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 mb-3">
                    <TeamLogo abbreviation={player.team_abbreviation} primaryColor={player.team_primary_color} size="sm" shape="circle" />
                    <span className="text-[11px] tracking-[0.2em] uppercase text-white/40">
                      {player.team_name}
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
                    <BioPill label="Age" value={String(player.age)} />
                    {player.height && <BioPill label="Ht" value={fmtHeightIn(player.height)} />}
                    {player.weight && <BioPill label="Wt" value={`${player.weight} lbs`} />}
                    {player.years_pro != null && <BioPill label="Exp" value={player.years_pro === 0 ? "Rookie" : `${player.years_pro} yr${player.years_pro !== 1 ? "s" : ""}`} />}
                    {player.college && <BioPill label="College" value={player.college} />}
                    {player.draft_round != null && player.draft_pick != null && (
                      <BioPill label="Draft" value={`Rd ${player.draft_round}, Pk ${player.draft_pick}`} />
                    )}
                    {player.rookie_year != null && <BioPill label="Class" value={String(player.rookie_year)} />}
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
              <GameLogTab playerId={player.id} position={player.position} teamColor={teamColor} />
            )}
            {tab === "career" && player && (
              <CareerStatsTab playerId={player.id} position={player.position} teamColor={teamColor} />
            )}
            {tab === "awards" && player && (
              <AwardsTab playerId={player.id} leagueId={player.league_id} teamColor={teamColor} />
            )}
            {tab === "history" && player && (
              <HistoryTab playerId={player.id} leagueId={player.league_id} teamColor={teamColor} />
            )}
          </div>
        </>
      )}
        </main>
      </div>
    </div>
  );
}
