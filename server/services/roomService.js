import crypto from 'crypto';
import mongoose from 'mongoose';
import Room from '../models/Room.js';
import Player from '../models/Player.js';
import User from '../models/User.js';
import { DEFAULT_TEAMS } from '../config/constants.js';
import { buildSetBasedPlayerPool } from '../auction/poolBuilder.js';

export const getRoomFilter = (roomId) => {
  if (!roomId) return { _id: null };
  const str = roomId.toString();
  if (mongoose.Types.ObjectId.isValid(str) && str.length === 24) {
    return { $or: [{ _id: new mongoose.Types.ObjectId(str) }, { roomId: str.toUpperCase() }] };
  }
  return { roomId: str.toUpperCase() };
};

// Generate unambiguous Room ID (no 0/O, 1/I/L confusion)
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const generateRoomId = (length = 6) => {
  let id = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    id += CHARSET[bytes[i] % CHARSET.length];
  }
  return id;
};

const ensureUniqueRoomId = async () => {
  let roomId;
  let attempts = 0;
  do {
    roomId = generateRoomId();
    const exists = await Room.findOne({ roomId });
    if (!exists) return roomId;
    attempts++;
  } while (attempts < 10);
  // Fallback to longer ID
  return generateRoomId(8);
};

export const createRoom = async (userId, config) => {
  const roomId = await ensureUniqueRoomId();
  
  const selectedIndex = (config.preferredTeamIndex !== undefined && config.preferredTeamIndex !== null && config.preferredTeamIndex >= 0)
    ? parseInt(config.preferredTeamIndex)
    : ((config.teamIndex !== undefined && config.teamIndex !== null && config.teamIndex >= 0) ? parseInt(config.teamIndex) : -1);

  // In lobby, make all DEFAULT_TEAMS (10 franchises) available so any joining member can choose any team
  const teams = [];
  for (let i = 0; i < DEFAULT_TEAMS.length; i++) {
    const template = DEFAULT_TEAMS[i];
    const isOwner = selectedIndex === i;
    teams.push({
      name: config.teamNames?.[i] || template.name,
      shortName: config.teamShortNames?.[i] || template.shortName,
      primaryColor: config.teamColors?.[i]?.primary || template.primaryColor,
      secondaryColor: config.teamColors?.[i]?.secondary || template.secondaryColor,
      owner: isOwner ? userId : null,
      isAI: false,
      purse: {
        initial: config.purse || 120,
        spent: 0,
        remaining: config.purse || 120
      }
    });
  }
  
  const room = await Room.create({
    roomId,
    name: config.name || `Auction Room ${roomId}`,
    admin: userId,
    status: 'LOBBY',
    participants: [{
      user: userId,
      teamIndex: selectedIndex,
      status: selectedIndex >= 0 ? 'READY' : 'WAITING',
      isAI: false
    }],
    teams,
    settings: {
      maxTeams: config.maxTeams || 10,
      purse: config.purse || 120,
      squadSize: config.squadSize || 25,
      minSquad: config.minSquad || 18,
      overseasLimit: config.overseasLimit || 8,
      maxOverseasXI: config.maxOverseasXI || 4,
      bidTimer: config.bidTimer || 15,
      bidIncrement: config.bidIncrement || 0.25,
      auctionType: config.auctionType || 'standard',
      categories: config.categories || [],
      poolSize: Math.min(Math.max(config.poolSize || 400, 360), 500),
      visibility: config.visibility || 'private',
      isAIRoom: config.isAIRoom || false,
      isAIAuctioneer: config.isAIAuctioneer !== undefined ? config.isAIAuctioneer : (config.isAIRoom || false),
      minReservePerPlayer: config.minReservePerPlayer || 0.2,
      nominationMode: config.nominationMode || 'automatic'
    },
    auction: {
      status: 'LOBBY',
      playerPool: [],
      soldPlayers: [],
      unsoldPlayers: [],
      playerPoolIndex: 0,
      round: 1
    },
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h expiry for lobby rooms
  });
  
  return room;
};

export const joinRoom = async (roomId, userId) => {
  const room = await Room.findOne(getRoomFilter(roomId));
  
  if (!room) {
    throw new Error('ROOM_NOT_FOUND');
  }
  if (room.status !== 'LOBBY' && room.status !== 'IN_PROGRESS') {
    throw new Error('ROOM_NOT_JOINABLE');
  }
  
  // Check if already a participant
  const existing = room.participants.find(p => p.user.toString() === userId.toString());
  if (existing) {
    // Reconnecting
    existing.isConnected = true;
    await room.save();
    return room;
  }
  
  if (room.status !== 'LOBBY') {
    throw new Error('AUCTION_ALREADY_STARTED');
  }
  
  const humanParticipants = room.participants.filter(p => !p.isAI);
  if (humanParticipants.length >= room.settings.maxTeams) {
    throw new Error('ROOM_FULL');
  }
  
  room.participants.push({
    user: userId,
    status: 'WAITING',
    isAI: false
  });
  
  await room.save();
  return room;
};

export const leaveRoom = async (roomId, userId) => {
  const room = await Room.findOne(getRoomFilter(roomId));
  if (!room) throw new Error('ROOM_NOT_FOUND');
  
  // If room is in lobby, fully remove participant
  if (room.status === 'LOBBY') {
    room.participants = room.participants.filter(p => p.user.toString() !== userId.toString());
    
    // Release any claimed team
    room.teams.forEach(team => {
      if (team.owner?.toString() === userId.toString()) {
        team.owner = null;
      }
    });
    
    // If auctioneer leaves in lobby, reset auctioneer
    if (room.auctioneer && room.auctioneer.toString() === userId.toString()) {
      room.auctioneer = null;
    }
    
    // If admin leaves in lobby, assign new admin or abandon
    if (room.admin.toString() === userId.toString()) {
      const remaining = room.participants.filter(p => !p.isAI);
      if (remaining.length > 0) {
        room.admin = remaining[0].user;
      } else {
        room.status = 'ABANDONED';
      }
    }
  } else {
    // During auction, mark as disconnected
    const participant = room.participants.find(p => p.user.toString() === userId.toString());
    if (participant) {
      participant.isConnected = false;
    }
  }
  
  await room.save();
  return room;
};

export const selectTeam = async (roomId, userId, teamIndex) => {
  const room = await Room.findOne(getRoomFilter(roomId));
  if (!room) throw new Error('ROOM_NOT_FOUND');
  if (room.status !== 'LOBBY') throw new Error('CANNOT_SELECT_IN_PROGRESS');
  if (teamIndex < 0 || teamIndex >= room.teams.length) throw new Error('INVALID_TEAM');

  // Auctioneer cannot select a team
  if (room.auctioneer && room.auctioneer.toString() === userId.toString()) {
    throw new Error('AUCTIONEER_CANNOT_SELECT_TEAM');
  }
  
  const team = room.teams[teamIndex];
  
  // Check if team already claimed by someone else
  if (team.owner && team.owner.toString() !== userId.toString()) {
    throw new Error('TEAM_ALREADY_CLAIMED');
  }
  
  // Release any previously claimed team by this user
  room.teams.forEach(t => {
    if (t.owner?.toString() === userId.toString()) {
      t.owner = null;
    }
  });
  
  // Claim the team
  team.owner = userId;
  
  // Update participant teamIndex
  const participant = room.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.teamIndex = teamIndex;
  }
  
  await room.save();
  return room;
};

export const setReady = async (roomId, userId, isReady) => {
  const room = await Room.findOne(getRoomFilter(roomId));
  if (!room) throw new Error('ROOM_NOT_FOUND');
  if (room.status !== 'LOBBY') throw new Error('CANNOT_READY_IN_PROGRESS');
  
  const participant = room.participants.find(p => p.user.toString() === userId.toString());
  if (!participant) throw new Error('NOT_IN_ROOM');
  
  const isAuctioneer = room.auctioneer && room.auctioneer.toString() === userId.toString();

  // Drafters must have a team to ready up; Auctioneer does not need a team
  if (isReady && !isAuctioneer && participant.teamIndex === -1) {
    throw new Error('SELECT_TEAM_FIRST');
  }
  
  participant.status = isReady ? 'READY' : 'WAITING';
  await room.save();
  return room;
};

export const canStartAuction = (room) => {
  const auctioneerId = (room.auctioneer?._id || room.auctioneer)?.toString();
  // Filter participants: ignore AI participants and AI auctioneer bot
  const humanParticipants = room.participants.filter(p => {
    if (p.isAI) return false;
    const uid = (p.user?._id || p.user)?.toString();
    if (room.settings?.isAIAuctioneer && uid === auctioneerId) return false;
    return true;
  });

  const readyParticipants = humanParticipants.filter(p => p.status === 'READY');
  const allHumansReady = humanParticipants.length === readyParticipants.length;
  const hasMinimumPlayers = humanParticipants.length >= 1; // At least 1 human (could play vs AI)
  
  // If auctioneer exists, auctioneer does not select a team
  const drafters = auctioneerId
    ? humanParticipants.filter(p => (p.user?._id || p.user).toString() !== auctioneerId)
    : humanParticipants;
  
  const allTeamsClaimed = drafters.length > 0
    ? drafters.every(p => p.teamIndex >= 0)
    : true;
  
  return allHumansReady && hasMinimumPlayers && allTeamsClaimed;
};

export const initializeAuctionPool = async (room) => {
  const pool = await buildSetBasedPlayerPool(room.settings?.poolSize || 400);
  room.auction.playerPool = pool.map(p => p._id);
  room.auction.playerPoolIndex = 0;
  await room.save();
  return pool;
};

export const getRoomState = async (roomId) => {
  const room = await Room.findOne(getRoomFilter(roomId))
    .populate('participants.user', 'username displayName avatar isGuest')
    .populate('admin', 'username displayName avatar')
    .populate('auctioneer', 'username displayName avatar')
    .populate('teams.owner', 'username displayName avatar')
    .populate('auction.currentPlayer')
    .populate('auction.playerPool')
    .populate('teams.squad')
    .populate('teams.squadDetails.player');
  
  if (!room) return null;

  // In LOBBY, ensure all DEFAULT_TEAMS franchises are present so participants can select any of them
  if (room.status === 'LOBBY' && room.teams.length < DEFAULT_TEAMS.length) {
    const existingShortNames = new Set(room.teams.map(t => t.shortName));
    let modified = false;
    for (const template of DEFAULT_TEAMS) {
      if (!existingShortNames.has(template.shortName)) {
        room.teams.push({
          name: template.name,
          shortName: template.shortName,
          primaryColor: template.primaryColor,
          secondaryColor: template.secondaryColor,
          owner: null,
          isAI: false,
          purse: {
            initial: room.settings?.purse || 120,
            spent: 0,
            remaining: room.settings?.purse || 120
          }
        });
        modified = true;
      }
    }
    if (modified) {
      await room.save();
    }
  }

  return room;
};

export const setAuctioneer = async (roomId, requesterId, auctioneerUserId) => {
  const room = await Room.findOne(getRoomFilter(roomId));
  if (!room) throw new Error('ROOM_NOT_FOUND');
  if (room.status !== 'LOBBY') throw new Error('CANNOT_CHANGE_IN_PROGRESS');
  if (room.admin.toString() !== requesterId.toString()) {
    throw new Error('ONLY_ADMIN_CAN_SET_AUCTIONEER');
  }

  if (!auctioneerUserId) {
    room.auctioneer = null;
  } else {
    // Verify target user is in room participants
    const participant = room.participants.find(
      p => (p.user?._id || p.user).toString() === auctioneerUserId.toString()
    );
    if (!participant) {
      throw new Error('USER_NOT_IN_ROOM');
    }
    room.auctioneer = auctioneerUserId;

    // Release any claimed team by this newly assigned auctioneer
    room.teams.forEach(team => {
      if (team.owner && team.owner.toString() === auctioneerUserId.toString()) {
        team.owner = null;
      }
    });
    participant.teamIndex = -1;
  }

  await room.save();
  return getRoomState(roomId);
};

export const getOrCreateAIAuctioneerUser = async () => {
  let aiUser = await User.findOne({ username: 'ai_auctioneer' });
  if (!aiUser) {
    aiUser = await User.create({
      username: 'ai_auctioneer',
      displayName: 'Auctioneer (AI)',
      avatar: 'robot',
      isGuest: true,
      stats: { roomsCreated: 0, roomsJoined: 0 }
    });
  }
  return aiUser;
};

export const updateRoomSettings = async (roomId, userId, settings) => {
  const room = await Room.findOne(getRoomFilter(roomId));
  if (!room) throw new Error('ROOM_NOT_FOUND');
  if (room.status !== 'LOBBY') throw new Error('CANNOT_CHANGE_IN_PROGRESS');
  if (room.admin.toString() !== userId.toString()) {
    throw new Error('ONLY_ADMIN_CAN_UPDATE_SETTINGS');
  }

  if (newSettings.maxTeams !== undefined) {
    const maxT = parseInt(newSettings.maxTeams);
    if (!isNaN(maxT) && maxT >= 2 && maxT <= 10) {
      room.settings.maxTeams = maxT;
    }
  }

  if (newSettings.isAIRoom !== undefined) {
    room.settings.isAIRoom = Boolean(newSettings.isAIRoom);
    if (room.settings.isAIRoom) {
      // In AI room, default to AI Auctioneer unless explicitly turned off
      room.settings.isAIAuctioneer = true;
      const aiAuctioneer = await getOrCreateAIAuctioneerUser();
      room.auctioneer = aiAuctioneer._id;
    } else {
      room.settings.isAIAuctioneer = false;
      if (room.auctioneer) {
        const currentAuctioneer = await User.findById(room.auctioneer);
        if (currentAuctioneer?.username === 'ai_auctioneer') {
          room.auctioneer = null;
        }
      }
    }
  }

  if (newSettings.isAIAuctioneer !== undefined) {
    room.settings.isAIAuctioneer = Boolean(newSettings.isAIAuctioneer);
    if (room.settings.isAIAuctioneer) {
      const aiAuctioneer = await getOrCreateAIAuctioneerUser();
      room.auctioneer = aiAuctioneer._id;
    } else if (room.auctioneer) {
      const currentAuctioneer = await User.findById(room.auctioneer);
      if (currentAuctioneer?.username === 'ai_auctioneer') {
        room.auctioneer = null;
      }
    }
  }

  if (newSettings.bidTimer !== undefined) {
    room.settings.bidTimer = Number(newSettings.bidTimer);
  }
  if (newSettings.bidIncrement !== undefined) {
    room.settings.bidIncrement = Number(newSettings.bidIncrement);
  }
  if (newSettings.purse !== undefined) {
    room.settings.purse = Number(newSettings.purse);
  }

  await room.save();
  return getRoomState(roomId);
};

export const getMyRooms = async (userId) => {
  const rooms = await Room.find({
    $or: [
      { admin: userId },
      { 'participants.user': userId }
    ]
  })
    .select('roomId name status admin settings.maxTeams settings.visibility participants teams createdAt completedAt')
    .sort({ createdAt: -1 })
    .limit(50);
  
  return rooms;
};

export const getPublicRooms = async () => {
  const rooms = await Room.find({
    'settings.visibility': 'public',
    status: 'LOBBY'
  })
    .select('roomId name status admin settings.maxTeams participants teams createdAt')
    .populate('admin', 'username displayName')
    .sort({ createdAt: -1 })
    .limit(20);
  
  return rooms;
};

export default {
  createRoom, joinRoom, leaveRoom, selectTeam, setReady,
  canStartAuction, initializeAuctionPool, getRoomState,
  setAuctioneer, updateRoomSettings, getOrCreateAIAuctioneerUser,
  getMyRooms, getPublicRooms
};

