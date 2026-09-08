import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.roomId = null;
  }

  connect(roomId, callbacks = {}) {
    this.roomId = roomId;
    const token = localStorage.getItem('auction_token');

    if (this.socket) {
      this.socket.disconnect();
    }

    const serverUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.origin : 'http://localhost:5000');

    this.socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.socket.emit('room:join', { roomId });
      if (callbacks.onConnect) callbacks.onConnect();
    });

    this.socket.on('auction:state', (data) => callbacks.onAuctionState?.(data));
    this.socket.on('auction:started', (data) => callbacks.onAuctionStarted?.(data));
    this.socket.on('player:nominated', (data) => callbacks.onPlayerNominated?.(data));
    this.socket.on('bid:update', (data) => callbacks.onBidUpdate?.(data));
    this.socket.on('bid:rejected', (data) => callbacks.onBidRejected?.(data));
    this.socket.on('timer:update', (data) => callbacks.onTimerUpdate?.(data));
    this.socket.on('player:sold', (data) => callbacks.onPlayerSold?.(data));
    this.socket.on('player:unsold', (data) => callbacks.onPlayerUnsold?.(data));
    this.socket.on('team:inactive', (data) => callbacks.onTeamInactive?.(data));
    this.socket.on('auction:paused', (data) => callbacks.onAuctionPaused?.(data));
    this.socket.on('auction:resumed', (data) => callbacks.onAuctionResumed?.(data));
    this.socket.on('auction:completed', (data) => callbacks.onAuctionCompleted?.(data));
    this.socket.on('auction:waiting_nomination', (data) => callbacks.onWaitingNomination?.(data));
    this.socket.on('chat:broadcast', (data) => callbacks.onChatMessage?.(data));

    this.socket.on('disconnect', () => {
      if (callbacks.onDisconnect) callbacks.onDisconnect();
    });
  }

  startAuction() {
    if (this.socket && this.roomId) {
      this.socket.emit('auction:start', { roomId: this.roomId });
    }
  }

  nominatePlayer(playerId) {
    if (this.socket && this.roomId) {
      this.socket.emit('auction:nominate', { roomId: this.roomId, playerId });
    }
  }

  placeBid(teamIdOrAmount, maybeAmount) {
    const amount = typeof maybeAmount !== 'undefined' ? maybeAmount : teamIdOrAmount;
    const teamId = typeof maybeAmount !== 'undefined' ? teamIdOrAmount : null;
    if (this.socket) {
      const roomTarget = this.roomId || this.socket.roomId;
      const payload = { roomId: roomTarget, amount: Number(amount) };
      if (teamId) payload.teamId = teamId;
      this.socket.emit('bid:place', payload);
    }
  }

  pauseAuction() {
    if (this.socket) {
      const roomTarget = this.roomId || this.socket.roomId;
      this.socket.emit('auction:pause', { roomId: roomTarget });
    }
  }

  resumeAuction() {
    if (this.socket) {
      const roomTarget = this.roomId || this.socket.roomId;
      this.socket.emit('auction:resume', { roomId: roomTarget });
    }
  }

  endAuction() {
    if (this.socket) {
      const roomTarget = this.roomId || this.socket.roomId;
      this.socket.emit('auction:end', { roomId: roomTarget });
    }
  }

  sendChatMessage(message) {
    this.sendChat(message);
  }

  sendChat(message) {
    if (this.socket) {
      const roomTarget = this.roomId || this.socket.roomId;
      this.socket.emit('chat:message', { roomId: roomTarget, message });
    }
  }

  disconnect() {
    if (this.socket) {
      const s = this.socket;
      this.socket = null;
      try {
        s.removeAllListeners();
        if (s.connected) {
          s.disconnect();
        } else {
          s.once('connect', () => {
            try { s.disconnect(); } catch (e) {}
          });
          setTimeout(() => {
            try { s.disconnect(); } catch (e) {}
          }, 300);
        }
      } catch (err) {
        // Safe dev cleanup
      }
    }
  }
}

export default new SocketService();
