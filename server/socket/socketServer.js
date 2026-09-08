import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import auctionEngine from '../auction/AuctionEngine.js';
import Room from '../models/Room.js';
import Bid from '../models/Bid.js';
import Player from '../models/Player.js';
import { getRoomFilter } from '../services/roomService.js';

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: 'http://localhost:5173',
      credentials: true
    }
  });

  auctionEngine.setIO(io);

  // Authenticate socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid socket auth token'));
    }
  });

  io.on('connection', (socket) => {
    // Join room channel
    socket.on('room:join', async ({ roomId }) => {
      if (!roomId) return;

      // Send current live state
      const room = await Room.findOne(getRoomFilter(roomId))
        .populate('auction.currentPlayer')
        .populate('auction.playerPool')
        .populate('teams.squad')
        .populate('teams.squadDetails.player')
        .populate('participants.user', 'username displayName avatar')
        .populate('auctioneer', 'username displayName avatar')
        .populate('teams.owner', 'username displayName avatar');

      const roomChannel = room ? room.roomId : roomId.toUpperCase();
      socket.join(roomChannel);
      socket.join(roomId); // join both codes in case frontend uses ObjectId
      socket.roomId = roomChannel;

      if (room) {
        const bids = await Bid.find({ roomId: roomChannel })
          .sort({ bidOrder: -1 })
          .limit(20);

        socket.emit('auction:state', {
          room,
          currentPlayer: room.auction.currentPlayer,
          currentBid: room.auction.currentBid,
          currentBidder: room.auction.currentBidder,
          status: room.auction.status,
          bids: bids.reverse()
        });
      }
    });

    // Start auction
    socket.on('auction:start', async ({ roomId }) => {
      try {
        const targetRoom = socket.roomId || (roomId && roomId.toUpperCase());
        await auctionEngine.startAuction(targetRoom, socket.user._id);
      } catch (err) {
        socket.emit('auction:error', { message: err.message });
      }
    });

    // Auctioneer manually nominates next player
    socket.on('auction:nominate', async ({ roomId, playerId }) => {
      try {
        const targetRoom = socket.roomId || (roomId && roomId.toUpperCase());
        await auctionEngine.nominatePlayer(targetRoom, socket.user._id, playerId);
      } catch (err) {
        socket.emit('auction:error', { message: err.message });
      }
    });

    // Place bid
    socket.on('bid:place', async ({ roomId, teamId, amount }) => {
      try {
        const targetRoom = socket.roomId || (roomId && roomId.toUpperCase());
        const result = await auctionEngine.placeBid(targetRoom, socket.user._id, teamId, amount);
        if (!result.success) {
          socket.emit('bid:rejected', { reason: result.error });
        }
      } catch (err) {
        socket.emit('bid:rejected', { reason: err.message });
      }
    });

    // Pause / Resume
    socket.on('auction:pause', async ({ roomId }) => {
      const targetRoom = socket.roomId || (roomId && roomId.toUpperCase());
      await auctionEngine.pauseAuction(targetRoom, socket.user._id);
    });

    socket.on('auction:resume', async ({ roomId }) => {
      const targetRoom = socket.roomId || (roomId && roomId.toUpperCase());
      await auctionEngine.resumeAuction(targetRoom, socket.user._id);
    });

    // End Auction (Room Admin / Creator)
    socket.on('auction:end', async ({ roomId }) => {
      try {
        const targetRoom = socket.roomId || (roomId && roomId.toUpperCase());
        await auctionEngine.endAuction(targetRoom, socket.user._id);
      } catch (err) {
        socket.emit('auction:error', { message: err.message });
      }
    });

    // Chat message in auction
    socket.on('chat:message', ({ roomId, message }) => {
      if (!message) return;
      const targetRoom = socket.roomId || (roomId && roomId.toUpperCase());
      if (!targetRoom) return;
      const broadcastMsg = {
        _id: `${Date.now()}_${socket.id}`,
        userId: socket.user?._id,
        user: socket.user?.displayName || socket.user?.username || 'User',
        senderName: socket.user?.displayName || socket.user?.username || 'User',
        message,
        text: message,
        timestamp: new Date().toISOString(),
        isSystem: false
      };
      io.to(targetRoom).emit('chat:broadcast', broadcastMsg);
      socket.emit('chat:broadcast', broadcastMsg);
    });

    socket.on('disconnect', () => {
      // Room channel auto cleans up
    });
  });

  return io;
};
