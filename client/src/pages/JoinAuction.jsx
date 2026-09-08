import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Hash, ArrowRight, Users, Globe, Clock } from 'lucide-react';
import useRoomStore from '../store/roomStore';
import useAuthStore from '../store/authStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function JoinAuction() {
  const { roomId: urlRoomId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { joinRoom, fetchPublicRooms, publicRooms, isLoading, error, clearError } = useRoomStore();
  const [roomId, setRoomId] = useState(urlRoomId || '');

  useEffect(() => {
    fetchPublicRooms();
  }, []);

  useEffect(() => {
    if (urlRoomId) {
      setRoomId(urlRoomId);
    }
  }, [urlRoomId]);

  const handleJoin = async (e) => {
    e?.preventDefault();
    if (!roomId.trim()) return;
    if (!isAuthenticated) {
      navigate(`/login?redirect=/join/${roomId}`);
      return;
    }
    try {
      await joinRoom(roomId.toUpperCase().trim());
      navigate(`/room/${roomId.toUpperCase().trim()}/lobby`);
    } catch (err) {}
  };

  const handleJoinPublic = async (rid) => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/join/${rid}`);
      return;
    }
    try {
      await joinRoom(rid);
      navigate(`/room/${rid}/lobby`);
    } catch (err) {}
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        Join Auction
      </h1>
      <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>Enter a Room ID to join an auction, or browse public rooms.</p>

      {/* Room ID Entry */}
      <div className="p-6 rounded-xl mb-8" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm text-red-400" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleJoin} className="flex gap-3">
          <div className="relative flex-1">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text" value={roomId}
              onChange={e => { setRoomId(e.target.value.toUpperCase()); clearError(); }}
              placeholder="Enter Room ID (e.g. 7F3K9Q)"
              maxLength={8}
              className="w-full pl-11 pr-4 py-4 rounded-xl text-lg font-display font-bold tracking-widest outline-none text-center uppercase"
              style={{ backgroundColor: 'var(--broadcast-surface)', border: '2px solid var(--broadcast-border)', color: 'var(--text-primary)', letterSpacing: '0.3em' }}
            />
          </div>
          <button type="submit" disabled={isLoading || !roomId.trim()}
            className="px-8 py-4 rounded-xl font-bold text-sm transition hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
            style={{ background: 'var(--gradient-gold)', color: '#000' }}>
            {isLoading ? 'Joining...' : <>Join <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
      </div>

      {/* Public Rooms */}
      {publicRooms.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Globe className="w-5 h-5" style={{ color: '#3b82f6' }} /> Public Rooms
          </h2>
          <div className="space-y-3">
            {publicRooms.map(room => (
              <div key={room.roomId} className="p-4 rounded-xl flex items-center justify-between"
                style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-sm px-2 py-1 rounded" style={{ backgroundColor: 'rgba(245,166,35,0.15)', color: 'var(--gold-primary)' }}>
                      {room.roomId}
                    </span>
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{room.name}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {room.participants?.length || 0}/{room.settings?.maxTeams}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(room.createdAt).toLocaleTimeString()}</span>
                    <span>by {room.admin?.displayName || room.admin?.username}</span>
                  </div>
                </div>
                <button onClick={() => handleJoinPublic(room.roomId)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-80"
                  style={{ background: 'var(--gradient-gold)', color: '#000' }}>
                  Join
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
