import mongoose from 'mongoose';

const auctionEventSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: [
      'AUCTION_STARTED', 'PLAYER_NOMINATED', 'BID_PLACED', 'BID_ACCEPTED',
      'BID_REJECTED', 'TIMER_RESET', 'PLAYER_SOLD', 'PLAYER_UNSOLD',
      'TEAM_INACTIVE', 'AUCTION_PAUSED', 'AUCTION_RESUMED', 'AUCTION_COMPLETED'
    ],
    required: true
  },
  data: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const AuctionEvent = mongoose.model('AuctionEvent', auctionEventSchema);
export default AuctionEvent;
