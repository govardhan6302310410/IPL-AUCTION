import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, CheckCircle, AlertCircle, DollarSign, Award, ChevronRight } from 'lucide-react';
import axios from 'axios';

const mockSquad = [
  { id: 1, name: 'MS Dhoni', role: 'Wicketkeeper', isOverseas: false, cost: 120000000 },
  { id: 2, name: 'Ruturaj Gaikwad', role: 'Batter', isOverseas: false, cost: 60000000 },
  { id: 3, name: 'Devon Conway', role: 'Batter', isOverseas: true, cost: 10000000 },
  { id: 4, name: 'Ravindra Jadeja', role: 'All-Rounder', isOverseas: false, cost: 160000000 },
  { id: 5, name: 'Moeen Ali', role: 'All-Rounder', isOverseas: true, cost: 80000000 },
  { id: 6, name: 'Deepak Chahar', role: 'Fast Bowler', isOverseas: false, cost: 140000000 },
  { id: 7, name: 'Matheesha Pathirana', role: 'Fast Bowler', isOverseas: true, cost: 2000000 },
  { id: 8, name: 'Maheesh Theekshana', role: 'Spinner', isOverseas: true, cost: 7000000 },
  { id: 9, name: 'Tushar Deshpande', role: 'Fast Bowler', isOverseas: false, cost: 2000000 },
  { id: 10, name: 'Shivam Dube', role: 'All-Rounder', isOverseas: false, cost: 40000000 },
  { id: 11, name: 'Ajinkya Rahane', role: 'Batter', isOverseas: false, cost: 5000000 },
  { id: 12, name: 'Daryl Mitchell', role: 'All-Rounder', isOverseas: true, cost: 140000000 },
  { id: 13, name: 'Rachin Ravindra', role: 'All-Rounder', isOverseas: true, cost: 18000000 },
  { id: 14, name: 'Shardul Thakur', role: 'All-Rounder', isOverseas: false, cost: 40000000 },
  { id: 15, name: 'Mustafizur Rahman', role: 'Fast Bowler', isOverseas: true, cost: 20000000 },
  { id: 16, name: 'Sameer Rizvi', role: 'Batter', isOverseas: false, cost: 84000000 },
  { id: 17, name: 'Avanish Rao Aravelly', role: 'Wicketkeeper', isOverseas: false, cost: 2000000 },
  { id: 18, name: 'Mitchell Santner', role: 'All-Rounder', isOverseas: true, cost: 19000000 },
];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export default function SquadBuilder() {
  const { roomId, teamId } = useParams();
  const navigate = useNavigate();
  const [squad, setSquad] = useState([]);
  const [loading, setLoading] = useState(true);
  const totalPurse = 1000000000;

  useEffect(() => {
    // In a real app, fetch squad by teamId/roomId
    // axios.get(`/api/teams/${teamId}/squad`).then(...)
    setTimeout(() => {
      setSquad(mockSquad);
      setLoading(false);
    }, 500);
  }, [teamId, roomId]);

  if (loading) return <div className="p-8 text-center text-[var(--color-primary)]">Loading squad...</div>;

  const groupedSquad = squad.reduce((acc, player) => {
    if (!acc[player.role]) acc[player.role] = [];
    acc[player.role].push(player);
    return acc;
  }, {});

  const purseSpent = squad.reduce((sum, p) => sum + p.cost, 0);
  const purseRemaining = totalPurse - purseSpent;
  const avgPlayerCost = squad.length > 0 ? purseSpent / squad.length : 0;
  
  const wksCount = (groupedSquad['Wicketkeeper'] || []).length;
  const overseasCount = squad.filter(p => p.isOverseas).length;
  const bowlersCount = (groupedSquad['Fast Bowler'] || []).length + (groupedSquad['Spinner'] || []).length + (groupedSquad['All-Rounder'] || []).length; // Rough estimate of bowling options

  const validations = [
    {
      id: 'min-max-squad',
      label: 'Squad Size (18-25)',
      status: squad.length >= 18 && squad.length <= 25 ? 'pass' : (squad.length < 18 ? 'fail' : 'warning'),
      value: `${squad.length}/25`
    },
    {
      id: 'wk-req',
      label: 'Wicketkeepers',
      status: wksCount >= 2 ? 'pass' : (wksCount === 1 ? 'warning' : 'fail'),
      value: wksCount
    },
    {
      id: 'os-limit',
      label: 'Overseas Players (Max 8)',
      status: overseasCount <= 8 ? (overseasCount === 8 ? 'warning' : 'pass') : 'fail',
      value: `${overseasCount}/8`
    },
    {
      id: 'bowlers',
      label: 'Bowling Options (Min 5)',
      status: bowlersCount >= 5 ? 'pass' : 'fail',
      value: bowlersCount
    }
  ];

  const getValidationIcon = (status) => {
    if (status === 'pass') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'warning') return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    return <AlertCircle className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-white p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-wider text-[var(--color-primary)] drop-shadow-md">
              Squad Overview
            </h1>
            <p className="text-gray-400 mt-2 text-lg">Analyze your final team composition</p>
          </div>
          
          <button 
            onClick={() => navigate('/playing-xi')}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-transform"
          >
            Build Playing XI <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 flex items-center gap-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wider">Purse Remaining</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(purseRemaining)}</p>
            </div>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 flex items-center gap-4">
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <Award className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wider">Purse Spent</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(purseSpent)}</p>
            </div>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 flex items-center gap-4">
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Users className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wider">Avg Player Cost</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(avgPlayerCost)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Squad Grid */}
          <div className="lg:col-span-2 space-y-6">
            {['Batter', 'Wicketkeeper', 'All-Rounder', 'Fast Bowler', 'Spinner'].map(role => (
              groupedSquad[role] && groupedSquad[role].length > 0 && (
                <div key={role} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-[var(--color-border)]/50 to-transparent p-4 border-b border-[var(--color-border)]">
                    <h3 className="text-xl font-bold text-white uppercase tracking-wider flex justify-between">
                      {role}s <span className="text-[var(--color-primary)]">{groupedSquad[role].length}</span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                    {groupedSquad[role].map(player => (
                      <div key={player.id} className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-[var(--color-border)]/50 hover:border-[var(--color-primary)] transition-colors">
                        <div>
                          <p className="font-semibold text-white flex items-center gap-2">
                            {player.name}
                            {player.isOverseas && <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">OS</span>}
                          </p>
                          <p className="text-xs text-gray-400">{formatCurrency(player.cost)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>

          {/* Validation Checklist Sidebar */}
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 sticky top-6">
              <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-6 border-b border-[var(--color-border)] pb-4">
                Squad Validation
              </h3>
              <div className="space-y-4">
                {validations.map(val => (
                  <div key={val.id} className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-[var(--color-border)]/50">
                    <div className="flex items-center gap-3">
                      {getValidationIcon(val.status)}
                      <span className="font-medium text-gray-200">{val.label}</span>
                    </div>
                    <span className={`font-bold ${val.status === 'pass' ? 'text-green-400' : (val.status === 'warning' ? 'text-yellow-400' : 'text-red-400')}`}>
                      {val.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-lg">
                <h4 className="font-bold text-[var(--color-primary)] mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4" /> Team Balance Rating
                </h4>
                <div className="w-full bg-black/50 rounded-full h-3 mt-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-yellow-400 to-[var(--color-primary)] h-full w-[85%] rounded-full"></div>
                </div>
                <p className="text-right text-sm text-gray-300 mt-1 font-mono">85/100</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
