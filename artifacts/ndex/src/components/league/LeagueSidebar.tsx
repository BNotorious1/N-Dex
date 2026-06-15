import {
  Home, FileText, Newspaper, Users, User, Ban, Calendar, Search,
  BarChart3, ListOrdered, ArrowLeftRight, ClipboardList,
  TrendingUp, Repeat2, Download, Trophy, ChevronDown, ChevronRight,
  ShieldCheck, Settings2, Plug, UserCog, SkipForward, UserPlus, Activity,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import type { LeagueSection } from "@/pages/LeagueDetail";

interface Props {
  league: { id: number; name: string; platform: string; season: number; week: number; phase: string };
  section: LeagueSection;
  onSelect?: (s: LeagueSection) => void;
  collapsed: boolean;
  onToggle: () => void;
  /** When provided the sidebar renders navigation links instead of local section callbacks */
  navLeagueId?: number;
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
    sub: [
      { key: "players-search", label: "Search", icon: Search },
      { key: "suspensions", label: "Suspensions", icon: Ban },
    ],
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
      { key: "admin-import-status", label: "Import Status", icon: Activity },
      { key: "admin-members", label: "Members", icon: UserCog },
      { key: "admin-invite", label: "Invite Players", icon: UserPlus },
      { key: "admin-advance", label: "Advance Week", icon: SkipForward },
    ],
  },
];

const ADMIN_KEYS: LeagueSection[] = [
  "admin", "admin-settings", "admin-ea-connect", "admin-import-status",
  "admin-members", "admin-invite", "admin-advance",
];

export default function LeagueSidebar({ league, section, onSelect, collapsed, onToggle, navLeagueId }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(["players", "admin"])
  );
  const [, navigate] = useLocation();

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
    <aside
      className={`shrink-0 bg-[#0d0d0d] border-r border-white/8 flex flex-col overflow-y-auto overflow-x-hidden transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-[48px]" : "w-[210px]"
      }`}
    >
      {/* League identity */}
      <div className={`border-b border-white/8 flex items-center ${collapsed ? "px-2 py-4 justify-center" : "px-4 py-4"}`}>
        <div className="h-7 w-7 rounded-lg bg-[#00C8FF]/15 border border-[#00C8FF]/25 flex items-center justify-center shrink-0">
          <span className="text-[9px] font-black text-[#00C8FF]">ND</span>
        </div>
        {!collapsed && (
          <div className="ml-2 min-w-0">
            <p className="text-xs font-bold text-white truncate">{league.name}</p>
            <p className="text-[10px] text-white/35">
              {league.platform} &bull; S{league.season} W{league.week}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`w-full flex items-center py-2 text-white/30 hover:text-white/60 hover:bg-white/4 transition-colors mb-1 ${
            collapsed ? "justify-center px-0" : "gap-2.5 px-4"
          }`}
        >
          {collapsed
            ? <PanelLeftOpen className="h-3.5 w-3.5 shrink-0" />
            : <>
                <PanelLeftClose className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs font-medium">Collapse</span>
              </>
          }
        </button>

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
                  const targetKey = item.sub ? item.sub[0].key : item.key;
                  if (navLeagueId) {
                    navigate(`/leagues/${navLeagueId}?section=${targetKey}`);
                    return;
                  }
                  if (collapsed) {
                    onSelect?.(targetKey);
                    return;
                  }
                  if (item.sub) {
                    const wasExpanded = expanded.has(item.key);
                    toggle(item.key);
                    if (!wasExpanded && item.sub.length > 0) {
                      onSelect?.(item.sub[0].key);
                    }
                  } else {
                    onSelect?.(item.key);
                  }
                }}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center py-2 text-xs transition-colors ${
                  collapsed ? "justify-center px-0" : "gap-2.5 px-4"
                } ${
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
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left font-medium">{item.label}</span>
                    {item.sub && (
                      isExpanded
                        ? <ChevronDown className="h-3 w-3 opacity-50" />
                        : <ChevronRight className="h-3 w-3 opacity-50" />
                    )}
                  </>
                )}
              </button>

              {!collapsed && item.sub && isExpanded && (
                <div className={`pl-4 ${isAdmin ? "border-l border-[#F44336]/10 ml-4" : ""}`}>
                  {item.sub.map((sub) => {
                    const SubIcon = sub.icon;
                    const subActive = section === sub.key;
                    return (
                      <button
                        key={sub.key}
                        onClick={() => navLeagueId ? navigate(`/leagues/${navLeagueId}?section=${sub.key}`) : onSelect?.(sub.key)}
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

        <div className="border-t border-white/6 my-2 mx-3" />

        {/* Export CSV */}
        <button
          onClick={handleExportCSV}
          title={collapsed ? "Export CSV" : undefined}
          className={`w-full flex items-center py-2 text-xs text-white/55 hover:text-white hover:bg-white/4 transition-colors ${
            collapsed ? "justify-center px-0" : "gap-2.5 px-4"
          }`}
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span className="font-medium">Export CSV</span>}
        </button>
      </nav>

      {/* Admin indicator */}
      {!collapsed && ADMIN_KEYS.includes(section) && (
        <div className="px-4 py-3 border-t border-white/6">
          <div className="flex items-center gap-1.5 rounded-lg bg-[#F44336]/8 border border-[#F44336]/15 px-2.5 py-1.5">
            <ShieldCheck className="h-3 w-3 text-[#F44336]" />
            <span className="text-[10px] font-bold text-[#F44336]">Admin Mode</span>
          </div>
        </div>
      )}

      {/* Collapsed admin indicator dot */}
      {collapsed && ADMIN_KEYS.includes(section) && (
        <div className="flex justify-center py-3 border-t border-white/6">
          <ShieldCheck className="h-3.5 w-3.5 text-[#F44336]" />
        </div>
      )}
    </aside>
  );
}
