import React, { useState } from 'react';
import { Trophy, TrendingUp, DollarSign, Star, Award, Zap } from 'lucide-react';

const mockTeams = [
  { rank: 1, team: 'Chennai Super Kings', owner: 'Dhoni Fan', rating: 96, spent: '99.5Cr', color: '#facc15' },
  { rank: 2, team: 'Mumbai Indians', owner: 'Rohit Army', rating: 94, spent: '98.0Cr', color: '#004ba0' },
  { rank: 3, team: 'Kolkata Knight Riders', owner: 'SRK', rating: 91, spent: '97.2Cr', color: '#4c1d95' },
  { rank: 4, team: 'Royal Challengers Bangalore', owner: 'Virat Squad', rating: 89, spent: '99.8Cr', color: '#dc2626' },
  { rank: 5, team: 'Rajasthan Royals', owner: 'Royals', rating: 88, spent: '96.5Cr', color: '#ec4899' },
];

const mockPlayers = [
  { rank: 1, player: 'Mitchell Starc', role: 'Bowler', team: 'KKR', price: '24.75Cr', metric: 'Most Expensive' },
  { rank: 2, player: 'Pat Cummins', role: 'All-Rounder', team: 'SRH', price: '20.50Cr', metric: 'Most Expensive' },
  { rank: 3, player: 'Daryl Mitchell', role: 'Batsman', team: 'CSK', price: '14.00Cr', metric: 'Most Expensive' },
];

const mockBargains = [
  { rank: 1, player: 'Rachin Ravindra', role: 'All-Rounder', team: 'CSK', price: '1.80Cr', metric: 'Best Steal' },
  { rank: 2, player: 'Travis Head', role: 'Batsman', team: 'SRH', price: '6.80Cr', metric: 'Great Value' },
  { rank: 3, player: 'Wanindu Hasaranga', role: 'Bowler', team: 'SRH', price: '1.50Cr', metric: 'Underpriced' },
];

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState('teams');

  const getPodiumHeight = (rank) => {
    switch(rank) {
      case 1: return 'h-48';
      case 2: return 'h-36';
      case 3: return 'h-24';
      default: return 'h-0';
    }
  };

  const getPodiumColor = (rank) => {
    switch(rank) {
      case 1: return 'from-yellow-400 to-yellow-600 border-yellow-300';
      case 2: return 'from-gray-300 to-gray-500 border-gray-200';
      case 3: return 'from-amber-600 to-amber-800 border-amber-500';
      default: return '';
    }
  };

  const renderPodium = (data) => (
    <div className="flex justify-center items-end gap-2 md:gap-6 mt-12 mb-16 h-[250px]">
      {[2, 1, 3].map(pos => {
        const item = data.find(d => d.rank === pos);
        if (!item) return null;
        
        return (
          <div key={pos} className="flex flex-col items-center group">
            {/* Hover details */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity -translate-y-4 mb-2 bg-black/80 p-2 rounded text-xs text-center border border-gray-700 whitespace-nowrap absolute">
              {item.owner || item.role}
            </div>
            
            {/* Entity Name */}
            <div className="text-center mb-4 relative">
              {pos === 1 && <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-2 animate-pulse" />}
              <div className="font-bold text-white text-sm md:text-xl">{item.team || item.player}</div>
              <div className="text-yellow-400 font-mono font-bold">{item.rating ? `${item.rating} OVR` : item.price}</div>
            </div>
            
            {/* Podium Block */}
            <div className={`w-24 md:w-32 rounded-t-xl bg-gradient-to-b ${getPodiumColor(pos)} ${getPodiumHeight(pos)} flex items-start justify-center pt-4 border-t-4 border-opacity-50 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0"></div>
              <span className="text-4xl font-black text-black/40">{pos}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-white p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-6xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-600 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)] flex items-center justify-center gap-4">
            <Award className="w-12 h-12 text-yellow-500" /> Hall of Fame
          </h1>
          <p className="text-xl text-gray-400">The Ultimate IPL Auction Rankings</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-4 p-2 bg-black/30 rounded-full border border-gray-800 w-fit mx-auto">
          {[
            { id: 'teams', label: 'All-Time Teams', icon: Trophy },
            { id: 'expensive', label: 'Most Expensive', icon: DollarSign },
            { id: 'bargains', label: 'Best Bargains', icon: TrendingUp },
            { id: 'rated', label: 'Top Rated Players', icon: Star },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Content */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-8 relative overflow-hidden shadow-2xl">
          {activeTab === 'teams' && (
            <div className="animate-fade-in">
              {renderPodium(mockTeams)}
              
              <div className="mt-8 overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-black/50 text-gray-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Rank</th>
                      <th className="p-4">Franchise</th>
                      <th className="p-4">Owner</th>
                      <th className="p-4 text-center">Rating</th>
                      <th className="p-4 text-right">Purse Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {mockTeams.map((team, idx) => (
                      <tr key={team.team} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold text-gray-400">#{team.rank}</td>
                        <td className="p-4 font-black text-lg" style={{ color: team.color }}>{team.team}</td>
                        <td className="p-4 text-gray-300">{team.owner}</td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center justify-center bg-gray-800 text-yellow-400 font-bold py-1 px-3 rounded-lg border border-gray-700">
                            {team.rating} OVR
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-gray-300">{team.spent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'expensive' && (
             <div className="animate-fade-in">
                {renderPodium(mockPlayers)}
             </div>
          )}

          {activeTab === 'bargains' && (
            <div className="animate-fade-in">
              {renderPodium(mockBargains)}
            </div>
          )}

           {activeTab === 'rated' && (
            <div className="animate-fade-in text-center py-20 text-gray-400">
              <Star className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-xl">Top Rated Players feature coming soon.</p>
            </div>
          )}
        </div>

      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
