import { Link } from 'react-router-dom';
import { Trophy, Users, Bot, Database, History, ArrowRight, Zap, Shield, Sparkles, Gavel } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function Home() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-[calc(100vh-5rem)] relative overflow-hidden">
      
      {/* Stadium Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-amber-500/10 via-cyan-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-40 -left-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Hero Section */}
      <section className="relative py-12 sm:py-24 lg:py-28">
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          
          {/* Live Broadcast Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider mb-6 bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>IPL 2026 LIVE AUCTION ENGINE</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-none mb-6">
            <span className="text-white drop-shadow-sm">MEGA FRANCHISE</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow-md">
              CRICKET AUCTION
            </span>
          </h1>

          <p className="text-sm sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 text-[var(--text-secondary)] leading-relaxed">
            Take command of iconic franchises. Compete in real-time bidding battles with friends or high-IQ AI bots, and assemble your ultimate IPL championship squad.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-md sm:max-w-none mx-auto">
            <Link
              to={isAuthenticated ? '/create' : '/login'}
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl text-base sm:text-lg font-black transition-all hover:scale-105 active:scale-95 shadow-xl shadow-amber-500/20"
              style={{ background: 'var(--gradient-gold)', color: '#000' }}
            >
              <Gavel className="w-5 h-5" />
              <span>Create Auction</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/join"
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl text-base sm:text-lg font-bold transition-all hover:scale-105 active:scale-95 text-white border border-[var(--broadcast-border)] bg-[var(--broadcast-card)] hover:bg-white/5 shadow-lg"
            >
              <Users className="w-5 h-5 text-cyan-400" />
              <span>Join with Code</span>
            </Link>
          </div>

          {/* Broadcast Highlights Pill Strip */}
          <div className="mt-10 sm:mt-14 pt-8 border-t border-[var(--broadcast-border)]/60 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 text-left">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">Live Budget</span>
              <span className="text-sm sm:text-base font-black text-white">₹120 Cr Purses</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block">Cricsheet Data</span>
              <span className="text-sm sm:text-base font-black text-white">500+ Real Stars</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider block">AI Intelligence</span>
              <span className="text-sm sm:text-base font-black text-white">Realistic AI Bidders</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">Live Analytics</span>
              <span className="text-sm sm:text-base font-black text-white">Squad Strength HUD</span>
            </div>
          </div>

        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: Users,
              title: 'Multiplayer Arena',
              desc: 'Create or join lobbies with friends in real time with WebSocket low-latency synchronization.',
              to: '/join',
              badge: 'Real-Time',
              accent: 'border-cyan-500/30 hover:border-cyan-400',
              iconBg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
            },
            {
              icon: Bot,
              title: 'Play with AI Mode',
              desc: 'Solo or small groups can fill empty slots with budget-conscious AI bots that chat and bid dynamically.',
              to: '/create',
              badge: 'Difficult AI',
              accent: 'border-purple-500/30 hover:border-purple-400',
              iconBg: 'bg-purple-500/15 text-purple-400 border-purple-500/30'
            },
            {
              icon: Shield,
              title: 'Squad Strength HUD',
              desc: 'Live real-time calculations of Batting, Bowling, Fielding, and Overall squad balance as bids are won.',
              to: '/dashboard',
              badge: 'Live Metric',
              accent: 'border-amber-500/30 hover:border-amber-400',
              iconBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            },
            {
              icon: History,
              title: 'Ledgers & History',
              desc: 'Complete post-auction reports, squad rosters, purse remaining breakdowns, and room management.',
              to: '/my-auctions',
              badge: 'Archived',
              accent: 'border-emerald-500/30 hover:border-emerald-400',
              iconBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            }
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <Link 
                key={i} 
                to={f.to} 
                className={`p-5 sm:p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between bg-[var(--broadcast-card)] border ${f.accent} shadow-lg`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${f.iconBg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10">
                      {f.badge}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-white mb-2">
                    {f.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {f.desc}
                  </p>
                </div>

                <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-gray-300 group-hover:text-white">
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

    </div>
  );
}
