interface StatLine {
  player: { id: number; name: string; position: string };
  team_name: string; stat_label: string; stat_value: number;
}
interface StatLeaders {
  passing: StatLine[]; rushing: StatLine[];
  receiving: StatLine[]; defense: StatLine[];
}

interface Props { statLeaders?: StatLeaders }

const CATEGORY_META = {
  passing: { label: "QB Passing Power", color: "#00C8FF" },
  rushing: { label: "RB Speed Leaders", color: "#22c55e" },
  receiving: { label: "WR/TE Catching", color: "#f59e0b" },
  defense: { label: "DEF Tackling", color: "#F44336" },
};

export default function StatisticsSection({ statLeaders }: Props) {
  if (!statLeaders) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/30 text-xs">Loading statistics…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-6">
        {(["passing", "rushing", "receiving", "defense"] as const).map((cat) => (
          <StatTable key={cat} cat={cat} entries={statLeaders[cat]} />
        ))}
      </div>
    </div>
  );
}

function StatTable({ cat, entries }: { cat: keyof typeof CATEGORY_META; entries: StatLine[] }) {
  const meta = CATEGORY_META[cat];
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-1 w-4 rounded-full" style={{ backgroundColor: meta.color }} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{meta.label}</p>
      </div>
      <div className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/8 bg-[#0f0f0f]">
              <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/25 w-8">#</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/25">Player</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/25">POS</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/25">Team</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/25">Stat</th>
            </tr>
          </thead>
          <tbody>
            {entries.length > 0 ? entries.map((e, i) => (
              <tr key={e.player.id} className="border-b border-white/5 hover:bg-white/3 transition-colors last:border-0">
                <td className="px-4 py-3 text-white/20">{i + 1}</td>
                <td className="px-3 py-3 font-semibold text-white">{e.player.name}</td>
                <td className="px-3 py-3 text-center">
                  <span className="rounded border border-white/12 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-white/60">
                    {e.player.position}
                  </span>
                </td>
                <td className="px-3 py-3 text-center text-white/45">{e.team_name}</td>
                <td className="px-3 py-3 text-center">
                  <span className="text-sm font-black" style={{ color: meta.color }}>{e.stat_value}</span>
                  <span className="text-[9px] text-white/25 block">{e.stat_label}</span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-white/25 text-[11px]">No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
