import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, index: true },
  fullName: { type: String, trim: true },
  dob: { type: Date },
  age: { type: Number },
  country: { type: String, required: true, index: true },
  nationality: { type: String },
  role: {
    type: String,
    required: true,
    enum: ['Batter', 'Wicketkeeper', 'All-Rounder', 'Fast Bowler', 'Spin Bowler'],
    index: true
  },
  battingStyle: {
    type: String,
    enum: ['Right-hand bat', 'Left-hand bat'],
    default: 'Right-hand bat'
  },
  bowlingStyle: {
    type: String,
    enum: ['Right-arm fast', 'Right-arm medium', 'Left-arm fast', 'Left-arm medium',
           'Right-arm offspin', 'Right-arm legspin', 'Left-arm orthodox', 'Left-arm chinaman', 'None'],
    default: 'None'
  },
  isWicketkeeper: { type: Boolean, default: false },
  isOverseas: { type: Boolean, default: false, index: true },
  isCapped: { type: Boolean, default: true },
  basePrice: { type: Number, required: true, default: 0.2 }, // in crores
  previousPrice: { type: Number },
  previousTeam: { type: String },
  image: { type: String, default: 'default_player.png' },
  
  // Career aggregate stats (computed from season stats)
  careerStats: {
    batting: {
      matches: { type: Number, default: 0 },
      innings: { type: Number, default: 0 },
      runs: { type: Number, default: 0 },
      average: { type: Number, default: 0 },
      strikeRate: { type: Number, default: 0 },
      highestScore: { type: Number, default: 0 },
      fifties: { type: Number, default: 0 },
      hundreds: { type: Number, default: 0 },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
      notOuts: { type: Number, default: 0 },
      ballsFaced: { type: Number, default: 0 }
    },
    bowling: {
      matches: { type: Number, default: 0 },
      innings: { type: Number, default: 0 },
      overs: { type: Number, default: 0 },
      runsConceded: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      average: { type: Number, default: 0 },
      economy: { type: Number, default: 0 },
      strikeRate: { type: Number, default: 0 },
      bestBowling: { type: String, default: '0/0' },
      threeWickets: { type: Number, default: 0 },
      fourWickets: { type: Number, default: 0 },
      fiveWickets: { type: Number, default: 0 }
    },
    fielding: {
      catches: { type: Number, default: 0 },
      runOuts: { type: Number, default: 0 },
      stumpings: { type: Number, default: 0 }
    }
  },

  // Computed ratings
  rating: {
    overall: { type: Number, default: 0 },
    batting: { type: Number, default: 0 },
    bowling: { type: Number, default: 0 },
    fielding: { type: Number, default: 0 },
    consistency: { type: Number, default: 0 },
    recentForm: { type: Number, default: 0 },
    impact: { type: Number, default: 0 }
  },

  // Data provenance
  dataSource: {
    type: String,
    enum: ['cricsheet', 'statsguru', 'official_ipl', 'manual_verified', 'demo'],
    default: 'demo',
    index: true
  },
  lastVerified: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Text search index
playerSchema.index({ name: 'text', fullName: 'text', country: 'text' });

const Player = mongoose.model('Player', playerSchema);
export default Player;
