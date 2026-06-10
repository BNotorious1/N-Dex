import {
  Home, FileText, Newspaper, Users, User, Ban, Calendar,
  BarChart3, ListOrdered, ArrowLeftRight, ClipboardList,
  TrendingUp, Repeat2, Download, Trophy, ChevronDown, ChevronRight,
  ShieldCheck, Settings2, Plug, UserCog, SkipForward, UserPlus,
} from "lucide-react";
import { useState } from "react";
import type { LeagueSection } from "@/pages/LeagueDetail";

interface Props {
  league: { id: number; name: string; platform: string; season: number; week: number; phase: string };
  section: LeagueSection;
  onSelect: (s: LeagueSection) => void;
}

interface NavItem {
  key: LeagueSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  sub?: { key: LeagueSection; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

const NAV: NavItem[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "rules", label: "Rules", icon: FileText },
  { key: "news", label: "News", icon: Newspaper },
  { key: "teams", label: "Teams", icon: Users },
  {
    key: "players", label: "Players", icon: User,
    sub: [{ key: "suspensions", label: "Suspensions", icon: Ban }],
  },
  { key: "games", label: "Games", icon: Calendar },
  { key: "statistics", label: "Statistics", icon: BarChart3 },
  { key: "standings", label: "Standings", icon: ListOrdered },
  { key: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { key: "draft", label: "Draft", icon: ClipboardList },
  { key: "rankings", label: "Rankings", icon: TrendingUp },
  { key: "trades", label: "Trades", icon: Repeat2 },
  { key: "awards", label: "Awards", icon: Trophy },
  {
    key: "admin", label: "Administration", icon: ShieldCheck,
    sub: [
      { key: "admin-settings", label: "Settings", icon: Settings2 },
      { key: "admin-ea-connect", label: "EA Connect", icon: Plug },
      { key: "admin-members", label: "Members", icon: UserCog },
      { key: "admin-invite", label: "Invite Players", icon: UserPlus },
      { key: "admin-advance", label: "Advance Week", icon: SkipForward },
    ],
  },
];

const ADMIN_KEYS: LeagueSection[] = ["admin", "admin-settings", "admin-ea-connect", "admin-members", "admin-invite", "admin-advance"];

export default function LeagueSidebar({ league, section, onSelect }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(["players", ...(ADMIN_KEYS.includes(section) ? ["admin"] : ["admin"])])
  );

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleExportCSV = () => {
    alert("CSV export coming soon.");
  };

  return (
    <aside className="w-[210px] shrink-0 bg-[#0d0d0d] border-r border-white/8 flex flex-col overflow-y-auto">
      {/* League identity */}
      <div className="px-4 py-4 border-b border-white/8">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-7 w-7 rounded-lg bg-[#00C8FF]/15 border border-[#00C8FF]/25 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-black text-[#00C8FF]">ND</span>
          </div>
          <p className="text-xs font-bold text-white truncate">{league.name}</p>
        </div>
        <p className="text-[10px] text-white/35 pl-9">
          {league.platform} &bull; S{league.season} W{league.week}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = section === item.key;
          const hasSubActive = item.sub?.some((s) => s.key === section);
          const isExpanded = expanded.has(item.key);
          const isAdmin = item.key === "admin";

          return (
            <div key={item.key}>
              <button
                onClick={() => {
                  if (item.sub) {
                    const wasExpanded = expanded.has(item.key);
                    toggle(item.key);
                    if (!wasExpanded && item.sub.length > 0) {
                      onSelect(item.sub[0].key);
                    }
                  } else {
                    onSelect(item.key);
                  }
                }}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs transition-colors ${
                  isActive || hasSubActive
                    ? isAdmin
                      ? "text-[#F44336] bg-[#F44336]/8"
                      : "text-[#00C8FF] bg-[#00C8FF]/8"
                    : isAdmin
                      ? "text-white/45 hover:text-[#F44336]/80 hover:bg-[#F44336]/5"
                      : "text-white/55 hover:text-white hover:bg-white/4"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-left font-medium">{item.label}</span>
                {item.sub && (
                  isExpanded
                    ? <ChevronDown className="h-3 w-3 opacity-50" />
                    : <ChevronRight className="h-3 w-3 opacity-50" />
                )}
              </button>

              {item.sub && isExpanded && (
                <div className={`pl-4 ${isAdmin ? "border-l border-[#F44336]/10 ml-4" : ""}`}>
                  {item.sub.map((sub) => {
                    const SubIcon = sub.icon;
                    const subActive = section === sub.key;
                    return (
                      <button
                        key={sub.key}
                        onClick={() => onSelect(sub.key)}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] transition-colors rounded-sm ${
                          subActive
                            ? isAdmin
                              ? "text-[#F44336] bg-[#F44336]/8"
                              : "text-[#00C8FF]"
                            : "text-white/40 hover:text-white/70"
                        }`}
                      >
                        <SubIcon className="h-3 w-3 shrink-0" />
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Divider before Export */}
        <div className="border-t border-white/6 my-2 mx-4" />

        {/* Export CSV */}
        <button
          onClick={handleExportCSV}
          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-white/55 hover:text-white hover:bg-white/4 transition-colors"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium">Export CSV</span>
        </button>
      </nav>
    </aside>
  );
}
