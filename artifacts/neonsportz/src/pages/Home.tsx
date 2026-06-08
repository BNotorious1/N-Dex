import { Link } from "wouter";
import { useGetFeaturedLeagues } from "@workspace/api-client-react";
import Navbar from "@/components/Navbar";
import LeagueCard from "@/components/LeagueCard";

export default function Home() {
  const { data: featured, isLoading } = useGetFeaturedLeagues();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/8">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00C8FF]/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 bg-gradient-to-r from-transparent via-[#00C8FF]/40 to-transparent" />

        <div className="mx-auto max-w-7xl px-4 py-20 sm:py-28 text-center">
          <div className="flex justify-center mb-6">
            <img
              src="/ndex-logo.png"
              alt="N-Dex"
              className="h-20 w-20 object-contain drop-shadow-[0_0_20px_rgba(0,200,255,0.5)]"
              data-testid="img-hero-logo"
            />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight mb-3">
            <span className="text-white">N-</span>
            <span className="text-[#00C8FF]">Dex</span>
          </h1>

          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-3 italic tracking-wide">
            The Notorious Franchise Index
          </p>
          <p className="text-white/30 text-sm max-w-xl mx-auto mb-10">
            View your Madden Franchise League teams, players, statistics, games, scores, and more from anywhere.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/leagues"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00C8FF] px-6 py-3 text-sm font-bold text-black uppercase tracking-wider hover:bg-[#00b3e0] transition-colors shadow-[0_0_20px_rgba(0,200,255,0.3)]"
              data-testid="button-browse-leagues"
            >
              Browse Leagues
            </Link>
            <Link
              href="/leagues/new"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-white uppercase tracking-wider hover:bg-white/10 hover:border-white/30 transition-colors"
              data-testid="button-create-league"
            >
              Create League
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 border-b border-white/8">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#00C8FF]/10 border border-[#00C8FF]/20 px-3 py-1 text-xs font-semibold text-[#00C8FF] uppercase tracking-wider mb-4">
              Platform Features
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-4">
              Fast &amp; Easy Access<br />to Madden Data
            </h2>
            <p className="text-white/50 text-sm leading-relaxed mb-6">
              View your Madden Franchise League's teams, players, statistics, games, scores, and more from anywhere. Just export your data from the Madden Companion app to our platform.
            </p>
            <Link
              href="/leagues"
              className="inline-flex items-center gap-2 rounded-lg bg-[#00C8FF] px-4 py-2 text-xs font-bold text-black uppercase tracking-wider hover:bg-[#00b3e0] transition-colors"
              data-testid="button-view-demo"
            >
              View Leagues
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Live Standings", desc: "Real-time league standings and records" },
              { label: "Player Stats", desc: "Deep dive into individual player ratings" },
              { label: "Game Scores", desc: "Track every game result week by week" },
              { label: "Team Rosters", desc: "Full roster with attribute breakdowns" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl bg-[#141414] border border-white/8 p-4">
                <div className="h-1 w-8 rounded-full bg-[#00C8FF] mb-3" />
                <p className="text-sm font-bold text-white mb-1">{f.label}</p>
                <p className="text-xs text-white/40">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Leagues */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-white">Featured Leagues</h2>
            <p className="text-xs text-white/40 mt-1">Top leagues by membership</p>
          </div>
          <Link
            href="/leagues"
            className="text-xs font-semibold text-[#00C8FF] uppercase tracking-wider hover:text-[#00b3e0] transition-colors"
            data-testid="link-view-all"
          >
            View All &rarr;
          </Link>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-52 rounded-xl bg-[#141414] border border-white/8 animate-pulse" />
            ))}
          </div>
        ) : featured && featured.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((league) => (
              <LeagueCard key={league.id} league={league} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-white/30">
            <p className="text-sm">No leagues yet. Be the first to create one.</p>
            <Link href="/leagues/new" className="mt-4 inline-block text-xs text-[#00C8FF] hover:underline">
              Create League
            </Link>
          </div>
        )}
      </section>

    </div>
  );
}
