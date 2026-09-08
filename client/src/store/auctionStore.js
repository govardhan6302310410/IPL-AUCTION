import { create } from 'zustand';

const useAuctionStore = create((set, get) => ({
  room: null,
  currentPlayer: null,
  currentBid: 0,
  highestBidder: null,
  nextMinBid: 0.2,
  timer: 15,
  bids: [],
  auctionStatus: 'LOBBY', // 'LOBBY' | 'BIDDING' | 'SOLD' | 'UNSOLD' | 'PAUSED' | 'COMPLETED'
  soldData: null,
  unsoldData: null,
  bidRejectedMsg: null,
  chatMessages: [],
  isConnected: false,

  setConnected: (val) => set({ isConnected: val }),
  clearRejection: () => set({ bidRejectedMsg: null }),

  initAuctionState: (data) => {
    const room = data.room;
    const bidAmount = typeof data.currentBid === 'object' ? (Number(data.currentBid?.amount) || 0) : (Number(data.currentBid) || 0);
    const bidderId = (data.currentBidder?._id || data.currentBidder)?.toString();
    const currentBidderTeam = bidderId ? data.room?.teams?.find(t => (t._id || t.id)?.toString() === bidderId) : null;

    set({
      room,
      currentPlayer: data.currentPlayer,
      currentBid: bidAmount,
      highestBidder: currentBidderTeam || null,
      nextMinBid: bidAmount > 0 
        ? parseFloat((bidAmount + (room?.settings?.bidIncrement || 0.25)).toFixed(2))
        : (data.currentPlayer?.basePrice || 0.2),
      bids: data.bids || [],
      auctionStatus: data.status || 'BIDDING'
    });
  },

  onPlayerNominated: (data) => {
    set((state) => {
      // Mark current player in playerPool
      let updatedPool = state.room?.auction?.playerPool;
      if (updatedPool && data.player) {
        const nomId = (data.player._id || data.player).toString();
        updatedPool = updatedPool.map(p => {
          const pId = (p._id || p).toString();
          if (pId === nomId) {
            return typeof p === 'object' ? { ...p, isNominated: true } : p;
          }
          return p;
        });
      }

      const base = Number(data.basePrice || data.player?.basePrice || 0.2);
      return {
        currentPlayer: data.player,
        currentBid: base,
        highestBidder: null,
        nextMinBid: base,
        timer: data.timerDuration || 15,
        auctionStatus: 'BIDDING',
        soldData: null,
        unsoldData: null,
        bidRejectedMsg: null,
        room: state.room ? {
          ...state.room,
          auction: {
            ...state.room.auction,
            playerPool: updatedPool || state.room.auction?.playerPool
          }
        } : null
      };
    });
  },

  onBidUpdate: (data) => {
    const rawBidder = data.highestBidder;
    let normalizedBidder = rawBidder;
    if (rawBidder) {
      const bId = (rawBidder._id || rawBidder.teamId || rawBidder.id)?.toString();
      normalizedBidder = {
        ...rawBidder,
        _id: bId,
        id: bId,
        teamId: bId,
        name: rawBidder.name || rawBidder.teamName || 'Team',
        teamName: rawBidder.teamName || rawBidder.name || 'Team',
        shortName: rawBidder.shortName || rawBidder.teamShortName || 'TEAM',
        teamShortName: rawBidder.teamShortName || rawBidder.shortName || 'TEAM',
        primaryColor: rawBidder.primaryColor || '#f5a623'
      };
    }

    const newCurrentBid = typeof data.currentBid === 'object' 
      ? (Number(data.currentBid?.amount) || 0) 
      : (Number(data.currentBid) || 0);

    const calculatedNext = Number(data.nextMinBid) || parseFloat((newCurrentBid + 0.25).toFixed(2));

    set((state) => ({
      currentBid: newCurrentBid,
      highestBidder: normalizedBidder,
      nextMinBid: calculatedNext,
      bids: data.bid ? [data.bid, ...(state.bids || [])] : (state.bids || [])
    }));
  },

  onBidRejected: (data) => {
    set({ bidRejectedMsg: data.reason });
    setTimeout(() => set({ bidRejectedMsg: null }), 4000);
  },

  onTimerUpdate: (data) => set({ timer: data.remaining }),

  onPlayerSold: (data) => {
    set((state) => {
      // Update team in room with full squad & squadDetails
      const updatedTeams = state.room?.teams?.map(t => {
        if (t._id === data.team._id) {
          const currentSquad = t.squad || [];
          const currentSquadDetails = t.squadDetails || [];
          return {
            ...t,
            purse: { ...t.purse, remaining: data.team.remainingPurse },
            squad: [...currentSquad, data.player],
            squadDetails: [
              ...currentSquadDetails,
              { player: data.player, boughtFor: data.amount, boughtAt: new Date() }
            ],
            overseas: data.team.overseasCount
          };
        }
        return t;
      });

      // Update playerPool: mark as sold
      let updatedPool = state.room?.auction?.playerPool;
      if (updatedPool && data.player) {
        const soldId = (data.player._id || data.player).toString();
        updatedPool = updatedPool.map(p => {
          const pId = (p._id || p).toString();
          if (pId === soldId) {
            return typeof p === 'object'
              ? { ...p, isSold: true, soldTo: data.team.shortName || data.team.name, soldFor: data.amount }
              : p;
          }
          return p;
        });
      }

      return {
        auctionStatus: 'SOLD',
        soldData: data,
        room: state.room ? {
          ...state.room,
          teams: updatedTeams,
          auction: {
            ...state.room.auction,
            playerPool: updatedPool || state.room.auction?.playerPool
          }
        } : null
      };
    });
  },

  onPlayerUnsold: (data) => {
    set((state) => {
      let updatedPool = state.room?.auction?.playerPool;
      if (updatedPool && data.player) {
        const unId = (data.player._id || data.player).toString();
        updatedPool = updatedPool.map(p => {
          const pId = (p._id || p).toString();
          if (pId === unId) {
            return typeof p === 'object' ? { ...p, isUnsold: true } : p;
          }
          return p;
        });
      }

      return {
        auctionStatus: 'UNSOLD',
        unsoldData: data,
        room: state.room ? {
          ...state.room,
          auction: {
            ...state.room.auction,
            playerPool: updatedPool || state.room.auction?.playerPool
          }
        } : null
      };
    });
  },

  onWaitingNomination: (data) => {
    set({
      auctionStatus: 'NOMINATING',
      currentPlayer: null,
      currentBid: 0,
      highestBidder: null,
      soldData: null,
      unsoldData: null
    });
  },

  onChatMessage: (msg) => {
    // Normalize message format
    const normalized = {
      _id: msg._id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: msg.userId,
      user: msg.user || msg.senderName || 'Anonymous',
      senderName: msg.senderName || msg.user || 'Anonymous',
      message: msg.message || msg.text || '',
      text: msg.text || msg.message || '',
      timestamp: msg.timestamp || new Date().toISOString(),
      isSystem: !!msg.isSystem,
      type: msg.type || 'CHAT',
      amount: msg.amount,
      teamColor: msg.teamColor,
      teamName: msg.teamName,
      teamShortName: msg.teamShortName
    };

    set((state) => ({
      chatMessages: [...state.chatMessages, normalized].slice(-200)
    }));
  },

  setRoom: (room) => set({ room })
}));

export default useAuctionStore;
