import * as roomService from '../services/roomService.js';
import Room from '../models/Room.js';
import Bid from '../models/Bid.js';
import AuctionEvent from '../models/AuctionEvent.js';
import timerManager from '../auction/TimerManager.js';
import auctionEngine from '../auction/AuctionEngine.js';
import { calculateAuctionResults } from '../analytics/winnerEngine.js';
import { ratePlayingXI } from '../analytics/playingXIEngine.js';

export const createRoom = async (req, res) => {
  try {
    const room = await roomService.createRoom(req.user._id, req.body);
    // Update user stats
    req.user.stats.roomsCreated += 1;
    await req.user.save();
    
    res.status(201).json({
      message: 'Room created successfully',
      room: {
        roomId: room.roomId,
        name: room.name,
        status: room.status,
        settings: room.settings,
        teams: room.teams
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating room', error: error.message });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await roomService.joinRoom(roomId, req.user._id);
    
    req.user.stats.roomsJoined += 1;
    await req.user.save();
    
    res.json({
      message: 'Joined room successfully',
      room: {
        roomId: room.roomId,
        name: room.name,
        status: room.status
      }
    });
  } catch (error) {
    const statusMap = {
      'ROOM_NOT_FOUND': 404,
      'ROOM_NOT_JOINABLE': 400,
      'AUCTION_ALREADY_STARTED': 400,
      'ROOM_FULL': 400
    };
    const status = statusMap[error.message] || 500;
    const messageMap = {
      'ROOM_NOT_FOUND': 'Room not found. Please check the Room ID.',
      'ROOM_NOT_JOINABLE': 'This room is no longer accepting participants.',
      'AUCTION_ALREADY_STARTED': 'The auction has already started.',
      'ROOM_FULL': 'This room is full.'
    };
    res.status(status).json({ message: messageMap[error.message] || error.message, code: error.message });
  }
};

export const getRoomState = async (req, res) => {
  try {
    const room = await roomService.getRoomState(req.params.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json({ room });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching room', error: error.message });
  }
};

export const selectTeam = async (req, res) => {
  try {
    const { teamIndex } = req.body;
    const room = await roomService.selectTeam(req.params.roomId, req.user._id, teamIndex);
    res.json({ message: 'Team selected', room: { teams: room.teams } });
  } catch (error) {
    const statusMap = {
      'TEAM_ALREADY_CLAIMED': 409,
      'INVALID_TEAM': 400,
      'CANNOT_SELECT_IN_PROGRESS': 400
    };
    res.status(statusMap[error.message] || 500).json({ message: error.message });
  }
};

export const setReady = async (req, res) => {
  try {
    const { isReady } = req.body;
    const room = await roomService.setReady(req.params.roomId, req.user._id, isReady);
    const canStart = roomService.canStartAuction(room);
    res.json({ message: isReady ? 'Ready!' : 'Unready', canStart });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const setAuctioneer = async (req, res) => {
  try {
    const { auctioneerUserId } = req.body;
    const room = await roomService.setAuctioneer(req.params.roomId, req.user._id, auctioneerUserId);
    res.json({ message: 'Auctioneer updated', room });
  } catch (error) {
    const statusMap = {
      'ROOM_NOT_FOUND': 404,
      'CANNOT_CHANGE_IN_PROGRESS': 400,
      'ONLY_ADMIN_CAN_SET_AUCTIONEER': 403,
      'USER_NOT_IN_ROOM': 400
    };
    res.status(statusMap[error.message] || 400).json({ message: error.message });
  }
};

export const updateRoomSettings = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await roomService.updateRoomSettings(roomId, req.user._id, req.body);
    const canStart = roomService.canStartAuction(room);
    res.json({ message: 'Settings updated successfully', room, canStart });
  } catch (error) {
    const statusMap = {
      'ROOM_NOT_FOUND': 404,
      'CANNOT_CHANGE_IN_PROGRESS': 400,
      'ONLY_ADMIN_CAN_UPDATE_SETTINGS': 403
    };
    res.status(statusMap[error.message] || 400).json({ message: error.message });
  }
};

export const getMyRooms = async (req, res) => {
  try {
    const rooms = await roomService.getMyRooms(req.user._id);
    res.json({ rooms });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rooms', error: error.message });
  }
};

export const getPublicRooms = async (req, res) => {
  try {
    const rooms = await roomService.getPublicRooms();
    res.json({ rooms });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching public rooms', error: error.message });
  }
};

export const endAuction = async (req, res) => {
  try {
    const { roomId } = req.params;
    const result = await auctionEngine.endAuction(roomId.toUpperCase(), req.user._id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAuctionResults = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne(roomService.getRoomFilter(roomId))
      .populate('teams.squadDetails.player')
      .populate('teams.squad')
      .populate('teams.playingXI.player')
      .populate('teams.owner', 'username displayName avatar')
      .populate('auctioneer', 'username displayName avatar');

    if (!room) return res.status(404).json({ message: 'Room not found' });

    let results = room.auction.results;
    if (!results || !results.rankings) {
      results = calculateAuctionResults(room);
      room.auction.results = results;
      await room.save();
    }

    res.json({ results, room });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching auction results', error: error.message });
  }
};

export const submitPlayingXI = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { teamId, playingXI } = req.body;

    const room = await Room.findOne(roomService.getRoomFilter(roomId))
      .populate('teams.squadDetails.player')
      .populate('teams.squad');

    if (!room) return res.status(404).json({ message: 'Room not found' });

    const team = room.teams.id(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    // Rate Playing XI
    const ratingResult = ratePlayingXI(playingXI, team, room.settings);
    if (!ratingResult.valid) {
      return res.status(400).json({ message: ratingResult.error });
    }

    // Save playingXI to team
    team.playingXI = playingXI;
    team.playingXIRating = {
      compositeScore: ratingResult.compositeScore,
      battingScore: ratingResult.breakdown?.topOrderScore,
      bowlingScore: ratingResult.breakdown?.bowlingScore,
      balanceScore: ratingResult.breakdown?.balanceScore,
      topOrderScore: ratingResult.breakdown?.topOrderScore,
      middleOrderScore: ratingResult.breakdown?.middleOrderScore,
      deathBowlingScore: ratingResult.breakdown?.bowlingScore,
      submittedAt: new Date()
    };

    await room.save();

    res.json({
      message: 'Playing XI submitted successfully!',
      rating: ratingResult,
      team: {
        _id: team._id,
        name: team.name,
        playingXI: team.playingXI,
        playingXIRating: team.playingXIRating
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting Playing XI', error: error.message });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne(roomService.getRoomFilter(roomId));
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const adminId = (room.admin?._id || room.admin)?.toString();
    const userId = req.user._id.toString();

    // Allow deletion if user is room admin or creator
    const isParticipant = room.participants?.some(p => (p.user?._id || p.user)?.toString() === userId);
    if (adminId !== userId && !isParticipant) {
      return res.status(403).json({ message: 'Not authorized to delete this auction' });
    }

    // Stop timer if running
    timerManager.clearTimer(roomId.toUpperCase());

    // Delete bids and events
    await Bid.deleteMany({ roomId: roomId.toUpperCase() });
    await AuctionEvent.deleteMany({ roomId: roomId.toUpperCase() });
    await Room.deleteOne({ _id: room._id });

    res.json({ success: true, message: 'Auction room deleted successfully', roomId: room.roomId });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting auction room', error: error.message });
  }
};
