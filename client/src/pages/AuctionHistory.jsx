import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, FastForward, Hash, DollarSign, Gavel } from 'lucide-react';
import axios from 'axios';

// Mock data to simulate the history
const mockHistory = [
  { id: 1, playerName: 'Virat Kohli', role: 'Batsman', basePrice: '2.00', soldPrice: '17.00', team: 'RCB', bids: [{ team: 'CSK', amount: 2.0 }, { team: 'RCB', amount: 5.0 }, { team: 'CSK', amount: 15.0 }, { team: 'RCB', amount: 17.0 }] },
  { id: 2, playerName: 'MS Dhoni', role: 'Wicket Keeper', basePrice: '2.00', soldPrice: '15.00', team: 'CSK', bids: [{ team: 'MI', amount: 2.0 }, { team: 'CSK', amount: 15.0 }] },
  { id: 3, playerName: 'Jasprit Bumrah', role: 'Bowler', basePrice: '2.00', soldPrice: '16.50', team: 'MI', bids: [{ team: 'RCB', amount: 2.0 }, { team: 'MI', amount: 16.5 }] },
  { id: 4, playerName: 'Rohit Sharma', role: 'Batsman', basePrice: '2.00', soldPrice: '16.00', team: 'MI', bids: [{ team: 'DC', amount: 2.0 }, { team: 'MI', amount: 16.0 }] },
  { id: 5, playerName: 'Suryakumar Yadav', role: 'Batsman', basePrice: '1.50', soldPrice: '12.00', team: 'MI', bids: [{ team: 'KKR', amount: 1.5 }, { team: 'MI', amount: 12.0 }] },
];

export default function AuctionHistory() {
  const { id } = useParams();
  const [history, setHistory] = useState(mockHistory);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentBidIndex, setCurrentBidIndex] = useState(0);
  
  const currentItem = history[currentIndex];

  useEffect(() => {
    // In a real app, fetch from `/api/history/room/${id}`
    // axios.get(`/api/history/room/${id}`).then(res => setHistory(res.data));
  }, [id]);

  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setTimeout(() => {
        if (currentBidIndex < currentItem.bids.length) {
          setCurrentBidIndex(prev => prev + 1);
        } else {
          if (currentIndex < history.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setCurrentBidIndex(0);
          } else {
            setIsPlaying(false);
          }
        }
      }, 2000 / speed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, currentBidIndex, speed, currentItem.bids.length, history.length]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setCurrentBidIndex(0);
      setIsPlaying(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setCurrentBidIndex(0);
      setIsPlaying(false);
    }
  };
  
  const handleJumpToPlayer = (e) => {
    setCurrentIndex(Number(e.target.value));
    setCurrentBidIndex(0);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-white p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-2xl">
          <div>
            <h1 className="text-2xl font-black uppercase text-yellow-500 tracking-wider flex items-center gap-2">
              <FastForward className="w-6 h-6" /> Auction Replay
            </h1>
            <p className="text-gray-400 text-sm">Room: {id || 'Simulated'}</p>
          </div>
          
          <select 
            className="bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-yellow-500"
            value={currentIndex}
            onChange={handleJumpToPlayer}
          >
            {history.map((item, idx) => (
              <option key={item.id} value={idx}>{item.playerName}</option>
            ))}
          </select>
        </div>

        {/* Main Display Area */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Gavel className="w-64 h-64" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
            {/* Player Info */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="inline-block px-4 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold tracking-wider uppercase border border-blue-500/30">
                {currentItem.role}
              </div>
              <h2 className="text-5xl font-black text-white">{currentItem.playerName}</h2>
              <div className="text-xl text-gray-400">Base Price: ₹{currentItem.basePrice} Cr</div>
            </div>

            {/* Bidding Visualization */}
            <div className="flex-1 w-full bg-black/40 rounded-2xl p-6 border border-gray-800 min-h-[300px] flex flex-col justify-end">
              <div className="space-y-3 overflow-hidden flex flex-col justify-end h-full">
                {currentItem.bids.slice(0, currentBidIndex).map((bid, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg animate-fade-in-up border border-gray-700">
                    <span className="font-bold text-gray-300">{bid.team}</span>
                    <span className="text-yellow-400 font-mono text-lg font-bold">₹{bid.amount.toFixed(2)} Cr</span>
                  </div>
                ))}
                {currentBidIndex === currentItem.bids.length && (
                  <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-yellow-600/20 to-green-600/20 border border-yellow-500/50 text-center animate-bounce-in shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                    <div className="text-gray-300 text-sm uppercase tracking-wider mb-1">SOLD TO {currentItem.team}</div>
                    <div className="text-4xl font-black text-yellow-500">₹{currentItem.soldPrice} Cr</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 flex flex-col items-center gap-6">
          
          {/* Progress Bar */}
          <div className="w-full flex items-center gap-4">
            <span className="text-sm font-mono text-gray-400">{currentIndex + 1} / {history.length}</span>
            <input 
              type="range" 
              min="0" 
              max={history.length - 1} 
              value={currentIndex}
              onChange={handleJumpToPlayer}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-8">
            <button onClick={handlePrev} className="p-3 rounded-full hover:bg-gray-800 transition-colors">
              <SkipBack className="w-8 h-8 text-gray-300" />
            </button>
            
            <button onClick={handlePlayPause} className="p-6 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black transition-transform hover:scale-105 shadow-[0_0_15px_rgba(234,179,8,0.4)]">
              {isPlaying ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 ml-1" />}
            </button>
            
            <button onClick={handleNext} className="p-3 rounded-full hover:bg-gray-800 transition-colors">
              <SkipForward className="w-8 h-8 text-gray-300" />
            </button>
          </div>

          {/* Speed Controls */}
          <div className="flex items-center gap-2 bg-black/50 p-2 rounded-xl border border-gray-800">
            {[1, 2, 4].map(s => (
              <button 
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-4 py-2 rounded-lg font-bold text-sm ${speed === s ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {s}x
              </button>
            ))}
          </div>

        </div>

      </div>

      <style>{`
        .animate-fade-in-up {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-bounce-in {
          animation: bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
