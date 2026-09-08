import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: './server/.env' });

import Room from '../models/Room.js';
import User from '../models/User.js';
import Bid from '../models/Bid.js';
import AuctionEvent from '../models/AuctionEvent.js';

async function testDelete() {
  console.log('--- Testing Room Deletion Flow ---');
  await mongoose.connect(process.env.MONGODB_URI);

  const testUser = await User.findOne();
  const testRoomId = `DEL_${Date.now().toString().slice(-4)}`;

  const room = await Room.create({
    roomId: testRoomId,
    name: 'Delete Test Room',
    admin: testUser._id,
    settings: { maxTeams: 4, purse: 120 },
    teams: [{ name: 'Test Team', shortName: 'TT', isAI: false, owner: testUser._id }]
  });

  await Bid.create({
    roomId: testRoomId,
    player: new mongoose.Types.ObjectId(),
    team: room.teams[0]._id,
    teamName: 'Test Team',
    teamShortName: 'TT',
    amount: 2.0,
    bidOrder: 1
  });

  await AuctionEvent.create({
    roomId: testRoomId,
    type: 'AUCTION_STARTED'
  });

  console.log(`Created test room ${testRoomId}`);

  // Perform deletion cleanup
  await Bid.deleteMany({ roomId: testRoomId });
  await AuctionEvent.deleteMany({ roomId: testRoomId });
  const delRes = await Room.deleteOne({ roomId: testRoomId });

  if (delRes.deletedCount !== 1) {
    throw new Error('Room was not deleted!');
  }

  const checkRoom = await Room.findOne({ roomId: testRoomId });
  const checkBids = await Bid.find({ roomId: testRoomId });
  const checkEvents = await AuctionEvent.find({ roomId: testRoomId });

  if (checkRoom || checkBids.length > 0 || checkEvents.length > 0) {
    throw new Error('Cleanup failed; records still remain!');
  }

  console.log('PASS: Room and all associated bids & events deleted cleanly.');
  await mongoose.disconnect();
  process.exit(0);
}

testDelete().catch(e => {
  console.error('Delete test failed:', e);
  process.exit(1);
});
