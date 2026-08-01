export interface TeamPlayer {
  id: number;
  team_id: number;
  name: string;
  position: string;
  overall: number;
  age: number;
  years_pro: number | null;
  dev_trait: number | null;
  portrait_id: number | null;
  // Core ratings
  speed: number;
  strength: number;
  awareness: number;
  acceleration: number | null;
  agility: number | null;
  jumping: number | null;
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
  // Body measurements
  height: number | null;
  weight: number | null;
  college: string | null;
  // Contract
  contract_salary: number | null;
  contract_bonus: number | null;
  contract_length: number | null;
  contract_years_left: number | null;
  cap_hit: number | null;
  depth_chart_order: number | null;
}

export const DEV_LABEL: Record<number, string> = {
  0: "Normal",
  1: "Star",
  2: "Superstar",
  3: "X-Factor",
};

export const DEV_COLOR: Record<number, string> = {
  0: "text-white/35",
  1: "text-yellow-400",
  2: "text-purple-400",
  3: "text-[#00C8FF]",
};

export function fmtMoney(v: number | null | undefined): string {
  if (v == null || v === 0) return "—";
  const m = v / 1_000_000;
  if (m >= 0.1) return `$${parseFloat(m.toFixed(2))}M`;
  const k = v / 1_000;
  if (k >= 1) return `$${parseFloat(k.toFixed(1))}K`;
  return `$${v}`;
}

export function fmtHeight(inches: number | null | undefined): string {
  if (inches == null || inches === 0) return "—";
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

export function ovrColor(v: number | null | undefined): string {
  if (v == null) return "text-white/30";
  if (v >= 90) return "text-[#00C8FF]";
  if (v >= 80) return "text-green-400";
  if (v >= 70) return "text-yellow-400";
  return "text-red-400";
}
