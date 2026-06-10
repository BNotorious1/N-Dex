import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import TeamLogo from "@/components/TeamLogo";
import { ArrowLeft, User, Zap, Star, ShieldAlert, Activity, BarChart3, Trophy, Clock, BookOpen } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlayerDetail {
  id: number;
  name: string;
  position: string;
  overall: number;
  age: number;
  speed: number;
  strength: number;
  awareness: number;
  throwing_power: number | null;
  catching: number | null;
  tackling: number | null;
  acceleration: number | null;
  agility: number | null;
  dev_trait: number | null;
  ea_player_id: string | null;
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
  if (v >= 90) return "#00C8FF";
  if (v >= 80) return "#4ade80";
  if (v >= 70) return "#facc15";
  return "#F44336";
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

// ─── Small components ─────────────────────────────────────────────────────────

function RatingRow({ label, value, max = 99 }: { label: string; value: number | null | undefined; max?: number }) {
  if (value == null) return null;
  const pct = Math.round((value / max) * 100);
  const color = ratingBarColor(value);
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-[11px] text-white/45 uppercase tracking-wider w-32 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-7 text-right" style={{ color }}>{value}</span>
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

// ─── Attribute groups per position ───────────────────────────────────────────

function getAttributeGroups(p: PlayerDetail) {
  const QB_POS = ["QB"];
  const SKILL_POS = ["WR", "TE", "HB", "RB", "FB"];
  const DEF_POS = ["MLB", "LOLB", "ROLB", "LB", "CB", "FS", "SS", "S", "DE", "DT", "NT", "MIKE", "WILL", "SAM"];

  const physical = [
    { label: "Speed",        value: p.speed },
    { label: "Acceleration", value: p.acceleration },
    { label: "Agility",      value: p.agility },
    { label: "Strength",     value: p.strength },
  ].filter(x => x.value != null);

  const mental = [
    { label: "Awareness", value: p.awareness },
  ];

  const posSkills: { label: string; value: number | null }[] = [];
  if (QB_POS.includes(p.position) && p.throwing_power != null) {
    posSkills.push({ label: "Throwing Power", value: p.throwing_power });
  }
  if (SKILL_POS.includes(p.position) && p.catching != null) {
    posSkills.push({ label: "Catching", value: p.catching });
  }
  if (DEF_POS.includes(p.position) && p.tackling != null) {
    posSkills.push({ label: "Tackling", value: p.tackling });
  }
  // OL/K/P — show catching or throwing if available
  if (posSkills.length === 0) {
    if (p.catching != null) posSkills.push({ label: "Catching", value: p.catching });
    if (p.throwing_power != null) posSkills.push({ label: "Throwing Power", value: p.throwing_power });
    if (p.tackling != null) posSkills.push({ label: "Tackling", value: p.tackling });
  }

  return { physical, mental, posSkills };
}

// ─── Tabs content ─────────────────────────────────────────────────────────────

function AttributesTab({ player }: { player: PlayerDetail }) {
  const { physical, mental, posSkills } = getAttributeGroups(player);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Physical */}
      <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
        <div className="px-4 py-2.5 bg-[#0f0f0f] border-b border-white/8">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Physical</span>
        </div>
        <div className="px-4">
          {physical.map(a => (
            <RatingRow key={a.label} label={a.label} value={a.value} />
          ))}
        </div>
      </div>

      {/* Mental + Position Skills */}
      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
          <div className="px-4 py-2.5 bg-[#0f0f0f] border-b border-white/8">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Mental</span>
          </div>
          <div className="px-4">
            <RatingRow label="Awareness" value={mental[0]!.value} />
          </div>
        </div>

        {posSkills.length > 0 && (
          <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#0f0f0f] border-b border-white/8">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Position Skills</span>
            </div>
            <div className="px-4">
              {posSkills.map(a => (
                <RatingRow key={a.label} label={a.label} value={a.value} />
              ))}
            </div>
          </div>
        )}
      </div>
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

  const teamColor = player?.team_primary_color ?? "#00C8FF";
  const [firstName, lastName] = player ? splitName(player.name) : ["", ""];

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
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ backgroundColor: teamColor }}
            />

            {/* Background: team logo watermark */}
            <div className="absolute right-0 top-0 h-full w-1/2 flex items-center justify-end overflow-hidden opacity-[0.055] select-none pointer-events-none">
              <img
                src={espnLogoUrl(player.team_abbreviation)}
                alt=""
                className="h-[340px] w-[340px] object-contain"
                style={{ filter: "brightness(1.4) saturate(0)" }}
              />
            </div>

            {/* Subtle gradient from team color */}
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{ background: `radial-gradient(ellipse at 80% 50%, ${teamColor} 0%, transparent 65%)` }}
            />

            <div className="relative px-8 py-9 pl-10">
              {/* Back nav row */}
              <div className="flex items-center justify-between mb-7">
                <Link
                  href={`/leagues/${player.league_id}`}
                  className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to League
                </Link>

                {/* OVR badge */}
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black tracking-wider border"
                  style={{
                    color: ovrColor(player.overall),
                    backgroundColor: `${ovrColor(player.overall)}18`,
                    borderColor: `${ovrColor(player.overall)}30`,
                  }}
                >
                  <span className="text-[10px] font-semibold text-white/40">OVR</span>
                  {player.overall}
                </span>
              </div>

              {/* Team identity */}
              <div className="flex items-center gap-2.5 mb-5">
                <TeamLogo
                  abbreviation={player.team_abbreviation}
                  primaryColor={player.team_primary_color}
                  size="sm"
                  shape="circle"
                />
                <span className="text-[11px] tracking-[0.25em] uppercase text-white/40">
                  {player.team_city} · {player.team_name}
                </span>
              </div>

              {/* Player name */}
              <div className="mb-5">
                {firstName && (
                  <p className="text-2xl font-semibold text-white/75 tracking-wide leading-none mb-1">
                    {firstName}
                  </p>
                )}
                <p className="text-6xl sm:text-7xl font-black uppercase leading-none tracking-tight text-white">
                  {lastName}
                </p>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Position badge */}
                <span className="px-2.5 py-1 rounded-md border border-white/15 bg-white/5 text-xs font-bold text-white/70 uppercase">
                  {player.position}
                </span>

                {/* Dev trait */}
                {devInfo && devInfo.label !== "Normal" && (
                  <span
                    className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border"
                    style={{
                      color: devInfo.color,
                      backgroundColor: devInfo.glow,
                      borderColor: `${devInfo.color}40`,
                    }}
                  >
                    {devInfo.label === "X-Factor" && <Zap className="inline h-2.5 w-2.5 mr-1 -mt-px" />}
                    {devInfo.label === "Superstar" && <Star className="inline h-2.5 w-2.5 mr-1 -mt-px" />}
                    {devInfo.label === "Star" && <Star className="inline h-2.5 w-2.5 mr-1 -mt-px" />}
                    {devInfo.label}
                  </span>
                )}

                {/* Age */}
                <span className="text-xs text-white/35">
                  Age <span className="text-white/60 font-semibold">{player.age}</span>
                </span>

                {/* Birth date */}
                {birthStr && (
                  <span className="text-xs text-white/30">· Born {birthStr}</span>
                )}
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
