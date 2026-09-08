import Room from '../models/Room.js';
import Player from '../models/Player.js';
import Bid from '../models/Bid.js';
import AuctionEvent from '../models/AuctionEvent.js';
import { validateBid } from './BidValidator.js';
import timerManager from './TimerManager.js';
import { calculateMaxLegalBid } from './PurseManager.js';
import { aiBidDecision } from './AIEngine.js';
import { calculateAuctionResults } from '../analytics/winnerEngine.js';
import { buildSetBasedPlayerPool } from './poolBuilder.js';
import { getOrCreateAIAuctioneerUser, getRoomState, getRoomFilter } from '../services/roomService.js';
import { extractPlayerRating } from '../analytics/playerValue.js';
import aiChatEngine from './AIChatEngine.js';
class AuctionEngine {
  constructor() {
    this.io = null;
    this.roomLocks = new Map(); // Concurrency lock per room
  }

  setIO(io) {
    this.io = io;
  }

  async acquireLock(roomId) {
    const key = roomId ? roomId.toString() : 'default';
    const start = Date.now();
    while (this.roomLocks.get(key)) {
      if (Date.now() - start > 400) {
        this.roomLocks.delete(key);
        break;
      }
      await new Promise(r => setTimeout(r, 10));
    }
    this.roomLocks.set(key, true);
  }

  releaseLock(roomId) {
    const key = roomId ? roomId.toString() : 'default';
    this.roomLocks.delete(key);
  }

  broadcast(roomId, event, payload) {
    if (this.io) {
      this.io.to(roomId).emit(event, payload);
    }
  }

  async startAuction(roomId, adminUserId) {
    await this.acquireLock(roomId);
    try {
      const room = await Room.findOne(getRoomFilter(roomId)).populate('participants.user');
      if (!room) throw new Error('Room not found');
      const canonicalRoomId = room.roomId;
      if (room.admin.toString() !== adminUserId.toString()) {
        throw new Error('Only room admin can start auction');
      }

      // If auction is already in progress, broadcast current state and return safely
      if (room.status === 'IN_PROGRESS') {
        const broadcastRoom = (await getRoomState(canonicalRoomId)) || room;
        this.broadcast(canonicalRoomId, 'auction:started', { room: broadcastRoom });
        return room;
      }

      // Auto-assign admin to team 0 if no team is claimed
      const hasHumanTeam = room.teams.some(t => t.owner && !t.isAI);
      if (!hasHumanTeam && room.teams.length > 0) {
        room.teams[0].owner = adminUserId;
        room.teams[0].isAI = false;
        const adminPart = room.participants.find(p => p.user && (p.user._id || p.user).toString() === adminUserId.toString());
        if (adminPart) {
          adminPart.teamIndex = 0;
          adminPart.status = 'READY';
        }
      }

      // Ensure each human participant's claimed team owner is synced
      room.participants.forEach((p) => {
        if (!p.isAI && p.teamIndex >= 0 && p.teamIndex < room.teams.length) {
          const t = room.teams[p.teamIndex];
          t.owner = p.user._id || p.user;
          t.isAI = false;
        }
      });

      // Filter to the teams claimed by human participants
      const claimedTeams = room.teams.filter(t => t.owner && !t.isAI);
      const isAIRoom = !!room.settings?.isAIRoom;

      if (isAIRoom) {
        // "Play with AI" mode:
        // Total teams chosen by user = targetCount
        const targetCount = Math.max(2, Math.min(10, room.settings?.maxTeams || 10));
        const unownedTeams = room.teams.filter(t => !t.owner);
        const aiTeamsNeeded = Math.max(0, targetCount - claimedTeams.length);
        const selectedAITeams = unownedTeams.slice(0, aiTeamsNeeded);
        
        selectedAITeams.forEach(t => {
          t.isAI = true;
          t.aiPersonality = 'Difficult';
        });
        
        room.teams = [...claimedTeams, ...selectedAITeams];
        
        // Auto-assign dedicated AI Auctioneer if enabled or auctioneer is missing
        if (room.settings?.isAIAuctioneer || !room.auctioneer) {
          const aiAuctioneer = await getOrCreateAIAuctioneerUser();
          room.auctioneer = aiAuctioneer._id;
          room.settings.isAIAuctioneer = true;
        }
      } else if (claimedTeams.length >= 2) {
        // Human multiplayer auction: Keep ONLY the teams chosen by the joined members
        room.teams = claimedTeams;
      } else if (claimedTeams.length === 1) {
        // Fallback solo test/play: Keep the human team + add AI teams
        const targetCount = Math.max(room.settings?.maxTeams || 4, 4);
        const unownedTeams = room.teams.filter(t => !t.owner);
        const aiTeamsNeeded = Math.max(1, targetCount - 1);
        const selectedAITeams = unownedTeams.slice(0, aiTeamsNeeded);
        selectedAITeams.forEach(t => {
          t.isAI = true;
          t.aiPersonality = 'Difficult';
        });
        room.teams = [...claimedTeams, ...selectedAITeams];
      } else {
        // Fallback
        const targetCount = Math.max(room.settings?.maxTeams || 10, claimedTeams.length);
        const unownedTeams = room.teams.filter(t => !t.owner);
        const aiTeamsNeeded = Math.max(0, targetCount - claimedTeams.length);
        const selectedAITeams = unownedTeams.slice(0, aiTeamsNeeded);
        selectedAITeams.forEach(t => {
          t.isAI = true;
          t.aiPersonality = 'Difficult';
        });
        room.teams = [...claimedTeams, ...selectedAITeams];
      }

      // Set all active auction teams to ACTIVE status
      room.teams.forEach((t) => {
        t.status = 'ACTIVE';
      });

      // Update participant teamIndex so they accurately point to their team in the updated room.teams array
      room.participants.forEach(p => {
        if (p.user) {
          const pUserId = (p.user._id || p.user).toString();
          const newIdx = room.teams.findIndex(t => t.owner && (t.owner._id || t.owner).toString() === pUserId);
          if (newIdx >= 0) {
            p.teamIndex = newIdx;
          }
        }
      });

      // Sync room settings maxTeams to actual team count
      room.settings.maxTeams = room.teams.length;

      // Ensure auction subdocument is initialized
      if (!room.auction) {
        room.auction = {
          status: 'PENDING',
          playerPool: [],
          playerPoolIndex: 0,
          round: 1,
          currentBid: 0,
          bidCount: 0,
          soldPlayers: [],
          unsoldPlayers: []
        };
      }

      // Prepare player pool: Marquee -> Wicketkeepers -> Batters -> All-Rounders -> Fast Bowlers -> Spinners -> Remaining (randomized within each set)
      let needsPool = !room.auction.playerPool || room.auction.playerPool.length === 0;
      if (!needsPool) {
        const samplePlayer = await Player.findById(room.auction.playerPool[0]);
        if (!samplePlayer) {
          needsPool = true;
        }
      }
      if (needsPool) {
        const pool = await buildSetBasedPlayerPool(room.settings?.poolSize || 400);
        room.auction.playerPool = pool.map(p => p._id);
        room.auction.playerPoolIndex = 0;
      }

      const isAIAuctioneer = room.settings?.isAIAuctioneer || (room.auctioneer && room.settings?.isAIRoom);

      if (room.auctioneer && !isAIAuctioneer) {
        // Human Auctioneer mode: wait for manual nomination
        room.status = 'IN_PROGRESS';
        room.auction.status = 'NOMINATING';
        room.auction.playerPoolIndex = 0;
        await room.save();

        await AuctionEvent.create({ roomId, type: 'AUCTION_STARTED', data: { name: room.name } });

        const broadcastRoom = (await getRoomState(roomId)) || room;
        this.broadcast(roomId, 'auction:started', { room: broadcastRoom });
        this.broadcast(roomId, 'auction:waiting_nomination', {
          auctioneerId: room.auctioneer,
          message: 'Waiting for Auctioneer to nominate the next player...'
        });
        return room;
      } else {
        // Standard or AI Auctioneer mode: automatically kick off first nomination
        room.status = 'IN_PROGRESS';
        room.auction.status = 'STARTING';
        room.auction.playerPoolIndex = 0;
        await room.save();

        await AuctionEvent.create({ roomId, type: 'AUCTION_STARTED', data: { name: room.name } });

        const broadcastRoom = (await getRoomState(roomId)) || room;
        this.broadcast(roomId, 'auction:started', { room: broadcastRoom });
        if (isAIAuctioneer) {
          this.broadcast(roomId, 'chat:broadcast', {
            _id: `${Date.now()}_ai_auc_start`,
            user: 'AUCTIONEER',
            senderName: 'Auctioneer (AI)',
            message: '🎙️ Welcome franchise managers! The IPL Mega Auction is officially underway.',
            text: '🎙️ Welcome franchise managers! The IPL Mega Auction is officially underway.',
            timestamp: new Date().toISOString(),
            isSystem: true,
            type: 'AUCTIONEER'
          });
        }

        // Automatically nominate first player after 2.5 seconds
        setTimeout(() => this.nominateNextPlayer(roomId), 2500);
        return room;
      }
    } finally {
      this.releaseLock(roomId);
    }
  }

  async nominateNextPlayer(roomId) {
    await this.acquireLock(roomId);
    try {
      const room = await Room.findOne(getRoomFilter(roomId));
      if (!room || room.status !== 'IN_PROGRESS') return;
      const canonicalRoomId = room.roomId;

      // If a player is already actively being auctioned, do not interrupt or skip them
      if (room.auction?.status === 'BIDDING' && room.auction?.currentPlayer) {
        return;
      }

      // Collect all players already sold or in any squad to guarantee NO duplicates
      const soldSet = new Set((room.auction.soldPlayers || []).map(id => id.toString()));
      (room.teams || []).forEach(t => {
        (t.squad || []).forEach(pId => soldSet.add(pId.toString()));
        (t.squadDetails || []).forEach(sd => {
          const p = sd.player?._id || sd.player || sd;
          if (p) soldSet.add(p.toString());
        });
      });

      let poolIndex = room.auction.playerPoolIndex || 0;
      let player = null;

      // Scan through playerPool until we find an un-sold player
      while (poolIndex < room.auction.playerPool.length) {
        const candidateId = room.auction.playerPool[poolIndex];
        poolIndex++;
        if (!soldSet.has(candidateId.toString())) {
          player = await Player.findById(candidateId);
          if (player) {
            break;
          }
        }
      }

      // Persist the advanced pool index so the next call gets the next player
      room.auction.playerPoolIndex = poolIndex;

      if (!player) {
        await room.save();
        return this.completeAuction(canonicalRoomId);
      }

      // Check if player is Marquee/Iconic
      const isStarPlayer = (player.basePrice >= 2.0) || (player.rating && player.rating >= 88);
      const nominationTimer = isStarPlayer ? 20 : (room.settings.bidTimer || 15);

      room.auction.status = 'BIDDING';
      room.auction.currentPlayer = player._id;
      room.auction.currentBid = player.basePrice;
      room.auction.currentBidder = null;
      room.auction.currentBidderUser = null;
      room.auction.bidCount = 0;
      room.auction.timerEndTime = new Date(Date.now() + nominationTimer * 1000);
      room.auction.timerDuration = nominationTimer;
      await room.save();

      await AuctionEvent.create({
        roomId: canonicalRoomId,
        type: 'PLAYER_NOMINATED',
        data: { player: player.name, basePrice: player.basePrice }
      });

      this.broadcast(canonicalRoomId, 'player:nominated', {
        player,
        basePrice: player.basePrice,
        timerDuration: nominationTimer,
        currentBid: player.basePrice,
        poolIndex,
        totalPool: room.auction.playerPool.length
      });

      // AI Chat reaction on nomination
      if (typeof aiChatEngine?.onPlayerNominated === 'function') {
        aiChatEngine.onPlayerNominated(canonicalRoomId, player, (eventRoomId, msgObj) => {
          this.broadcast(eventRoomId, 'chat:broadcast', msgObj);
        });
      }

      // Start timer
      timerManager.startTimer(
        canonicalRoomId,
        nominationTimer,
        (remaining) => this.broadcast(canonicalRoomId, 'timer:update', { remaining }),
        () => this.handleTimerExpiry(canonicalRoomId)
      );

      // AI Bidding check for opening bid
      this.triggerAIBidCheck(canonicalRoomId, player, player.basePrice);
    } finally {
      this.releaseLock(roomId);
    }
  }

  async nominatePlayer(roomId, userId, playerId) {
    await this.acquireLock(roomId);
    try {
      const room = await Room.findOne(getRoomFilter(roomId));
      if (!room || room.status !== 'IN_PROGRESS') {
        throw new Error('Auction is not live');
      }
      const canonicalRoomId = room.roomId;

      // Check authorization: caller must be the room auctioneer (or admin)
      const auctioneerId = (room.auctioneer?._id || room.auctioneer)?.toString();
      const adminId = (room.admin?._id || room.admin)?.toString();
      const requesterId = (userId?._id || userId)?.toString();

      if (auctioneerId && auctioneerId !== requesterId && adminId !== requesterId) {
        throw new Error('Only the Auctioneer can nominate players');
      }

      if (room.auction.status !== 'NOMINATING' && room.auction.status !== 'STARTING') {
        throw new Error('Auction is not waiting for nomination');
      }

      // If playerId is not provided, default to next in pool
      let targetPlayerId = playerId;
      if (!targetPlayerId) {
        const poolIndex = room.auction.playerPoolIndex || 0;
        if (poolIndex >= room.auction.playerPool.length) {
          return this.completeAuction(canonicalRoomId);
        }
        targetPlayerId = room.auction.playerPool[poolIndex];
      }

      const player = await Player.findById(targetPlayerId);
      if (!player) throw new Error('Player not found');

      // Check if player is already sold
      const isAlreadySold = (room.auction.soldPlayers || []).some(id => id.toString() === player._id.toString()) ||
        room.teams.some(t => (t.squad || []).some(id => id.toString() === player._id.toString()));
      if (isAlreadySold) {
        throw new Error(`${player.name} has already been sold in this auction.`);
      }

      // Advance pool index if this was the current pool player
      if (room.auction.playerPool[room.auction.playerPoolIndex]?.toString() === player._id.toString()) {
        room.auction.playerPoolIndex += 1;
      }

      // Check if player is Marquee/Iconic
      const isStarPlayer = (player.basePrice >= 2.0) || (player.rating && player.rating >= 88);
      const nominationTimer = isStarPlayer ? 20 : (room.settings.bidTimer || 15);

      room.auction.status = 'BIDDING';
      room.auction.currentPlayer = player._id;
      room.auction.currentBid = player.basePrice;
      room.auction.currentBidder = null;
      room.auction.currentBidderUser = null;
      room.auction.bidCount = 0;
      room.auction.timerEndTime = new Date(Date.now() + nominationTimer * 1000);
      room.auction.timerDuration = nominationTimer;
      await room.save();

      await AuctionEvent.create({
        roomId: canonicalRoomId,
        type: 'PLAYER_NOMINATED',
        data: { player: player.name, basePrice: player.basePrice, manual: true }
      });

      this.broadcast(canonicalRoomId, 'player:nominated', {
        player,
        basePrice: player.basePrice,
        timerDuration: nominationTimer,
        currentBid: player.basePrice,
        poolIndex: room.auction.playerPoolIndex,
        totalPool: room.auction.playerPool.length
      });

      // AI Chat reaction on nomination
      if (typeof aiChatEngine?.onPlayerNominated === 'function') {
        aiChatEngine.onPlayerNominated(canonicalRoomId, player, (eventRoomId, msgObj) => {
          this.broadcast(eventRoomId, 'chat:broadcast', msgObj);
        });
      }

      // Start countdown timer
      timerManager.startTimer(
        canonicalRoomId,
        nominationTimer,
        (remaining) => this.broadcast(canonicalRoomId, 'timer:update', { remaining }),
        () => this.handleTimerExpiry(canonicalRoomId)
      );

      // Trigger AI bidding check for opening bid
      this.triggerAIBidCheck(canonicalRoomId, player, player.basePrice);

      return { success: true, player };
    } finally {
      this.releaseLock(roomId);
    }
  }

  async placeBid(roomId, userId, teamId, amount) {
    await this.acquireLock(roomId);
    try {
      const room = await Room.findOne(getRoomFilter(roomId));
      if (!room) return { success: false, error: 'Room not found' };
      const canonicalRoomId = room.roomId;

      const player = await Player.findById(room.auction.currentPlayer);
      let team = teamId ? room.teams.id(teamId) : null;
      if (!team) {
        team = room.teams.find(t => (t.owner?._id || t.owner)?.toString() === (userId?._id || userId)?.toString());
      }
      if (!team) return { success: false, error: 'No team claimed by user in this room' };
      const user = { _id: userId };

      const validation = validateBid({ room, player, team, user, amount });
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Record bid
      const bidOrder = (room.auction.bidCount || 0) + 1;
      const bid = await Bid.create({
        roomId: canonicalRoomId,
        player: player._id,
        team: team._id,
        teamName: team.name,
        teamShortName: team.shortName,
        teamColor: team.primaryColor,
        user: userId,
        amount,
        bidOrder,
        isAI: team.isAI
      });

      room.auction.currentBid = amount;
      room.auction.currentBidder = team._id;
      room.auction.currentBidderUser = userId;
      room.auction.bidCount = bidOrder;

      // Reset timer on valid bid
      const timerDuration = room.settings.bidTimer || 15;
      room.auction.timerEndTime = new Date(Date.now() + timerDuration * 1000);
      room.auction.timerDuration = timerDuration;
      await room.save();

      await AuctionEvent.create({
        roomId: canonicalRoomId,
        type: 'BID_ACCEPTED',
        data: { team: team.name, amount, player: player.name }
      });

      timerManager.resetTimer(canonicalRoomId, timerDuration);

      const nextMinBid = parseFloat((amount + (room.settings.bidIncrement || 0.25)).toFixed(2));

      this.broadcast(canonicalRoomId, 'bid:update', {
        currentBid: amount,
        highestBidder: {
          _id: team._id,
          teamId: team._id,
          name: team.name,
          teamName: team.name,
          shortName: team.shortName,
          teamShortName: team.shortName,
          primaryColor: team.primaryColor,
          user: userId
        },
        nextMinBid,
        bidCount: bidOrder,
        bid
      });

      this.broadcast(canonicalRoomId, 'chat:broadcast', {
        _id: `${Date.now()}_bid_${bidOrder}`,
        user: team.shortName,
        senderName: team.name,
        message: `⚡ ${team.name} bid ₹${amount.toFixed(2)} Cr on ${player.name}`,
        text: `⚡ ${team.name} bid ₹${amount.toFixed(2)} Cr on ${player.name}`,
        timestamp: new Date().toISOString(),
        isSystem: true,
        type: 'BID',
        teamShortName: team.shortName,
        teamColor: team.primaryColor,
        amount
      });
      
      // Hook AI
      this.triggerAIBidCheck(canonicalRoomId, player, nextMinBid);

      return { success: true, bid };
    } finally {
      this.releaseLock(roomId);
    }
  }

  async handleTimerExpiry(roomId) {
    await this.acquireLock(roomId);
    try {
      const room = await Room.findOne(getRoomFilter(roomId));
      if (!room || room.status !== 'IN_PROGRESS' || room.auction.status !== 'BIDDING') return;
      const canonicalRoomId = room.roomId;

      const player = await Player.findById(room.auction.currentPlayer);
      if (!player) return;

      if (!room.auction.currentBidder || room.auction.currentBid === 0) {
        // UNSOLD
        room.auction.status = 'UNSOLD';
        room.auction.unsoldPlayers.push(player._id);
        await room.save();

        await AuctionEvent.create({
          roomId: canonicalRoomId,
          type: 'PLAYER_UNSOLD',
          data: { player: player.name, basePrice: player.basePrice }
        });

        this.broadcast(canonicalRoomId, 'player:unsold', {
          player,
          basePrice: player.basePrice
        });

        const isAIAuctioneer = room.settings?.isAIAuctioneer || (room.auctioneer && room.settings?.isAIRoom);
        const unsoldMsg = isAIAuctioneer
          ? aiChatEngine.generateAuctioneerUnsold(canonicalRoomId, player)
          : `❌ UNSOLD: ${player.name} went unsold at base price ₹${player.basePrice.toFixed(2)} Cr`;

        this.broadcast(canonicalRoomId, 'chat:broadcast', {
          _id: `${Date.now()}_unsold_${player._id}`,
          user: isAIAuctioneer ? 'Auctioneer (AI)' : 'AUCTIONEER',
          senderName: isAIAuctioneer ? 'Auctioneer (AI)' : 'AUCTIONEER',
          message: unsoldMsg,
          text: unsoldMsg,
          timestamp: new Date().toISOString(),
          isSystem: true,
          type: 'UNSOLD',
          player: {
            _id: player._id,
            name: player.name,
            role: player.role
          }
        });
      } else {
        // SOLD
        const winningTeam = room.teams.id(room.auction.currentBidder);
        const finalPrice = room.auction.currentBid;

        // Deduct purse and add player to squad
        winningTeam.purse.spent = parseFloat((winningTeam.purse.spent + finalPrice).toFixed(2));
        winningTeam.purse.remaining = parseFloat((winningTeam.purse.remaining - finalPrice).toFixed(2));
        winningTeam.squad.push(player._id);
        winningTeam.squadDetails.push({
          player: player._id,
          boughtFor: finalPrice,
          boughtAt: new Date()
        });

        if (player.isOverseas) {
          winningTeam.overseas = (winningTeam.overseas || 0) + 1;
        }

        // Check if team is now inactive (purse or roster limits)
        const maxLegal = calculateMaxLegalBid(winningTeam, room.settings);
        if (maxLegal < (room.settings.minReservePerPlayer || 0.2) || winningTeam.squad.length >= (room.settings.squadSize || 25)) {
          winningTeam.status = 'INACTIVE';
          winningTeam.inactiveReason = 'Purse or roster constraints reached';
          this.broadcast(canonicalRoomId, 'team:inactive', {
            teamId: winningTeam._id,
            reason: winningTeam.inactiveReason
          });
        }

        room.auction.status = 'SOLD';
        room.auction.soldPlayers.push(player._id);
        await room.save();

        await AuctionEvent.create({
          roomId: canonicalRoomId,
          type: 'PLAYER_SOLD',
          data: {
            player: player.name,
            team: winningTeam.name,
            finalPrice,
            basePrice: player.basePrice
          }
        });

        this.broadcast(canonicalRoomId, 'player:sold', {
          player,
          team: {
            _id: winningTeam._id,
            name: winningTeam.name,
            shortName: winningTeam.shortName,
            primaryColor: winningTeam.primaryColor,
            remainingPurse: winningTeam.purse.remaining,
            squadCount: winningTeam.squad.length,
            overseasCount: winningTeam.overseas
          },
          amount: finalPrice,
          finalPrice,
          basePrice: player.basePrice,
          priceMultiplier: parseFloat((finalPrice / (player.basePrice || 0.2)).toFixed(2))
        });

        const isAIAuctioneer = room.settings?.isAIAuctioneer || (room.auctioneer && room.settings?.isAIRoom);
        const soldMsg = isAIAuctioneer
          ? aiChatEngine.generateAuctioneerSold(canonicalRoomId, player, winningTeam, finalPrice)
          : `🔨 SOLD! ${player.name} sold to ${winningTeam.name} for ₹${finalPrice.toFixed(2)} Cr!`;

        this.broadcast(canonicalRoomId, 'chat:broadcast', {
          _id: `${Date.now()}_sold_${player._id}`,
          user: isAIAuctioneer ? 'Auctioneer (AI)' : 'AUCTIONEER',
          senderName: isAIAuctioneer ? 'Auctioneer (AI)' : 'AUCTIONEER',
          message: soldMsg,
          text: soldMsg,
          timestamp: new Date().toISOString(),
          isSystem: true,
          type: 'SOLD',
          amount: finalPrice,
          teamName: winningTeam.name,
          teamShortName: winningTeam.shortName,
          teamColor: winningTeam.primaryColor,
          player: {
            _id: player._id,
            name: player.name,
            role: player.role
          }
        });

        // Winning AI team celebration chat (with human typing delay of 1.2s - 2.2s)
        if (winningTeam.isAI) {
          const winDelay = Math.floor(Math.random() * 1000 + 1200);
          setTimeout(() => {
            const winChat = aiChatEngine.generateWinMessage(canonicalRoomId, winningTeam, player, finalPrice);
            this.broadcast(canonicalRoomId, 'chat:broadcast', {
              _id: `${Date.now()}_ai_win_${winningTeam._id}`,
              userId: winningTeam._id,
              user: winningTeam.name,
              senderName: `${winningTeam.name} [AI]`,
              message: winChat,
              text: winChat,
              timestamp: new Date().toISOString(),
              isSystem: false,
              teamShortName: winningTeam.shortName,
              teamColor: winningTeam.primaryColor,
              isAI: true
            });
          }, winDelay);
        }
      }

      // Advance to next player after 4 seconds
      setTimeout(async () => {
        try {
          const currentRoom = await Room.findOne(getRoomFilter(canonicalRoomId));
          if (!currentRoom || currentRoom.status !== 'IN_PROGRESS') return;

          const isAIAuctioneer = currentRoom.settings?.isAIAuctioneer || (currentRoom.auctioneer && currentRoom.settings?.isAIRoom);

          if (currentRoom.auctioneer && !isAIAuctioneer) {
            // Human Auctioneer mode: set status to NOMINATING and wait for manual choice
            currentRoom.auction.status = 'NOMINATING';
            currentRoom.auction.currentPlayer = null;
            await currentRoom.save();
            this.broadcast(canonicalRoomId, 'auction:waiting_nomination', {
              auctioneerId: currentRoom.auctioneer,
              message: 'Waiting for Auctioneer to nominate the next player...'
            });
          } else {
            // Default automated flow or AI Auctioneer: nominate next player
            this.nominateNextPlayer(canonicalRoomId);
          }
        } catch (err) {
          console.error('Error advancing to next player:', err);
        }
      }, 4000);
    } finally {
      this.releaseLock(roomId);
    }
  }

  async triggerAIBidCheck(roomId, player, nextMinBid) {
    // We do not acquire lock here, placeBid will acquire it
    try {
      const room = await Room.findOne(getRoomFilter(roomId)).populate('teams.squadDetails.player');
      if (!room || room.status !== 'IN_PROGRESS' || room.auction.status !== 'BIDDING') return;
      const canonicalRoomId = room.roomId;

      let resolvedPlayer = player;
      if (!resolvedPlayer || !resolvedPlayer.basePrice) {
        resolvedPlayer = await Player.findById(room.auction.currentPlayer);
      }
      if (!resolvedPlayer) return;

      const aiTeams = room.teams.filter(t => t.isAI && t.status === 'ACTIVE');
      if (!aiTeams.length) return;

      // Randomize evaluation order
      aiTeams.sort(() => Math.random() - 0.5);

      let scheduled = false;
      for (const team of aiTeams) {
        // Prevent AI from bidding against itself
        if (room.auction.currentBidder && room.auction.currentBidder.toString() === team._id.toString()) continue;

        const decision = aiBidDecision({ room, team, player: resolvedPlayer, currentBid: room.auction.currentBid, nextBid: nextMinBid });
        if (decision.shouldBid) {
          scheduled = true;

          // AI conversational chat when placing bid (approx 35% probability or high-urgency star)
          const pRating = extractPlayerRating(resolvedPlayer);
          const isStar = pRating >= 85;
          const shouldSpeak = isStar ? Math.random() < 0.65 : Math.random() < 0.35;
          if (shouldSpeak) {
            // Typing delay right before placing bid
            const chatDelay = Math.max(300, decision.delayMs - Math.floor(Math.random() * 400 + 300));
            setTimeout(() => {
              const msg = aiChatEngine.generateBidMessage(canonicalRoomId, team, resolvedPlayer, decision.bidAmount);
              this.broadcast(canonicalRoomId, 'chat:broadcast', {
                _id: `${Date.now()}_ai_bid_chat_${team._id}`,
                userId: team._id,
                user: team.name,
                senderName: `${team.name} [AI]`,
                message: msg,
                text: msg,
                timestamp: new Date().toISOString(),
                isSystem: false,
                teamShortName: team.shortName,
                teamColor: team.primaryColor,
                isAI: true
              });
            }, chatDelay);
          }

          setTimeout(() => {
            // For AI teams, pass team._id as user to avoid any conflict with auctioneer
            const dummyUserId = team._id;
            this.placeBid(canonicalRoomId, dummyUserId, team._id, decision.bidAmount).catch(console.error);
          }, decision.delayMs);
          break; // Only one AI schedules a bid at a time to mimic sequential bidding
        } else if (room.auction.currentBid > 0 && decision.maxWillingBid && room.auction.currentBid >= decision.maxWillingBid) {
          // AI was outbid or reached its valuation limit!
          // Occasionally comment with frustration/stepping back (approx 20% probability)
          if (Math.random() < 0.20) {
            const outbidDelay = Math.floor(Math.random() * 1200 + 800);
            setTimeout(() => {
              const msg = aiChatEngine.generateOutbidMessage(canonicalRoomId, team, resolvedPlayer, room.auction.currentBid, decision.maxWillingBid);
              this.broadcast(canonicalRoomId, 'chat:broadcast', {
                _id: `${Date.now()}_ai_outbid_${team._id}`,
                userId: team._id,
                user: team.name,
                senderName: `${team.name} [AI]`,
                message: msg,
                text: msg,
                timestamp: new Date().toISOString(),
                isSystem: false,
                teamShortName: team.shortName,
                teamColor: team.primaryColor,
                isAI: true
              });
            }, outbidDelay);
          }
        }
      }

      // If multiple bids have happened (> 3 bids) and none of the AIs are bidding right now,
      // occasionally an uninvolved AI team chips in as a spectator (15% chance)
      if (!scheduled && room.auction.bidCount >= 3 && Math.random() < 0.15) {
        const uninvolvedAIs = aiTeams.filter(t => !room.auction.currentBidder || room.auction.currentBidder.toString() !== t._id.toString());
        if (uninvolvedAIs.length > 0) {
          const spectatorAI = uninvolvedAIs[Math.floor(Math.random() * uninvolvedAIs.length)];
          const specDelay = Math.floor(Math.random() * 1500 + 1000);
          setTimeout(() => {
            const msg = aiChatEngine.generateSpectatorComment(canonicalRoomId, spectatorAI, resolvedPlayer, room.auction.currentBid);
            this.broadcast(canonicalRoomId, 'chat:broadcast', {
              _id: `${Date.now()}_ai_spec_${spectatorAI._id}`,
              userId: spectatorAI._id,
              user: spectatorAI.name,
              senderName: `${spectatorAI.name} [AI]`,
              message: msg,
              text: msg,
              timestamp: new Date().toISOString(),
              isSystem: false,
              teamShortName: spectatorAI.shortName,
              teamColor: spectatorAI.primaryColor,
              isAI: true
            });
          }, specDelay);
        }
      }
    } catch (e) {
      console.error('AI Bid check failed', e);
    }
  }

  async pauseAuction(roomId, adminUserId) {
    const room = await Room.findOne(getRoomFilter(roomId));
    if (!room || room.admin.toString() !== adminUserId.toString()) return;
    const canonicalRoomId = room.roomId;

    room.status = 'PAUSED';
    await room.save();
    timerManager.clearTimer(canonicalRoomId);

    await AuctionEvent.create({ roomId: canonicalRoomId, type: 'AUCTION_PAUSED' });
    this.broadcast(canonicalRoomId, 'auction:paused', {});
  }

  async resumeAuction(roomId, adminUserId) {
    const room = await Room.findOne(getRoomFilter(roomId));
    if (!room || room.admin.toString() !== adminUserId.toString()) return;
    const canonicalRoomId = room.roomId;

    room.status = 'IN_PROGRESS';
    await room.save();

    await AuctionEvent.create({ roomId: canonicalRoomId, type: 'AUCTION_RESUMED' });
    this.broadcast(canonicalRoomId, 'auction:resumed', {});

    // Restart timer with remaining seconds
    const remaining = room.auction.timerDuration || 15;
    timerManager.startTimer(
      canonicalRoomId,
      remaining,
      (rem) => this.broadcast(canonicalRoomId, 'timer:update', { remaining: rem }),
      () => this.handleTimerExpiry(canonicalRoomId)
    );
  }

  async endAuction(roomId, adminUserId) {
    const room = await Room.findOne(getRoomFilter(roomId));
    if (!room) throw new Error('Room not found');
    if (room.admin.toString() !== adminUserId.toString()) {
      throw new Error('Only room creator can end the auction');
    }
    return this.completeAuction(room.roomId);
  }

  async completeAuction(roomId) {
    const room = await Room.findOne(getRoomFilter(roomId)).populate('teams.squadDetails.player teams.squad');
    if (!room) return;
    const canonicalRoomId = room.roomId;

    room.status = 'COMPLETED';
    room.auction.status = 'COMPLETED';
    room.completedAt = new Date();
    
    // Calculate results
    const results = calculateAuctionResults(room);
    room.auction.results = results;

    await room.save();

    timerManager.clearTimer(canonicalRoomId);

    await AuctionEvent.create({ roomId: canonicalRoomId, type: 'AUCTION_COMPLETED' });
    this.broadcast(canonicalRoomId, 'auction:completed', { room, results });
    return { success: true, results };
  }
}

export default new AuctionEngine();
