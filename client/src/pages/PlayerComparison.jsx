import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, X, Plus, Users, ArrowLeft, RotateCcw, AlertCircle, BarChart3, PieChart } from 'lucide-react';
import axios from 'axios';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const COMPARE_COLORS = ['#f5a623', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

export default function PlayerComparison() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  // Initialize from URL search params if present
  useEffect(() => {
    const idsParam = searchParams.get('players');
    if (idsParam) {
      const ids = idsParam.split(',').filter(Boolean);
      if (ids.length > 0) {
        // Fetch details for initial player IDs
        Promise.all(ids.slice(0, 5).map(id => axios.get(`/api/players/${id}`).then(r => r.data.player).catch(() => null)))
          .then(results => {
            const validPlayers = results.filter(Boolean);
            if (validPlayers.length > 0) {
              setSelectedPlayers(validPlayers);
            }
          });
      }
    }
  }, []);

  // Update URL search params when selected players change
  const updateUrlParams = (players) => {
    if (players.length > 0) {
      setSearchParams({ players: players.map(p => p._id).join(',') }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const searchPlayers = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await axios.get(`/api/players?search=${encodeURIComponent(q)}&limit=8`);
      const selectedIdSet = new Set(selectedPlayers.map(p => p._id));
      setSearchResults((data.players || []).filter(p => !selectedIdSet.has(p._id)));
    } catch (err) {
      console.error('Failed to search players:', err);
    } finally {
      setSearching(false);
    }
  }, [selectedPlayers]);

  useEffect(() => {
    const timer = setTimeout(() => searchPlayers(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchPlayers]);

  const addPlayer = (player) => {
    if (selectedPlayers.length >= 5) return;
    if (selectedPlayers.some(p => p._id === player._id)) return;
    const updated = [...selectedPlayers, player];
    setSelectedPlayers(updated);
    updateUrlParams(updated);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removePlayer = (id) => {
    const updated = selectedPlayers.filter(p => p._id !== id);
    setSelectedPlayers(updated);
    updateUrlParams(updated);
    if (updated.length < 2) {
      setComparisonData(null);
    }
  };

  const clearAll = () => {
    setSelectedPlayers([]);
    setComparisonData(null);
    updateUrlParams([]);
  };

  const compare = useCallback(async () => {
    if (selectedPlayers.length < 2) {
      setComparisonData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post('/api/players/compare', {
        playerIds: selectedPlayers.map(p => p._id)
      });
      setComparisonData(data);
    } catch (err) {
      console.error('Failed to compare players:', err);
      setError(err.response?.data?.message || 'Failed to compare selected players');
    } finally {
      setLoading(false);
    }
  }, [selectedPlayers]);

  useEffect(() => {
    if (selectedPlayers.length >= 2) {
      compare();
    } else {
      setComparisonData(null);
    }
  }, [selectedPlayers, compare]);

  // Use comparisonData players if available, otherwise fall back to selectedPlayers
  const activePlayers = comparisonData?.players || selectedPlayers;

  // Radar chart data
  const radarData = activePlayers.length >= 2 ? [
    { key: 'batting', label: 'Batting' },
    { key: 'bowling', label: 'Bowling' },
    { key: 'fielding', label: 'Fielding' },
    { key: 'consistency', label: 'Consistency' },
    { key: 'recentForm', label: 'Recent Form' },
    { key: 'impact', label: 'Impact' }
  ].map(attr => {
    const point = { subject: attr.label };
    activePlayers.forEach(p => {
      point[p.name] = p.rating?.[attr.key] || 0;
    });
    return point;
  }) : [];

  // Bar chart data for key metrics
  const barCategories = [
    { key: 'runs', label: 'Runs' },
    { key: 'strikeRate', label: 'Strike Rate' },
    { key: 'wickets', label: 'Wickets' },
    { key: 'rating', label: 'Rating' }
  ];

  const barData = barCategories.map(cat => {
    const point = { category: cat.label };
    activePlayers.forEach(p => {
      let val = 0;
      if (cat.key === 'runs') val = p.careerStats?.batting?.runs || 0;
      else if (cat.key === 'strikeRate') val = Math.round(p.careerStats?.batting?.strikeRate || 0);
      else if (cat.key === 'wickets') val = p.careerStats?.bowling?.wickets || 0;
      else if (cat.key === 'rating') val = Math.round(p.rating?.overall || 0);
      point[p.name] = val;
    });
    return point;
  });

  // Table rows configuration
  const tableRows = [
    {
      label: 'Role',
      getRaw: p => p.role,
      format: p => p.role,
      highlight: false
    },
    {
      label: 'Country',
      getRaw: p => p.country,
      format: p => p.country,
      highlight: false
    },
    {
      label: 'Overall Rating',
      getRaw: p => p.rating?.overall ?? 0,
      format: p => p.rating?.overall ? p.rating.overall.toFixed(1) : '-',
      highlight: true,
      better: 'higher'
    },
    {
      label: 'Matches',
      getRaw: p => Math.max(p.careerStats?.batting?.matches || 0, p.careerStats?.bowling?.matches || 0),
      format: p => Math.max(p.careerStats?.batting?.matches || 0, p.careerStats?.bowling?.matches || 0),
      highlight: true,
      better: 'higher'
    },
    {
      label: 'Runs',
      getRaw: p => p.careerStats?.batting?.runs || 0,
      format: p => p.careerStats?.batting?.runs ?? 0,
      highlight: true,
      better: 'higher'
    },
    {
      label: 'Batting Avg',
      getRaw: p => p.careerStats?.batting?.average || 0,
      format: p => p.careerStats?.batting?.average ? p.careerStats.batting.average.toFixed(1) : '-',
      highlight: true,
      better: 'higher'
    },
    {
      label: 'Strike Rate',
      getRaw: p => p.careerStats?.batting?.strikeRate || 0,
      format: p => p.careerStats?.batting?.strikeRate ? p.careerStats.batting.strikeRate.toFixed(1) : '-',
      highlight: true,
      better: 'higher'
    },
    {
      label: 'Wickets',
      getRaw: p => p.careerStats?.bowling?.wickets || 0,
      format: p => p.careerStats?.bowling?.wickets ?? 0,
      highlight: true,
      better: 'higher'
    },
    {
      label: 'Bowling Economy',
      getRaw: p => {
        const overs = p.careerStats?.bowling?.overs || 0;
        const wickets = p.careerStats?.bowling?.wickets || 0;
        return (overs > 0 || wickets > 0) ? p.careerStats?.bowling?.economy : null;
      },
      format: p => {
        const overs = p.careerStats?.bowling?.overs || 0;
        const wickets = p.careerStats?.bowling?.wickets || 0;
        return (overs > 0 || wickets > 0) && p.careerStats?.bowling?.economy
          ? p.careerStats.bowling.economy.toFixed(2)
          : '-';
      },
      highlight: true,
      better: 'lower'
    },
    {
      label: 'Catches',
      getRaw: p => p.careerStats?.fielding?.catches || 0,
      format: p => p.careerStats?.fielding?.catches ?? 0,
      highlight: true,
      better: 'higher'
    },
    {
      label: 'Base Price',
      getRaw: p => p.basePrice || 0,
      format: p => p.basePrice ? `₹${p.basePrice} Cr` : '-',
      highlight: false
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/players" className="text-xs hover:opacity-80 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Players
            </Link>
          </div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <Users className="w-8 h-8" style={{ color: 'var(--gold-primary)' }} />
            Player Comparison
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Select 2–5 players to compare stats, ratings, and performance head-to-head.
          </p>
        </div>

        {selectedPlayers.length > 0 && (
          <button
            onClick={clearAll}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80"
            style={{ backgroundColor: 'var(--broadcast-surface)', border: '1px solid var(--broadcast-border)', color: 'var(--text-muted)' }}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear All
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={selectedPlayers.length >= 5 ? "Maximum 5 players selected" : "Search players to add (e.g. Virat, Bumrah, Rohit)..."}
            disabled={selectedPlayers.length >= 5}
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition disabled:opacity-50"
            style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)', color: 'var(--text-primary)' }}
          />
          {searching && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--gold-primary)', borderTopColor: 'transparent' }} />
            </div>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div
            className="absolute z-20 w-full mt-1.5 rounded-xl shadow-xl overflow-hidden border max-h-72 overflow-y-auto"
            style={{ backgroundColor: 'var(--broadcast-card)', borderColor: 'var(--broadcast-border)' }}
          >
            {searchResults.map(p => (
              <button
                key={p._id}
                onClick={() => addPlayer(p)}
                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-white/5 transition"
                style={{ borderBottom: '1px solid var(--broadcast-border)' }}
              >
                <div>
                  <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                    {p.role} • {p.country} • ₹{p.basePrice} Cr
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(245,166,35,0.15)', color: 'var(--gold-primary)' }}>
                    ★ {p.rating?.overall?.toFixed(1) || '0.0'}
                  </span>
                  <Plus className="w-4 h-4" style={{ color: 'var(--gold-primary)' }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Player Chips */}
      <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Selected Players ({selectedPlayers.length}/5)
          </span>
          {selectedPlayers.length === 1 && (
            <span className="text-xs font-medium" style={{ color: 'var(--gold-primary)' }}>
              Add at least 1 more player to compare
            </span>
          )}
        </div>

        {selectedPlayers.length === 0 ? (
          <p className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>
            No players selected yet. Search above to add 2 to 5 players.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {selectedPlayers.map((p, i) => (
              <span
                key={p._id}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition"
                style={{
                  backgroundColor: COMPARE_COLORS[i] + '18',
                  color: COMPARE_COLORS[i],
                  border: `1.5px solid ${COMPARE_COLORS[i]}50`
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COMPARE_COLORS[i] }} />
                <span>{p.name}</span>
                <span className="text-xs opacity-75 font-normal">({p.role})</span>
                <button
                  onClick={() => removePlayer(p._id)}
                  className="hover:opacity-100 opacity-60 transition ml-1 p-0.5 rounded"
                  title="Remove player"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Loading & Error States */}
      {loading && <LoadingSpinner size="lg" text="Analyzing and comparing players..." />}

      {error && !loading && (
        <div className="p-4 rounded-xl flex items-center gap-3 mb-6" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--unsold-red)', color: 'var(--unsold-red)' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={compare} className="ml-auto text-xs underline font-medium">Retry</button>
        </div>
      )}

      {/* Comparison Visuals */}
      {activePlayers.length >= 2 && !loading && (
        <div className="space-y-6 animate-slide-in-up">
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <div className="p-6 rounded-2xl" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <PieChart className="w-5 h-5" style={{ color: 'var(--gold-primary)' }} />
                  Skill & Rating Radar
                </h3>
              </div>
              <div className="w-full h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="var(--broadcast-border)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        border: '1px solid var(--broadcast-border)',
                        borderRadius: '8px',
                        color: '#f1f5f9',
                        fontSize: '12px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    {activePlayers.map((p, i) => (
                      <Radar
                        key={p._id}
                        name={p.name}
                        dataKey={p.name}
                        stroke={COMPARE_COLORS[i]}
                        fill={COMPARE_COLORS[i]}
                        fillOpacity={0.2}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Key Stats Bar Chart */}
            <div className="p-6 rounded-2xl" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <BarChart3 className="w-5 h-5" style={{ color: 'var(--gold-primary)' }} />
                  Key Metrics Comparison
                </h3>
              </div>
              <div className="w-full h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--broadcast-border)" vertical={false} />
                    <XAxis dataKey="category" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        border: '1px solid var(--broadcast-border)',
                        borderRadius: '8px',
                        color: '#f1f5f9',
                        fontSize: '12px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    {activePlayers.map((p, i) => (
                      <Bar
                        key={p._id}
                        name={p.name}
                        dataKey={p.name}
                        fill={COMPARE_COLORS[i]}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Stats Comparison Table */}
          <div className="p-6 rounded-2xl overflow-x-auto" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
            <h3 className="font-display text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Head-to-Head Statistics
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--broadcast-border)' }}>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Metric
                  </th>
                  {activePlayers.map((p, i) => (
                    <th key={p._id} className="px-4 py-3 text-center font-bold" style={{ color: COMPARE_COLORS[i] }}>
                      <Link to={`/players/${p._id}`} className="hover:underline flex flex-col items-center">
                        <span>{p.name}</span>
                        <span className="text-xs font-normal opacity-75">{p.country}</span>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map(({ label, getRaw, format, highlight, better }) => {
                  // Compute winner for numeric highlights
                  let winnerId = null;
                  if (highlight) {
                    const validEntries = activePlayers
                      .map(p => ({ id: p._id, val: getRaw(p) }))
                      .filter(e => typeof e.val === 'number' && !isNaN(e.val) && e.val > 0);

                    if (validEntries.length >= 2) {
                      if (better === 'lower') {
                        const minVal = Math.min(...validEntries.map(e => e.val));
                        const matches = validEntries.filter(e => e.val === minVal);
                        if (matches.length === 1) winnerId = matches[0].id;
                      } else {
                        const maxVal = Math.max(...validEntries.map(e => e.val));
                        const matches = validEntries.filter(e => e.val === maxVal);
                        if (matches.length === 1) winnerId = matches[0].id;
                      }
                    }
                  }

                  return (
                    <tr key={label} className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid var(--broadcast-border)' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {label}
                      </td>
                      {activePlayers.map((p) => {
                        const formatted = format(p);
                        const isWinner = winnerId === p._id;
                        return (
                          <td
                            key={p._id}
                            className={`px-4 py-3 text-center font-medium ${isWinner ? 'font-bold' : ''}`}
                            style={{
                              color: isWinner ? 'var(--gold-primary)' : 'var(--text-primary)'
                            }}
                          >
                            <span className={isWinner ? 'px-2 py-0.5 rounded' : ''} style={isWinner ? { backgroundColor: 'rgba(245, 166, 35, 0.15)' } : undefined}>
                              {formatted}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
