import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const navLinks = [
  { label: "Madden Leagues", href: "/leagues" },
  { label: "Create League", href: "/leagues/new" },
];

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.079.11 18.1.128 18.116a19.887 19.887 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  );
}

export default function Navbar() {
  const [location] = useLocation();
  const { user, loading, login, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <img
            src="/ndex-logo.png"
            alt="N-Dex"
            className="h-8 w-8 object-contain"
            data-testid="img-logo"
          />
          <span className="text-sm font-bold tracking-widest text-white uppercase hidden sm:block">
            N-Dex
          </span>
        </Link>

        <div className="flex items-center gap-1 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-colors ${
                location.startsWith(link.href)
                  ? "text-[#00C8FF] border-b-2 border-[#00C8FF]"
                  : "text-white/60 hover:text-white"
              }`}
              data-testid={`link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth area */}
        {loading ? (
          <div className="h-8 w-28 rounded-lg bg-white/5 animate-pulse" />
        ) : user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 hover:bg-white/8 transition-colors"
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.displayName} className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-[#5865F2]/30 flex items-center justify-center">
                  <DiscordIcon className="h-3 w-3 text-[#5865F2]" />
                </div>
              )}
              <span className="text-xs font-semibold text-white max-w-[120px] truncate">{user.displayName}</span>
              <ChevronDown className={`h-3 w-3 text-white/40 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl bg-[#141414] border border-white/10 shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-white/8">
                  <div className="flex items-center gap-2.5">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.displayName} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-[#5865F2]/20 flex items-center justify-center">
                        <DiscordIcon className="h-4 w-4 text-[#5865F2]" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
                      {user.email && <p className="text-[10px] text-white/35 truncate">{user.email}</p>}
                    </div>
                  </div>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={() => { logout(); setDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={login}
            className="flex items-center gap-2 rounded-lg bg-[#5865F2] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#4752c4] transition-colors"
            data-testid="button-login"
          >
            <DiscordIcon className="h-4 w-4" />
            Login with Discord
          </button>
        )}
      </div>
    </nav>
  );
}
