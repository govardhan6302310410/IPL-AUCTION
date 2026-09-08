import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teamIndex: { type: Number, default: -1 }, // index in teams array, -1 = no team
  status: {
    type: String,
    enum: ['WAITING', 'READY', 'ACTIVE', 'SPECTATOR', 'INACTIVE', 'FINISHED'],
    default: 'WAITING'
  },
  isAI: { type: Boolean, default: false },
  aiPersonality: { type: String },
  joinedAt: { type: Date, default: Date.now },
  isConnected: { type: Boolean, default: true }
}, { _id: true });

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  shortName: { type: String, required: true },
  primaryColor: { type: String, default: '#f5a623' },
  secondaryColor: { type: String, default: '#d4941f' },
  logo: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // the participant controlling this team
  isAI: { type: Boolean, default: false },
  aiPersonality: { type: String },
  purse: {
    initial: { type: Number, default: 120 },
    spent: { type: Number, default: 0 },
    remaining: { type: Number, default: 120 }
  },
  squad: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  squadDetails: [{
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    boughtFor: { type: Number },
    boughtAt: { type: Date }
  }],
  overseas: { type: Number, default: 0 },
  playingXI: [{
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    position: { type: Number },
    isCaptain: { type: Boolean, default: false },
    isViceCaptain: { type: Boolean, default: false },
    isWicketkeeper: { type: Boolean, default: false }
  }],
  playingXIRating: {
    compositeScore: { type: Number },
    battingScore: { type: Number },
    bowlingScore: { type: Number },
    balanceScore: { type: Number },
    topOrderScore: { type: Number },
    middleOrderScore: { type: Number },
    deathBowlingScore: { type: Number },
    submittedAt: { type: Date }
  },
  status: {
    type: String,
    enum: ['WAITING', 'READY', 'ACTIVE', 'SPECTATOR', 'INACTIVE', 'FINISHED'],
    default: 'WAITING'
  },
  inactiveReason: { type: String }
}, { _id: true });

const auctionStateSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['LOBBY', 'READY', 'STARTING', 'NOMINATING', 'BIDDING', 'SOLD', 'UNSOLD', 'PAUSED', 'NEXT_PLAYER', 'COMPLETED'],
    default: 'LOBBY'
  },
  currentPlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  currentBid: { type: Number, default: 0 },
  currentBidder: { type: mongoose.Schema.Types.ObjectId }, // team _id
  currentBidderUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bidCount: { type: Number, default: 0 },
  timerEndTime: { type: Date },
  timerDuration: { type: Number }, // seconds
  playerPool: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  playerPoolIndex: { type: Number, default: 0 },
  soldPlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  unsoldPlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  currentCategory: { type: String },
  round: { type: Number, default: 1 },
  results: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    uppercase: true
  },
  name: { type: String, required: true, trim: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  auctioneer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: {
    type: String,
    enum: ['LOBBY', 'STARTING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ABANDONED'],
    default: 'LOBBY',
    index: true
  },
  participants: [participantSchema],
  teams: [teamSchema],
  settings: {
    maxTeams: { type: Number, default: 10 },
    purse: { type: Number, default: 120 },
    squadSize: { type: Number, default: 25 },
    minSquad: { type: Number, default: 18 },
    overseasLimit: { type: Number, default: 8 },
    maxOverseasXI: { type: Number, default: 4 },
    bidTimer: { type: Number, default: 15 },
    bidIncrement: { type: Number, default: 0.25 },
    auctionType: { type: String, enum: ['standard', 'category', 'custom'], default: 'standard' },
    categories: [{ type: String }],
    poolSize: { type: Number, default: 400 },
    visibility: { type: String, enum: ['private', 'public'], default: 'private' },
    isAIRoom: { type: Boolean, default: false },
    isAIAuctioneer: { type: Boolean, default: false },
    minReservePerPlayer: { type: Number, default: 0.2 },
    nominationMode: { type: String, enum: ['admin', 'automatic', 'team'], default: 'automatic' }
  },
  auction: auctionStateSchema,
  bidHistory: [{
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    team: { type: mongoose.Schema.Types.ObjectId },
    teamName: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number },
    bidOrder: { type: Number },
    timestamp: { type: Date, default: Date.now }
  }],
  events: [{
    type: { type: String },
    data: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now }
  }],
  expiresAt: { type: Date },
  completedAt: { type: Date }
}, {
  timestamps: true
});

// Index for finding public rooms
roomSchema.index({ 'settings.visibility': 1, status: 1 });
// TTL index for auto-expiring stale lobby rooms (24 hours)
roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Room = mongoose.model('Room', roomSchema);
export default Room;
