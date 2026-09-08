import mongoose from 'mongoose';

const playerSeasonStatsSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
  season: { type: Number, required: true, index: true }, // e.g. 2023
  team: { type: String },
  
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
    ballsFaced: { type: Number, default: 0 },
    dotBallPercent: { type: Number, default: 0 },
    boundaryPercent: { type: Number, default: 0 }
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
    fiveWickets: { type: Number, default: 0 },
    dotBallPercent: { type: Number, default: 0 }
  },
  fielding: {
    catches: { type: Number, default: 0 },
    runOuts: { type: Number, default: 0 },
    stumpings: { type: Number, default: 0 }
  },
  
  // Data provenance
  dataSource: {
    type: String,
    enum: ['cricsheet', 'statsguru', 'official_ipl', 'manual_verified', 'demo'],
    default: 'demo'
  },
  lastVerified: { type: Date, default: Date.now }
}, {
  timestamps: true
});

playerSeasonStatsSchema.index({ player: 1, season: 1 }, { unique: true });

const PlayerSeasonStats = mongoose.model('PlayerSeasonStats', playerSeasonStatsSchema);
export default PlayerSeasonStats;
