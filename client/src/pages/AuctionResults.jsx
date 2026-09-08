import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  Trophy, Star, DollarSign, Users, Target, Shield, AlertTriangle, 
  CheckCircle2, XCircle, ChevronRight, Sparkles, Award, UserPlus, 
  UserMinus, Flame, Swords, ArrowUpDown, Gavel, Radio, LogOut
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import useAuthStore from '../store/authStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function AuctionResults() {
  const { id, roomId: routeRoomId } = useParams();
  const roomId = (id || routeRoomId || '').toUpperCase();
  const { user } = useAuthStore();
  const currentUserId = (user?._id || user?.id)?.toString();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resultsData, setResultsData] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [activeTab, setActiveTab] = useState('auctioneerSummary'); // 'auctioneerSummary' | 'squadLeaderboard' | 'playingXI' | 'radarCompare'
  const [auctioneerFilterTeam, setAuctioneerFilterTeam] = useState('ALL');

  // Playing XI builder state
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [availableSquad, setAvailableSquad] = useState([]);
  const [playingXI, setPlayingXI] = useState([]);
  const [captainId, setCaptainId] = useState(null);
  const [viceCaptainId, setViceCaptainId] = useState(null);
  const [wicketKeeperId, setWicketKeeperId] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState(null);
  const [xiRatingResult, setXiRatingResult] = useState(null);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auction_token');
      const res = await fetch(`/api/rooms/${roomId}/results`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Failed to fetch auction results');
      }

      const data = await res.json();
      setResultsData(data.results);
      setRoomData(data.room);

      const aId = (data.room?.auctioneer?._id || data.room?.auctioneer)?.toString();
      const userIsAuctioneer = aId && aId === currentUserId;

      if (userIsAuctioneer) {
        setActiveTab('auctioneerSummary');
      }

      // Identify user's team or default to first team for XI builder
      const teams = data.room?.teams || [];
      const userTeam = teams.find(t => {
        const ownerId = (t.owner?._id || t.owner)?.toString();
        return ownerId && ownerId === currentUserId;
      }) || teams[0];

      if (userTeam) {
        setSelectedTeamId(userTeam._id);
        setupTeamLineup(userTeam);
      }
    } catch (err) {
      console.error('Error fetching results:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roomId) fetchResults();
  }, [roomId]);

  const setupTeamLineup = (team) => {
    if (!team) return;
    const squadPlayers = (team.squadDetails || []).map(sd => {
      const p = sd.player || sd;
      const rawRating = typeof p.rating === 'object' ? (p.rating?.overall ?? 8.5) : (p.rating ?? 8.5);
      const rating10 = Number(rawRating) > 10 ? (Number(rawRating) / 10).toFixed(1) : Number(rawRating).toFixed(1);
      return {
        _id: p._id,
        name: p.name || 'Player',
        role: p.role || 'Batter',
        country: p.country || 'India',
        isOverseas: !!p.isOverseas,
        rating10,
        price: Number(sd.boughtFor ?? sd.price ?? 1.0)
      };
    });

    // Check if team already has submitted playing XI
    if (team.playingXI && team.playingXI.length === 11) {
      const currentXI = team.playingXI.map(xiItem => {
        const p = xiItem.player || xiItem;
        const found = squadPlayers.find(sp => sp._id === (p._id || p)) || p;
        return {
          ...found,
          _id: p._id || p,
          isCaptain: !!xiItem.isCaptain,
          isViceCaptain: !!xiItem.isViceCaptain,
          isWicketkeeper: !!xiItem.isWicketkeeper
        };
      });
      setPlayingXI(currentXI);
      const xiIds = new Set(currentXI.map(p => p._id));
      setAvailableSquad(squadPlayers.filter(p => !xiIds.has(p._id)));
      
      const c = currentXI.find(p => p.isCaptain);
      if (c) setCaptainId(c._id);
      const vc = currentXI.find(p => p.isViceCaptain);
      if (vc) setViceCaptainId(vc._id);
      const wk = currentXI.find(p => p.isWicketkeeper);
      if (wk) setWicketKeeperId(wk._id);

      if (team.playingXIRating) {
        setXiRatingResult(team.playingXIRating);
      }
    } else {
      // Default empty XI with squad bench
      setAvailableSquad(squadPlayers);
      setPlayingXI([]);
      setCaptainId(null);
      setViceCaptainId(null);
      setWicketKeeperId(null);
      setXiRatingResult(null);
    }
  };

  const handleTeamChange = (teamId) => {
    setSelectedTeamId(teamId);
    const team = roomData?.teams?.find(t => t._id === teamId);
    setupTeamLineup(team);
    setSubmitFeedback(null);
  };

  const addToXI = (player) => {
    if (playingXI.length >= 11) {
      setSubmitFeedback({ type: 'error', text: 'Playing XI can have at most 11 players!' });
      return;
    }
    const currentOverseas = playingXI.filter(p => p.isOverseas).length;
    if (player.isOverseas && currentOverseas >= 4) {
      setSubmitFeedback({ type: 'error', text: 'Maximum 4 overseas players allowed in Playing XI!' });
      return;
    }

    setPlayingXI(prev => [...prev, player]);
    setAvailableSquad(prev => prev.filter(p => p._id !== player._id));
    setSubmitFeedback(null);

    // Auto-detect wicketkeeper
    if (player.role === 'Wicketkeeper' && !wicketKeeperId) {
      setWicketKeeperId(player._id);
    }
  };

  const removeFromXI = (player) => {
    setPlayingXI(prev => prev.filter(p => p._id !== player._id));
    setAvailableSquad(prev => [...prev, player]);
    if (captainId === player._id) setCaptainId(null);
    if (viceCaptainId === player._id) setViceCaptainId(null);
    if (wicketKeeperId === player._id) setWicketKeeperId(null);
    setSubmitFeedback(null);
  };

  const toggleSpecialRole = (playerId, role) => {
    if (role === 'C') {
      setCaptainId(prev => prev === playerId ? null : playerId);
      if (viceCaptainId === playerId) setViceCaptainId(null);
    } else if (role === 'VC') {
      setViceCaptainId(prev => prev === playerId ? null : playerId);
      if (captainId === playerId) setCaptainId(null);
    } else if (role === 'WK') {
      setWicketKeeperId(prev => prev === playerId ? null : playerId);
    }
  };

  const handleSubmitPlayingXI = async () => {
    if (playingXI.length !== 11) {
      setSubmitFeedback({ type: 'error', text: 'Please select exactly 11 players for your Playing XI.' });
      return;
    }

    const overseasCount = playingXI.filter(p => p.isOverseas).length;
    if (overseasCount > 4) {
      setSubmitFeedback({ type: 'error', text: `Too many overseas players (${overseasCount}/4). Maximum 4 permitted.` });
      return;
    }

    const hasWK = playingXI.some(p => p.role === 'Wicketkeeper') || wicketKeeperId !== null;
    if (!hasWK) {
      setSubmitFeedback({ type: 'error', text: 'Playing XI must contain at least 1 designated Wicketkeeper (WK).' });
      return;
    }

    const payloadXI = playingXI.map((p, idx) => ({
      player: p._id,
      position: idx + 1,
      isCaptain: captainId === p._id,
      isViceCaptain: viceCaptainId === p._id,
      isWicketkeeper: wicketKeeperId === p._id || p.role === 'Wicketkeeper'
    }));

    try {
      setSubmitLoading(true);
      setSubmitFeedback(null);
      const token = localStorage.getItem('auction_token');
      const res = await fetch(`/api/rooms/${roomId}/playing-xi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          teamId: selectedTeamId,
          playingXI: payloadXI
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to rate and save Playing XI');
      }

      setSubmitFeedback({ 
        type: 'success', 
        text: `Playing XI submitted successfully! Overall XI Rating: ★ ${(data.rating.compositeScore / 10).toFixed(1)} / 10` 
      });
      setXiRatingResult(data.rating);
      
      // Refresh room results to update Playing XI leaderboard tab
      fetchResults();
    } catch (err) {
      console.error('Submit XI Error:', err);
      setSubmitFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--broadcast-bg)] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Calculating Post-Auction Squad Analytics & Strengths..." />
      </div>
    );
  }

  if (error || !resultsData) {
    return (
      <div className="min-h-screen bg-[var(--broadcast-bg)] text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-black mb-2">Auction Results Unavailable</h2>
        <p className="text-[var(--text-muted)] max-w-md mb-6">{error || 'Could not load room ratings.'}</p>
        <Link to={`/room/${roomId}`} className="px-6 py-2.5 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition">
          Return to Room
        </Link>
      </div>
    );
  }

  const { champion, rankings = [], eligibleCount, ineligibleCount } = resultsData;
  const currentOverseasInXI = playingXI.filter(p => p.isOverseas).length;
  const currentBowlersInXI = playingXI.filter(p => ['Fast Bowler', 'Spinner', 'Spin Bowler', 'Bowler', 'All-Rounder'].includes(p.role)).length;
  const hasWicketkeeperInXI = playingXI.some(p => p.role === 'Wicketkeeper') || wicketKeeperId !== null;

  const auctioneerId = (roomData?.auctioneer?._id || roomData?.auctioneer)?.toString();
  const isAuctioneer = !!(auctioneerId && auctioneerId === currentUserId);
  const isAIRoom = !!roomData?.settings?.isAIRoom;
  const canViewAuctioneerLedger = true;

  const allTeams = roomData?.teams || [];
  const totalPlayersDrafted = allTeams.reduce((acc, t) => acc + (t.squadDetails?.length || 0), 0);
  const totalExpenditure = allTeams.reduce((acc, t) => acc + (t.purse?.spent || 0), 0);
  const totalRemainingPurse = allTeams.reduce((acc, t) => acc + (t.purse?.remaining || 0), 0);

  let highestBuy = null;
  allTeams.forEach(t => {
    (t.squadDetails || []).forEach(sd => {
      const p = sd.player || sd;
      const price = Number(sd.boughtFor ?? sd.price ?? 0);
      if (price > 0 && (!highestBuy || price > highestBuy.price)) {
        highestBuy = {
          playerName: p.name || 'Player',
          teamName: t.name,
          teamShortName: t.shortName,
          teamColor: t.primaryColor,
          price
        };
      }
    });
  });

  const displayedTeams = auctioneerFilterTeam === 'ALL'
    ? allTeams
    : allTeams.filter(t => t.shortName === auctioneerFilterTeam || t._id === auctioneerFilterTeam);

  // Radar chart data for champion or selected franchise
  const radarTeam = champion || rankings[0];
  const radarData = radarTeam ? [
    { subject: 'Batting', A: radarTeam.breakdown?.battingScore || 80, fullMark: 100 },
    { subject: 'Bowling', A: radarTeam.breakdown?.bowlingScore || 80, fullMark: 100 },
    { subject: 'Variety', A: radarTeam.breakdown?.varietyScore || 85, fullMark: 100 },
    { subject: 'Depth', A: radarTeam.breakdown?.depthScore || 75, fullMark: 100 },
    { subject: 'Purse Value', A: radarTeam.breakdown?.purseEfficiencyScore || 80, fullMark: 100 },
  ] : [];

  return (
    <div className="min-h-screen bg-[var(--broadcast-bg)] text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-[var(--broadcast-border)]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-full border border-yellow-500/20 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Official IPL Auction Conclusion
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-amber-600">
              Auction Complete & Squad Ratings
            </h1>
            <p className="text-sm md:text-base text-[var(--text-secondary)] mt-1">
              Room #{roomId} • {eligibleCount} Squads Eligible • {ineligibleCount} Ineligible (&lt; 18 Players)
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {roomData?.status === 'IN_PROGRESS' && (
              <Link
                to={`/room/${roomId}`}
                className="px-4 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-white border border-rose-500/30 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>Return to Live Arena</span>
              </Link>
            )}
            <Link 
              to={`/tournament/${roomId}`} 
              className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-400 hover:to-amber-500 text-black font-black text-xs rounded-xl shadow-lg shadow-yellow-500/20 hover:scale-105 transition-transform uppercase tracking-wider flex items-center gap-2"
            >
              <Flame className="w-4 h-4 fill-black" />
              <span>Simulate IPL Tournament</span>
            </Link>
            <Link
              to="/dashboard"
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Champion Showcase Banner */}
        {champion && champion.isEligible && (
          <div className="relative bg-gradient-to-br from-yellow-950/40 via-[var(--broadcast-card)] to-yellow-950/30 border border-yellow-500/30 rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl flex flex-col lg:flex-row items-center gap-8">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Trophy className="w-64 h-64 text-yellow-500" />
            </div>

            <div className="relative z-10 flex-shrink-0 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 text-yellow-400 text-xs font-bold tracking-widest uppercase mb-1">
                <Award className="w-4 h-4" /> Best Overall Auction Draft
              </div>
              <div className="text-4xl md:text-6xl font-display font-black text-white drop-shadow-md">
                {champion.teamName}
              </div>
              <div className="mt-3 inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-300 px-4 py-1.5 rounded-full border border-yellow-500/30 text-lg font-black">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span>Squad Rating: ★ {champion.rating10} / 10</span>
                <span className="text-xs text-yellow-200/80 font-normal">({champion.compositeScore}/100)</span>
              </div>
            </div>

            <div className="relative z-10 flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
              <div className="bg-black/50 border border-white/10 rounded-xl p-3.5">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Batting Power</div>
                <div className="text-2xl font-black text-blue-400">{champion.breakdown?.battingScore || 85}</div>
                <div className="w-full bg-gray-800 h-1.5 mt-2 rounded-full overflow-hidden">
                  <div className="bg-blue-400 h-full rounded-full" style={{ width: `${champion.breakdown?.battingScore || 85}%` }} />
                </div>
              </div>

              <div className="bg-black/50 border border-white/10 rounded-xl p-3.5">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Bowling Unit</div>
                <div className="text-2xl font-black text-red-400">{champion.breakdown?.bowlingScore || 82}</div>
                <div className="w-full bg-gray-800 h-1.5 mt-2 rounded-full overflow-hidden">
                  <div className="bg-red-400 h-full rounded-full" style={{ width: `${champion.breakdown?.bowlingScore || 82}%` }} />
                </div>
              </div>

              <div className="bg-black/50 border border-white/10 rounded-xl p-3.5">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Variety & Depth</div>
                <div className="text-2xl font-black text-amber-400">{champion.breakdown?.varietyScore || 88}</div>
                <div className="w-full bg-gray-800 h-1.5 mt-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: `${champion.breakdown?.varietyScore || 88}%` }} />
                </div>
              </div>

              <div className="bg-black/50 border border-white/10 rounded-xl p-3.5">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Squad Count</div>
                <div className="text-2xl font-black text-green-400">{champion.squadSize} / 25</div>
                <div className="text-[10px] text-green-300/80 mt-1">Eligible (≥ 18 Players)</div>
              </div>

              <div className="bg-black/50 border border-white/10 rounded-xl p-3.5 col-span-2 md:col-span-4 flex items-center gap-3">
                <Target className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <p className="text-xs text-gray-300 leading-relaxed">
                  <span className="text-yellow-400 font-bold">Draft Verdict: </span>
                  {champion.explanation || 'Constructed a remarkably balanced squad with high-calibre core match winners and strong bench depth across pace and spin departments.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--broadcast-border)] pb-2 overflow-x-auto">
          {canViewAuctioneerLedger && (
            <button
              onClick={() => setActiveTab('auctioneerSummary')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${
                activeTab === 'auctioneerSummary'
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-[var(--broadcast-surface)] text-[var(--text-secondary)] hover:text-white border border-[var(--broadcast-border)]'
              }`}
            >
              <Gavel className="w-4 h-4" />
              <span>Auctioneer Squads Summary</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('squadLeaderboard')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${
              activeTab === 'squadLeaderboard'
                ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                : 'bg-[var(--broadcast-surface)] text-[var(--text-secondary)] hover:text-white border border-[var(--broadcast-border)]'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Overall Squad Leaderboard</span>
          </button>

          {!isAuctioneer && (
            <button
              onClick={() => setActiveTab('playingXI')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${
                activeTab === 'playingXI'
                  ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                  : 'bg-[var(--broadcast-surface)] text-[var(--text-secondary)] hover:text-white border border-[var(--broadcast-border)]'
              }`}
            >
              <Swords className="w-4 h-4" />
              <span>Build & Rate Playing XI (11)</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('radarCompare')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${
              activeTab === 'radarCompare'
                ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                : 'bg-[var(--broadcast-surface)] text-[var(--text-secondary)] hover:text-white border border-[var(--broadcast-border)]'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Strengths Radar Comparison</span>
          </button>
        </div>

        {/* TAB AUCTIONEER: FULL SQUADS & PRICE BREAKDOWN */}
        {activeTab === 'auctioneerSummary' && (
          <div className="space-y-6 animate-fade-in">
            {/* Auctioneer Header Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[var(--broadcast-card)] to-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Gavel className="w-4 h-4" /> Auctioneer Official Post-Auction Ledger
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-black text-white">
                  Franchise Squad Rosters & Final Prices
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Comprehensive audit view: Every player acquired, purchase price, remaining purse, and team rosters.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs px-3.5 py-2 rounded-xl bg-black/50 border border-amber-500/30 text-amber-300 font-bold shrink-0">
                <span>Room #{roomId}</span>
                <span>•</span>
                <span>{allTeams.length} Franchises</span>
              </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[var(--broadcast-card)] border border-[var(--broadcast-border)] p-4 rounded-xl">
                <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Total Players Sold</p>
                <p className="text-2xl md:text-3xl font-black text-white mt-1">{totalPlayersDrafted}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Across {allTeams.length} franchises</p>
              </div>

              <div className="bg-[var(--broadcast-card)] border border-[var(--broadcast-border)] p-4 rounded-xl">
                <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Total Expenditure</p>
                <p className="text-2xl md:text-3xl font-black text-[var(--gold-primary)] mt-1">₹{totalExpenditure.toFixed(2)} Cr</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Total money spent</p>
              </div>

              <div className="bg-[var(--broadcast-card)] border border-[var(--broadcast-border)] p-4 rounded-xl">
                <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Purse Remaining</p>
                <p className="text-2xl md:text-3xl font-black text-emerald-400 mt-1">₹{totalRemainingPurse.toFixed(2)} Cr</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Unspent across teams</p>
              </div>

              <div className="bg-[var(--broadcast-card)] border border-[var(--broadcast-border)] p-4 rounded-xl">
                <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Highest Acquisition</p>
                {highestBuy ? (
                  <>
                    <p className="text-sm font-bold text-white mt-1 truncate" title={highestBuy.playerName}>{highestBuy.playerName}</p>
                    <p className="text-xs font-black text-amber-400">₹{highestBuy.price.toFixed(2)} Cr ({highestBuy.teamShortName})</p>
                  </>
                ) : (
                  <p className="text-sm text-[var(--text-muted)] mt-1">No buys recorded</p>
                )}
              </div>
            </div>

            {/* Franchise Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setAuctioneerFilterTeam('ALL')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  auctioneerFilterTeam === 'ALL'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'bg-[var(--broadcast-card)] text-[var(--text-muted)] hover:text-white border border-[var(--broadcast-border)]'
                }`}
              >
                All Franchises ({allTeams.length})
              </button>
              {allTeams.map(t => (
                <button
                  key={t._id || t.shortName}
                  onClick={() => setAuctioneerFilterTeam(t.shortName)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                    auctioneerFilterTeam === t.shortName
                      ? 'bg-white text-black shadow-md'
                      : 'bg-[var(--broadcast-card)] text-[var(--text-muted)] hover:text-white border border-[var(--broadcast-border)]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.primaryColor || '#f5a623' }}></span>
                  <span>{t.shortName}</span>
                  <span className="text-[10px] opacity-70">({t.squadDetails?.length || 0})</span>
                </button>
              ))}
            </div>

            {/* Team Breakdown Cards */}
            <div className="space-y-6">
              {displayedTeams.map(team => {
                const squad = team.squadDetails || [];
                const spent = team.purse?.spent ?? (team.purse?.initial - (team.purse?.remaining ?? 0));
                const remaining = team.purse?.remaining ?? 0;
                const ownerName = team.owner?.displayName || team.owner?.username || (team.isAI ? 'AI Franchise' : 'Unclaimed');

                return (
                  <div
                    key={team._id || team.shortName}
                    className="bg-[var(--broadcast-card)] border border-[var(--broadcast-border)] rounded-2xl overflow-hidden shadow-xl"
                  >
                    {/* Franchise Banner */}
                    <div className="p-4 md:p-5 border-b border-[var(--broadcast-border)] bg-white/[0.02] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center font-display font-black text-sm shadow-md"
                          style={{ backgroundColor: (team.primaryColor || '#f5a623') + '30', color: team.primaryColor || '#f5a623', border: `1px solid ${team.primaryColor || '#f5a623'}50` }}
                        >
                          {team.shortName}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-lg font-bold text-white">{team.name}</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ backgroundColor: (team.primaryColor || '#f5a623') + '25', color: team.primaryColor || '#f5a623' }}>
                              {team.shortName}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            Manager: <span className="text-gray-300 font-semibold">{ownerName}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4 text-xs font-semibold self-stretch sm:self-auto justify-between sm:justify-end bg-[var(--broadcast-surface)] px-3 py-2 rounded-xl border border-[var(--broadcast-border)]">
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] block uppercase">Spent</span>
                          <span className="text-[var(--gold-primary)] font-bold">₹{Number(spent).toFixed(2)} Cr</span>
                        </div>
                        <div className="w-[1px] h-6 bg-[var(--broadcast-border)]"></div>
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] block uppercase">Remaining</span>
                          <span className="text-emerald-400 font-bold">₹{Number(remaining).toFixed(2)} Cr</span>
                        </div>
                        <div className="w-[1px] h-6 bg-[var(--broadcast-border)]"></div>
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] block uppercase">Squad</span>
                          <span className="text-white font-bold">{squad.length}/{roomData.settings?.squadSize || 25}</span>
                        </div>
                        <div className="w-[1px] h-6 bg-[var(--broadcast-border)]"></div>
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] block uppercase">Overseas</span>
                          <span className="text-blue-400 font-bold">{team.overseas || 0}/{roomData.settings?.overseasLimit || 8}</span>
                        </div>
                      </div>
                    </div>

                    {/* Squad Players Table */}
                    {squad.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                        No players acquired by this franchise during the auction.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-black/40 text-[var(--text-muted)] text-[10px] uppercase tracking-wider border-b border-[var(--broadcast-border)]">
                            <tr>
                              <th className="p-3 pl-4">#</th>
                              <th className="p-3">Player</th>
                              <th className="p-3">Role</th>
                              <th className="p-3">Country</th>
                              <th className="p-3 text-center">Rating</th>
                              <th className="p-3 text-right pr-4">Price Paid</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--broadcast-border)] text-xs">
                            {squad.map((item, idx) => {
                              const p = item.player || item;
                              const price = Number(item.boughtFor ?? item.price ?? p.basePrice ?? 0);
                              const rawRating = typeof p.rating === 'object' ? (p.rating?.overall ?? 8.5) : (p.rating ?? 8.5);
                              const rating10 = Number(rawRating) > 10 ? (Number(rawRating) / 10).toFixed(1) : Number(rawRating).toFixed(1);

                              return (
                                <tr key={p._id || idx} className="hover:bg-white/[0.02] transition">
                                  <td className="p-3 pl-4 text-[var(--text-muted)] font-mono text-[11px]">{idx + 1}</td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-white">{p.name || 'Unknown Player'}</span>
                                      {p.isOverseas && (
                                        <span className="text-[10px] text-blue-400 font-bold" title="Overseas Player">✈</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-white/5 text-gray-300">
                                      {p.role || 'Player'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-gray-400">{p.country || 'India'}</td>
                                  <td className="p-3 text-center text-yellow-400 font-bold">★ {rating10}</td>
                                  <td className="p-3 pr-4 text-right">
                                    <span className="font-display font-black text-xs md:text-sm text-[var(--gold-primary)] px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                                      ₹{Number(price).toFixed(2)} Cr
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 1: SQUAD LEADERBOARD */}
        {activeTab === 'squadLeaderboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* Ineligible Rule Notice */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/90 leading-relaxed">
                <span className="font-bold text-amber-300">IPL Rule Enforced: </span>
                Franchises must finish with at least <span className="underline font-bold">18 players</span> in their squad.
                Teams with fewer than 18 players are marked as <span className="font-bold text-red-400">Ineligible for Squad Comparison</span>, ranked at the bottom, and disqualified from winning the Draft Trophy.
              </div>
            </div>

            {/* Complete Franchise Leaderboard Table */}
            <div className="bg-[var(--broadcast-card)] border border-[var(--broadcast-border)] rounded-2xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-[var(--broadcast-border)] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold uppercase tracking-wider text-white">
                    Official Squad Comparison Leaderboard
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Ranked by Batting (35%), Bowling (35%), Variety (15%), Depth (10%), and Purse Efficiency (5%)
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-black/50 text-[var(--text-muted)] text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Rank</th>
                      <th className="p-4">Franchise</th>
                      <th className="p-4 text-center">Eligibility</th>
                      <th className="p-4 text-center">Rating</th>
                      <th className="p-4 text-center">Batting</th>
                      <th className="p-4 text-center">Bowling</th>
                      <th className="p-4 text-center">Variety</th>
                      <th className="p-4 text-center">Squad Size</th>
                      <th className="p-4 text-right">Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--broadcast-border)] text-sm">
                    {rankings.map((team, idx) => {
                      const isEligible = team.isEligible;
                      return (
                        <tr 
                          key={team.teamId || idx} 
                          className={`hover:bg-white/5 transition-colors ${!isEligible ? 'bg-red-950/10' : ''}`}
                        >
                          <td className="p-4 font-bold text-base">
                            {isEligible ? (
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                                team.rank === 1 ? 'bg-yellow-500 text-black' :
                                team.rank === 2 ? 'bg-gray-300 text-black' :
                                team.rank === 3 ? 'bg-amber-700 text-white' :
                                'bg-gray-800 text-gray-300'
                              }`}>
                                #{team.rank}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                Ineligible
                              </span>
                            )}
                          </td>

                          <td className="p-4">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span 
                                className="w-3 h-3 rounded-full shrink-0" 
                                style={{ backgroundColor: team.primaryColor || '#f5a623' }}
                              />
                              <span>{team.teamName}</span>
                              {allTeams.find(t => t.shortName === team.teamShortName || t.name === team.teamName || t._id === team.teamId)?.isAI && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                  AI
                                </span>
                              )}
                              {team.rank === 1 && isEligible && (
                                <Trophy className="w-4 h-4 text-yellow-400 shrink-0 inline" />
                              )}
                            </div>
                            <div className="text-xs text-[var(--text-muted)] mt-0.5">
                              {team.explanation}
                            </div>
                          </td>

                          <td className="p-4 text-center">
                            {isEligible ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-400 font-bold bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Eligible
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full" title={team.ineligibleReason}>
                                <XCircle className="w-3.5 h-3.5" /> &lt; 18 Players
                              </span>
                            )}
                          </td>

                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 font-black px-3 py-1 rounded-lg border text-sm ${
                              isEligible 
                                ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400' 
                                : 'bg-gray-800 border-gray-700 text-gray-500 line-through'
                            }`}>
                              ★ {team.rating10}
                            </span>
                          </td>

                          <td className="p-4 text-center font-semibold text-blue-400">
                            {team.breakdown?.battingScore || '-'}
                          </td>

                          <td className="p-4 text-center font-semibold text-red-400">
                            {team.breakdown?.bowlingScore || '-'}
                          </td>

                          <td className="p-4 text-center font-semibold text-amber-400">
                            {team.breakdown?.varietyScore || '-'}
                          </td>

                          <td className="p-4 text-center font-mono">
                            <span className={team.squadSize < (team.minSquad || 18) ? 'text-red-400 font-bold' : 'text-gray-300'}>
                              {team.squadSize} / 25
                            </span>
                          </td>

                          <td className="p-4 text-right font-mono text-gray-300">
                            ₹{(team.purseSpent || 0).toFixed(2)} Cr
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PLAYING XI BUILDER & RATING */}
        {activeTab === 'playingXI' && (
          <div className="space-y-6 animate-fade-in">
            {/* Team Selector & Header Controls */}
            <div className="bg-[var(--broadcast-card)] border border-[var(--broadcast-border)] rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Select Franchise:
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => handleTeamChange(e.target.value)}
                  className="bg-[var(--broadcast-surface)] border border-[var(--broadcast-border)] text-white text-sm font-bold rounded-xl px-4 py-2 outline-none focus:border-yellow-500"
                >
                  {(roomData?.teams || []).map(t => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.squadDetails?.length || 0} players)
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Validation Chips */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 ${
                  playingXI.length === 11 
                    ? 'bg-green-500/20 border-green-500/40 text-green-400' 
                    : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                }`}>
                  Squad: {playingXI.length} / 11
                </span>

                <span className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 ${
                  currentOverseasInXI <= 4 
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' 
                    : 'bg-red-500/20 border-red-500/40 text-red-400'
                }`}>
                  Overseas: {currentOverseasInXI} / 4
                </span>

                <span className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 ${
                  hasWicketkeeperInXI 
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                    : 'bg-red-500/20 border-red-500/40 text-red-400'
                }`}>
                  Keeper (WK): {hasWicketkeeperInXI ? 'Selected' : 'Required'}
                </span>

                <span className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 ${
                  currentBowlersInXI >= 5 
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' 
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                }`}>
                  Bowlers: {currentBowlersInXI} / 5+
                </span>
              </div>

              <button
                onClick={handleSubmitPlayingXI}
                disabled={playingXI.length !== 11 || submitLoading}
                className="w-full md:w-auto px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-black text-sm rounded-xl transition shadow-lg shadow-green-950/40 flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
              >
                {submitLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Award className="w-4 h-4" />
                    <span>Submit & Rate Playing XI</span>
                  </>
                )}
              </button>
            </div>

            {/* Feedback Message */}
            {submitFeedback && (
              <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold ${
                submitFeedback.type === 'success' 
                  ? 'bg-green-500/20 border-green-500/40 text-green-300' 
                  : 'bg-red-500/20 border-red-500/40 text-red-300'
              }`}>
                {submitFeedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                <span>{submitFeedback.text}</span>
              </div>
            )}

            {/* Playing XI Rating Results Banner */}
            {xiRatingResult && (
              <div className="bg-gradient-to-r from-purple-950/40 via-[var(--broadcast-card)] to-indigo-950/40 border border-purple-500/30 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-purple-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Playing XI Strength Evaluation
                    </div>
                    <h4 className="text-2xl font-black text-white mt-1">
                      Lineup Rating: ★ {(xiRatingResult.compositeScore / 10).toFixed(1)} / 10
                    </h4>
                    <p className="text-xs text-gray-300 mt-0.5">
                      {xiRatingResult.analysis || 'Dynamic match-day lineup evaluated across top order, middle finishers, bowling attack, and balance.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-black/50 border border-white/10 px-4 py-2 rounded-xl text-center">
                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Top Order (1-3)</div>
                      <div className="text-lg font-black text-blue-400">
                        {xiRatingResult.breakdown?.topOrderScore || xiRatingResult.topOrderScore || 85}
                      </div>
                    </div>

                    <div className="bg-black/50 border border-white/10 px-4 py-2 rounded-xl text-center">
                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Middle Order (4-7)</div>
                      <div className="text-lg font-black text-yellow-400">
                        {xiRatingResult.breakdown?.middleOrderScore || xiRatingResult.middleOrderScore || 85}
                      </div>
                    </div>

                    <div className="bg-black/50 border border-white/10 px-4 py-2 rounded-xl text-center">
                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Bowling Unit (8-11)</div>
                      <div className="text-lg font-black text-red-400">
                        {xiRatingResult.breakdown?.bowlingScore || xiRatingResult.bowlingScore || 85}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pitch + Bench Dual Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Pitch Display (Left / 7 cols) */}
              <div className="lg:col-span-7 bg-gradient-to-b from-[#1b3b22] to-[#0c1f11] rounded-2xl border border-green-500/20 p-5 shadow-2xl relative flex flex-col">
                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                  <div>
                    <h4 className="font-display font-black text-sm uppercase tracking-widest text-green-300">
                      Match Day 11 (Batting Order)
                    </h4>
                    <p className="text-[11px] text-green-200/60">Designate C (Captain), VC (Vice Captain), and WK (Wicketkeeper)</p>
                  </div>
                  <span className="text-xs font-bold text-green-400 bg-black/40 px-2.5 py-1 rounded-full border border-green-500/20">
                    {playingXI.length}/11 Selected
                  </span>
                </div>

                {/* Slots 1 to 11 */}
                <div className="space-y-2 flex-1">
                  {playingXI.map((player, index) => {
                    const isC = captainId === player._id;
                    const isVC = viceCaptainId === player._id;
                    const isWK = wicketKeeperId === player._id || player.role === 'Wicketkeeper';

                    return (
                      <div 
                        key={player._id} 
                        className="bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-3 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 font-black text-xs flex items-center justify-center shrink-0 border border-green-500/30">
                            {index + 1}
                          </span>
                          <div className="truncate">
                            <div className="font-bold text-white text-sm flex items-center gap-1.5 truncate">
                              <span>{player.name}</span>
                              {player.isOverseas && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
                                  OS
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 flex items-center gap-2">
                              <span>{player.role}</span>
                              <span>•</span>
                              <span className="text-yellow-400 font-bold">★ {player.rating10}</span>
                            </div>
                          </div>
                        </div>

                        {/* Special Role Toggles */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleSpecialRole(player._id, 'C')}
                            className={`px-2 py-1 rounded text-xs font-black transition border ${
                              isC 
                                ? 'bg-yellow-500 border-yellow-400 text-black shadow-md' 
                                : 'border-gray-700 text-gray-500 hover:text-white'
                            }`}
                            title="Captain"
                          >
                            C
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleSpecialRole(player._id, 'VC')}
                            className={`px-2 py-1 rounded text-xs font-black transition border ${
                              isVC 
                                ? 'bg-blue-500 border-blue-400 text-white shadow-md' 
                                : 'border-gray-700 text-gray-500 hover:text-white'
                            }`}
                            title="Vice Captain"
                          >
                            VC
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleSpecialRole(player._id, 'WK')}
                            className={`px-2 py-1 rounded text-xs font-black transition border ${
                              isWK 
                                ? 'bg-amber-500 border-amber-400 text-black shadow-md' 
                                : 'border-gray-700 text-gray-500 hover:text-white'
                            }`}
                            title="Wicketkeeper"
                          >
                            WK
                          </button>

                          <button
                            type="button"
                            onClick={() => removeFromXI(player)}
                            className="p-1 text-red-400 hover:text-red-300 ml-1 rounded hover:bg-red-500/10"
                            title="Remove from XI"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Remaining Empty Slots */}
                  {Array.from({ length: Math.max(0, 11 - playingXI.length) }).map((_, i) => (
                    <div 
                      key={`empty-slot-${i}`}
                      className="border border-dashed border-white/15 rounded-xl p-3 flex items-center justify-center text-xs text-white/30 bg-black/20"
                    >
                      Empty Position #{playingXI.length + i + 1}
                    </div>
                  ))}
                </div>
              </div>

              {/* Squad Bench (Right / 5 cols) */}
              <div className="lg:col-span-5 bg-[var(--broadcast-card)] border border-[var(--broadcast-border)] rounded-2xl p-5 flex flex-col h-[650px]">
                <div className="flex items-center justify-between border-b border-[var(--broadcast-border)] pb-3 mb-3">
                  <h4 className="font-bold uppercase tracking-wider text-sm text-white">
                    Squad Bench
                  </h4>
                  <span className="text-xs text-[var(--text-muted)]">
                    {availableSquad.length} Players Available
                  </span>
                </div>

                <div className="overflow-y-auto space-y-2 flex-1 pr-1 custom-scrollbar">
                  {availableSquad.length === 0 ? (
                    <div className="text-center text-xs text-[var(--text-muted)] py-12">
                      All squad members assigned to Playing XI.
                    </div>
                  ) : (
                    availableSquad.map(player => (
                      <div
                        key={player._id}
                        className="bg-[var(--broadcast-surface)] border border-[var(--broadcast-border)] hover:border-yellow-500/40 rounded-xl p-2.5 flex items-center justify-between gap-3 transition"
                      >
                        <div className="truncate">
                          <div className="font-bold text-white text-sm flex items-center gap-1.5 truncate">
                            <span>{player.name}</span>
                            {player.isOverseas && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
                                OS
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2">
                            <span>{player.role}</span>
                            <span>•</span>
                            <span className="text-yellow-400 font-bold">★ {player.rating10}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => addToXI(player)}
                          disabled={playingXI.length >= 11}
                          className="px-2.5 py-1.5 bg-yellow-500/20 hover:bg-yellow-500 hover:text-black text-yellow-400 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-yellow-500/30 disabled:opacity-30 disabled:pointer-events-none shrink-0"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Add
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: RADAR COMPARISON */}
        {activeTab === 'radarCompare' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <div className="bg-[var(--broadcast-card)] border border-[var(--broadcast-border)] rounded-2xl p-6 flex flex-col items-center">
              <h4 className="font-bold text-base uppercase tracking-wider text-white mb-4">
                Franchise Profile: {champion?.teamName || 'Champion'}
              </h4>
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#333" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar 
                      name={champion?.teamName || 'Champion'} 
                      dataKey="A" 
                      stroke="#facc15" 
                      fill="#facc15" 
                      fillOpacity={0.3} 
                    />
                    <Tooltip contentStyle={{ backgroundColor: '#141724', border: '1px solid #333', borderRadius: '8px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[var(--broadcast-card)] border border-[var(--broadcast-border)] rounded-2xl p-6 flex flex-col justify-center space-y-4">
              <h4 className="font-bold text-base uppercase tracking-wider text-yellow-400">
                How Squad Strength is Calculated
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                The overall squad score is an algorithmic compilation of each team's depth and skill distribution:
              </p>
              <ul className="text-xs space-y-2 text-[var(--text-muted)]">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-400">• Top 7 Batting Power (35%):</span>
                  Considers career IPL runs, strike rates, clutch boundary percentages, and career milestones.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-red-400">• Top 6 Bowling Unit (35%):</span>
                  Evaluates wickets, economy rates under pressure, death over dot ball execution, and bowling average.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-400">• Attack Variety & Pace/Spin Balance (15%):</span>
                  Rewards balanced combinations of genuine fast bowlers, spinners, and all-rounders.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-green-400">• Bench Depth & Purse Efficiency (15%):</span>
                  Rewards squad fullness and value-per-crore acquisitions.
                </li>
              </ul>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
