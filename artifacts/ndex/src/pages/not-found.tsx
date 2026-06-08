import { Link } from "wouter";
import Navbar from "@/components/Navbar";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-6xl font-black text-[#00C8FF] mb-4">404</p>
        <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-white/40 text-sm mb-6">The page you're looking for doesn't exist.</p>
        <Link href="/" className="rounded-lg bg-[#00C8FF] px-4 py-2 text-sm font-bold text-black hover:bg-[#00b3e0] transition-colors">
          Go Home
        </Link>
      </div>
    </div>
  );
}
