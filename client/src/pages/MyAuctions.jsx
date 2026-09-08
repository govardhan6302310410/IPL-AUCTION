import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Clock, ArrowRight, Plus, Trash2, Radio, Play } from 'lucide-react';
import useRoomStore from '../store/roomStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const STATUS_CONFIG = {
  LOBBY: { bg: 'rgba(59,130,246,0.15)', color: '#38bdf8', border: 'rgba(56,189,248,0.3)', label: 'LOBBY' },
  IN_PROGRESS: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'rgba(248,113,113,0.3)', label: 'LIVE' },
  PAUSED: { bg: 'rgba(245,166,35,0.15)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)', label: 'PAUSED' },
  COMPLETED: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: 'rgba(52,211,153,0.3)', label: 'COMPLETED' },
  ABANDONED: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', border: 'rgba(148,163,184,0.3)', label: 'CLOSED' }
};

export default function MyAuctions() {
  const { myRooms, fetchMyRooms, deleteRoom, isLoading } = useRoomStore();
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { fetchMyRooms(); }, []);

  const handleDelete = async (e, roomId, roomName) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete auction "${roomName || roomId}"? This action cannot be undone.`)) {
      return;
    }
    try {
      setDeletingId(roomId);
      await deleteRoom(roomId);
    } catch (err) {
      alert(err.message || 'Failed to delete room');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-white">
            My Auctions
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Manage your created franchise rooms, past draft archives, and active lobbies
          </p>
        </div>

        <Link 
          to="/create" 
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition hover:opacity-90 active:scale-95 shadow-md self-start sm:self-auto shrink-0"
          style={{ background: 'var(--gradient-gold)', color: '#000' }}
        >
          <Plus className="w-4 h-4" />
          <span>New Auction</span>
        </Link>
      </div>

      {isLoading && myRooms.length === 0 ? (
        <LoadingSpinner size="lg" text="Loading auctions..." />
      ) : myRooms.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-[var(--broadcast-card)] border border-[var(--broadcast-border)]">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-white/5 border border-white/10 text-[var(--text-muted)]">
            <Trophy className="w-8 h-8" />
          </div>
          <p className="text-base sm:text-lg font-bold text-white">No auctions found</p>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
            You haven't hosted any auctions yet. Start a multiplayer draft room or play solo with AI!
          </p>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl text-xs font-bold transition hover:opacity-90"
            style={{ background: 'var(--gradient-gold)', color: '#000' }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Auction</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {myRooms.map(room => {
            const config = STATUS_CONFIG[room.status] || STATUS_CONFIG.LOBBY;
            const linkTo = room.status === 'LOBBY' ? `/room/${room.roomId}/lobby`
              : room.status === 'COMPLETED' ? `/auction/${room._id}/results`
              : `/room/${room.roomId}`;

            return (
              <div key={room.roomId} className="relative group">
                <Link 
                  to={linkTo}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 bg-[var(--broadcast-card)] border border-[var(--broadcast-border)] hover:border-amber-500/40 hover:shadow-lg gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                    <div className="font-mono font-bold text-xs sm:text-sm px-2.5 py-1 rounded-lg bg-black/40 border border-amber-500/30 text-[var(--gold-primary)] shrink-0 tracking-wider">
                      {room.roomId}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-display font-bold text-sm sm:text-base text-white truncate">
                          {room.name}
                        </p>
                        {room.settings?.isAIRoom && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            AI
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--text-muted)] flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-cyan-400" /> 
                          <span>{room.participants?.length || 0}/{room.settings?.maxTeams || 10} Franchises</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> 
                          <span>{new Date(room.createdAt).toLocaleDateString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 shrink-0">
                    <span 
                      className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border flex items-center gap-1.5"
                      style={{ backgroundColor: config.bg, color: config.color, borderColor: config.border }}
                    >
                      {room.status === 'IN_PROGRESS' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />}
                      {config.label}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDelete(e, room.roomId, room.name)}
                        disabled={deletingId === room.roomId}
                        title="Delete Auction"
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/15 transition disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-amber-400 group-hover:bg-amber-500/10 transition">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
