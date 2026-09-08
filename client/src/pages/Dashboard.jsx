import { Trophy, Plus, Users, Gavel, Bot, Sparkles, Shield, ArrowRight, BookOpen, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Dashboard() {
  const { user } = useAuthStore();
  const userName = user?.displayName || user?.username || 'Franchise Boss';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 animate-fade-in">
      
      {/* Broadcast Command Center Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-10 border border-[var(--broadcast-border)] bg-gradient-to-r from-[var(--broadcast-card)] via-[#11192e] to-[var(--broadcast-card)] shadow-2xl">
        {/* Stadium ambient light overlay */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                <Gavel className="w-3.5 h-3.5" /> IPL Auction Command Hub
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hidden sm:inline-flex items-center gap-1">
                <Bot className="w-3 h-3" /> AI Simulation Ready
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">{userName}</span>!
            </h1>
            <p className="mt-2.5 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-xl">
              Step onto the auction stage. Draft marquee legends, negotiate high-stakes bidding wars, and build a championship-winning franchise squad.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md shrink-0">
            <div className="text-center px-2 py-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold block">Max Purse</span>
              <span className="font-display font-black text-sm sm:text-lg text-emerald-400">₹120 Cr</span>
            </div>
            <div className="text-center px-2 py-1 border-x border-white/10">
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold block">Squad Cap</span>
              <span className="font-display font-black text-sm sm:text-lg text-amber-400">25 Players</span>
            </div>
            <div className="text-center px-2 py-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold block">Overseas</span>
              <span className="font-display font-black text-sm sm:text-lg text-cyan-400">Max 8</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Action Hub - 4 Interactive Broadcast Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" /> Auction Actions
          </h2>
          <span className="text-xs text-[var(--text-muted)]">Select an option to begin</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Create Auction */}
          <Link 
            to="/create" 
            className="group p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-[#182035] to-[var(--broadcast-card)] border border-amber-500/30 hover:border-amber-400 hover:shadow-[0_10px_30px_rgba(245,166,35,0.2)]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
            <div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-md group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                Create Auction
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                Host a customized room with AI bots or human friends. Set purse budgets and nominate marquee stars.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <span>Start New Room</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Join Auction */}
          <Link 
            to="/join" 
            className="group p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-[#122238] to-[var(--broadcast-card)] border border-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_10px_30px_rgba(6,182,212,0.2)]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all" />
            <div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-md group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                Join Auction
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                Enter an existing 6-character room code to join an active multiplayer auction lobby instantly.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-cyan-400">
              <span>Enter Room Code</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: My Auctions */}
          <Link 
            to="/my-auctions" 
            className="group p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-[#132627] to-[var(--broadcast-card)] border border-emerald-500/30 hover:border-emerald-400 hover:shadow-[0_10px_30px_rgba(16,185,129,0.2)]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
            <div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-md group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                My Auctions
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                Review your created rooms, active lobbies, past auction ledgers, and manage your hosted rooms.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <span>View History</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 4: Play with AI Simulation */}
          <Link 
            to="/create" 
            className="group p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-[#21183b] to-[var(--broadcast-card)] border border-purple-500/30 hover:border-purple-400 hover:shadow-[0_10px_30px_rgba(139,92,246,0.2)]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all" />
            <div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-md group-hover:scale-110 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                Play With AI
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                Quick-play solo against competitive AI bots that strategize budgets, chat live, and build balanced squads.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-purple-400">
              <span>Launch AI Match</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>
      </div>

      {/* Broadcast Pro Tips / Strategic Insights */}
      <div className="p-6 rounded-2xl bg-[var(--broadcast-card)] border border-[var(--broadcast-border)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-display font-bold text-sm text-white">
              Live Squad Strength Intelligence
            </h4>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              During the live auction, watch the bottom-center Squad Strength HUD to monitor your Batting, Bowling, and Fielding ratings in real-time.
            </p>
          </div>
        </div>

        <Link
          to="/create"
          className="px-4 py-2 rounded-xl text-xs font-bold font-display transition shrink-0 bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center gap-1.5"
        >
          <span>Host Live Draft</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

    </div>
  );
}
