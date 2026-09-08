import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ChevronLeft, ChevronRight, Star, MapPin, X, Users } from 'lucide-react';
import axios from 'axios';
import DataSourceBadge from '../components/ui/DataSourceBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const ROLES = ['Batter', 'Wicketkeeper', 'All-Rounder', 'Fast Bowler', 'Spin Bowler'];
const ROLE_COLORS = {
  'Batter': '#3b82f6',
  'Wicketkeeper': '#8b5cf6',
  'All-Rounder': '#10b981',
  'Fast Bowler': '#ef4444',
  'Spin Bowler': '#f59e0b'
};

export default function PlayerDatabase() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ role: '', country: '', overseas: '', capped: '' });
  const [sortBy, setSortBy] = useState('rating.overall');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState(null);

  const fetchPlayers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page, limit: 20, sortBy, sortOrder,
        ...(search && { search }),
        ...(filters.role && { role: filters.role }),
        ...(filters.country && { country: filters.country }),
        ...(filters.overseas && { overseas: filters.overseas }),
        ...(filters.capped && { capped: filters.capped })
      });
      const { data } = await axios.get(`/api/players?${params}`);
      setPlayers(data.players);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch players:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filters, sortBy, sortOrder]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  useEffect(() => {
    axios.get('/api/players/stats').then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPlayers(1);
  };

  const clearFilters = () => {
    setFilters({ role: '', country: '', overseas: '', capped: '' });
    setSearch('');
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length + (search ? 1 : 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Player Database
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {stats?.totalPlayers || 0} players • Search, filter, and compare
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/players/compare"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition hover:opacity-90"
            style={{ backgroundColor: 'var(--broadcast-surface)', border: '1px solid var(--broadcast-border)', color: 'var(--gold-primary)' }}>
            <Users className="w-4 h-4" /> Compare Players
          </Link>
          <DataSourceBadge source={stats?.dataSource || players[0]?.dataSource || 'cricsheet'} size="md" />
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or country..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--broadcast-surface)', border: '1px solid var(--broadcast-border)', color: 'var(--text-primary)' }}
            />
          </div>
          <button
            type="button" onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition"
            style={{ border: '1px solid var(--broadcast-border)', color: activeFilterCount > 0 ? 'var(--gold-primary)' : 'var(--text-secondary)' }}
          >
            <Filter className="w-4 h-4" />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </form>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-4 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ borderTop: '1px solid var(--broadcast-border)' }}>
            <select value={filters.role} onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}
              className="px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--broadcast-surface)', border: '1px solid var(--broadcast-border)', color: 'var(--text-primary)' }}>
              <option value="">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={filters.overseas} onChange={e => setFilters(f => ({ ...f, overseas: e.target.value }))}
              className="px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--broadcast-surface)', border: '1px solid var(--broadcast-border)', color: 'var(--text-primary)' }}>
              <option value="">All Players</option>
              <option value="false">Indian</option>
              <option value="true">Overseas</option>
            </select>
            <select value={filters.capped} onChange={e => setFilters(f => ({ ...f, capped: e.target.value }))}
              className="px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--broadcast-surface)', border: '1px solid var(--broadcast-border)', color: 'var(--text-primary)' }}>
              <option value="">Capped & Uncapped</option>
              <option value="true">Capped</option>
              <option value="false">Uncapped</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--broadcast-surface)', border: '1px solid var(--broadcast-border)', color: 'var(--text-primary)' }}>
              <option value="rating.overall">Sort: Rating</option>
              <option value="basePrice">Sort: Base Price</option>
              <option value="careerStats.batting.runs">Sort: Runs</option>
              <option value="careerStats.bowling.wickets">Sort: Wickets</option>
              <option value="name">Sort: Name</option>
            </select>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs" style={{ color: 'var(--unsold-red)' }}>
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Role quick filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilters(f => ({ ...f, role: '' }))} 
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition`}
          style={{ 
            backgroundColor: !filters.role ? 'var(--gold-primary)' : 'var(--broadcast-card)', 
            color: !filters.role ? '#000' : 'var(--text-secondary)',
            border: '1px solid var(--broadcast-border)'
          }}>All</button>
        {ROLES.map(role => (
          <button key={role} onClick={() => setFilters(f => ({ ...f, role: f.role === role ? '' : role }))}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition"
            style={{ 
              backgroundColor: filters.role === role ? ROLE_COLORS[role] : 'var(--broadcast-card)',
              color: filters.role === role ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--broadcast-border)'
            }}>
            {role} {stats?.roleCounts?.find(r => r._id === role)?.count ? `(${stats.roleCounts.find(r => r._id === role).count})` : ''}
          </button>
        ))}
      </div>

      {/* Player Grid */}
      {loading ? (
        <LoadingSpinner size="lg" text="Loading players..." />
      ) : players.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg" style={{ color: 'var(--text-muted)' }}>No players found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {players.map(player => (
            <Link key={player._id} to={`/players/${player._id}`}
              className="group p-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
              {/* Player header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-lg"
                    style={{ backgroundColor: ROLE_COLORS[player.role] + '20', color: ROLE_COLORS[player.role] }}>
                    {player.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-medium text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {player.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{player.country}</span>
                      {player.isOverseas && (
                        <span className="text-xs px-1.5 py-0.5 rounded ml-1" style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>OS</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5" style={{ color: 'var(--gold-primary)' }} />
                    <span className="font-display font-bold text-sm" style={{ color: 'var(--gold-primary)' }}>
                      {player.rating?.overall?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Role pill */}
              <div className="mb-3">
                <span className="px-2 py-1 rounded text-xs font-medium"
                  style={{ backgroundColor: ROLE_COLORS[player.role] + '20', color: ROLE_COLORS[player.role] }}>
                  {player.role}
                </span>
                {!player.isCapped && (
                  <span className="ml-2 px-2 py-1 rounded text-xs" style={{ backgroundColor: 'rgba(148,163,184,0.15)', color: 'var(--text-muted)' }}>Uncapped</span>
                )}
              </div>

              {/* Key stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded" style={{ backgroundColor: 'var(--broadcast-surface)' }}>
                  <div className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {player.careerStats?.batting?.matches || 0}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Matches</div>
                </div>
                <div className="p-2 rounded" style={{ backgroundColor: 'var(--broadcast-surface)' }}>
                  <div className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {player.careerStats?.batting?.runs || 0}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Runs</div>
                </div>
                <div className="p-2 rounded" style={{ backgroundColor: 'var(--broadcast-surface)' }}>
                  <div className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {player.careerStats?.bowling?.wickets || 0}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Wickets</div>
                </div>
              </div>

              {/* Base price */}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Base Price</span>
                <span className="font-display font-bold text-sm" style={{ color: 'var(--gold-primary)' }}>
                  ₹{player.basePrice} Cr
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => fetchPlayers(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm disabled:opacity-30 transition"
            style={{ border: '1px solid var(--broadcast-border)', color: 'var(--text-primary)' }}
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Page {pagination.page} of {pagination.pages} ({pagination.total} players)
          </span>
          <button
            onClick={() => fetchPlayers(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm disabled:opacity-30 transition"
            style={{ border: '1px solid var(--broadcast-border)', color: 'var(--text-primary)' }}
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
