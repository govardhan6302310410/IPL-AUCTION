import React, { useState } from 'react';
import { Save, UserPlus, Info, AlertTriangle, UserMinus } from 'lucide-react';

const initialSquad = [
  { id: 'p1', name: 'MS Dhoni', role: 'Wicketkeeper', isOverseas: false },
  { id: 'p2', name: 'Ruturaj Gaikwad', role: 'Batter', isOverseas: false },
  { id: 'p3', name: 'Devon Conway', role: 'Batter', isOverseas: true },
  { id: 'p4', name: 'Ravindra Jadeja', role: 'All-Rounder', isOverseas: false },
  { id: 'p5', name: 'Moeen Ali', role: 'All-Rounder', isOverseas: true },
  { id: 'p6', name: 'Deepak Chahar', role: 'Fast Bowler', isOverseas: false },
  { id: 'p7', name: 'Matheesha Pathirana', role: 'Fast Bowler', isOverseas: true },
  { id: 'p8', name: 'Maheesh Theekshana', role: 'Spinner', isOverseas: true },
  { id: 'p9', name: 'Tushar Deshpande', role: 'Fast Bowler', isOverseas: false },
  { id: 'p10', name: 'Shivam Dube', role: 'All-Rounder', isOverseas: false },
  { id: 'p11', name: 'Ajinkya Rahane', role: 'Batter', isOverseas: false },
  { id: 'p12', name: 'Daryl Mitchell', role: 'All-Rounder', isOverseas: true },
  { id: 'p13', name: 'Rachin Ravindra', role: 'All-Rounder', isOverseas: true },
  { id: 'p14', name: 'Shardul Thakur', role: 'All-Rounder', isOverseas: false },
];

export default function PlayingXI() {
  const [bench, setBench] = useState(initialSquad);
  const [playingXI, setPlayingXI] = useState([]);
  const [impactPlayer, setImpactPlayer] = useState(null);
  const [captain, setCaptain] = useState(null);
  const [viceCaptain, setViceCaptain] = useState(null);
  const [wicketKeeper, setWicketKeeper] = useState(null);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sourceId = result.source.droppableId;
    const destId = result.destination.droppableId;
    
    // Only handling basic list reordering for now to avoid complex DnD logic in boilerplate
    // A robust implementation would handle moves between bench, XI, and impact player
  };

  const moveToXI = (player) => {
    if (playingXI.length >= 11) return;
    setBench(bench.filter(p => p.id !== player.id));
    setPlayingXI([...playingXI, player]);
  };

  const removeFromXI = (player) => {
    setPlayingXI(playingXI.filter(p => p.id !== player.id));
    setBench([...bench, player]);
    if (captain === player.id) setCaptain(null);
    if (viceCaptain === player.id) setViceCaptain(null);
    if (wicketKeeper === player.id) setWicketKeeper(null);
  };

  const toggleRole = (playerId, role) => {
    if (role === 'C') {
      setCaptain(captain === playerId ? null : playerId);
      if (viceCaptain === playerId) setViceCaptain(null);
    } else if (role === 'VC') {
      setViceCaptain(viceCaptain === playerId ? null : playerId);
      if (captain === playerId) setCaptain(null);
    } else if (role === 'WK') {
      setWicketKeeper(wicketKeeper === playerId ? null : playerId);
    }
  };

  // Validations
  const overseasInXI = playingXI.filter(p => p.isOverseas).length;
  const hasWK = playingXI.some(p => p.role === 'Wicketkeeper') || wicketKeeper !== null;
  const bowlingOptions = playingXI.filter(p => ['Fast Bowler', 'Spinner', 'All-Rounder'].includes(p.role)).length;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-white p-4 md:p-8 font-sans flex flex-col">
      <div className="max-w-7xl mx-auto w-full space-y-6 flex-1 flex flex-col">
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-wider text-[var(--color-primary)]">Playing XI Builder</h1>
            <p className="text-gray-400">Select your best 11 + Impact Player</p>
          </div>
          <button className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 px-6 py-2 rounded-lg font-bold shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
                  disabled={playingXI.length !== 11}>
            <Save className="w-5 h-5" /> Save Lineup
          </button>
        </div>

        {/* Validation Alerts */}
        <div className="flex flex-wrap gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${overseasInXI > 4 ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-green-500/20 border-green-500 text-green-400'}`}>
            <AlertTriangle className="w-4 h-4" /> Max 4 Overseas: {overseasInXI}/4
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${!hasWK && playingXI.length > 0 ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-green-500/20 border-green-500 text-green-400'}`}>
            <Info className="w-4 h-4" /> Wicketkeeper: {hasWK ? 'Selected' : 'Required'}
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${bowlingOptions < 5 && playingXI.length > 5 ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-green-500/20 border-green-500 text-green-400'}`}>
            <Info className="w-4 h-4" /> Bowling Options: {bowlingOptions}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
          
          {/* Pitch Layout (Playing XI) */}
          <div className="lg:col-span-8 bg-green-800 rounded-2xl relative overflow-hidden border-4 border-white/20 min-h-[600px] shadow-[0_0_50px_rgba(0,0,0,0.5)_inset]">
            {/* Pitch graphic overlay */}
            <div className="absolute inset-x-1/4 top-[10%] bottom-[10%] bg-[#e3cd96]/90 rounded-sm shadow-xl z-0">
               {/* Crease lines */}
               <div className="absolute top-[10%] w-full h-[2px] bg-white"></div>
               <div className="absolute bottom-[10%] w-full h-[2px] bg-white"></div>
            </div>

            <div className="relative z-10 p-6 h-full flex flex-col justify-between">
              <div className="text-center font-bold text-white/50 tracking-[0.3em] uppercase mb-4">Batting Order</div>
              
              <div className="flex-1 flex flex-col gap-2">
                {playingXI.map((player, index) => (
                  <div key={player.id} className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg p-2 flex items-center justify-between mx-auto w-[80%] hover:bg-black/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--color-primary)] font-black w-6 text-center">{index + 1}</span>
                      <div>
                        <p className="font-bold text-white">{player.name} {player.isOverseas && <span className="text-[10px] text-blue-300 ml-1">(OS)</span>}</p>
                        <p className="text-xs text-gray-400">{player.role}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Role Badges */}
                      <button onClick={() => toggleRole(player.id, 'C')} className={`w-7 h-7 rounded-full text-xs font-bold border transition-colors ${captain === player.id ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-black' : 'border-gray-500 text-gray-500 hover:border-white hover:text-white'}`}>C</button>
                      <button onClick={() => toggleRole(player.id, 'VC')} className={`w-7 h-7 rounded-full text-xs font-bold border transition-colors ${viceCaptain === player.id ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-500 text-gray-500 hover:border-white hover:text-white'}`}>VC</button>
                      <button onClick={() => toggleRole(player.id, 'WK')} className={`w-7 h-7 rounded-full text-xs font-bold border transition-colors ${wicketKeeper === player.id || player.role === 'Wicketkeeper' ? 'bg-yellow-500 border-yellow-500 text-black' : 'border-gray-500 text-gray-500 hover:border-white hover:text-white'}`}>WK</button>
                      
                      <button onClick={() => removeFromXI(player)} className="ml-2 text-red-400 hover:text-red-300">
                        <UserMinus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Empty Slots */}
                {[...Array(11 - playingXI.length)].map((_, i) => (
                  <div key={`empty-${i}`} className="border border-dashed border-white/20 rounded-lg p-3 flex items-center justify-center mx-auto w-[80%] bg-black/20">
                    <span className="text-white/30 text-sm font-medium">Slot {playingXI.length + i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Squad Bench */}
          <div className="lg:col-span-4 flex flex-col h-full bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
            <div className="bg-gradient-to-r from-[var(--color-border)] to-transparent p-4 flex justify-between items-center border-b border-[var(--color-border)]">
              <h3 className="font-bold text-lg uppercase tracking-wider">Squad Bench</h3>
              <span className="text-sm text-gray-400">{bench.length} players</span>
            </div>
            
            <div className="overflow-y-auto p-4 space-y-3 flex-1 h-[600px] custom-scrollbar">
              {bench.map(player => (
                <div key={player.id} className="bg-black/40 border border-[var(--color-border)] rounded-lg p-3 flex justify-between items-center hover:border-[var(--color-primary)] transition-colors">
                  <div>
                    <p className="font-semibold text-sm">{player.name} {player.isOverseas && <span className="text-[10px] text-blue-400 bg-blue-400/10 px-1 rounded ml-1 border border-blue-400/20">OS</span>}</p>
                    <p className="text-xs text-gray-400">{player.role}</p>
                  </div>
                  <button 
                    onClick={() => moveToXI(player)}
                    disabled={playingXI.length >= 11}
                    className="p-2 bg-[var(--color-border)] hover:bg-[var(--color-primary)] hover:text-black rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-[var(--color-border)] disabled:hover:text-white"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Impact Player Slot */}
            <div className="p-4 border-t border-[var(--color-border)] bg-black/50 mt-auto">
              <h4 className="font-bold text-sm text-[var(--color-primary)] uppercase tracking-wider mb-3">Impact Player</h4>
              <div className="border border-dashed border-[var(--color-primary)]/50 rounded-lg p-4 flex items-center justify-center cursor-pointer hover:bg-[var(--color-primary)]/10 transition-colors">
                <span className="text-gray-400 text-sm">Drag or select a player</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
