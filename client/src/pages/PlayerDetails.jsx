import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Star, MapPin } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line } from 'recharts';
import DataSourceBadge from '../components/ui/DataSourceBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const ROLE_COLORS = {
  'Batter': '#3b82f6', 'Wicketkeeper': '#8b5cf6', 'All-Rounder': '#10b981',
  'Fast Bowler': '#ef4444', 'Spin Bowler': '#f59e0b'
};

const TABS = ['Overview', 'Batting', 'Bowling', 'Fielding', 'Seasons'];

const StatBox = ({ label, value, highlight }) => (
  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--broadcast-surface)' }}>
    <div className={`font-display font-bold ${highlight ? 'text-lg' : 'text-base'}`}
      style={{ color: highlight ? 'var(--gold-primary)' : 'var(--text-primary)' }}>
      {value}
    </div>
    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
  </div>
);

export default function PlayerDetails() {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);
  const [seasonStats, setSeasonStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');

  useEffect(() => {
    const fetchPlayer = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`/api/players/${id}`);
        setPlayer(data.player);
        setSeasonStats(data.seasonStats);
      } catch (err) {
        console.error('Failed to fetch player:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayer();
  }, [id]);

  if (loading) return <LoadingSpinner size="lg" text="Loading player..." />;
  if (!player) return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>Player not found</div>;

  const radarData = [
    { subject: 'Batting', value: player.rating?.batting || 0, fullMark: 100 },
    { subject: 'Bowling', value: player.rating?.bowling || 0, fullMark: 100 },
    { subject: 'Fielding', value: player.rating?.fielding || 0, fullMark: 100 },
    { subject: 'Consistency', value: player.rating?.consistency || 0, fullMark: 100 },
    { subject: 'Form', value: player.rating?.recentForm || 0, fullMark: 100 },
    { subject: 'Impact', value: player.rating?.impact || 0, fullMark: 100 }
  ];

  const seasonRunsData = seasonStats.map(s => ({ season: s.season, runs: s.batting?.runs || 0, wickets: s.bowling?.wickets || 0, avg: s.batting?.average || 0, sr: s.batting?.strikeRate || 0, eco: s.bowling?.economy || 0 }));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Navigation & Actions */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/players" className="inline-flex items-center gap-1 text-sm hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft className="w-4 h-4" /> Back to Players
        </Link>
        <Link to={`/players/compare?players=${player._id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition hover:opacity-90"
          style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)', color: 'var(--gold-primary)' }}>
          Compare Player →
        </Link>
      </div>

      {/* Player Header Card */}
      <div className="p-6 rounded-2xl mb-6" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center font-display font-bold text-3xl"
            style={{ backgroundColor: ROLE_COLORS[player.role] + '20', color: ROLE_COLORS[player.role] }}>
            {player.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{player.name}</h1>
              <DataSourceBadge source={player.dataSource} />
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <MapPin className="w-4 h-4" /> {player.country}
              </span>
              <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: ROLE_COLORS[player.role] + '20', color: ROLE_COLORS[player.role] }}>
                {player.role}
              </span>
              {player.isOverseas && <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>Overseas</span>}
              {!player.isCapped && <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'rgba(148,163,184,0.15)', color: 'var(--text-muted)' }}>Uncapped</span>}
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{player.battingStyle}</span>
              {player.bowlingStyle !== 'None' && <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{player.bowlingStyle}</span>}
            </div>
          </div>

          {/* Rating badge */}
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center animate-glow"
              style={{ background: 'var(--gradient-gold)' }}>
              <Star className="w-4 h-4 text-black mb-0.5" />
              <span className="font-display text-2xl font-bold text-black">{player.rating?.overall?.toFixed(1)}</span>
            </div>
            <div className="mt-2 font-display text-lg font-bold" style={{ color: 'var(--gold-primary)' }}>
              ₹{player.basePrice} Cr
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Base Price</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl overflow-x-auto" style={{ backgroundColor: 'var(--broadcast-card)' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap"
            style={{
              backgroundColor: activeTab === tab ? 'var(--gold-primary)' : 'transparent',
              color: activeTab === tab ? '#000' : 'var(--text-secondary)'
            }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-slide-in-up">
        {activeTab === 'Overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
              <h3 className="font-display text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Rating Breakdown</h3>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--broadcast-border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                  <Radar dataKey="value" stroke="var(--gold-primary)" fill="var(--gold-primary)" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Stats */}
            <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
              <h3 className="font-display text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Career Summary</h3>
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Matches" value={player.careerStats?.batting?.matches || 0} highlight />
                <StatBox label="Runs" value={player.careerStats?.batting?.runs || 0} />
                <StatBox label="Avg" value={player.careerStats?.batting?.average?.toFixed(1) || '0.0'} />
                <StatBox label="SR" value={player.careerStats?.batting?.strikeRate?.toFixed(1) || '0.0'} />
                <StatBox label="Wickets" value={player.careerStats?.bowling?.wickets || 0} />
                <StatBox label="Economy" value={player.careerStats?.bowling?.economy?.toFixed(1) || '0.0'} />
                <StatBox label="50s" value={player.careerStats?.batting?.fifties || 0} />
                <StatBox label="100s" value={player.careerStats?.batting?.hundreds || 0} />
                <StatBox label="Catches" value={player.careerStats?.fielding?.catches || 0} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Batting' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
              <h3 className="font-display text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Batting Statistics</h3>
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Matches" value={player.careerStats?.batting?.matches || 0} highlight />
                <StatBox label="Innings" value={player.careerStats?.batting?.innings || 0} />
                <StatBox label="Runs" value={player.careerStats?.batting?.runs || 0} highlight />
                <StatBox label="Average" value={player.careerStats?.batting?.average?.toFixed(2) || '0.00'} />
                <StatBox label="Strike Rate" value={player.careerStats?.batting?.strikeRate?.toFixed(2) || '0.00'} />
                <StatBox label="Highest" value={player.careerStats?.batting?.highestScore || 0} />
                <StatBox label="50s" value={player.careerStats?.batting?.fifties || 0} />
                <StatBox label="100s" value={player.careerStats?.batting?.hundreds || 0} />
                <StatBox label="Not Outs" value={player.careerStats?.batting?.notOuts || 0} />
                <StatBox label="4s" value={player.careerStats?.batting?.fours || 0} />
                <StatBox label="6s" value={player.careerStats?.batting?.sixes || 0} />
                <StatBox label="Balls Faced" value={player.careerStats?.batting?.ballsFaced || 0} />
              </div>
            </div>
            {seasonRunsData.length > 0 && (
              <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
                <h3 className="font-display text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Runs by Season</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={seasonRunsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--broadcast-border)" />
                    <XAxis dataKey="season" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--broadcast-surface)', border: '1px solid var(--broadcast-border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                    <Bar dataKey="runs" fill="var(--gold-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Bowling' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
              <h3 className="font-display text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Bowling Statistics</h3>
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Matches" value={player.careerStats?.bowling?.matches || 0} highlight />
                <StatBox label="Overs" value={player.careerStats?.bowling?.overs?.toFixed(1) || '0.0'} />
                <StatBox label="Wickets" value={player.careerStats?.bowling?.wickets || 0} highlight />
                <StatBox label="Economy" value={player.careerStats?.bowling?.economy?.toFixed(2) || '0.00'} />
                <StatBox label="Average" value={player.careerStats?.bowling?.average?.toFixed(2) || '0.00'} />
                <StatBox label="SR" value={player.careerStats?.bowling?.strikeRate?.toFixed(2) || '0.00'} />
                <StatBox label="Best" value={player.careerStats?.bowling?.bestBowling || '0/0'} />
                <StatBox label="3W" value={player.careerStats?.bowling?.threeWickets || 0} />
                <StatBox label="5W" value={player.careerStats?.bowling?.fiveWickets || 0} />
                <StatBox label="Runs" value={player.careerStats?.bowling?.runsConceded || 0} />
                <StatBox label="4W" value={player.careerStats?.bowling?.fourWickets || 0} />
                <StatBox label="Innings" value={player.careerStats?.bowling?.innings || 0} />
              </div>
            </div>
            {seasonRunsData.length > 0 && (
              <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
                <h3 className="font-display text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Wickets by Season</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={seasonRunsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--broadcast-border)" />
                    <XAxis dataKey="season" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--broadcast-surface)', border: '1px solid var(--broadcast-border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                    <Bar dataKey="wickets" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Fielding' && (
          <div className="max-w-md">
            <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
              <h3 className="font-display text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Fielding Statistics</h3>
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Catches" value={player.careerStats?.fielding?.catches || 0} highlight />
                <StatBox label="Run Outs" value={player.careerStats?.fielding?.runOuts || 0} />
                <StatBox label="Stumpings" value={player.careerStats?.fielding?.stumpings || 0} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Seasons' && (
          <div className="space-y-4">
            {seasonStats.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No season data available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--broadcast-border)' }}>
                      {['Season', 'M', 'Runs', 'Avg', 'SR', 'HS', '50s', 'Wkts', 'Eco', 'BB', 'Ct'].map(h => (
                        <th key={h} className="px-3 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {seasonStats.map(s => (
                      <tr key={s.season} style={{ borderBottom: '1px solid var(--broadcast-border)' }}>
                        <td className="px-3 py-3 font-display font-bold" style={{ color: 'var(--gold-primary)' }}>{s.season}</td>
                        <td className="px-3 py-3" style={{ color: 'var(--text-primary)' }}>{s.batting?.matches || 0}</td>
                        <td className="px-3 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{s.batting?.runs || 0}</td>
                        <td className="px-3 py-3" style={{ color: 'var(--text-primary)' }}>{s.batting?.average?.toFixed(1) || '0.0'}</td>
                        <td className="px-3 py-3" style={{ color: 'var(--text-primary)' }}>{s.batting?.strikeRate?.toFixed(1) || '0.0'}</td>
                        <td className="px-3 py-3" style={{ color: 'var(--text-primary)' }}>{s.batting?.highestScore || 0}</td>
                        <td className="px-3 py-3" style={{ color: 'var(--text-primary)' }}>{s.batting?.fifties || 0}</td>
                        <td className="px-3 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{s.bowling?.wickets || 0}</td>
                        <td className="px-3 py-3" style={{ color: 'var(--text-primary)' }}>{s.bowling?.economy?.toFixed(1) || '0.0'}</td>
                        <td className="px-3 py-3" style={{ color: 'var(--text-primary)' }}>{s.bowling?.bestBowling || '-'}</td>
                        <td className="px-3 py-3" style={{ color: 'var(--text-primary)' }}>{s.fielding?.catches || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {seasonRunsData.length > 1 && (
              <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
                <h3 className="font-display text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Performance Trend</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={seasonRunsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--broadcast-border)" />
                    <XAxis dataKey="season" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--broadcast-surface)', border: '1px solid var(--broadcast-border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                    <Line type="monotone" dataKey="avg" stroke="var(--gold-primary)" strokeWidth={2} dot={{ fill: 'var(--gold-primary)' }} name="Average" />
                    <Line type="monotone" dataKey="sr" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} name="Strike Rate" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
