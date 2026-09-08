import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useRoomStore from '../store/roomStore';
import useAuctionStore from '../store/auctionStore';
import socketService from '../services/socketService';
import { 
  Gavel, Pause, Play, Users, MessageSquare, AlertCircle, LogOut, 
  Shield, Radio, Hash, Send, ChevronDown, ChevronUp, Search, 
  Layers, CheckCircle, XCircle, Sparkles, Trophy, Clock, Flame, Award, Zap
} from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function LiveAuction() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { fetchRoom } = useRoomStore();
  
  const {
    room, currentPlayer, currentBid, highestBidder, nextMinBid,
    timer, bids, auctionStatus, soldData, unsoldData, bidRejectedMsg,
    chatMessages, setConnected, initAuctionState,
    onPlayerNominated, onBidUpdate, onBidRejected, onTimerUpdate,
    onPlayerSold, onPlayerUnsold, onChatMessage, onWaitingNomination, setRoom
  } = useAuctionStore();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState('franchises'); // For desktop right column: 'franchises' | 'feed' | 'pool'
  const [mobileTab, setMobileTab] = useState('feed'); // For mobile bottom section: 'feed' | 'franchises' | 'pool' | 'strength' | 'stats'
  const [chatInput, setChatInput] = useState('');
  const [expandedTeams, setExpandedTeams] = useState({});
  const [poolSearch, setPoolSearch] = useState('');
  const [poolRoleFilter, setPoolRoleFilter] = useState('ALL');
  const [allPlayersPool, setAllPlayersPool] = useState([]);
  const [nominateSearch, setNominateSearch] = useState('');
  const [nominateRoleFilter, setNominateRoleFilter] = useState('ALL');
  const [nominatingPlayerId, setNominatingPlayerId] = useState(null);
  const [selectedStrengthTeamId, setSelectedStrengthTeamId] = useState(null);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [isEndingAuction, setIsEndingAuction] = useState(false);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [bidErrorToast, setBidErrorToast] = useState(null);
  
  const messagesEndRef = useRef(null);

  // Sync rejected bid messages and clear bid spinner
  useEffect(() => {
    if (bidRejectedMsg) {
      setBidErrorToast(bidRejectedMsg);
      setIsPlacingBid(false);
      const timer = setTimeout(() => setBidErrorToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [bidRejectedMsg]);

  // Clear bidding loading state whenever bid or bidder updates
  useEffect(() => {
    setIsPlacingBid(false);
  }, [currentBid, highestBidder]);

  // Smooth continuous local timer countdown (immune to network packet latency)
  const [localTimer, setLocalTimer] = useState(timer || 15);
  const targetEndTimeRef = useRef(Date.now() + (timer || 15) * 1000);

  useEffect(() => {
    setLocalTimer(timer);
    targetEndTimeRef.current = Date.now() + timer * 1000;
  }, [timer]);

  useEffect(() => {
    if (auctionStatus !== 'BIDDING') return;
    const interval = setInterval(() => {
      const remainingSec = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
      setLocalTimer(remainingSec);
    }, 1000);
    return () => clearInterval(interval);
  }, [auctionStatus]);

  const formatRating = (rating) => {
    if (!rating) return '8.5';
    const val = typeof rating === 'object' ? (rating.overall ?? 8.5) : rating;
    const num = Number(val);
    if (isNaN(num)) return '8.5';
    return num > 10 ? (num / 10).toFixed(1) : num.toFixed(1);
  };

  // Initialize room data
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const roomData = await fetchRoom(roomId);
        setRoom(roomData);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load room:', err);
        setLoadError(err.message || 'Room not found');
        setIsLoading(false);
      }
    };
    initialize();
  }, [roomId, fetchRoom, setRoom]);

  // Connect socket
  useEffect(() => {
    if (!room) return;
    
    socketService.connect(roomId, {
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
      onAuctionState: (data) => initAuctionState(data),
      onPlayerNominated,
      onBidUpdate,
      onBidRejected,
      onTimerUpdate,
      onPlayerSold,
      onPlayerUnsold,
      onChatMessage,
      onWaitingNomination: (data) => onWaitingNomination?.(data),
      onAuctionCompleted: () => {
        navigate(`/room/${roomId}/results`);
      }
    });

    return () => socketService.disconnect();
  }, [room, roomId, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, mobileTab, activeTab]);

  // Pre-load current player pool from room if available
  useEffect(() => {
    if (Array.isArray(room?.auction?.playerPool)) {
      setAllPlayersPool(room.auction.playerPool.filter(p => typeof p === 'object' && p !== null));
    }
  }, [room?.auction?.playerPool]);

  // Determine current user role & team
  const currentUserId = (user?._id || user?.id)?.toString();
  const auctioneerId = (room?.auctioneer?._id || room?.auctioneer)?.toString();
  const isAuctioneer = !!(auctioneerId && auctioneerId === currentUserId);
  const auctioneerUser = typeof room?.auctioneer === 'object' ? room.auctioneer : null;
  const isAdmin = (room?.admin?._id || room?.admin)?.toString() === currentUserId;

  let myTeam = null;
  if (room && user) {
    myTeam = room.teams?.find(t => {
      const ownerId = (t.owner?._id || t.owner)?.toString();
      return ownerId && ownerId === currentUserId;
    });

    if (!myTeam) {
      const myParticipant = room.participants?.find(p => {
        const pUserId = (p.user?._id || p.user)?.toString();
        return pUserId && pUserId === currentUserId;
      });
      if (myParticipant && myParticipant.teamIndex >= 0 && room?.teams?.[myParticipant.teamIndex]) {
        myTeam = room.teams[myParticipant.teamIndex];
      }
    }

    if (!myTeam && isAdmin && room?.teams?.length > 0) {
      myTeam = room.teams.find(t => !t.isAI) || room.teams[0];
    }
  }

  // Active team for squad strength display
  const activeStrengthTeam = useMemo(() => {
    if (selectedStrengthTeamId) {
      const found = room?.teams?.find(t => (t?._id || t?.id)?.toString() === selectedStrengthTeamId?.toString());
      if (found) return found;
    }
    return myTeam || room?.teams?.[0] || null;
  }, [selectedStrengthTeamId, room, myTeam]);

  // Real-time Squad Strength Calculator (Batting, Bowling, Fielding, Overall)
  const squadStrength = useMemo(() => {
    if (!activeStrengthTeam) {
      return { count: 0, batting: 0, bowling: 0, fielding: 0, overall: 0, batters: 0, bowlers: 0, wks: 0, allRounders: 0, overseas: 0 };
    }

    const squadDetails = activeStrengthTeam.squadDetails || [];
    const squad = activeStrengthTeam.squad || [];

    const resolvePlayer = (item) => {
      if (!item) return null;
      if (typeof item === 'object' && item.name) return item;
      const id = (typeof item === 'object' ? (item._id || item.id) : item)?.toString();
      if (!id) return null;
      return (
        allPlayersPool.find(p => (p?._id || p?.id)?.toString() === id) ||
        (Array.isArray(room?.auction?.playerPool) && room.auction.playerPool.find(p => typeof p === 'object' && (p?._id || p?.id)?.toString() === id)) ||
        null
      );
    };

    const players = [];
    if (squadDetails.length > 0) {
      squadDetails.forEach(sd => {
        const p = sd.player || sd;
        const resolved = resolvePlayer(p);
        if (resolved) players.push(resolved);
      });
    } else if (squad.length > 0) {
      squad.forEach(sq => {
        const resolved = resolvePlayer(sq);
        if (resolved) players.push(resolved);
      });
    }

    if (players.length === 0) {
      return { count: 0, batting: 0, bowling: 0, fielding: 0, overall: 0, batters: 0, bowlers: 0, wks: 0, allRounders: 0, overseas: 0 };
    }

    let batters = 0, bowlers = 0, wks = 0, allRounders = 0, overseas = 0;

    const getRating = (p) => {
      if (!p) return { ovr: 75, bat: 75, bowl: 75, field: 75 };
      const r = p.rating || {};
      const role = p.role || 'Batter';
      let ovr = 75, bat = 75, bowl = 75, field = 75;

      if (typeof r === 'object' && r !== null) {
        ovr = Number(r.overall ?? 75);
        bat = Number(r.batting ?? ovr);
        bowl = Number(r.bowling ?? ovr);
        field = Number(r.fielding ?? ovr);
      } else if (typeof r === 'number') {
        ovr = r;
        bat = role === 'Batter' || role === 'All-Rounder' ? r : Math.max(30, r - 30);
        bowl = role === 'Bowler' || role === 'Fast Bowler' || role === 'Spinner' || role === 'Spin Bowler' || role === 'All-Rounder' ? r : Math.max(30, r - 35);
        field = r;
      }
      return {
        ovr: isNaN(ovr) ? 75 : ovr,
        bat: isNaN(bat) ? 75 : bat,
        bowl: isNaN(bowl) ? 75 : bowl,
        field: isNaN(field) ? 75 : field
      };
    };

    players.forEach(p => {
      if (p.isOverseas) overseas++;
      const role = p.role || 'Batter';
      if (role === 'Wicketkeeper' || role === 'Wicket-Keeper' || role === 'WK') wks++;
      else if (role === 'All-Rounder' || role === 'All Rounder') allRounders++;
      else if (role === 'Bowler' || role === 'Fast Bowler' || role === 'Spinner' || role === 'Spin Bowler') bowlers++;
      else batters++;
    });

    const batScores = players.map(p => getRating(p).bat).sort((a, b) => b - a);
    const topBat = batScores.slice(0, Math.min(7, batScores.length));
    const batting = topBat.length > 0 ? Math.round(topBat.reduce((a, b) => a + b, 0) / topBat.length) : 0;

    const bowlScores = players.map(p => getRating(p).bowl).sort((a, b) => b - a);
    const topBowl = bowlScores.slice(0, Math.min(6, bowlScores.length));
    const bowling = topBowl.length > 0 ? Math.round(topBowl.reduce((a, b) => a + b, 0) / topBowl.length) : 0;

    const fieldScores = players.map(p => getRating(p).field);
    const fielding = fieldScores.length > 0 ? Math.round(fieldScores.reduce((a, b) => a + b, 0) / fieldScores.length) : 0;

    const overall = (batting > 0 || bowling > 0)
      ? Math.min(99, Math.max(0, Math.round((batting * 0.4) + (bowling * 0.4) + (fielding * 0.2))))
      : 0;

    return {
      count: players.length,
      batting,
      bowling,
      fielding,
      overall,
      batters,
      bowlers,
      wks,
      allRounders,
      overseas
    };
  }, [activeStrengthTeam, allPlayersPool, room]);

  // Bidding Action
  const handleBid = useCallback((amount) => {
    if (isAuctioneer) return;
    if (!myTeam) {
      onBidRejected({ reason: 'No team assigned to place bids' });
      return;
    }
    if (auctionStatus !== 'BIDDING' && auctionStatus !== 'IN_PROGRESS') {
      onBidRejected({ reason: 'Auction is not actively accepting bids' });
      return;
    }

    // Immediate mobile haptic feedback
    try {
      if (typeof window !== 'undefined' && window.navigator?.vibrate) {
        window.navigator.vibrate(25);
      }
    } catch {}

    setIsPlacingBid(true);
    setBidErrorToast(null);
    socketService.placeBid(myTeam._id, amount);
  }, [isAuctioneer, myTeam, auctionStatus, onBidRejected]);

  // Send Chat Message
  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socketService.sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  const toggleTeamExpand = (teamId) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  // End Auction handler (Host / Admin or forced from Quit modal)
  const handleEndAuction = async () => {
    setIsEndingAuction(true);
    try {
      socketService.endAuction();
      const token = localStorage.getItem('auction_token');
      await fetch(`/api/rooms/${roomId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      }).catch(() => {});
      setShowQuitModal(false);
      navigate(`/room/${roomId}/results`);
    } catch (err) {
      console.error('Failed to end auction:', err);
      navigate(`/room/${roomId}/results`);
    } finally {
      setIsEndingAuction(false);
    }
  };

  // Next bid increment calculations & price resolution
  const currentBidAmount = typeof currentBid === 'object' 
    ? (Number(currentBid?.amount) || 0) 
    : (Number(currentBid) || 0);

  const displayBidPrice = currentBidAmount > 0 
    ? currentBidAmount 
    : (currentPlayer?.basePrice || 2.0);

  const nextBid = nextMinBid && nextMinBid > displayBidPrice
    ? nextMinBid
    : parseFloat((displayBidPrice + (room?.settings?.bidIncrement || 0.25)).toFixed(2));

  const highestBidderId = (highestBidder?._id || highestBidder?.teamId || highestBidder?.id)?.toString();
  const myTeamId = (myTeam?._id || myTeam?.id)?.toString();
  const isLeading = !!(highestBidderId && myTeamId && highestBidderId === myTeamId);
  const canBid = !isAuctioneer && !isLeading && auctionStatus === 'BIDDING' && (myTeam?.purse?.remaining || 0) >= nextBid;
  const isPending = auctionStatus !== 'BIDDING' && auctionStatus !== 'IN_PROGRESS';

  // Pool list for drawer and nominations
  const poolList = useMemo(() => {
    if (room?.auction?.playerPool && room.auction.playerPool.length > 0) {
      return room.auction.playerPool;
    }
    return allPlayersPool;
  }, [room?.auction?.playerPool, allPlayersPool]);

  // Filtered pool based on user search and role tabs
  const filteredPool = useMemo(() => {
    return poolList.filter(player => {
      const matchesSearch = !poolSearch || 
        player.name?.toLowerCase().includes(poolSearch.toLowerCase()) || 
        (player.country && player.country.toLowerCase().includes(poolSearch.toLowerCase()));
      
      let matchesRole = true;
      if (poolRoleFilter !== 'ALL') {
        const roleUpper = (player.role || '').toUpperCase();
        if (poolRoleFilter === 'BOWLER') {
          matchesRole = roleUpper.includes('BOWLER');
        } else if (poolRoleFilter === 'BATTER') {
          matchesRole = roleUpper.includes('BATTER') || roleUpper.includes('BATSMAN');
        } else if (poolRoleFilter === 'ALL-ROUNDER') {
          matchesRole = roleUpper.includes('ALL-ROUNDER') || roleUpper.includes('ALLROUNDER');
        } else if (poolRoleFilter === 'WICKETKEEPER' || poolRoleFilter === 'WK') {
          matchesRole = roleUpper.includes('WICKETKEEPER') || roleUpper === 'WK' || !!player.isWicketkeeper;
        } else {
          matchesRole = roleUpper === poolRoleFilter;
        }
      }
      return matchesSearch && matchesRole;
    });
  }, [poolList, poolSearch, poolRoleFilter]);

  // Set of sold player IDs
  const soldSet = useMemo(() => {
    const sold = room?.auction?.soldPlayers || [];
    const set = new Set();
    sold.forEach(p => {
      const id = (p?._id || p)?.toString();
      if (id) set.add(id);
    });
    return set;
  }, [room?.auction?.soldPlayers]);

  // Remaining uncalled players available for nomination by auctioneer
  const availableForNomination = useMemo(() => {
    return poolList.filter(player => {
      const pId = (player._id || player.id)?.toString();
      if (!pId) return false;
      if (soldSet.has(pId)) return false;
      if (currentPlayer && (currentPlayer._id || currentPlayer)?.toString() === pId) return false;

      const matchesSearch = !nominateSearch || 
        player.name?.toLowerCase().includes(nominateSearch.toLowerCase()) || 
        (player.country && player.country.toLowerCase().includes(nominateSearch.toLowerCase()));

      let matchesRole = true;
      if (nominateRoleFilter !== 'ALL') {
        const roleUpper = (player.role || '').toUpperCase();
        if (nominateRoleFilter === 'BOWLER') {
          matchesRole = roleUpper.includes('BOWLER');
        } else if (nominateRoleFilter === 'BATTER') {
          matchesRole = roleUpper.includes('BATTER') || roleUpper.includes('BATSMAN');
        } else if (nominateRoleFilter === 'ALL-ROUNDER') {
          matchesRole = roleUpper.includes('ALL-ROUNDER') || roleUpper.includes('ALLROUNDER');
        } else if (nominateRoleFilter === 'WICKETKEEPER' || nominateRoleFilter === 'WK') {
          matchesRole = roleUpper.includes('WICKETKEEPER') || roleUpper === 'WK' || !!player.isWicketkeeper;
        } else {
          matchesRole = roleUpper === nominateRoleFilter;
        }
      }
      return matchesSearch && matchesRole;
    });
  }, [poolList, soldSet, currentPlayer, nominateSearch, nominateRoleFilter]);

  const handleNominatePlayer = (playerId) => {
    if (!playerId) return;
    setNominatingPlayerId(playerId);
    socketService.nominatePlayer(playerId);
    setTimeout(() => {
      setNominatingPlayerId(null);
    }, 1500);
  };

  // Loading and Error Guards
  if (isLoading) return <LoadingSpinner size="lg" text="Entering Live Auction Broadcast Arena..." />;
  
  if (!room || loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--broadcast-bg)] text-white p-6 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-rose-500/15 border border-rose-500/30 text-rose-400 mb-4 shadow-xl">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="font-display text-2xl font-bold mb-2 text-white">Auction Room Not Found</h2>
        <p className="text-xs text-[var(--text-muted)] max-w-sm mb-6 leading-relaxed">
          The auction room you are trying to access ({roomId}) does not exist or may have been deleted.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => navigate('/my-auctions')}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[var(--gold-primary)] text-black transition hover:opacity-90 shadow-md"
          >
            My Auctions
          </button>
        </div>
      </div>
    );
  }

  const isTimerCritical = localTimer <= 3 && localTimer > 0;

  // =========================================================================
  // REUSABLE TAB RENDERERS: Franchises, Live Chat, Pool, Squad Strength, Stats
  // =========================================================================

  const renderFranchisesTab = () => (
    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar min-h-0">
      {room?.teams?.map(team => {
        const isHighest = highestBidder?._id === team._id;
        const isMine = myTeam?._id === team._id;
        const isExpanded = expandedTeams[team._id] ?? isMine;
        const squadDetails = team.squadDetails || [];

        return (
          <div 
            key={team._id} 
            className={`rounded-xl border transition-all ${
              isHighest 
                ? 'bg-white/5 border-[var(--gold-primary)] shadow-[0_0_15px_rgba(212,175,55,0.2)]' 
                : 'bg-[var(--broadcast-card)] border-[var(--broadcast-border)]'
            } ${isMine ? 'ring-1 ring-[var(--gold-primary)]' : ''}`}
          >
            {/* Team Summary Bar */}
            <div 
              onClick={() => toggleTeamExpand(team._id)}
              className="p-3 cursor-pointer hover:bg-white/5 transition flex items-center justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shadow shrink-0" 
                  style={{ backgroundColor: team.primaryColor || '#f5a623', color: '#fff' }}
                >
                  {team.shortName}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs text-white truncate">{team.name}</span>
                    {isMine && (
                      <span className="text-[8px] bg-[var(--gold-primary)] text-black px-1 py-0.2 rounded font-black">
                        YOU
                      </span>
                    )}
                    {team.isAI && (
                      <span className="text-[8px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1 py-0.2 rounded font-bold">
                        AI
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    Purse: <span className="text-[var(--gold-primary)] font-bold">₹{team.purse?.remaining?.toFixed(2)} Cr</span> • Squad: <span className="text-white font-bold">{team.squad?.length || 0}/{room.settings?.squadSize || 25}</span> • Overseas: <span className="text-white font-bold">{team.overseas || 0}/{room.settings?.overseasLimit || 8}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                {isHighest && (
                  <span className="text-[9px] font-bold text-[var(--gold-primary)] uppercase bg-[var(--gold-primary)]/10 px-1.5 py-0.5 rounded border border-[var(--gold-primary)]/30 animate-pulse">
                    Bidding
                  </span>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                )}
              </div>
            </div>

            {/* Bought Squad Expandable Content */}
            {isExpanded && (
              <div className="border-t border-[var(--broadcast-border)] bg-[var(--broadcast-surface)]/60 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold px-1 pb-1">
                  <span>Acquired Players ({squadDetails.length})</span>
                  <span>Price</span>
                </div>

                {squadDetails.length > 0 ? (
                  squadDetails.map((item, sIdx) => {
                    const pName = item.player?.name || item.name || 'Player';
                    const pRole = item.player?.role || item.role || 'Player';
                    const pPrice = item.boughtFor || item.price || 0;
                    return (
                      <div 
                        key={sIdx} 
                        className="flex items-center justify-between p-2 rounded-lg bg-[var(--broadcast-card)] border border-[var(--broadcast-border)]/50 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-white/10 text-gray-300 shrink-0">
                            {pRole}
                          </span>
                          <span className="font-medium text-white truncate">{pName}</span>
                        </div>
                        <span className="font-display font-bold text-[var(--gold-primary)] shrink-0 ml-2">
                          ₹{pPrice.toFixed(2)} Cr
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-2 text-[11px] text-[var(--text-muted)] italic">
                    No players bought yet in this auction
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderChatTab = () => (
    <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar min-h-0">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-4">
            <MessageSquare className="w-10 h-10 text-[var(--text-muted)] mb-2" />
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Feed is quiet</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Live bids, AI comments, and player chats appear here</p>
          </div>
        ) : (
          chatMessages.map((msg, idx) => {
            // System Announcements (SOLD, UNSOLD, NOMINATION, BID)
            if (msg.isSystem || msg.type === 'SOLD' || msg.type === 'UNSOLD' || msg.type === 'NOMINATION' || msg.type === 'BID') {
              const isSold = msg.type === 'SOLD';
              const isUnsold = msg.type === 'UNSOLD';
              const isNomination = msg.type === 'NOMINATION';
              const isBid = msg.type === 'BID';

              return (
                <div 
                  key={idx} 
                  className={`p-2.5 rounded-xl border text-xs shadow-sm transition ${
                    isSold 
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' 
                      : isUnsold 
                      ? 'bg-red-950/40 border-red-500/50 text-red-300' 
                      : isNomination 
                      ? 'bg-blue-950/40 border-blue-500/50 text-blue-300' 
                      : 'bg-yellow-950/30 border-yellow-500/40 text-yellow-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-75 flex items-center gap-1">
                      {isSold && <Trophy className="w-3 h-3 text-emerald-400" />}
                      {isUnsold && <XCircle className="w-3 h-3 text-red-400" />}
                      {isNomination && <Sparkles className="w-3 h-3 text-blue-400" />}
                      {isBid && <Gavel className="w-3 h-3 text-yellow-400" />}
                      {msg.type}
                    </span>
                    <span className="text-[9px] opacity-60">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="font-semibold leading-relaxed">
                    {msg.message || msg.text}
                  </div>
                </div>
              );
            }

            // Conversational Messages (Humans and AI Teams)
            const isMyMsg = msg.userId === user?._id || msg.user === user?.username || msg.senderName === user?.displayName;
            const isAIMsg = !!msg.isAI || msg.senderName?.includes('[AI]');
            const teamColor = msg.teamColor || '#f5a623';

            return (
              <div key={idx} className={`flex flex-col ${isMyMsg ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 mb-0.5 px-1">
                  {msg.teamShortName && (
                    <span 
                      className="text-[9px] font-black px-1.5 py-0.2 rounded text-white shadow-sm"
                      style={{ backgroundColor: teamColor }}
                    >
                      {msg.teamShortName}
                    </span>
                  )}
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">
                    {msg.senderName?.replace(' [AI]', '') || msg.user}
                  </span>
                  {isAIMsg && (
                    <span className="text-[8px] font-bold px-1 rounded uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      BOT
                    </span>
                  )}
                  <span className="text-[9px] opacity-40 ml-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div 
                  className={`px-3 py-1.5 rounded-xl text-xs max-w-[88%] leading-relaxed shadow-sm transition ${
                    isMyMsg 
                      ? 'bg-[var(--gold-primary)] text-black rounded-tr-none font-medium' 
                      : isAIMsg
                      ? 'bg-purple-950/25 text-purple-100 rounded-tl-none border border-purple-500/30'
                      : 'bg-[var(--broadcast-card)] text-white rounded-tl-none border border-[var(--broadcast-border)]'
                  }`}
                  style={!isMyMsg && !isAIMsg && msg.teamColor ? { borderLeft: `3px solid ${msg.teamColor}` } : {}}
                >
                  {msg.text || msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Form */}
      <form onSubmit={sendChatMessage} className="p-2.5 border-t border-[var(--broadcast-border)] bg-[var(--broadcast-card)] flex gap-2 shrink-0">
        <input 
          type="text" 
          value={chatInput} 
          onChange={e => setChatInput(e.target.value)} 
          placeholder="Type a message..." 
          className="flex-1 bg-[var(--broadcast-surface)] border border-[var(--broadcast-border)] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold-primary)]" 
        />
        <button 
          type="submit" 
          disabled={!chatInput.trim()}
          className="p-2 bg-[var(--gold-primary)] text-black rounded-lg hover:opacity-90 transition disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );

  const renderPoolTab = () => (
    <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0">
      {/* Search & Filter Bar */}
      <div className="p-2.5 border-b border-[var(--broadcast-border)] bg-[var(--broadcast-card)] space-y-2 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            value={poolSearch} 
            onChange={e => setPoolSearch(e.target.value)}
            placeholder="Search player or country..." 
            className="w-full bg-[var(--broadcast-surface)] border border-[var(--broadcast-border)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold-primary)]"
          />
        </div>
        
        {/* Role Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] custom-scrollbar">
          {['ALL', 'BATTER', 'BOWLER', 'ALL-ROUNDER', 'WICKETKEEPER'].map(r => (
            <button
              key={r}
              onClick={() => setPoolRoleFilter(r)}
              className={`px-2 py-0.5 rounded-full font-bold uppercase whitespace-nowrap transition ${
                poolRoleFilter === r 
                  ? 'bg-[var(--gold-primary)] text-black' 
                  : 'bg-[var(--broadcast-surface)] text-[var(--text-muted)] hover:text-white border border-[var(--broadcast-border)]'
              }`}
            >
              {r === 'WICKETKEEPER' ? 'WK' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Players List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar min-h-0">
        <div className="px-1 py-0.5 flex justify-between items-center text-[10px] text-[var(--text-muted)] uppercase">
          <span>Pool: {filteredPool.length} Players</span>
          <span>Base Price</span>
        </div>

        {filteredPool.length > 0 ? (
          filteredPool.map((p, idx) => {
            const isCurrent = currentPlayer && (currentPlayer._id === p._id || currentPlayer.name === p.name);
            return (
              <div 
                key={p._id || idx}
                className={`p-2 rounded-xl border flex items-center justify-between transition ${
                  isCurrent 
                    ? 'bg-[var(--gold-primary)]/15 border-[var(--gold-primary)] shadow-[0_0_12px_rgba(212,175,55,0.3)]' 
                    : 'bg-[var(--broadcast-card)] border-[var(--broadcast-border)] hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[var(--broadcast-surface)] border border-[var(--broadcast-border)] flex items-center justify-center font-bold text-[10px] text-[var(--gold-primary)] shrink-0">
                    {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-white truncate">{p.name}</span>
                      {isCurrent && (
                        <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-[var(--gold-primary)] text-black animate-pulse">
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                      <span className="text-gray-400">{p.role}</span>
                      <span>•</span>
                      <span>{p.country || 'India'}</span>
                      {p.rating?.overall && (
                        <>
                          <span>•</span>
                          <span className="text-yellow-400 font-semibold">★ {formatRating(p.rating)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2 flex items-center gap-1.5">
                  <span className="font-display font-bold text-xs text-[var(--gold-primary)]">
                    ₹{p.basePrice?.toFixed(2)} Cr
                  </span>
                  {isAuctioneer && (auctionStatus === 'NOMINATING' || !currentPlayer) && !isCurrent && !soldSet.has((p._id || p.id)?.toString()) && (
                    <button
                      onClick={() => handleNominatePlayer(p._id)}
                      disabled={nominatingPlayerId === p._id}
                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black text-[10px] font-bold border border-amber-500/40 transition"
                    >
                      Call Up
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-6 text-xs text-[var(--text-muted)]">
            No players found matching filter
          </div>
        )}
      </div>
    </div>
  );

  const renderSquadStrengthTab = () => (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-0">
      {/* Franchise Tabs */}
      {room?.teams?.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
          {room.teams.map(t => {
            if (!t) return null;
            const tId = (t._id || t.id)?.toString();
            const activeId = (activeStrengthTeam?._id || activeStrengthTeam?.id)?.toString();
            const isSelected = activeId === tId;
            return (
              <button
                key={tId || t.shortName}
                onClick={() => setSelectedStrengthTeamId(t._id || t.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-white text-black shadow-sm'
                    : 'bg-white/5 text-[var(--text-muted)] hover:text-white border border-white/10'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.primaryColor || '#f5a623' }}></span>
                <span>{t.shortName || t.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected Team Header */}
      <div className="p-3 rounded-xl bg-[var(--broadcast-card)] border border-[var(--broadcast-border)] flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Inspecting Franchise</span>
          <h4 className="font-display font-black text-sm text-white">{activeStrengthTeam?.name}</h4>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Purse Left</span>
          <p className="font-display font-black text-sm text-[var(--gold-primary)]">
            ₹{activeStrengthTeam?.purse?.remaining?.toFixed(2) ?? '120.00'} Cr
          </p>
        </div>
      </div>

      {/* 4 Strength Meters */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center">
          <span className="text-[10px] font-semibold text-amber-400 mb-1">🏏 Bat</span>
          <span className="text-base font-black font-display text-white">
            {squadStrength.count > 0 ? squadStrength.batting : '—'}
          </span>
          <div className="w-full h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${squadStrength.batting}%` }} />
          </div>
        </div>

        <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center">
          <span className="text-[10px] font-semibold text-cyan-400 mb-1">⚡ Bowl</span>
          <span className="text-base font-black font-display text-white">
            {squadStrength.count > 0 ? squadStrength.bowling : '—'}
          </span>
          <div className="w-full h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${squadStrength.bowling}%` }} />
          </div>
        </div>

        <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center">
          <span className="text-[10px] font-semibold text-emerald-400 mb-1">🧤 Field</span>
          <span className="text-base font-black font-display text-white">
            {squadStrength.count > 0 ? squadStrength.fielding : '—'}
          </span>
          <div className="w-full h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${squadStrength.fielding}%` }} />
          </div>
        </div>

        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col items-center">
          <span className="text-[10px] font-bold text-[var(--gold-primary)] mb-1">★ Overall</span>
          <span className="text-base font-black font-display text-[var(--gold-primary)]">
            {squadStrength.count > 0 ? squadStrength.overall : '—'}
          </span>
          <div className="w-full h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${squadStrength.overall}%` }} />
          </div>
        </div>
      </div>

      {/* Composition Breakdown */}
      <div className="p-2.5 rounded-xl bg-black/25 border border-white/5 text-[11px] flex items-center justify-between text-[var(--text-muted)] flex-wrap gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span>🏏 {squadStrength.batters} Bat</span>
          <span>•</span>
          <span>⚡ {squadStrength.bowlers} Bowl</span>
          <span>•</span>
          <span>🧤 {squadStrength.wks} WK</span>
          <span>•</span>
          <span>🔄 {squadStrength.allRounders} AR</span>
        </div>
        <span className="font-semibold text-gray-300">
          {squadStrength.count}/{room?.settings?.squadSize || 25} Squad
        </span>
      </div>

      {/* Acquired Players Roster */}
      <div className="space-y-1.5">
        <h5 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
          Signed Players ({activeStrengthTeam?.squadDetails?.length || 0})
        </h5>
        {(!activeStrengthTeam?.squadDetails || activeStrengthTeam.squadDetails.length === 0) ? (
          <div className="text-center py-6 text-xs text-[var(--text-muted)] bg-black/20 rounded-xl border border-white/5">
            No players signed yet by {activeStrengthTeam?.name || 'this franchise'}.
          </div>
        ) : (
          <div className="space-y-1.5">
            {activeStrengthTeam.squadDetails.map((item, idx) => {
              const pName = item.player?.name || item.name || 'Player';
              const pRole = item.player?.role || item.role || 'Batter';
              const pPrice = item.boughtFor || item.price || 0;
              const isOvs = item.player?.isOverseas || item.isOverseas;
              return (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[var(--broadcast-card)] border border-white/5 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-gray-500 font-mono w-4">{idx + 1}.</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white truncate">{pName}</span>
                        {isOvs && (
                          <span className="text-[9px] text-cyan-400 font-bold bg-cyan-950/40 px-1 py-0.2 rounded border border-cyan-500/20">
                            ✈
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">{pRole}</span>
                    </div>
                  </div>
                  <span className="font-display font-bold text-amber-400 text-xs">
                    ₹{Number(pPrice).toFixed(2)} Cr
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderPlayerStatsTab = () => {
    if (!currentPlayer) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-6 min-h-[200px]">
          <Shield className="w-12 h-12 text-[var(--text-muted)] mb-3" />
          <p className="text-[var(--text-secondary)] uppercase tracking-widest text-xs font-bold">No Active Nominee</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Player stats appear once a star is called up</p>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-0">
        <div className="p-3 rounded-xl bg-[var(--broadcast-card)] border border-[var(--broadcast-border)]">
          <div className="flex items-center justify-between border-b border-[var(--broadcast-border)] pb-2 mb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Career Record: {currentPlayer.name}
            </h4>
            <span className="text-[10px] text-[var(--text-muted)] uppercase">IPL History</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-[var(--broadcast-surface)] p-2 rounded-lg border border-white/5">
              <span className="text-[9px] text-[var(--text-muted)] uppercase block">Matches</span>
              <span className="font-bold text-sm text-white">
                {currentPlayer.careerStats?.batting?.matches || currentPlayer.stats?.matches || '150'}
              </span>
            </div>
            <div className="bg-[var(--broadcast-surface)] p-2 rounded-lg border border-white/5">
              <span className="text-[9px] text-[var(--text-muted)] uppercase block">Runs</span>
              <span className="font-bold text-sm text-amber-400">
                {currentPlayer.careerStats?.batting?.runs ?? currentPlayer.stats?.runs ?? '3,850'}
              </span>
            </div>
            <div className="bg-[var(--broadcast-surface)] p-2 rounded-lg border border-white/5">
              <span className="text-[9px] text-[var(--text-muted)] uppercase block">Strike Rate</span>
              <span className="font-bold text-sm text-white">
                {currentPlayer.careerStats?.batting?.strikeRate ? currentPlayer.careerStats.batting.strikeRate.toFixed(1) : (currentPlayer.stats?.strikeRate || '139.5')}
              </span>
            </div>
            <div className="bg-[var(--broadcast-surface)] p-2 rounded-lg border border-white/5">
              <span className="text-[9px] text-[var(--text-muted)] uppercase block">Wickets</span>
              <span className="font-bold text-sm text-cyan-300">
                {currentPlayer.careerStats?.bowling?.wickets ?? currentPlayer.stats?.wickets ?? '15'}
              </span>
            </div>
            <div className="bg-[var(--broadcast-surface)] p-2 rounded-lg border border-white/5">
              <span className="text-[9px] text-[var(--text-muted)] uppercase block">Economy</span>
              <span className="font-bold text-sm text-white">
                {currentPlayer.careerStats?.bowling?.economy ? currentPlayer.careerStats.bowling.economy.toFixed(2) : (currentPlayer.stats?.economy || '7.85')}
              </span>
            </div>
            <div className="bg-[var(--broadcast-surface)] p-2 rounded-lg border border-white/5">
              <span className="text-[9px] text-[var(--text-muted)] uppercase block">Bat Style</span>
              <span className="font-bold text-xs text-white truncate block mt-0.5">
                {currentPlayer.battingStyle ? currentPlayer.battingStyle.replace('Hand', '') : 'RHB'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // MOBILE TOP BIDDING CONSOLE CARD (ALWAYS VISIBLE AT TOP ON MOBILE)
  // =========================================================================

  const renderMobileBiddingCard = () => {
    if (!currentPlayer) {
      return (
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Gavel className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-white">
              {auctionStatus === 'NOMINATING' ? 'Auctioneer Nominating Next Player...' : 'Waiting for next player...'}
            </span>
          </div>
          {isAuctioneer && availableForNomination.length > 0 && (
            <button
              onClick={() => handleNominatePlayer(availableForNomination[0]._id)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-400 text-black flex items-center gap-1 shadow hover:scale-105 active:scale-95 transition"
            >
              <Sparkles className="w-3 h-3" /> Call: {availableForNomination[0].name.split(' ')[0]}
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {/* Row 1: Player Avatar, Name, Role, Base Price */}
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center font-display font-black text-base text-white/20 bg-gradient-to-b from-[#1c2847] to-[#0d1424] border border-white/10 shrink-0 relative overflow-hidden shadow">
            {currentPlayer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            {currentPlayer.image && currentPlayer.image !== 'default_player.png' && (
              <img
                src={currentPlayer.image}
                alt={currentPlayer.name}
                className="w-full h-full object-cover object-top absolute inset-0 z-10"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-amber-400 text-black">
                {currentPlayer.role}
              </span>
              {currentPlayer.isOverseas && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  ✈ Overseas
                </span>
              )}
              <span className="text-[10px] font-bold text-amber-300 ml-auto">
                ★ {formatRating(currentPlayer.rating)}
              </span>
            </div>
            <h3 className="font-display font-bold text-sm text-white uppercase tracking-wide truncate mt-0.5">
              {currentPlayer.name}
            </h3>
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
              <span>{currentPlayer.country || 'India'}</span>
              <span>Base: <strong className="text-amber-400 font-display">₹{currentPlayer.basePrice?.toFixed(2)} Cr</strong></span>
            </div>
          </div>
        </div>

        {/* Row 2: Current Bid, Leader & Live Countdown Timer */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5 gap-2">
          <div className="min-w-0">
            <span className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider font-semibold block">Current Bid</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-black text-lg text-[var(--gold-primary)] tracking-tight">
                ₹{displayBidPrice.toFixed(2)} Cr
              </span>
              {highestBidder && (
                <span 
                  className="text-[9px] font-black px-1.5 py-0.5 rounded truncate max-w-[120px] inline-flex items-center gap-1"
                  style={{
                    backgroundColor: (highestBidder.primaryColor || '#f5a623') + '25',
                    color: highestBidder.primaryColor || '#f5a623'
                  }}
                >
                  <span>{highestBidder.shortName || highestBidder.teamShortName || highestBidder.name || highestBidder.teamName}</span>
                  {isLeading && (
                    <span className="text-[8px] bg-emerald-500 text-black px-1 py-0.2 rounded font-black">
                      YOU
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          <div className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs border flex items-center gap-1 shadow-sm shrink-0 ${
            localTimer <= 5 
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse' 
              : localTimer <= 10 
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{localTimer}s</span>
          </div>
        </div>

        {/* Row 3: Increments & Primary BID Button */}
        {myTeam && !isAuctioneer && (
          <div className="space-y-1.5">
            {bidErrorToast && (
              <div className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>{bidErrorToast}</span>
              </div>
            )}

            <div className="grid grid-cols-4 gap-1.5">
              {[0.20, 0.50, 1.00, 2.00].map(inc => {
                const amount = nextBid + inc;
                return (
                  <button
                    key={inc}
                    onClick={() => handleBid(amount)}
                    disabled={!canBid || isPending || isPlacingBid || amount > (myTeam.purse?.remaining || 0)}
                    className="py-1 px-1 rounded-lg font-mono text-[10px] font-bold transition flex items-center justify-center bg-white/5 hover:bg-white/10 text-white border border-white/10 active:scale-95 disabled:opacity-40"
                  >
                    +{inc.toFixed(2)}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBid(nextBid)}
                disabled={!canBid || isPending || isPlacingBid}
                className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-40 ${
                  isLeading 
                    ? 'bg-emerald-600 text-white border border-emerald-400 shadow-emerald-600/30' 
                    : isPlacingBid
                    ? 'bg-amber-600 text-white animate-pulse'
                    : 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-amber-500/25 hover:brightness-110'
                }`}
              >
                <Gavel className={`w-4 h-4 ${isPlacingBid ? 'animate-spin' : ''}`} />
                <span>
                  {isPlacingBid
                    ? 'Placing Bid...'
                    : isLeading
                    ? 'You Hold the Leading Bid'
                    : `BID ₹${nextBid.toFixed(2)} Cr`}
                </span>
              </button>

              <div className="text-right px-2 py-1 bg-black/30 rounded-lg border border-white/5 shrink-0">
                <span className="text-[8px] text-[var(--text-muted)] block uppercase">Purse</span>
                <span className="font-display font-bold text-[11px] text-emerald-400">
                  ₹{myTeam.purse?.remaining?.toFixed(2) ?? '120.00'} Cr
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[var(--broadcast-bg)] text-white select-none">
      
      {/* Root Broadcast SOLD / UNSOLD Full-Screen Overlay Stamp */}
      {auctionStatus === 'SOLD' && soldData && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in p-6">
          <div className="text-center transform animate-stamp max-w-lg">
            <div className="inline-block px-8 py-2 border-4 border-emerald-500 rounded-xl bg-emerald-950/60 shadow-[0_0_50px_rgba(16,185,129,0.4)] rotate-[-3deg] mb-4">
              <h1 className="font-display text-4xl sm:text-6xl font-black text-emerald-400 tracking-tight">
                🔨 SOLD!
              </h1>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1 uppercase tracking-wide">
              {soldData.player?.name}
            </h2>
            <p className="text-base text-gray-300">
              Bought by <span style={{ color: soldData.team?.primaryColor || 'var(--gold-primary)' }} className="font-bold text-lg">{soldData.team?.name}</span>
            </p>
            <div className="mt-4 font-display font-black text-3xl sm:text-4xl text-[var(--gold-primary)] drop-shadow-lg">
              ₹{soldData.amount?.toFixed(2)} Cr
            </div>
          </div>
        </div>
      )}
      
      {auctionStatus === 'UNSOLD' && unsoldData && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in p-6">
          <div className="text-center transform animate-stamp max-w-lg">
            <div className="inline-block px-8 py-2 border-4 border-rose-500 rounded-xl bg-rose-950/60 shadow-[0_0_50px_rgba(244,63,94,0.4)] rotate-[3deg] mb-4">
              <h1 className="font-display text-4xl sm:text-6xl font-black text-rose-400 tracking-tight">
                ❌ UNSOLD
              </h1>
            </div>
            <h2 className="text-2xl font-bold text-white uppercase tracking-wide">
              {unsoldData.player?.name}
            </h2>
            <p className="text-sm text-gray-400 mt-2">Passed at base price ₹{unsoldData.player?.basePrice?.toFixed(2)} Cr</p>
          </div>
        </div>
      )}

      {/* Broadcast Header */}
      <header className="h-14 shrink-0 flex items-center justify-between px-3 sm:px-5 border-b border-[var(--broadcast-border)] bg-[var(--broadcast-surface)]/95 backdrop-blur-md z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/15 text-rose-400 rounded-full border border-rose-500/30 shrink-0 shadow-sm">
            <Radio className="w-3 h-3 animate-pulse-live" />
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest">LIVE</span>
          </div>
          <h1 className="font-display font-bold text-sm sm:text-base md:text-lg text-white truncate max-w-[130px] sm:max-w-xs md:max-w-md">
            {room.name}
          </h1>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded text-[11px] text-[var(--text-secondary)] border border-white/5 shrink-0">
            <Hash className="w-3 h-3 text-cyan-400" /> {room.roomId || roomId}
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[var(--text-secondary)] font-medium uppercase tracking-wider">{auctionStatus}</span>
          </div>

          {/* Direct Shortcut to Squad Analysis & Playing XI */}
          <button
            onClick={() => navigate(`/room/${roomId}/results`)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition shadow-sm"
            title="Analyze Squad & Build Playing XI"
          >
            <Trophy className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="hidden md:inline">Squad & Playing 11</span>
            <span className="md:hidden text-[11px]">XI & Squad</span>
          </button>

          {/* Prominent Quit Auction Button */}
          <button 
            onClick={() => setShowQuitModal(true)} 
            title="Quit Auction"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 transition shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Quit Auction</span>
          </button>
        </div>
      </header>

      {/* Quit Auction / Post-Auction Options Modal */}
      {showQuitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[var(--broadcast-card)] border border-[var(--broadcast-border)] rounded-2xl p-5 sm:p-6 shadow-2xl relative">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">Quit Auction Room</h3>
                  <p className="text-xs text-[var(--text-muted)]">Choose how you would like to proceed:</p>
                </div>
              </div>
              <button
                onClick={() => setShowQuitModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Options List */}
            <div className="space-y-2.5 mb-5">
              {/* Option 1: Analyze Squad & Playing XI */}
              <button
                onClick={() => {
                  setShowQuitModal(false);
                  navigate(`/room/${roomId}/results`);
                }}
                className="w-full text-left p-3.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 transition group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-cyan-300">📊 Analyze Squad & Playing XI</span>
                    <span className="text-[10px] uppercase font-bold text-cyan-400/80 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">Recommended</span>
                  </div>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                    View complete squad breakdown, team valuation ratings, build your best Playing 11 (with 4 overseas rule), and simulate IPL season matches.
                  </p>
                </div>
              </button>

              {/* Option 2: Admin End Auction for Everyone */}
              {(isAdmin || isAuctioneer) && (
                <button
                  onClick={handleEndAuction}
                  disabled={isEndingAuction}
                  className="w-full text-left p-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 transition group flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                    <Gavel className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-amber-300">
                        {isEndingAuction ? 'Finishing Auction...' : '🏁 End Auction for Everyone'}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Host Only</span>
                    </div>
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                      Conclude the live auction now and transition all connected managers to the Results & Playing 11 builder.
                    </p>
                  </div>
                </button>
              )}

              {/* Option 3: Return to Dashboard */}
              <button
                onClick={() => {
                  setShowQuitModal(false);
                  navigate('/dashboard');
                }}
                className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 text-gray-300 flex items-center justify-center shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-sm text-gray-200">Exit to Dashboard</span>
                  <p className="text-xs text-[var(--text-muted)]">Leave the room and go to your dashboard.</p>
                </div>
              </button>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--broadcast-border)]">
              <button
                onClick={() => setShowQuitModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition"
              >
                Cancel & Resume Auction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* ======================================================== */}
        {/* MOBILE VIEW (< lg): UP = Bidding Console, DOWN = Tabs    */}
        {/* ======================================================== */}
        <div className="flex lg:hidden flex-1 flex-col h-full w-full overflow-hidden min-h-0">
          
          {/* UP: Sticky Bidding Console Card */}
          <div className="w-full bg-[var(--broadcast-card)] border-b border-[var(--broadcast-border)] p-2.5 sm:p-3 shrink-0 shadow-xl z-20">
            {renderMobileBiddingCard()}
          </div>

          {/* DOWN: Tab Switcher Bar */}
          <div className="flex items-center border-b border-[var(--broadcast-border)] bg-[var(--broadcast-surface)] px-2 py-1.5 gap-1 shrink-0 z-10 overflow-x-auto custom-scrollbar">
            {[
              { id: 'feed', label: 'Chat', icon: MessageSquare, badge: chatMessages.length > 0 },
              { id: 'franchises', label: 'Teams', icon: Users },
              { id: 'pool', label: 'Pool', icon: Layers },
              { id: 'strength', label: 'Strength', icon: Shield },
              { id: 'stats', label: 'Stats', icon: Trophy }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = mobileTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMobileTab(tab.id)}
                  className={`flex-1 min-w-[62px] py-1.5 px-2 rounded-xl text-[11px] font-bold tracking-wide transition flex items-center justify-center gap-1 shrink-0 touch-target ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-md shadow-amber-500/20 font-black'
                      : 'bg-white/5 text-[var(--text-secondary)] hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge && !isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                </button>
              );
            })}
          </div>

          {/* DOWN: Selected Tab Content */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[var(--broadcast-bg)]">
            {mobileTab === 'feed' && renderChatTab()}
            {mobileTab === 'franchises' && renderFranchisesTab()}
            {mobileTab === 'pool' && renderPoolTab()}
            {mobileTab === 'strength' && renderSquadStrengthTab()}
            {mobileTab === 'stats' && renderPlayerStatsTab()}
          </div>
        </div>

        {/* ======================================================== */}
        {/* DESKTOP VIEW (lg+): Full 3-Column Broadcast Studio       */}
        {/* ======================================================== */}

        {/* COLUMN 1: LEFT PANEL - Player Details & Career Stats */}
        <div className="w-72 xl:w-80 flex-shrink-0 h-full border-r border-[var(--broadcast-border)] bg-[var(--broadcast-card)] p-4 overflow-y-auto hidden lg:flex flex-col z-10 custom-scrollbar">
          {currentPlayer ? (
            <div className="animate-fade-in flex flex-col gap-4">
              {/* Player Image Card */}
              <div className="relative rounded-xl border border-[var(--broadcast-border)] bg-[var(--broadcast-surface)] overflow-hidden shadow-lg">
                <div className="h-44 w-full flex items-center justify-center font-display font-black text-6xl text-white/10 select-none relative bg-gradient-to-b from-[#1c2237] to-[#0d121f]">
                  {currentPlayer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  
                  {currentPlayer.image && currentPlayer.image !== 'default_player.png' && (
                    <img 
                      src={currentPlayer.image} 
                      alt={currentPlayer.name} 
                      className="w-full h-full object-cover object-top opacity-90 absolute inset-0 z-10" 
                      onError={(e) => { e.target.style.display = 'none'; }} 
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-transparent to-transparent z-10"></div>
                </div>

                <div className="p-3 bg-[var(--broadcast-surface)] border-t border-[var(--broadcast-border)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="inline-block px-2 py-0.5 bg-[var(--gold-primary)] text-black text-[10px] font-bold rounded uppercase tracking-wider">
                      {currentPlayer.role}
                    </span>
                    {currentPlayer.isOverseas && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded font-semibold">
                        ✈ Overseas
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-xl font-bold text-white uppercase tracking-wide truncate">
                    {currentPlayer.name}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] font-medium">
                    {currentPlayer.country || currentPlayer.nationality || 'India'}
                  </p>
                </div>
              </div>

              {/* Price & Rating Pills */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[var(--broadcast-surface)] p-2.5 rounded-lg border border-[var(--broadcast-border)] text-center">
                  <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Base Price</p>
                  <p className="font-display font-bold text-base text-[var(--gold-primary)]">₹{currentPlayer.basePrice?.toFixed(2)} Cr</p>
                </div>
                <div className="bg-[var(--broadcast-surface)] p-2.5 rounded-lg border border-[var(--broadcast-border)] text-center">
                  <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Player Rating</p>
                  <p className="font-display font-bold text-base text-yellow-400">
                    ★ {formatRating(currentPlayer.rating)}
                  </p>
                </div>
              </div>

              {/* Career Stats Box */}
              <div className="bg-[var(--broadcast-surface)] p-3 rounded-xl border border-[var(--broadcast-border)]">
                <div className="flex items-center justify-between border-b border-[var(--broadcast-border)] pb-2 mb-2.5">
                  <h3 className="text-[11px] text-[var(--text-secondary)] uppercase tracking-widest font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--gold-primary)]" /> Career Stats
                  </h3>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase">IPL Record</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[var(--broadcast-card)] p-2 rounded border border-[var(--broadcast-border)]/50">
                    <p className="text-[9px] text-[var(--text-muted)] uppercase">Matches</p>
                    <p className="font-bold text-sm text-white mt-0.5">
                      {currentPlayer.careerStats?.batting?.matches || currentPlayer.careerStats?.bowling?.matches || currentPlayer.stats?.matches || '150'}
                    </p>
                  </div>
                  <div className="bg-[var(--broadcast-card)] p-2 rounded border border-[var(--broadcast-border)]/50">
                    <p className="text-[9px] text-[var(--text-muted)] uppercase">Runs</p>
                    <p className="font-bold text-sm text-[var(--gold-primary)] mt-0.5">
                      {currentPlayer.careerStats?.batting?.runs ?? currentPlayer.stats?.runs ?? '3,850'}
                    </p>
                  </div>
                  <div className="bg-[var(--broadcast-card)] p-2 rounded border border-[var(--broadcast-border)]/50">
                    <p className="text-[9px] text-[var(--text-muted)] uppercase">Strike Rate</p>
                    <p className="font-bold text-sm text-white mt-0.5">
                      {currentPlayer.careerStats?.batting?.strikeRate ? currentPlayer.careerStats.batting.strikeRate.toFixed(1) : (currentPlayer.stats?.strikeRate || '139.5')}
                    </p>
                  </div>
                  <div className="bg-[var(--broadcast-card)] p-2 rounded border border-[var(--broadcast-border)]/50">
                    <p className="text-[9px] text-[var(--text-muted)] uppercase">Wickets</p>
                    <p className="font-bold text-sm text-white mt-0.5">
                      {currentPlayer.careerStats?.bowling?.wickets ?? currentPlayer.stats?.wickets ?? '15'}
                    </p>
                  </div>
                  <div className="bg-[var(--broadcast-card)] p-2 rounded border border-[var(--broadcast-border)]/50">
                    <p className="text-[9px] text-[var(--text-muted)] uppercase">Economy</p>
                    <p className="font-bold text-sm text-white mt-0.5">
                      {currentPlayer.careerStats?.bowling?.economy ? currentPlayer.careerStats.bowling.economy.toFixed(2) : (currentPlayer.stats?.economy || '7.85')}
                    </p>
                  </div>
                  <div className="bg-[var(--broadcast-card)] p-2 rounded border border-[var(--broadcast-border)]/50">
                    <p className="text-[9px] text-[var(--text-muted)] uppercase">Style</p>
                    <p className="font-bold text-[10px] text-white mt-0.5 truncate" title={currentPlayer.battingStyle || 'Right Hand'}>
                      {currentPlayer.battingStyle ? currentPlayer.battingStyle.replace('Hand', '') : 'RHB'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-4">
              <Shield className="w-12 h-12 text-[var(--text-muted)] mb-3" />
              <p className="text-[var(--text-secondary)] uppercase tracking-widest text-xs font-bold">Waiting for Next Player</p>
            </div>
          )}
        </div>

        {/* COLUMN 2: CENTER PANEL - Live Stage & Dual Responsive Hub */}
        <div className="flex-1 min-w-0 h-full hidden lg:flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-[var(--broadcast-bg)] via-[#0d1424] to-[var(--broadcast-bg)]">
          
          {/* Main Stage Area */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 min-h-0 overflow-y-auto custom-scrollbar">
            {currentPlayer ? (
              <div className="w-full max-w-md flex flex-col items-center">

                {/* Circular Countdown Timer */}
                <div className="relative mb-5 flex items-center justify-center">
                  <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center relative transition-all duration-300 ${
                    isTimerCritical 
                      ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] scale-105' 
                      : localTimer <= 10 
                      ? 'border-yellow-500 shadow-[0_0_20px_rgba(245,166,35,0.3)]' 
                      : 'border-[var(--broadcast-border)]'
                  }`}>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Seconds</span>
                    <span className={`font-display font-black text-5xl transition-colors ${
                      isTimerCritical ? 'text-red-500 animate-ping-subtle' : localTimer <= 10 ? 'text-yellow-400' : 'text-white'
                    }`}>
                      {localTimer}
                    </span>
                    {isTimerCritical && (
                      <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest mt-0.5">Going!</span>
                    )}
                  </div>
                </div>

                {/* Current Bid Display */}
                <div className="text-center mb-5 w-full bg-[var(--broadcast-card)] p-4 rounded-2xl border border-[var(--broadcast-border)] shadow-xl">
                  <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-widest font-semibold mb-1">
                    Current Highest Bid
                  </p>
                  <div className="font-display font-black text-4xl sm:text-5xl text-[var(--gold-primary)] tracking-tight">
                    ₹{displayBidPrice.toFixed(2)} <span className="text-2xl font-bold text-gray-300">Cr</span>
                  </div>
                  
                  {highestBidder ? (
                    <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: highestBidder.primaryColor || '#f5a623' }}></span>
                      <span className="text-xs font-bold text-white">{highestBidder.name || highestBidder.teamName || highestBidder.shortName}</span>
                      {isLeading && (
                        <span className="text-[9px] bg-emerald-500 text-black px-1.5 py-0.2 rounded font-black">
                          YOU
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] mt-2">Opening at base price</p>
                  )}
                </div>

                {/* Bidding Controls */}
                {myTeam && !isAuctioneer && (
                  <div className="w-full flex flex-col gap-2.5 max-w-sm">
                    {bidErrorToast && (
                      <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>{bidErrorToast}</span>
                      </div>
                    )}

                    {/* Fast Increments */}
                    <div className="grid grid-cols-4 gap-2">
                      {[0.20, 0.50, 1.00, 2.00].map(inc => {
                        const amount = nextBid + inc;
                        return (
                          <button
                            key={inc}
                            onClick={() => handleBid(amount)}
                            disabled={!canBid || isPending || isPlacingBid || amount > (myTeam.purse?.remaining || 0)}
                            className="py-2 px-2 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center bg-white/5 hover:bg-white/10 text-white border border-white/10 active:scale-95 disabled:opacity-40"
                          >
                            +{inc.toFixed(2)}
                          </button>
                        );
                      })}
                    </div>

                    {/* Primary BID CTA Button */}
                    <button
                      onClick={() => handleBid(nextBid)}
                      disabled={!canBid || isPending || isPlacingBid}
                      className={`w-full py-3.5 rounded-xl font-display font-black text-base uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 disabled:opacity-40 ${
                        isLeading 
                          ? 'bg-emerald-600 text-white border border-emerald-400 shadow-emerald-600/30' 
                          : isPlacingBid
                          ? 'bg-amber-600 text-white animate-pulse'
                          : 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-black shadow-amber-500/25 hover:brightness-110'
                      }`}
                    >
                      <Gavel className={`w-5 h-5 ${isPlacingBid ? 'animate-spin' : ''}`} />
                      <span>
                        {isPlacingBid
                          ? 'Placing Bid...'
                          : isLeading
                          ? 'You are Leading the Bid'
                          : `BID ₹${nextBid.toFixed(2)} Cr`}
                      </span>
                    </button>

                    {/* Purse Balance Indicator */}
                    <div className="text-center text-[11px] text-[var(--text-muted)] flex items-center justify-center gap-1.5 pt-0.5">
                      <span>Purse Remaining:</span>
                      <strong className="text-emerald-400 font-display font-bold text-xs">
                        ₹{myTeam.purse?.remaining?.toFixed(2) ?? '120.00'} Cr
                      </strong>
                    </div>
                  </div>
                )}

                {/* BOTTOM-CENTRE LIVE SQUAD STRENGTH HUD */}
                <div className="w-full mt-4 p-3 rounded-2xl bg-[var(--broadcast-card)]/90 backdrop-blur-md border border-[var(--broadcast-border)] shadow-xl animate-fade-in">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--broadcast-border)]/60">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-amber-500/15 text-amber-400 border border-amber-500/25">
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black uppercase tracking-wider text-white">Squad Strength</span>
                        {activeStrengthTeam && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.2 rounded"
                            style={{
                              backgroundColor: (activeStrengthTeam.primaryColor || '#f5a623') + '25',
                              color: activeStrengthTeam.primaryColor || '#f5a623'
                            }}
                          >
                            {activeStrengthTeam.shortName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Franchise Tabs for all teams */}
                    {room?.teams?.length > 1 && (
                      <div className="flex items-center gap-1 overflow-x-auto max-w-[220px] sm:max-w-[340px] pb-0.5 custom-scrollbar">
                        {room.teams.map(t => {
                          if (!t) return null;
                          const tId = (t._id || t.id)?.toString();
                          const activeId = (activeStrengthTeam?._id || activeStrengthTeam?.id)?.toString();
                          const isSelected = activeId === tId;
                          return (
                            <button
                              key={tId || t.shortName}
                              onClick={() => setSelectedStrengthTeamId(t._id || t.id)}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold transition flex items-center gap-1 shrink-0 ${
                                isSelected
                                  ? 'bg-white text-black shadow-sm'
                                  : 'bg-white/5 text-[var(--text-muted)] hover:text-white border border-white/10'
                              }`}
                              title={t.name}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.primaryColor || '#f5a623' }}></span>
                              <span>{t.shortName || t.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 4 Live Strength Meters */}
                  <div className="grid grid-cols-4 gap-2 text-center mb-2">
                    <div className="p-2 rounded-xl bg-black/30 border border-white/5 flex flex-col items-center">
                      <span className="text-[10px] font-semibold text-amber-400/90 mb-1">🏏 Batting</span>
                      <span className="text-sm md:text-base font-black font-display text-white">
                        {squadStrength.count > 0 ? squadStrength.batting : '—'}
                      </span>
                      <div className="w-full h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${squadStrength.batting}%` }} />
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-black/30 border border-white/5 flex flex-col items-center">
                      <span className="text-[10px] font-semibold text-cyan-400/90 mb-1">⚡ Bowling</span>
                      <span className="text-sm md:text-base font-black font-display text-white">
                        {squadStrength.count > 0 ? squadStrength.bowling : '—'}
                      </span>
                      <div className="w-full h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-cyan-400" style={{ width: `${squadStrength.bowling}%` }} />
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-black/30 border border-white/5 flex flex-col items-center">
                      <span className="text-[10px] font-semibold text-emerald-400/90 mb-1">🧤 Fielding</span>
                      <span className="text-sm md:text-base font-black font-display text-white">
                        {squadStrength.count > 0 ? squadStrength.fielding : '—'}
                      </span>
                      <div className="w-full h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${squadStrength.fielding}%` }} />
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-[var(--gold-primary)] mb-1">★ Overall</span>
                      <span className="text-sm md:text-base font-black font-display text-[var(--gold-primary)]">
                        {squadStrength.count > 0 ? squadStrength.overall : '—'}
                      </span>
                      <div className="w-full h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${squadStrength.overall}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Composition Breakdown */}
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-0.5 px-0.5">
                    {squadStrength.count > 0 ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>🏏 {squadStrength.batters} Bat</span>
                        <span>•</span>
                        <span>⚡ {squadStrength.bowlers} Bowl</span>
                        <span>•</span>
                        <span>🧤 {squadStrength.wks} WK</span>
                        <span>•</span>
                        <span>🔄 {squadStrength.allRounders} AR</span>
                        {squadStrength.overseas > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-blue-400 font-bold">✈ {squadStrength.overseas} Overseas</span>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="italic">No players acquired yet • Win bids to build squad strength</span>
                    )}
                    <span className="font-semibold text-gray-300 shrink-0">
                      {squadStrength.count}/{room?.settings?.squadSize || 25} Squad
                    </span>
                  </div>
                </div>

              </div>
            ) : (
              auctionStatus === 'NOMINATING' || auctioneerId ? (
                isAuctioneer ? (
                  /* Auctioneer Console */
                  <div className="w-full max-w-2xl flex flex-col h-full max-h-[560px] bg-[var(--broadcast-card)] rounded-2xl border border-amber-500/40 p-4 shadow-2xl animate-fade-in overflow-hidden">
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--broadcast-border)] mb-3 shrink-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <Gavel className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-sm md:text-base text-white flex items-center gap-2">
                            Auctioneer Console <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded uppercase font-bold">In Control</span>
                          </h3>
                          <p className="text-[11px] text-[var(--text-muted)]">Select which player to bring to the bidding table next</p>
                        </div>
                      </div>

                      {availableForNomination.length > 0 && (
                        <button
                          onClick={() => handleNominatePlayer(availableForNomination[0]._id)}
                          disabled={nominatingPlayerId !== null}
                          className="px-3 py-1.5 rounded-lg font-display text-xs font-bold transition flex items-center gap-1.5 hover:scale-105 active:scale-95 shadow-md shrink-0"
                          style={{ background: 'var(--gradient-gold)', color: '#000' }}
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Call Next: {availableForNomination[0].name.split(' ')[0]}
                        </button>
                      )}
                    </div>

                    {/* Search & Role Filter */}
                    <div className="space-y-2 mb-3 shrink-0">
                      <div className="relative">
                        <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={nominateSearch}
                          onChange={(e) => setNominateSearch(e.target.value)}
                          placeholder="Search player by name or country..."
                          className="w-full pl-9 pr-3 py-2 bg-[var(--broadcast-surface)] border border-[var(--broadcast-border)] rounded-lg text-xs text-white outline-none focus:border-amber-400/60"
                        />
                      </div>

                      <div className="flex gap-1.5 overflow-x-auto pb-1 text-[10px] font-bold">
                        {['ALL', 'BATTER', 'BOWLER', 'ALL-ROUNDER', 'WICKETKEEPER'].map(r => (
                          <button
                            key={r}
                            onClick={() => setNominateRoleFilter(r)}
                            className={`px-2.5 py-1 rounded-md transition uppercase tracking-wider ${
                              nominateRoleFilter === r 
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                                : 'bg-white/5 text-[var(--text-muted)] hover:text-white'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Scrollable Player Nomination List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
                      {availableForNomination.length === 0 ? (
                        <div className="text-center py-12 text-[var(--text-muted)] text-xs">
                          No matching players available in pool.
                        </div>
                      ) : (
                        availableForNomination.map(player => (
                          <div
                            key={player._id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/5 hover:border-amber-500/40 transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                                {player.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-white truncate">{player.name}</span>
                                  {player.isOverseas && (
                                    <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1 rounded font-bold">
                                      ✈
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-[var(--text-muted)]">
                                  {player.role} • {player.country || 'India'} • Base: ₹{player.basePrice?.toFixed(2)} Cr
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleNominatePlayer(player._id)}
                              disabled={nominatingPlayerId !== null}
                              className="px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 disabled:opacity-40 shrink-0"
                            >
                              <Gavel className="w-3 h-3" /> Call Up
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  /* Waiting for Auctioneer banner */
                  <div className="text-center p-8 max-w-md bg-[var(--broadcast-card)] rounded-2xl border border-[var(--broadcast-border)] shadow-xl animate-fade-in">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 bg-amber-500/15 border-2 border-amber-500/40 relative">
                      <div className="absolute inset-0 rounded-full border border-amber-400 animate-ping opacity-25"></div>
                      <Gavel className="w-10 h-10 text-amber-400" />
                    </div>
                    <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      AUCTIONEER IN CONTROL
                    </span>
                    <h2 className="font-display text-xl md:text-2xl font-bold text-white mt-3 mb-1.5">
                      Selecting Next Player
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      {auctioneerUser?.displayName || auctioneerUser?.username || 'The Auctioneer'} is choosing which player to call up next to the table.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-amber-300/80 font-medium">
                      <Sparkles className="w-3.5 h-3.5 animate-spin-slow" /> Name will be revealed when called up
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center opacity-60 p-6">
                  <Gavel className="w-16 h-16 text-[var(--gold-primary)] mx-auto mb-3 opacity-30" />
                  <h2 className="font-display text-2xl font-bold">LOBBY STAGE</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Waiting for auction to begin...</p>
                </div>
              )
            )}
          </div>

          {/* Bottom Live Feed & Ticker Bar */}
          <div className="h-10 border-t border-[var(--broadcast-border)] bg-[var(--broadcast-surface)] overflow-hidden flex items-center shrink-0">
            <div className="bg-[var(--gold-primary)] text-black h-full px-3.5 flex items-center font-bold text-[11px] uppercase tracking-widest shrink-0 z-10">
              ⚡ LIVE FEED
            </div>
            <div className="flex-1 whitespace-nowrap overflow-hidden pl-4 flex items-center gap-6">
              {chatMessages.filter(m => m.isSystem || m.type === 'SOLD' || m.type === 'BID').slice(-8).reverse().map((msg, idx) => (
                <div key={idx} className="inline-flex items-center gap-2 text-xs">
                  {msg.type === 'SOLD' ? (
                    <span className="text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                      {msg.message || msg.text}
                    </span>
                  ) : msg.type === 'BID' ? (
                    <span className="text-yellow-300 font-medium">
                      {msg.message || msg.text}
                    </span>
                  ) : (
                    <span className="text-gray-300">
                      {msg.message || msg.text}
                    </span>
                  )}
                  <span className="text-[var(--text-muted)]">•</span>
                </div>
              ))}
              {bids.slice(0, 5).map((b, i) => {
                const team = room.teams?.find(t => t._id === b.teamId);
                return (
                  <div key={`bid-${i}`} className="inline-flex items-center gap-1.5 text-xs">
                    <span style={{ color: team?.primaryColor || '#f5a623' }} className="font-bold">{team?.shortName || 'Team'}</span>
                    <span className="text-[var(--text-secondary)]">bid</span>
                    <span className="text-white font-bold">₹{b.amount} Cr</span>
                    <span className="text-[var(--text-muted)]">•</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUMN 3: RIGHT PANEL - Franchises, Live Feed, Pool Tabs (Desktop) */}
        <div className="w-80 xl:w-96 flex-shrink-0 h-full border-l border-[var(--broadcast-border)] bg-[var(--broadcast-surface)] hidden lg:flex flex-col z-10">
          
          {/* Tabs Navigation Header */}
          <div className="border-b border-[var(--broadcast-border)] bg-[var(--broadcast-card)] flex shrink-0">
            <button 
              onClick={() => setActiveTab('franchises')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition ${
                activeTab === 'franchises' 
                  ? 'border-[var(--gold-primary)] text-[var(--gold-primary)] bg-white/5' 
                  : 'border-transparent text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Franchises
            </button>

            <button 
              onClick={() => setActiveTab('feed')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition relative ${
                activeTab === 'feed' 
                  ? 'border-[var(--gold-primary)] text-[var(--gold-primary)] bg-white/5' 
                  : 'border-transparent text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Live Feed
              {chatMessages.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-[var(--gold-primary)] animate-pulse"></span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('pool')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition ${
                activeTab === 'pool' 
                  ? 'border-[var(--gold-primary)] text-[var(--gold-primary)] bg-white/5' 
                  : 'border-transparent text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Pool
            </button>
          </div>

          {/* Desktop Right Panel Content */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {activeTab === 'franchises' && renderFranchisesTab()}
            {activeTab === 'feed' && renderChatTab()}
            {activeTab === 'pool' && renderPoolTab()}
          </div>

          {/* Persistent Footer Card */}
          {myTeam && !isAuctioneer && (
            <div className="p-3 bg-[var(--broadcast-card)] border-t border-[var(--broadcast-border)] shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                  My Team: <span className="text-white">{myTeam.name}</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[var(--gold-primary)] text-black">
                  {myTeam.shortName}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[var(--broadcast-surface)] p-1.5 rounded border border-[var(--broadcast-border)]">
                  <p className="text-[8px] text-[var(--text-muted)] uppercase">Purse Left</p>
                  <p className="font-bold text-[var(--gold-primary)]">₹{myTeam.purse?.remaining?.toFixed(2)}</p>
                </div>
                <div className="bg-[var(--broadcast-surface)] p-1.5 rounded border border-[var(--broadcast-border)]">
                  <p className="text-[8px] text-[var(--text-muted)] uppercase">Squad</p>
                  <p className="font-bold text-white">{myTeam.squad?.length || 0}/{room.settings?.squadSize || 25}</p>
                </div>
                <div className="bg-[var(--broadcast-surface)] p-1.5 rounded border border-[var(--broadcast-border)]">
                  <p className="text-[8px] text-[var(--text-muted)] uppercase">Squad Overseas</p>
                  <p className="font-bold text-white">{myTeam.overseas || 0}/{room.settings?.overseasLimit || 8}</p>
                  <p className="text-[7px] text-[var(--text-muted)]">Max {room.settings?.maxOverseasXI || 4} in XI</p>
                </div>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
