import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Zap, Trophy, Medal, Star, Shield, ArrowRight } from 'lucide-react';

const mockPointsTable = [
  { rank: 1, team: 'CSK', m: 14, w: 10, l: 4, pts: 20, nrr: '+0.854', color: '#facc15', qualified: true },
  { rank: 2, team: 'MI', m: 14, w: 9, l: 5, pts: 18, nrr: '+0.652', color: '#004ba0', qualified: true },
  { rank: 3, team: 'RR', m: 14, w: 8, l: 6, pts: 16, nrr: '+0.345', color: '#ec4899', qualified: true },
  { rank: 4, team: 'RCB', m: 14, w: 8, l: 6, pts: 16, nrr: '+0.112', color: '#dc2626', qualified: true },
  { rank: 5, team: 'KKR', m: 14, w: 7, l: 7, pts: 14, nrr: '-0.105', color: '#4c1d95', qualified: false },
  { rank: 6, team: 'DC', m: 14, w: 6, l: 8, pts: 12, nrr: '-0.334', color: '#0284c7', qualified: false },
];

export default function TournamentSimulation() {
  const { roomId } = useParams();
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);

  const handleSimulate = () => {
    setIsSimulating(true);
    // Simulate API call and calculation delay
    setTimeout(() => {
      setIsSimulating(false);
      setSimulationComplete(true);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-white p-6 md:p-10 font-sans relative overflow-hidden">
      
      {/* Stadium Lights Background Effect when Simulating */}
      {isSimulating && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 flex justify-center items-start">
          <div className="w-[1px] h-[1000px] bg-white/20 shadow-[0_0_100px_50px_rgba(255,255,255,0.8)] rotate-45 transform origin-top animate-sweep"></div>
          <div className="w-[1px] h-[1000px] bg-white/20 shadow-[0_0_100px_50px_rgba(255,255,255,0.8)] -rotate-45 transform origin-top animate-sweep-reverse delay-100"></div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-10 relative z-10">
        
        {/* Banner */}
        <div className="bg-yellow-500 text-black py-3 px-6 rounded-xl font-black uppercase tracking-[0.2em] text-center flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
          <Zap className="w-5 h-5" /> Simulated Season Tournament - Results Are Simulated <Zap className="w-5 h-5" />
        </div>

        {!simulationComplete ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-8">
            <Trophy className="w-32 h-32 text-gray-700" />
            <div className="text-center space-y-4 max-w-xl">
              <h1 className="text-4xl font-black uppercase tracking-wider text-white">Simulate {roomId ? 'Your' : 'The'} Season</h1>
              <p className="text-gray-400">Watch as our engine pits the newly drafted squads against each other in a full 14-match season to determine the ultimate champion.</p>
            </div>
            
            <button 
              onClick={handleSimulate}
              disabled={isSimulating}
              className={`relative px-12 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full font-black text-2xl uppercase tracking-wider text-white shadow-[0_0_40px_rgba(79,70,229,0.5)] transition-all ${isSimulating ? 'opacity-90 scale-95 cursor-not-allowed' : 'hover:scale-105 hover:shadow-[0_0_60px_rgba(79,70,229,0.7)]'}`}
            >
              {isSimulating ? (
                <span className="flex items-center gap-4">
                  <Zap className="w-8 h-8 animate-spin" /> Simulating Matches...
                </span>
              ) : (
                <span className="flex items-center gap-4">
                  <Zap className="w-8 h-8" /> Simulate Season
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-12 animate-fade-in-up">
            
            {/* Champion Reveal */}
            <div className="text-center py-12 relative">
              <div className="absolute inset-0 bg-yellow-500/10 blur-[100px] rounded-full"></div>
              <h2 className="text-2xl text-yellow-500 font-bold tracking-widest uppercase mb-4">Tournament Champions</h2>
              <div className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-2xl">
                CSK
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Points Table */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-[var(--color-border)] bg-black/40">
                  <h3 className="text-xl font-black uppercase tracking-wider flex items-center gap-2">
                    <Medal className="text-yellow-500" /> League Standings
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-black/80 text-gray-400 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="p-4">Pos</th>
                        <th className="p-4">Team</th>
                        <th className="p-4 text-center">M</th>
                        <th className="p-4 text-center">W</th>
                        <th className="p-4 text-center">L</th>
                        <th className="p-4 text-center">Pts</th>
                        <th className="p-4 text-right">NRR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {mockPointsTable.map((team, idx) => (
                        <tr key={team.team} className={`${team.qualified ? 'bg-green-900/10 hover:bg-green-900/20' : 'hover:bg-white/5'} transition-colors`}>
                          <td className="p-4 font-bold">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${team.qualified ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-300'}`}>
                              {team.rank}
                            </span>
                          </td>
                          <td className="p-4 font-black text-lg" style={{ color: team.color }}>{team.team}</td>
                          <td className="p-4 text-center text-gray-400">{team.m}</td>
                          <td className="p-4 text-center text-gray-300">{team.w}</td>
                          <td className="p-4 text-center text-gray-500">{team.l}</td>
                          <td className="p-4 text-center font-bold text-white">{team.pts}</td>
                          <td className="p-4 text-right font-mono text-gray-300">{team.nrr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Playoff Bracket */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 shadow-xl flex flex-col">
                <div className="border-b border-[var(--color-border)] pb-4 mb-6">
                  <h3 className="text-xl font-black uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="text-yellow-500" /> Playoffs
                  </h3>
                </div>
                
                <div className="flex-1 flex flex-col justify-center gap-6 relative">
                  {/* Q1 & Eliminator */}
                  <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-gray-800">
                    <div className="w-1/3 text-center">
                      <div className="text-xs text-gray-500 uppercase mb-1">Qualifier 1</div>
                      <div className="font-bold text-yellow-500">CSK</div>
                      <div className="text-sm text-gray-400">def</div>
                      <div className="font-bold text-blue-500">MI</div>
                    </div>
                    <div className="w-1/3 flex justify-center"><ArrowRight className="text-gray-600" /></div>
                    <div className="w-1/3 text-center">
                      <div className="text-xs text-gray-500 uppercase mb-1">Eliminator</div>
                      <div className="font-bold text-pink-500">RR</div>
                      <div className="text-sm text-gray-400">def</div>
                      <div className="font-bold text-red-500">RCB</div>
                    </div>
                  </div>

                  {/* Q2 */}
                  <div className="flex justify-center items-center bg-black/40 p-4 rounded-xl border border-gray-800 w-2/3 mx-auto">
                    <div className="text-center w-full">
                      <div className="text-xs text-gray-500 uppercase mb-1">Qualifier 2</div>
                      <div className="font-bold text-blue-500">MI</div>
                      <div className="text-sm text-gray-400">def</div>
                      <div className="font-bold text-pink-500">RR</div>
                    </div>
                  </div>

                  {/* Final */}
                  <div className="flex justify-center items-center bg-gradient-to-r from-yellow-900/30 via-yellow-600/20 to-yellow-900/30 p-6 rounded-xl border border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.15)]">
                    <div className="text-center w-full">
                      <div className="text-sm text-yellow-500 font-bold uppercase tracking-widest mb-2">Grand Final</div>
                      <div className="flex items-center justify-center gap-8 text-2xl font-black">
                        <span className="text-yellow-500">CSK</span>
                        <span className="text-sm text-gray-400 font-normal">def</span>
                        <span className="text-blue-500">MI</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Awards Showcase */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-orange-900/40 to-black border border-orange-500/30 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 bg-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-orange-400 font-bold uppercase tracking-wider text-sm mb-2">Orange Cap</h4>
                <div className="text-2xl font-black text-white">Virat Kohli</div>
                <div className="text-gray-400 text-sm mt-1">741 Runs</div>
              </div>

              <div className="bg-gradient-to-br from-purple-900/40 to-black border border-purple-500/30 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 bg-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-purple-400 font-bold uppercase tracking-wider text-sm mb-2">Purple Cap</h4>
                <div className="text-2xl font-black text-white">Jasprit Bumrah</div>
                <div className="text-gray-400 text-sm mt-1">24 Wickets</div>
              </div>

              <div className="bg-gradient-to-br from-yellow-900/40 to-black border border-yellow-500/30 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 bg-yellow-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                  <Trophy className="w-8 h-8 text-black" />
                </div>
                <h4 className="text-yellow-400 font-bold uppercase tracking-wider text-sm mb-2">MVP</h4>
                <div className="text-2xl font-black text-white">Sunil Narine</div>
                <div className="text-gray-400 text-sm mt-1">482 Runs • 17 Wkts</div>
              </div>

              <div className="bg-gradient-to-br from-blue-900/40 to-black border border-blue-500/30 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-blue-400 font-bold uppercase tracking-wider text-sm mb-2">Fair Play</h4>
                <div className="text-2xl font-black text-white">CSK</div>
                <div className="text-gray-400 text-sm mt-1">10.0 Pts/Match</div>
              </div>
            </div>

          </div>
        )}

      </div>

      <style>{`
        @keyframes sweep {
          0% { transform: rotate(45deg) translateX(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: rotate(45deg) translateX(100%); opacity: 0; }
        }
        @keyframes sweep-reverse {
          0% { transform: rotate(-45deg) translateX(100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: rotate(-45deg) translateX(-100%); opacity: 0; }
        }
        .animate-sweep {
          animation: sweep 2s infinite linear;
        }
        .animate-sweep-reverse {
          animation: sweep-reverse 2s infinite linear;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
