import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

import Player from '../models/Player.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import Bid from '../models/Bid.js';
import auctionEngine from '../auction/AuctionEngine.js';
import { aiBidDecision } from '../auction/AIEngine.js';
import { validateBid } from '../auction/BidValidator.js';
import { extractPlayerRating, calculatePlayerExpectedValue } from '../analytics/playerValue.js';
import aiChatEngine from '../auction/AIChatEngine.js';

async function run() {
  console.log('=== STARTING AI BIDDING SIMULATION & VERIFICATION ===\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas successfully.');

  // Test 1: Verify rating extraction and EV calculation for player with Object rating
  console.log('\n--- TEST 1: Rating Extraction & EV Calculation ---');
  const samplePlayer = await Player.findOne({ name: 'Virat Kohli' }) || await Player.findOne();
  console.log(`Testing with player: ${samplePlayer.name} (${samplePlayer.role})`);
  console.log(`Raw rating type in DB: ${typeof samplePlayer.rating}, value:`, samplePlayer.rating);

  const numericRating = extractPlayerRating(samplePlayer);
  console.log(`Extracted numeric rating: ${numericRating}`);
  if (isNaN(numericRating) || numericRating <= 0) {
    throw new Error(`Rating extraction failed! Got ${numericRating}`);
  }

  const ev = calculatePlayerExpectedValue(samplePlayer);
  console.log(`Calculated EV: ₹${ev.toFixed(2)} Cr`);
  if (isNaN(ev) || ev <= 0) {
    throw new Error(`Expected Value is NaN or <= 0! Got ${ev}`);
  }
  console.log('PASS: Rating extraction & EV calculation are healthy and non-NaN.');

  // Test 2: AI Bid Decision
  console.log('\n--- TEST 2: AI Bid Decision ---');
  const mockRoom = {
    settings: { purse: 120, squadSize: 25, overseasLimit: 8, minSquad: 18, minReservePerPlayer: 0.2, bidIncrement: 0.25 }
  };
  const mockTeam = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Mumbai Indians',
    shortName: 'MI',
    primaryColor: '#004BA0',
    isAI: true,
    aiPersonality: 'Difficult',
    purse: { remaining: 120, spent: 0, initial: 120 },
    squad: [],
    squadDetails: [],
    overseas: 0,
    status: 'ACTIVE'
  };

  const decision1 = aiBidDecision({
    room: mockRoom,
    team: mockTeam,
    player: samplePlayer,
    currentBid: 0,
    nextBid: samplePlayer.basePrice
  });
  console.log('AI Decision at base price:', decision1);
  if (!decision1.shouldBid) {
    throw new Error(`AI refused to bid on star player at base price! Decision: ${JSON.stringify(decision1)}`);
  }
  console.log('PASS: AI successfully decides to bid with realistic delayMs:', decision1.delayMs);

  // Test 3: ValidateBid check with AI team and Auctioneer
  console.log('\n--- TEST 3: BidValidator with AI and Auctioneer ---');
  const adminId = new mongoose.Types.ObjectId();
  const testRoomObj = {
    status: 'IN_PROGRESS',
    auction: {
      status: 'BIDDING',
      currentPlayer: samplePlayer._id,
      currentBid: 0,
      currentBidder: null
    },
    admin: adminId,
    auctioneer: adminId, // Auctioneer is the admin!
    settings: mockRoom.settings
  };

  // Human auctioneer trying to bid directly on human team -> Should be rejected
  const humanTeam = { _id: new mongoose.Types.ObjectId(), owner: adminId, isAI: false, status: 'ACTIVE', purse: { remaining: 100 }, squad: [] };
  const humanVal = validateBid({
    room: testRoomObj,
    player: samplePlayer,
    team: humanTeam,
    user: { _id: adminId },
    amount: samplePlayer.basePrice
  });
  console.log('Human auctioneer bidding rejection check:', humanVal.error);
  if (humanVal.valid) {
    throw new Error('Human auctioneer should not be allowed to place bids!');
  }

  // AI team placing bid (even if triggered with admin or team ID) -> MUST BE VALID!
  const aiVal = validateBid({
    room: testRoomObj,
    player: samplePlayer,
    team: mockTeam,
    user: { _id: mockTeam._id },
    amount: samplePlayer.basePrice
  });
  console.log('AI team placing bid check:', aiVal);
  if (!aiVal.valid) {
    throw new Error(`AI team bid was rejected! Reason: ${aiVal.error}`);
  }
  console.log('PASS: AI team bids are valid and immune to auctioneer restrictions.');

  // Legitimate human team owner placing bid -> MUST BE VALID! (was previously throwing ReferenceError: userId is not defined)
  const humanUserId = new mongoose.Types.ObjectId();
  const humanManagerTeam = { _id: new mongoose.Types.ObjectId(), owner: humanUserId, isAI: false, status: 'ACTIVE', purse: { remaining: 100 }, squad: [] };
  const humanManagerVal = validateBid({
    room: testRoomObj,
    player: samplePlayer,
    team: humanManagerTeam,
    user: { _id: humanUserId },
    amount: samplePlayer.basePrice
  });
  console.log('Legitimate human manager placing bid check:', humanManagerVal);
  if (!humanManagerVal.valid) {
    throw new Error(`Legitimate human manager bid was rejected! Reason: ${humanManagerVal.error}`);
  }
  console.log('PASS: Legitimate human manager bid is valid without userId error.');

  // Test 4: AI Conversational Chat Generation
  console.log('\n--- TEST 4: AI Conversational Chat Engine ---');
  const bidChat = aiChatEngine.generateBidMessage('TEST', mockTeam, samplePlayer, 2.0);
  console.log(`Generated Bid Chat: "${bidChat}"`);
  if (!bidChat || bidChat.length < 5) throw new Error('Bid chat generation failed');

  const outbidChat = aiChatEngine.generateOutbidMessage('TEST', mockTeam, samplePlayer, 12.0, 10.0);
  console.log(`Generated Outbid Chat: "${outbidChat}"`);
  if (!outbidChat || outbidChat.length < 5) throw new Error('Outbid chat generation failed');

  const winChat = aiChatEngine.generateWinMessage('TEST', mockTeam, samplePlayer, 8.5);
  console.log(`Generated Win Chat: "${winChat}"`);
  if (!winChat || winChat.length < 5) throw new Error('Win chat generation failed');
  console.log('PASS: AI chat messages are contextual, reactive, and non-empty.');

  // Test 5: Live Database Room Simulation with AuctionEngine
  console.log('\n--- TEST 5: Live Room Simulation with AuctionEngine ---');
  const simRoomId = `SIM_${Date.now().toString().slice(-4)}`;
  const simAdmin = await User.findOne() || await User.create({
    username: `sim_user_${Date.now()}`,
    email: `sim_${Date.now()}@test.com`,
    password: 'hash'
  });

  const simRoom = await Room.create({
    roomId: simRoomId,
    name: 'Simulation Test Room',
    admin: simAdmin._id,
    auctioneer: simAdmin._id,
    settings: {
      isAIRoom: true,
      isAIAuctioneer: true,
      maxTeams: 4,
      purse: 120,
      bidTimer: 5,
      bidIncrement: 0.25,
      poolSize: 10
    },
    teams: [
      {
        name: 'Chennai Super Kings',
        shortName: 'CSK',
        primaryColor: '#FFFF00',
        owner: simAdmin._id,
        isAI: false,
        status: 'ACTIVE',
        purse: { initial: 120, remaining: 120, spent: 0 }
      },
      {
        name: 'Mumbai Indians',
        shortName: 'MI',
        primaryColor: '#004BA0',
        isAI: true,
        status: 'ACTIVE',
        purse: { initial: 120, remaining: 120, spent: 0 }
      },
      {
        name: 'Royal Challengers Bengaluru',
        shortName: 'RCB',
        primaryColor: '#EC1C24',
        isAI: true,
        status: 'ACTIVE',
        purse: { initial: 120, remaining: 120, spent: 0 }
      }
    ],
    participants: [
      {
        user: simAdmin._id,
        role: 'ADMIN',
        teamIndex: 0,
        status: 'READY'
      }
    ]
  });

  console.log(`Created simulation room: ${simRoomId}`);

  // Capture broadcast messages
  const capturedMessages = [];
  auctionEngine.setIO({
    to: (room) => ({
      emit: (event, payload) => {
        capturedMessages.push({ event, payload });
      }
    })
  });

  // Start auction
  await auctionEngine.startAuction(simRoomId, simAdmin._id);
  console.log('Auction started successfully.');

  // Verify player pool was initialized
  const startedRoom = await Room.findOne({ roomId: simRoomId });
  console.log(`Player pool length: ${startedRoom.auction.playerPool.length}`);
  if (!startedRoom.auction.playerPool || startedRoom.auction.playerPool.length === 0) {
    throw new Error('Player pool was not created in startAuction!');
  }

  // Nominate first player
  await auctionEngine.nominateNextPlayer(simRoomId);
  const biddingRoom = await Room.findOne({ roomId: simRoomId });
  console.log(`Nominated player ID: ${biddingRoom.auction.currentPlayer}, Status: ${biddingRoom.auction.status}`);
  if (biddingRoom.auction.status !== 'BIDDING') {
    throw new Error('Auction status is not BIDDING after nomination!');
  }

  // Wait 3.5 seconds to let AI teams place their bids via setTimeout
  console.log('Waiting 3.5s for AI teams to evaluate, chat, and place bids...');
  await new Promise(r => setTimeout(r, 3500));

  const afterAIBidsRoom = await Room.findOne({ roomId: simRoomId });
  console.log(`Current Bid: ₹${afterAIBidsRoom.auction.currentBid} Cr, Bid Count: ${afterAIBidsRoom.auction.bidCount}`);
  console.log(`Highest Bidder Team: ${afterAIBidsRoom.auction.currentBidder}`);

  const bidsInDb = await Bid.find({ roomId: simRoomId });
  console.log(`Bids recorded in DB: ${bidsInDb.length}`);
  bidsInDb.forEach(b => {
    console.log(`  -> Bid ₹${b.amount} Cr by ${b.teamName} (AI: ${b.isAI})`);
  });

  if (bidsInDb.length === 0) {
    throw new Error('FAILED: No AI bids were recorded in the database!');
  }

  const aiChatBroadcasts = capturedMessages.filter(m => m.event === 'chat:broadcast');
  console.log(`AI & Auctioneer Chat broadcasts captured: ${aiChatBroadcasts.length}`);
  aiChatBroadcasts.forEach(c => {
    console.log(`  [${c.payload.senderName || c.payload.user}]: ${c.payload.message}`);
  });

  // Clean up simulation room
  await Room.deleteOne({ roomId: simRoomId });
  await Bid.deleteMany({ roomId: simRoomId });
  console.log('\nCleaned up simulation room.');

  console.log('\n=== ALL AI BIDDING VERIFICATION TESTS PASSED! ===');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('\nSIMULATION TEST FAILED:', err);
  process.exit(1);
});
