import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, Check, Users, Crown, Shield, ChevronRight, Radio, Link as LinkIcon, Gavel, Bot, Sparkles } from 'lucide-react';
import useRoomStore from '../store/roomStore';
import useAuthStore from '../store/authStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import socketService from '../services/socketService';

export default function AuctionLobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentRoom, fetchRoom, selectTeam, setReady, setAuctioneer, updateSettings, isLoading, error } = useRoomStore();
  const [copied, setCopied] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

  const loadRoom = useCallback(async () => {
    try {
      const room = await fetchRoom(roomId);
      if (room.status === 'IN_PROGRESS') {
        navigate(`/room/${roomId}`);
      }
    } catch (err) {
      console.error('Failed to load room:', err);
    }
  }, [roomId, fetchRoom, navigate]);

  useEffect(() => {
    loadRoom();
    // Poll for updates every 3 seconds (will be replaced by sockets in Phase 5)
    const interval = setInterval(loadRoom, 3000);
    setRefreshInterval(interval);
    return () => clearInterval(interval);
  }, [loadRoom]);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectTeam = async (teamIndex) => {
    try {
      await selectTeam(roomId, teamIndex);
      await loadRoom();
    } catch (err) {}
  };

  const handleReady = async () => {
    const currentUserId = (user?._id || user?.id)?.toString();
    const myParticipant = currentRoom?.participants?.find(p => (p.user?._id || p.user)?.toString() === currentUserId);
    const isReady = myParticipant?.status === 'READY';
    try {
      await setReady(roomId, !isReady);
      await loadRoom();
    } catch (err) {}
  };

  const handleToggleAIMode = async () => {
    if (!isAdmin) return;
    try {
      const nextVal = !currentRoom?.settings?.isAIRoom;
      await updateSettings(roomId, { isAIRoom: nextVal });
      await loadRoom();
    } catch (err) {}
  };

  const handleMaxTeamsChange = async (e) => {
    if (!isAdmin) return;
    const maxTeams = parseInt(e.target.value);
    try {
      await updateSettings(roomId, { maxTeams });
      await loadRoom();
    } catch (err) {}
  };

  const handleAuctioneerChange = async (e) => {
    const selectedUserId = e.target.value;
    try {
      await setAuctioneer(roomId, selectedUserId || null);
      await loadRoom();
    } catch (err) {}
  };

  const handleStart = () => {
    if (isStarting) return;
    setIsStarting(true);
    socketService.connect(roomId, {
      onConnect: () => {
        socketService.startAuction();
      },
      onAuctionStarted: () => {
        navigate(`/room/${roomId}`);
      }
    });
  };

  if (isLoading && !currentRoom) return <LoadingSpinner size="lg" text="Loading room..." />;
  if (!currentRoom) return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>Room not found</div>;

  const room = currentRoom;
  const currentUserId = (user?._id || user?.id)?.toString();
  const isAdmin = (room.admin?._id || room.admin)?.toString() === currentUserId;
  const myParticipant = room.participants?.find(p => (p.user?._id || p.user)?.toString() === currentUserId);
  const myTeamIndex = myParticipant?.teamIndex ?? -1;
  const isReady = myParticipant?.status === 'READY';
  
  const auctioneerId = (room.auctioneer?._id || room.auctioneer)?.toString();
  const isAIAuctioneer = !!room.settings?.isAIAuctioneer;
  const isAIRoom = !!room.settings?.isAIRoom;
  const maxTeams = room.settings?.maxTeams || 10;

  // Filter human participants (ignoring AI auctioneer bot if present)
  const humanParticipants = room.participants?.filter(p => {
    if (p.isAI) return false;
    const uid = (p.user?._id || p.user)?.toString();
    if (isAIAuctioneer && uid === auctioneerId) return false;
    return true;
  }) || [];

  const readyCount = humanParticipants.filter(p => p.status === 'READY').length;
  const allReady = humanParticipants.length > 0 && readyCount === humanParticipants.length;
  
  const isAuctioneer = !!(auctioneerId && auctioneerId === currentUserId && !isAIAuctioneer);
  const auctioneerUser = isAIAuctioneer
    ? { displayName: 'Auctioneer (AI)', isAI: true }
    : (humanParticipants.find(p => (p.user?._id || p.user)?.toString() === auctioneerId)?.user || (typeof room.auctioneer === 'object' ? room.auctioneer : null));

  const drafters = auctioneerId
    ? humanParticipants.filter(p => (p.user?._id || p.user)?.toString() !== auctioneerId)
    : humanParticipants;
  const allTeamsClaimed = drafters.length > 0 ? drafters.every(p => p.teamIndex >= 0) : true;
  const canStart = allReady && allTeamsClaimed && isAdmin;

  // AI Calculations for live preview
  const claimedHumansCount = drafters.filter(p => p.teamIndex >= 0).length;
  const aiTeamsCount = isAIRoom ? Math.max(0, maxTeams - claimedHumansCount) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Room Header */}
      <div className="p-6 rounded-2xl mb-6" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Radio className="w-4 h-4 animate-pulse-live" style={{ color: 'var(--live-red)' }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--live-red)' }}>Lobby</span>
              {isAIRoom && (
                <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                  <Bot className="w-3 h-3" /> Play with AI
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{room.name}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {humanParticipants.length} player{humanParticipants.length !== 1 ? 's' : ''} joined • {readyCount}/{humanParticipants.length} ready
              {isAIRoom && ` • ${maxTeams} Total Teams (${aiTeamsCount} AI)`}
            </p>
          </div>

          {/* Room ID Share */}
          <div className="text-center">
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>ROOM ID</p>
            <div className="flex items-center gap-2">
              <span className="font-display text-3xl font-bold tracking-widest px-4 py-2 rounded-xl"
                style={{ backgroundColor: 'var(--broadcast-surface)', color: 'var(--gold-primary)', border: '2px dashed var(--gold-primary)', letterSpacing: '0.2em' }}>
                {room.roomId}
              </span>
            </div>
            <div className="flex gap-2 mt-2 justify-center">
              <button onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80"
                style={{ border: '1px solid var(--broadcast-border)', color: 'var(--text-secondary)' }}>
                {copied ? <Check className="w-3 h-3" style={{ color: 'var(--sold-green)' }} /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy ID'}
              </button>
              <button onClick={handleCopyLink}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80"
                style={{ border: '1px solid var(--broadcast-border)', color: 'var(--text-secondary)' }}>
                <LinkIcon className="w-3 h-3" /> Copy Link
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm text-red-400" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
          {error}
        </div>
      )}

      {/* Play with AI Configuration Card */}
      <div className="p-5 rounded-2xl mb-6 transition-all" style={{ backgroundColor: 'var(--broadcast-card)', border: isAIRoom ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--broadcast-border)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>Play with AI Mode</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  Difficult AI
                </span>
                {isAIRoom && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Active
                  </span>
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {isAIRoom 
                  ? 'Fills unoccupied team slots with Difficult AI bots and auto-assigns 1 dedicated AI Auctioneer.' 
                  : 'Enable this to run an auction solo or with a small group filled with competitive AI teams.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            {isAIRoom && isAdmin && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--text-secondary)] font-medium">Total Teams:</label>
                <select
                  value={maxTeams}
                  onChange={handleMaxTeamsChange}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--broadcast-surface)',
                    border: '1px solid var(--broadcast-border)',
                    color: 'var(--text-primary)'
                  }}
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <option key={n} value={n}>{n} Teams</option>
                  ))}
                </select>
              </div>
            )}

            {isAdmin ? (
              <button
                type="button"
                onClick={handleToggleAIMode}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                style={{
                  backgroundColor: isAIRoom ? 'rgba(139, 92, 246, 0.2)' : 'var(--broadcast-surface)',
                  color: isAIRoom ? '#a855f7' : 'var(--text-secondary)',
                  border: isAIRoom ? '1px solid #8b5cf6' : '1px solid var(--broadcast-border)'
                }}
              >
                {isAIRoom ? 'AI Enabled' : 'Enable AI Mode'}
              </button>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded font-medium" style={{ backgroundColor: isAIRoom ? 'rgba(139, 92, 246, 0.15)' : 'var(--broadcast-surface)', color: isAIRoom ? '#a855f7' : 'var(--text-muted)' }}>
                {isAIRoom ? 'AI Mode Enabled' : 'Human Multiplayer'}
              </span>
            )}
          </div>
        </div>

        {/* Live Slot Breakdown Pill */}
        {isAIRoom && (
          <div className="mt-4 pt-3 border-t border-purple-500/20 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-purple-200">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
              <span className="font-semibold">{maxTeams} Total Franchises:</span>
            </div>
            <span className="px-2.5 py-1 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300 font-medium">
              👥 {claimedHumansCount} Human {claimedHumansCount === 1 ? 'Player' : 'Players'}
            </span>
            <span className="px-2.5 py-1 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 font-medium">
              🤖 {aiTeamsCount} AI Teams (Difficult)
            </span>
            <span className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium flex items-center gap-1">
              <Gavel className="w-3 h-3" /> +1 AI Auctioneer
            </span>
          </div>
        )}
      </div>

      {/* Team Selection or Auctioneer Restricted View */}
      {isAuctioneer ? (
        <div className="p-6 rounded-2xl mb-8 border border-amber-500/30 text-center bg-gradient-to-b from-amber-500/10 to-transparent">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg">
            <Gavel className="w-6 h-6" />
          </div>
          <h3 className="font-display text-lg font-bold text-white mb-1">
            You are the Assigned Auctioneer
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-lg mx-auto leading-relaxed">
            As the Auctioneer, you preside over the live auction and manually choose which players come up to the bidding block. You do not select or build a franchise squad.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-300 font-semibold px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30">
            <span>Ready up below when you are set to conduct the auction</span>
          </div>
        </div>
      ) : (
        <>
          <h2 className="font-display text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Shield className="w-5 h-5" style={{ color: 'var(--gold-primary)' }} /> Select Your Team
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3 mb-8">
            {room.teams?.map((team, index) => {
              const teamOwnerId = (team.owner?._id || team.owner)?.toString();
              const ownerParticipant = room.participants?.find(p => (p.user?._id || p.user)?.toString() === teamOwnerId);
              const ownerUser = ownerParticipant?.user || (typeof team.owner === 'object' ? team.owner : null);
              const isMine = (myTeamIndex === index) || (teamOwnerId && teamOwnerId === currentUserId);
              const isClaimed = !!teamOwnerId;
              const isClaimedByOther = isClaimed && !isMine;

              return (
                <button
                  key={index}
                  onClick={() => !isClaimedByOther && handleSelectTeam(index)}
                  disabled={isClaimedByOther}
                  className="p-3 sm:p-4 rounded-xl text-left transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed flex flex-col justify-between"
                  style={{
                    backgroundColor: isMine ? `${team.primaryColor}18` : 'var(--broadcast-card)',
                    border: isMine ? `2px solid ${team.primaryColor}` : '1px solid var(--broadcast-border)'
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-display font-bold text-xs sm:text-sm shrink-0"
                      style={{ backgroundColor: team.primaryColor + '30', color: team.primaryColor }}>
                      {team.shortName}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs sm:text-sm truncate" style={{ color: 'var(--text-primary)' }}>{team.name}</p>
                      {isClaimed && (
                        <p className="text-[11px] truncate font-medium" style={{ color: isMine ? team.primaryColor : 'var(--text-muted)' }}>
                          {isMine ? '✓ You' : ownerUser?.displayName || ownerUser?.username || 'Claimed'}
                        </p>
                      )}
                    </div>
                  </div>
                  {!isClaimed && (
                    <p className="text-[11px] text-[var(--sold-green)] font-semibold">Available</p>
                  )}
                  {isMine && (
                    <div className="mt-1.5 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded text-center uppercase tracking-wider" style={{ backgroundColor: team.primaryColor + '30', color: team.primaryColor }}>
                      YOUR TEAM
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Optional Auctioneer Role Selection */}
      <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(245, 166, 35, 0.15)', color: 'var(--gold-primary)' }}>
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Auctioneer Role</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-gray-400">Optional</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {auctioneerUser 
                  ? `${auctioneerUser.displayName || auctioneerUser.username} will manually choose which player comes up next.` 
                  : 'System will automatically sequence players (Default flow).'}
              </p>
            </div>
          </div>

          {isAdmin ? (
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs text-[var(--text-secondary)] font-medium">Assign:</label>
              <select
                value={auctioneerId || ''}
                onChange={handleAuctioneerChange}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold outline-none cursor-pointer"
                style={{
                  backgroundColor: 'var(--broadcast-surface)',
                  border: '1px solid var(--broadcast-border)',
                  color: auctioneerId ? 'var(--gold-primary)' : 'var(--text-secondary)'
                }}
              >
                <option value="">None (Automatic)</option>
                {humanParticipants.map((p, idx) => {
                  const pId = (p.user?._id || p.user)?.toString();
                  const pName = p.user?.displayName || p.user?.username || `Player ${idx + 1}`;
                  return (
                    <option key={pId || idx} value={pId}>
                      {pName} {pId === currentUserId ? '(You)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <div className="text-xs font-semibold px-2.5 py-1 rounded self-start sm:self-auto" style={{ backgroundColor: auctioneerId ? 'rgba(245, 166, 35, 0.15)' : 'var(--broadcast-surface)', color: auctioneerId ? 'var(--gold-primary)' : 'var(--text-muted)' }}>
              {auctioneerUser ? `Auctioneer: ${auctioneerUser.displayName || auctioneerUser.username}` : 'No Auctioneer (Automatic)'}
            </div>
          )}
        </div>
      </div>

      {/* Participants List */}
      <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <Users className="w-5 h-5" /> Players ({humanParticipants.length})
      </h2>
      <div className="space-y-2 mb-8">
        {humanParticipants.map((p, i) => {
          const pUserId = (p.user?._id || p.user)?.toString();
          const isParticipantAdmin = (room.admin?._id || room.admin)?.toString() === pUserId;
          const isParticipantAuctioneer = auctioneerId && auctioneerId === pUserId;
          const pTeam = p.teamIndex >= 0 ? room.teams[p.teamIndex] : null;
          return (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg"
              style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
              <div className="flex items-center gap-3">
                {isParticipantAdmin && <Crown className="w-4 h-4" style={{ color: 'var(--gold-primary)' }} />}
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {p.user?.displayName || p.user?.username}
                </span>
                {isParticipantAuctioneer && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Gavel className="w-3 h-3" /> AUCTIONEER
                  </span>
                )}
                {pTeam && (
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: pTeam.primaryColor + '20', color: pTeam.primaryColor }}>
                    {pTeam.shortName}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded"
                style={{
                  backgroundColor: p.status === 'READY' ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)',
                  color: p.status === 'READY' ? 'var(--sold-green)' : 'var(--text-muted)'
                }}>
                {p.status}
              </span>
            </div>
          );
        })}
      </div>

      {/* Action Buttons - Sticky on mobile for quick access */}
      <div className="sticky bottom-0 left-0 right-0 p-3 sm:p-0 bg-[var(--broadcast-surface)]/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-t-0 border-[var(--broadcast-border)] -mx-4 sm:mx-0 z-30 shadow-2xl sm:shadow-none mt-6">
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 max-w-5xl mx-auto">
          {(isAuctioneer || myTeamIndex >= 0) && (
            <button onClick={handleReady}
              className="flex-1 min-h-[48px] py-3.5 sm:py-4 rounded-xl font-display text-base sm:text-lg font-bold transition hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
              style={{
                backgroundColor: isReady ? 'rgba(239,68,68,0.15)' : isAuctioneer ? 'rgba(245,166,35,0.15)' : 'rgba(16,185,129,0.15)',
                color: isReady ? 'var(--unsold-red)' : isAuctioneer ? 'var(--gold-primary)' : 'var(--sold-green)',
                border: isReady ? '2px solid var(--unsold-red)' : isAuctioneer ? '2px solid var(--gold-primary)' : '2px solid var(--sold-green)'
              }}>
              {isReady ? 'Cancel Ready' : isAuctioneer ? '✓ Ready as Auctioneer' : '✓ Ready Up'}
            </button>
          )}
          {isAdmin && (
            <button onClick={handleStart} disabled={!canStart || isStarting}
              className="flex-1 min-h-[48px] py-3.5 sm:py-4 rounded-xl font-display text-base sm:text-lg font-black transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg"
              style={{ background: canStart && !isStarting ? 'var(--gradient-gold)' : 'var(--broadcast-border)', color: canStart && !isStarting ? '#000' : 'var(--text-muted)' }}>
              {isStarting ? 'Starting Auction...' : 'Start Auction'} <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
        {isAdmin && !canStart && (
          <p className="text-[11px] sm:text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
            {!allTeamsClaimed ? 'All drafting players must select a franchise' : !allReady ? 'All participants must be ready' : 'Waiting for participants...'}
          </p>
        )}
      </div>
    </div>
  );
}
