import mongoose from 'mongoose';

const bidSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
  team: { type: mongoose.Schema.Types.ObjectId, required: true },
  teamName: { type: String, required: true },
  teamShortName: { type: String, required: true },
  teamColor: { type: String, default: '#f5a623' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true }, // in crores
  bidOrder: { type: Number, required: true },
  isAI: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

bidSchema.index({ roomId: 1, player: 1, bidOrder: -1 });

const Bid = mongoose.model('Bid', bidSchema);
export default Bid;
