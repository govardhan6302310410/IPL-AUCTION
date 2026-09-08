import React, { useState } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Shield, Swords, Zap, Activity } from 'lucide-react';

const teamsData = [
  { id: 'csk', name: 'Chennai Super Kings', color: '#facc15', stats: { bat: 95, bowl: 92, spin: 96, pace: 85, depth: 98, exp: 95 }, purseLeft: 5000000, squadSize: 25, overseas: 8 },
  { id: 'mi', name: 'Mumbai Indians', color: '#004ba0', stats: { bat: 96, bowl: 89, spin: 80, pace: 98, depth: 90, exp: 92 }, purseLeft: 20000000, squadSize: 24, overseas: 8 },
  { id: 'rcb', name: 'Royal Challengers', color: '#dc2626', stats: { bat: 98, bowl: 82, spin: 75, pace: 88, depth: 85, exp: 88 }, purseLeft: 2000000, squadSize: 22, overseas: 7 },
  { id: 'rr', name: 'Rajasthan Royals', color: '#ec4899', stats: { bat: 88, bowl: 94, spin: 92, pace: 90, depth: 82, exp: 85 }, purseLeft: 45000000, squadSize: 23, overseas: 8 },
];

const formatCurrency = (val) => `₹${(val / 10000000).toFixed(2)} Cr`;

export default function TeamComparison() {
  const [selectedTeams, setSelectedTeams] = useState(['csk', 'mi']);

  const toggleTeam = (teamId) => {
    if (selectedTeams.includes(teamId)) {
      if (selectedTeams.length > 2) {
        setSelectedTeams(selectedTeams.filter(id => id !== teamId));
      }
    } else {
      if (selectedTeams.length < 4) {
        setSelectedTeams([...selectedTeams, teamId]);
      }
    }
  };

  const getChartData = () => {
    const subjects = [
      { key: 'bat', label: 'Batting' },
      { key: 'bowl', label: 'Bowling' },
      { key: 'spin', label: 'Spin' },
      { key: 'pace', label: 'Pace' },
      { key: 'depth', label: 'Depth' },
      { key: 'exp', label: 'Experience' }
    ];

    return subjects.map(sub => {
      const dataPoint = { subject: sub.label };
      selectedTeams.forEach(teamId => {
        const team = teamsData.find(t => t.id === teamId);
        if (team) dataPoint[team.name] = team.stats[sub.key];
      });
      return dataPoint;
    });
  };

  const selectedTeamsData = selectedTeams.map(id => teamsData.find(t => t.id === id));

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-white p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <div className="text-center">
          <h1 className="text-4xl font-black uppercase tracking-wider text-[var(--color-primary)]">
            Head-to-Head Comparison
          </h1>
          <p className="text-gray-400 mt-2">Select up to 4 teams to compare their final auction draft</p>
        </div>

        {/* Team Selector */}
        <div className="flex flex-wrap justify-center gap-4 bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)]">
          {teamsData.map(team => {
            const isSelected = selectedTeams.includes(team.id);
            return (
              <button
                key={team.id}
                onClick={() => toggleTeam(team.id)}
                className={`px-6 py-3 rounded-xl font-bold transition-all border-2 ${
                  isSelected 
                    ? 'border-transparent shadow-[0_0_15px_rgba(255,255,255,0.2)] text-white' 
                    : 'border-[var(--color-border)] text-gray-400 hover:border-gray-500 bg-transparent'
                }`}
                style={isSelected ? { backgroundColor: team.color } : {}}
              >
                {team.name}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Radar Chart */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 flex flex-col items-center">
            <h3 className="text-xl font-bold uppercase tracking-wider mb-4 w-full text-left">Attribute Analysis</h3>
            <div className="w-full h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getChartData()}>
                  <PolarGrid stroke="#444" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#aaa' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333' }} />
                  <Legend />
                  {selectedTeamsData.map((team, idx) => (
                    <Radar 
                      key={team.id}
                      name={team.name}
                      dataKey={team.name}
                      stroke={team.color}
                      fill={team.color}
                      fillOpacity={0.3 + (idx * 0.1)}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side-by-side metrics */}
          <div className="space-y-4">
            {/* Metric: Purse Left */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
              <div className="flex items-center gap-2 text-gray-400 uppercase text-sm tracking-wider mb-4">
                <Zap className="w-4 h-4" /> Remaining Purse
              </div>
              <div className="space-y-4">
                {selectedTeamsData.map(team => (
                  <div key={`purse-${team.id}`} className="flex items-center gap-4">
                    <div className="w-24 font-bold text-sm truncate" style={{color: team.color}}>{team.name}</div>
                    <div className="flex-1 bg-gray-800 rounded-full h-3 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(team.purseLeft / 50000000) * 100}%`, backgroundColor: team.color }}></div>
                    </div>
                    <div className="w-20 text-right font-mono text-sm">{formatCurrency(team.purseLeft)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metric: Squad Size */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
              <div className="flex items-center gap-2 text-gray-400 uppercase text-sm tracking-wider mb-4">
                <Shield className="w-4 h-4" /> Squad Size
              </div>
              <div className="space-y-4">
                {selectedTeamsData.map(team => (
                  <div key={`size-${team.id}`} className="flex items-center gap-4">
                    <div className="w-24 font-bold text-sm truncate" style={{color: team.color}}>{team.name}</div>
                    <div className="flex-1 bg-gray-800 rounded-full h-3 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(team.squadSize / 25) * 100}%`, backgroundColor: team.color }}></div>
                    </div>
                    <div className="w-20 text-right font-mono text-sm">{team.squadSize} / 25</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metric: Overseas */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
              <div className="flex items-center gap-2 text-gray-400 uppercase text-sm tracking-wider mb-4">
                <Activity className="w-4 h-4" /> Overseas Players
              </div>
              <div className="space-y-4">
                {selectedTeamsData.map(team => (
                  <div key={`os-${team.id}`} className="flex items-center gap-4">
                    <div className="w-24 font-bold text-sm truncate" style={{color: team.color}}>{team.name}</div>
                    <div className="flex-1 flex gap-1">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className={`flex-1 h-3 rounded-sm ${i < team.overseas ? 'opacity-100' : 'opacity-20 bg-gray-600'}`} style={{ backgroundColor: i < team.overseas ? team.color : undefined }}></div>
                      ))}
                    </div>
                    <div className="w-20 text-right font-mono text-sm">{team.overseas} / 8</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
