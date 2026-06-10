import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import TeamLogo from "@/components/TeamLogo";
import { ArrowLeft, User, Zap, Star, ShieldAlert, Activity, BarChart3, Trophy, Clock, BookOpen, UserCircle2 } from "lucide-react";

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
}

type PageTab = "attributes" | "traits" | "abilities" | "gamelog" | "career" | "awards" | "history";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DEV_TRAIT = [
  { label: "Normal",    color: "#6b7280", glow: "#6b728040" },
  { label: "Star",      color: "#f59e0b", glow: "#f59e0b30" },
  { label: "Superstar", color: "#f97316", glow: "#f9731630" },
  { label: "X-Factor",  color: "#00C8FF", glow: "#00C8FF30" },
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

function splitName(fullName: string): [string, string] {
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) return ["", parts[0]!];
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

function AttrCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
      <div className="px-4 py-2.5 bg-[#0f0f0f] border-b border-white/8">
        <span className="font-black uppercase tracking-widest text-[16px] text-[#ffffff] border-t-[#ffffff66] border-r-[#ffffff66] border-b-[#ffffff66] border-l-[#ffffff66] text-left">{title}</span>
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

function AttributesTab({ player }: { player: PlayerDetail }) {
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
        <AttrCard key={g.title} title={g.title}>
          {g.rows.map(r => (
            <RatingRow key={r.label} label={r.label} value={r.value} />
          ))}
        </AttrCard>
      ))}
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

            <div className="relative px-8 py-8 pl-10">
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
                      className="w-full h-full object-cover object-top scale-125 origin-top"
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
                    {devInfo && devInfo.label !== "Normal" && (
                      <span
                        className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border"
                        style={{ color: devInfo.color, backgroundColor: devInfo.glow, borderColor: `${devInfo.color}40` }}
                      >
                        {devInfo.label === "X-Factor" && <Zap className="inline h-2.5 w-2.5 mr-1 -mt-px" />}
                        {(devInfo.label === "Superstar" || devInfo.label === "Star") && <Star className="inline h-2.5 w-2.5 mr-1 -mt-px" />}
                        {devInfo.label}
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
            <div className="flex items-center gap-0.5 mb-6 border-b border-white/8 overflow-x-auto">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                    tab === t.key
                      ? "border-[#00C8FF] text-[#00C8FF]"
                      : "border-transparent text-white/35 hover:text-white/55"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab === "attributes" && <AttributesTab player={player} />}
            {tab === "traits" && (
              <PlaceholderTab
                icon={<ShieldAlert className="h-6 w-6" />}
                title="Traits Not Yet Imported"
                description="Player trait data (e.g. clutch, penalties, possession receiver) will appear here once imported from Madden."
              />
            )}
            {tab === "abilities" && (
              <PlaceholderTab
                icon={<Zap className="h-6 w-6" />}
                title="Abilities Not Yet Imported"
                description="X-Factor and Superstar ability data will appear here once imported from Madden."
              />
            )}
            {tab === "gamelog" && (
              <PlaceholderTab
                icon={<BarChart3 className="h-6 w-6" />}
                title="Game Log Not Yet Available"
                description="Per-game stat lines will appear here once weekly stat imports are configured."
              />
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
