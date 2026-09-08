import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--broadcast-bg)] text-[var(--text-primary)] transition-colors duration-300 relative selection:bg-amber-400 selection:text-black">
      {/* Ambient stadium lighting glow in background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[140px]" />
      </div>

      <Header />

      <main className="flex-1 relative z-10">
        <Outlet />
      </main>

      <footer className="relative z-10 py-5 text-center text-xs border-t border-[var(--broadcast-border)]/60 bg-[var(--broadcast-surface)]/60 backdrop-blur-md text-[var(--text-muted)]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-display text-[11px] tracking-wider text-gray-400 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Broadcast Simulation Engine
          </div>
          <p>© 2026 IPL Auction Simulator • Official Simulation Platform</p>
        </div>
      </footer>
    </div>
  );
}
