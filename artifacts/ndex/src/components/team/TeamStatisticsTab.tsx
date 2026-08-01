import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface PlayerRef {
  id: number;
  name: string;
  position: string;
  overall: number;
}

interface StatRow {
  player: PlayerRef;
  team_id: number;
  gp: number;
  // passing
  pss_att?: number; pss_cmp?: number; pss_yds?: number; pss_tds?: number;
  pss_ints?: number; pss_sacks?: number; pss_lng?: number; pss_rating?: number;
  // rushing
  rsh_att?: number; rsh_yds?: number; rsh_tds?: number; rsh_lng?: number; rsh_btk?: number;
  fmb?: number; fmb_lost?: number;
  // receiving
  rec_catches?: number; rec_tgts?: number; rec_yds?: number; rec_tds?: number;
  rec_drops?: number; rec_lng?: number; rec_yac?: number;
  // defense
  def_total_tackles?: number; def_tfl?: number; def_sacks?: number;
  def_ints?: number; def_ff?: number; def_pd?: number; def_tds?: number; def_fum_rec?: number;
}

interface StatsResponse {
  passing: StatRow[];
  rushing: StatRow[];
  receiving: StatRow[];
  defense: StatRow[];
  kicking: StatRow[];
  punting: StatRow[];
}

type Phase = "regular" | "postseason" | "all";

const n = (v: number | undefined) => v ?? 0;
const fmt = (v: number | undefined, dec = 0) =>
  v == null || v === 0 ? "—" : dec > 0 ? v.toFixed(dec) : String(Math.round(v));

function StatTable<T extends StatRow>({
  rows,
  cols,
  primaryColor,
}: {
  rows: T[];
  cols: Array<{ label: string; value: (r: T) => React.ReactNode; numeric?: boolean }>;
  primaryColor: string;
}) {
  if (rows.length === 0) {
    return <div className="py-8 text-center text-white/30 text-xs">No stats available</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/8 bg-[#0d0d0d]">
            <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Name</th>
            {cols.map(c => (
              <th key={c.label} className={`px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white/30 ${c.numeric !== false ? "text-center" : "text-left"}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.player.id} className={`border-b border-white/5 hover:bg-white/3 ${i % 2 !== 0 ? "bg-white/[0.015]" : ""}`}>
              <td className="px-4 py-2.5 min-w-[140px]">
                <Link href={`/players/${row.player.id}`} className="font-semibold hover:underline" style={{ color: primaryColor }}>
                  {row.player.name}
                </Link>
                <span className="ml-1.5 text-[10px] text-white/30">{row.player.position}</span>
              </td>
              {cols.map(c => (
                <td key={c.label} className={`px-2 py-2.5 tabular-nums text-white/70 ${c.numeric !== false ? "text-center" : ""}`}>
                  {c.value(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeaderCard({
  label,
  row,
  stat,
  statLabel,
  primaryColor,
}: {
  label: string;
  row: StatRow | undefined;
  stat: number | undefined;
  statLabel: string;
  primaryColor: string;
}) {
  return (
    <div className="rounded-lg border border-white/8 bg-[#0d0d0d] p-3 min-w-[120px] flex-1">
      <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">{label}</p>
      {row ? (
        <>
          <Link href={`/players/${row.player.id}`} className="block font-bold text-[11px] leading-tight hover:underline truncate" style={{ color: primaryColor }}>
            {row.player.name}
          </Link>
          <p className="text-[10px] text-white/40 mb-1">{row.player.position}</p>
          <p className="text-2xl font-black text-white tabular-nums">{stat != null ? fmt(stat) : "—"}</p>
          <p className="text-[9px] text-white/30 uppercase">{statLabel}</p>
        </>
      ) : (
        <p className="text-white/20 text-xs mt-2">No data</p>
      )}
    </div>
  );
}

interface Props {
  team: { id: number; name: string; city: string; primary_color?: string | null };
  leagueId: number;
}

const PHASE_TABS: { key: Phase; label: string }[] = [
  { key: "regular", label: "Reg Season" },
  { key: "all", label: "All" },
  { key: "postseason", label: "Postseason" },
];

const STAT_TABS = ["passing", "rushing", "receiving", "defense"] as const;
type StatTab = typeof STAT_TABS[number];

export default function TeamStatisticsTab({ team, leagueId }: Props) {
  const [phase, setPhase] = useState<Phase>("regular");
  const [statTab, setStatTab] = useState<StatTab>("passing");
  const primaryColor = team.primary_color ?? "#555";

  const { data: allStats, isLoading } = useQuery<StatsResponse>({
    queryKey: ["team-page-stats", leagueId, phase],
    queryFn: async () => {
      const res = await fetch(`/api/leagues/${leagueId}/stats/players?phase=${phase}`);
      return res.json();
    },
    enabled: !!leagueId,
  });

  const teamId = team.id;
  const passing = (allStats?.passing ?? []).filter(r => r.team_id === teamId);
  const rushing = (allStats?.rushing ?? []).filter(r => r.team_id === teamId);
  const receiving = (allStats?.receiving ?? []).filter(r => r.team_id === teamId);
  const defense = (allStats?.defense ?? []).filter(r => r.team_id === teamId);

  // Team leaders
  const topPasser = [...passing].sort((a, b) => n(b.pss_yds) - n(a.pss_yds))[0];
  const topRusher = [...rushing].sort((a, b) => n(b.rsh_yds) - n(a.rsh_yds))[0];
  const topReceiver = [...receiving].sort((a, b) => n(b.rec_yds) - n(a.rec_yds))[0];
  const topTackler = [...defense].sort((a, b) => n(b.def_total_tackles) - n(a.def_total_tackles))[0];
  const topInt = [...defense].sort((a, b) => n(b.def_ints) - n(a.def_ints))[0];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-black text-white tracking-tight">
          {team.city} {team.name} Player Stats
        </h2>
        {/* Phase toggle */}
        <div className="flex rounded-lg overflow-hidden border border-white/10 bg-[#111]">
          {PHASE_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setPhase(t.key)}
              className={`px-3 py-1.5 text-[11px] font-bold transition-colors ${
                phase === t.key
                  ? "text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
              style={phase === t.key ? { backgroundColor: primaryColor } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Team Leaders */}
      {!isLoading && (topPasser || topRusher || topReceiver || topTackler || topInt) && (
        <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
          <div className="px-4 py-2.5 border-b border-white/8">
            <span className="text-xs font-black uppercase tracking-widest text-white/60">Team Leaders</span>
          </div>
          <div className="p-3 flex gap-3 overflow-x-auto">
            <LeaderCard label="Passing Yards" row={topPasser} stat={topPasser?.pss_yds} statLabel="Pass YDS" primaryColor={primaryColor} />
            <LeaderCard label="Rushing Yards" row={topRusher} stat={topRusher?.rsh_yds} statLabel="Rush YDS" primaryColor={primaryColor} />
            <LeaderCard label="Receiving Yards" row={topReceiver} stat={topReceiver?.rec_yds} statLabel="Rec YDS" primaryColor={primaryColor} />
            <LeaderCard label="Tackles" row={topTackler} stat={topTackler?.def_total_tackles} statLabel="Tackles" primaryColor={primaryColor} />
            <LeaderCard label="Interceptions" row={topInt} stat={topInt?.def_ints} statLabel="INTs" primaryColor={primaryColor} />
          </div>
        </div>
      )}

      {/* Stat category tabs */}
      <div className="flex gap-1 border-b border-white/8">
        {STAT_TABS.map(t => (
          <button
            key={t}
            onClick={() => setStatTab(t)}
            className={`px-4 py-2.5 text-xs font-bold capitalize transition-colors border-b-2 -mb-px ${
              statTab === t
                ? "text-white border-current"
                : "text-white/40 border-transparent hover:text-white/70"
            }`}
            style={statTab === t ? { borderColor: primaryColor, color: primaryColor } : {}}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Stat tables */}
      {isLoading ? (
        <div className="py-12 text-center text-white/30 text-sm">Loading…</div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-white/8 bg-[#111]">
          {statTab === "passing" && (
            <StatTable
              rows={passing}
              primaryColor={primaryColor}
              cols={[
                { label: "GP", value: r => fmt(r.gp) },
                { label: "CMP", value: r => fmt(r.pss_cmp) },
                { label: "ATT", value: r => fmt(r.pss_att) },
                { label: "CMP%", value: r => n(r.pss_att) > 0 ? `${((n(r.pss_cmp) / n(r.pss_att)) * 100).toFixed(1)}%` : "—" },
                { label: "YDS", value: r => fmt(r.pss_yds) },
                { label: "AVG", value: r => n(r.pss_att) > 0 ? (n(r.pss_yds) / n(r.pss_att)).toFixed(1) : "—" },
                { label: "TD", value: r => fmt(r.pss_tds) },
                { label: "INT", value: r => fmt(r.pss_ints) },
                { label: "SACK", value: r => fmt(r.pss_sacks) },
                { label: "LNG", value: r => fmt(r.pss_lng) },
                { label: "RTG", value: r => fmt(r.pss_rating, 1) },
              ]}
            />
          )}
          {statTab === "rushing" && (
            <StatTable
              rows={rushing}
              primaryColor={primaryColor}
              cols={[
                { label: "GP", value: r => fmt(r.gp) },
                { label: "CAR", value: r => fmt(r.rsh_att) },
                { label: "YDS", value: r => fmt(r.rsh_yds) },
                { label: "AVG", value: r => n(r.rsh_att) > 0 ? (n(r.rsh_yds) / n(r.rsh_att)).toFixed(1) : "—" },
                { label: "LNG", value: r => fmt(r.rsh_lng) },
                { label: "TD", value: r => fmt(r.rsh_tds) },
                { label: "FUM", value: r => fmt(r.fmb) },
                { label: "LST", value: r => fmt(r.fmb_lost) },
              ]}
            />
          )}
          {statTab === "receiving" && (
            <StatTable
              rows={receiving}
              primaryColor={primaryColor}
              cols={[
                { label: "GP", value: r => fmt(r.gp) },
                { label: "REC", value: r => fmt(r.rec_catches) },
                { label: "TGT", value: r => fmt(r.rec_tgts) },
                { label: "YDS", value: r => fmt(r.rec_yds) },
                { label: "AVG", value: r => n(r.rec_catches) > 0 ? (n(r.rec_yds) / n(r.rec_catches)).toFixed(1) : "—" },
                { label: "LNG", value: r => fmt(r.rec_lng) },
                { label: "TD", value: r => fmt(r.rec_tds) },
                { label: "DROP", value: r => fmt(r.rec_drops) },
                { label: "YAC", value: r => fmt(r.rec_yac) },
              ]}
            />
          )}
          {statTab === "defense" && (
            <StatTable
              rows={defense}
              primaryColor={primaryColor}
              cols={[
                { label: "GP", value: r => fmt(r.gp) },
                { label: "TOT", value: r => fmt(r.def_total_tackles) },
                { label: "TFL", value: r => fmt(r.def_tfl) },
                { label: "SACK", value: r => fmt(r.def_sacks) },
                { label: "INT", value: r => fmt(r.def_ints) },
                { label: "FF", value: r => fmt(r.def_ff) },
                { label: "FR", value: r => fmt(r.def_fum_rec) },
                { label: "PD", value: r => fmt(r.def_pd) },
                { label: "TD", value: r => fmt(r.def_tds) },
              ]}
            />
          )}
        </div>
      )}
    </div>
  );
}
